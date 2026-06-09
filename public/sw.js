const CACHE_VERSION = 'neonwave-pwa-1.4.16';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
    '/',
    '/login.html',
    '/offline.html',
    '/manifest.webmanifest',
    '/css/style.css',
    '/js/auth.js',
    '/js/changelog.js',
    '/js/music.js',
    '/js/player.js',
    '/js/playlists.js',
    '/js/settings.js',
    '/js/video-player.js',
    '/js/onboarding.js',
    '/js/ux-extras.js',
    '/js/pwa.js',
    '/nw.png',
    '/icons/apple-touch-icon.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/maskable-512.png'
];

const isSameOriginGet = (request) => (
    request.method === 'GET' && new URL(request.url).origin === self.location.origin
);

const shouldSkipCache = (url) => (
    url.pathname.startsWith('/api/')
    || url.pathname.startsWith('/callback')
    || url.pathname.includes('/music/streams/')
);

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter((key) => key.startsWith('neonwave-pwa-') && !key.startsWith(CACHE_VERSION))
                .map((key) => caches.delete(key))
        );
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (!isSameOriginGet(request)) return;

    const url = new URL(request.url);
    if (shouldSkipCache(url)) return;

    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const networkResponse = await fetch(request);
                const cache = await caches.open(RUNTIME_CACHE);
                cache.put(request, networkResponse.clone());
                return networkResponse;
            } catch {
                return (await caches.match(request))
                    || (await caches.match('/'))
                    || (await caches.match('/offline.html'));
            }
        })());
        return;
    }

    event.respondWith((async () => {
        const cachedResponse = await caches.match(request);
        const fetchAndCache = fetch(request).then(async (networkResponse) => {
            if (networkResponse && networkResponse.ok) {
                const cache = await caches.open(RUNTIME_CACHE);
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        });

        return cachedResponse || fetchAndCache;
    })());
});
