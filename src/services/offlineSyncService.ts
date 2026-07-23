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
        console.warn('[OfflineSyncService] Online request failed, falling back to service worker offline queue:', err);
      }
    }

    // Queue action via Service Worker or local storage fallback
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          this.pendingCount = event.data?.pendingCount || (this.pendingCount + 1);
          this.notifyListeners();
          
          // Request BackgroundSync if supported
          if (this.swRegistration && 'sync' in this.swRegistration) {
            (this.swRegistration as any).sync.register('replay-dashboard-actions').catch(() => {});
          }

          resolve({ success: true, offlineQueued: true });
        };

        navigator.serviceWorker.controller.postMessage(
          { type: 'QUEUE_OFFLINE_ACTION', action: actionData },
          [messageChannel.port2]
        );
      });
    } else {
      // LocalStorage fallback queue if service worker controller is initializing
      try {
        const queueStr = localStorage.getItem('aijobs_offline_queue') || '[]';
        const queue: PendingAction[] = JSON.parse(queueStr);
        queue.push(actionData);
        localStorage.setItem('aijobs_offline_queue', JSON.stringify(queue));
        this.pendingCount = queue.length;
        this.notifyListeners();
        return { success: true, offlineQueued: true };
      } catch (e) {
        console.error('[OfflineSyncService] LocalStorage fallback queue error:', e);
        return { success: false };
      }
    }
  }

  public async replayPendingActions(): Promise<{ replayed: number }> {
    if (!navigator.onLine) {
      console.log('[OfflineSyncService] Still offline. Skipping replay.');
      return { replayed: 0 };
    }

    // First replay local storage fallback queue if any
    try {
      const queueStr = localStorage.getItem('aijobs_offline_queue');
      if (queueStr) {
        const queue: PendingAction[] = JSON.parse(queueStr);
        if (queue.length > 0) {
          console.log(`[OfflineSyncService] Replaying ${queue.length} actions from localStorage fallback queue...`);
          for (const item of queue) {
            await fetch('/api/sync/replay', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                actionId: item.id,
                type: item.type,
                payload: item.payload,
                timestamp: item.timestamp
              })
            }).catch(() => {});
          }
          localStorage.removeItem('aijobs_offline_queue');
        }
      }
    } catch (e) {
      console.warn('[OfflineSyncService] Error replaying fallback queue:', e);
    }

    // Ask Service Worker to replay its IndexedDB queue
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          const replayed = event.data?.replayed || 0;
          this.updatePendingCount();
          this.lastSyncedAt = new Date().toLocaleTimeString();
          this.notifyListeners();
          resolve({ replayed });
        };

        navigator.serviceWorker.controller.postMessage(
          { type: 'REPLAY_PENDING_ACTIONS' },
          [messageChannel.port2]
        );
      });
    }

    this.updatePendingCount();
    return { replayed: 0 };
  }

  public subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback);
    // Initial call
    callback({
      isOnline: this.isOnline,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt
    });

    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    const status = {
      isOnline: this.isOnline,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt
    };
    this.listeners.forEach((callback) => callback(status));
  }

  public getStatus() {
    return {
      isOnline: this.isOnline,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt
    };
  }
}

export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;
