/* myStereo / Flipside service worker: lets Android install the app. It caches nothing, so updates are never stale. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
