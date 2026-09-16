/* AIJobs Service Worker - Offline Cache & Dashboard Action Replay Sync */

// Bump cache version whenever production bundles/routes change. Old caches are
// deleted on activate so stale Vite chunks can never shadow a fresh deploy.
const CACHE_NAME = 'aijobs-v3-cache';
const DB_NAME = 'aijobs_offline_sync_db';
const STORE_NAME = 'pending_dashboard_actions';
const CANONICAL_ORIGIN = 'https://aijobs1.in';
const LEGACY_HOSTS = new Set([
  'www.aijobs1.in',
  'aijobs1.vercel.app',
  'aijobs-14.vercel.app',
  'aijobs.vercel.app'
]);
const IS_LEGACY_HOST = LEGACY_HOSTS.has(self.location.hostname);

// Only cache stable shell assets. Hashed /assets/*.js and /assets/*.css files are
// intentionally NOT cached here because serving an old dynamic-import chunk after
// a deployment causes errors such as "Failed to Load AuthModal".
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.ico'
];

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
      break;
    }
  }

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

self.addEventListener('install', (event) => {
  self.skipWaiting();
  if (IS_LEGACY_HOST) return;
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      })
    )
  );
});

self.addEventListener('activate', (event) => {
  if (IS_LEGACY_HOST) {
    event.waitUntil(
      Promise.all([
        self.registration.unregister(),
        caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      ])
    );
    return;
  }

  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';

  // A service worker cannot safely proxy an authenticated API request across origins.
  // If an old Vercel/www host is still controlled by this worker, send navigations to
  // the canonical production host and otherwise stay out of the request entirely.
  if (IS_LEGACY_HOST) {
    if (isNavigation) {
      const target = `${CANONICAL_ORIGIN}${url.pathname}${url.search}${url.hash}`;
      event.respondWith(Response.redirect(target, 302));
    }
    return;
  }

  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  const isBuildAsset = url.pathname.startsWith('/assets/');

  // Never answer navigation requests or hashed build assets from an old cache.
  // This guarantees that HTML and dynamic-import chunks always belong to the
  // same production deployment.
  if (isBuildAsset || isNavigation) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        if (isNavigation) {
          return new Response(
            '<!doctype html><html><body style="font-family:sans-serif;background:#07152F;color:white;padding:40px"><h2>AIJOBS is temporarily offline</h2><p>Please reconnect and reload this page.</p></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
        return new Response('', { status: 503 });
      })
    );
    return;
  }

  // Stable same-origin assets use network-first with cache fallback.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'replay-dashboard-actions' || event.tag === 'sync-offline-actions') {
    event.waitUntil(replayPendingActions());
  }
});

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'QUEUE_OFFLINE_ACTION') {
    event.waitUntil(
      savePendingAction(event.data.action).then(async () => {
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
  } else if (event.data.type === 'CLEAR_RUNTIME_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    );
  }
});