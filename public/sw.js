/* AIJobs Service Worker - Offline Cache & Dashboard Action Replay Sync */

const CACHE_NAME = 'aijobs-v1-cache';
const DB_NAME = 'aijobs_offline_sync_db';
const STORE_NAME = 'pending_dashboard_actions';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Open or create IndexedDB in Service Worker scope
function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Add pending action to IndexedDB
async function savePendingAction(actionData) {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item = {
      id: actionData.id || `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: actionData.type,
      payload: actionData.payload,
      endpoint: actionData.endpoint || '/api/sync/replay',
      timestamp: Date.now()
    };
    store.put(item);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(item);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[SW] Error saving pending action to IndexedDB:', err);
    throw err;
  }
}

// Get all pending actions
async function getPendingActions() {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[SW] Error fetching pending actions:', err);
    return [];
  }
}

// Delete action by ID
async function deletePendingAction(id) {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[SW] Error deleting action:', err);
  }
}

// Replay queued actions to backend server
async function replayPendingActions() {
  const actions = await getPendingActions();
  if (!actions.length) return { replayed: 0 };

  console.log(`[SW] Replaying ${actions.length} pending dashboard actions...`);
  let replayedCount = 0;

  for (const action of actions) {
    try {
      const response = await fetch(action.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.id,
          type: action.type,
          payload: action.payload,
          timestamp: action.timestamp
        })
      });

      if (response.ok || response.status === 200 || response.status === 201) {
        await deletePendingAction(action.id);
        replayedCount++;
      } else {
        console.warn(`[SW] Action replay failed with status ${response.status} for action: ${action.id}`);
      }
    } catch (err) {
      console.error(`[SW] Network error replaying action ${action.id}:`, err);
      break; // stop replaying if offline or network drops again
    }
  }

  // Notify all window clients
  const clientsList = await self.clients.matchAll();
  for (const client of clientsList) {
    client.postMessage({
      type: 'OFFLINE_ACTIONS_REPLAYED',
      replayedCount,
      remainingCount: actions.length - replayedCount
    });
  }

  return { replayed: replayedCount };
}

// Service Worker Lifecycle
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

// Fetch event with Network-first, fallback to Cache Strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Handle Sync Event if browser supports BackgroundSync API
self.addEventListener('sync', (event) => {
  if (event.tag === 'replay-dashboard-actions' || event.tag === 'sync-offline-actions') {
    event.waitUntil(replayPendingActions());
  }
});

// Handle Messages from main client window
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'QUEUE_OFFLINE_ACTION') {
    event.waitUntil(
      savePendingAction(event.data.action).then(async (savedItem) => {
        const actions = await getPendingActions();
        event.ports[0]?.postMessage({ success: true, pendingCount: actions.length });
      })
    );
  } else if (event.data.type === 'REPLAY_PENDING_ACTIONS') {
    event.waitUntil(
      replayPendingActions().then((result) => {
        event.ports[0]?.postMessage({ success: true, replayed: result.replayed });
      })
    );
  } else if (event.data.type === 'GET_PENDING_COUNT') {
    event.waitUntil(
      getPendingActions().then((actions) => {
        event.ports[0]?.postMessage({ count: actions.length, actions });
      })
    );
  }
});
