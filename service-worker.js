const CACHE_NAME = 'vincent-it-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/js/three-background.js',
    '/js/i18n.js',
    '/js/search-filter.js',
    '/js/quiz.js',
    '/js/lazy-load.js',
    '/js/chat.js',
    '/js/booking.js',
    '/js/portal.js',
    '/blog/index.html',
    '/blog/posts.json',
    '/client/portal.html',
    '/admin/index.html',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(ASSETS.map(url =>
                cache.add(url).catch(() => console.log('SW: failed to cache', url))
            ))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ offline: true, message: 'You are offline. Data will sync when connected.' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }
    if (event.request.url.match(/\.(woff2?|ttf|otf|eot)/)) {
        event.respondWith(fetch(event.request));
        return;
    }
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
            if (response.ok && event.request.url.startsWith(self.location.origin)) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
        }))
    );
});
