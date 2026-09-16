import { storage } from "../firebase";
import { Check, Type } from "lucide-react";
/**
 * Service Worker Offline Sync Service
 * Caches pending dashboard actions when offline and replays them when connectivity is restored.
 */

export interface PendingAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

type SyncCallback = (status: { isOnline: boolean; pendingCount: number; lastSyncedAt?: string }) => void;

const CANONICAL_HOST = 'aijobs1.in';
const LEGACY_HOSTS = new Set(['www.aijobs1.in', 'aijobs1.vercel.app', 'aijobs-14.vercel.app', 'aijobs.vercel.app']);

class OfflineSyncService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private pendingCount: number = 0;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<SyncCallback> = new Set();
  private lastSyncedAt: string | undefined;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initListeners();
    }
  }

  private initListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.replayPendingActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'OFFLINE_ACTIONS_REPLAYED') {
          const { replayedCount, remainingCount } = event.data;
          this.pendingCount = remainingCount;
          if (replayedCount > 0) {
            this.lastSyncedAt = new Date().toLocaleTimeString();
          }
          this.notifyListeners();
        }
      });
    }
  }

  public async registerServiceWorker(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[OfflineSyncService] Service Workers not supported in current environment.');
      return;
    }

    if (LEGACY_HOSTS.has(window.location.hostname)) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch (err) {
        console.warn('[OfflineSyncService] Legacy host cleanup warning:', err);
      }
      window.location.replace(`https://${CANONICAL_HOST}${window.location.pathname}${window.location.search}${window.location.hash}`);
      return;
    }

    if (window.location.hostname !== CANONICAL_HOST && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.log('[OfflineSyncService] Service Worker registration skipped on non-canonical host.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      this.swRegistration = registration;
      console.log('[OfflineSyncService] Service Worker registered successfully:', registration.scope);

      // Check for pending actions count
      this.updatePendingCount();
    } catch (err) {
      console.warn('[OfflineSyncService] Service Worker registration skipped or failed:', err);
    }
  }

  public async updatePendingCount(): Promise<number> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return this.pendingCount;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        this.pendingCount = event.data?.count || 0;
        this.notifyListeners();
        resolve(this.pendingCount);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_PENDING_COUNT' },
        [messageChannel.port2]
      );
    });
  }

  public async enqueueAction(type: string, payload: any): Promise<{ success: boolean; offlineQueued?: boolean }> {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const actionData: PendingAction = {
      id: actionId,
      type,
      payload,
      timestamp: Date.now()
    };

    // If online, try to send to API first
    if (navigator.onLine) {
      try {
        const response = await fetch('/api/sync/replay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionId: actionData.id,
            type: actionData.type,
            payload: actionData.payload,
            timestamp: actionData.timestamp
          })
        });

        if (response.ok) {
          this.lastSyncedAt = new Date().toLocaleTimeString();
          this.notifyListeners();
          return { success: true, offlineQueued: false };
        }
      } catch (err) {
        console.warn('[OfflineSyncService] Online request failed, queueing for retry:', err);
      }
    }

    if (!navigator.serviceWorker.controller) {
      return { success: false, offlineQueued: false };
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        this.pendingCount = event.data?.pendingCount || this.pendingCount + 1;
        this.notifyListeners();
        resolve({ success: true, offlineQueued: true });
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'QUEUE_OFFLINE_ACTION', action: actionData },
        [messageChannel.port2]
      );
    });
  }

  public async replayPendingActions(): Promise<void> {
    if (!navigator.serviceWorker.controller) return;

    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      if (event.data?.success) {
        this.pendingCount = Math.max(0, this.pendingCount - (event.data.replayed || 0));
        if ((event.data.replayed || 0) > 0) this.lastSyncedAt = new Date().toLocaleTimeString();
        this.notifyListeners();
      }
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'REPLAY_PENDING_ACTIONS' },
      [messageChannel.port2]
    );
  }

  public subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback);
    callback({ isOnline: this.isOnline, pendingCount: this.pendingCount, lastSyncedAt: this.lastSyncedAt });
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    const status = { isOnline: this.isOnline, pendingCount: this.pendingCount, lastSyncedAt: this.lastSyncedAt };
    this.listeners.forEach((listener) => listener(status));
  }

  public getStatus() {
    return { isOnline: this.isOnline, pendingCount: this.pendingCount, lastSyncedAt: this.lastSyncedAt };
  }
}

export const offlineSyncService = new OfflineSyncService();

export default offlineSyncService;