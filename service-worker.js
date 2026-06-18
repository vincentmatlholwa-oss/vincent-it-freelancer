const CACHE_NAME = 'vincent-it-v4';
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
    // POST /api/orders — catch offline submissions
    if (event.request.method === 'POST' && event.request.url.includes('/api/orders')) {
        event.respondWith(
            fetch(event.request).then(res => res).catch(() => {
                return new Response(JSON.stringify({ success: true, offline: true, message: 'Order queued for sync when online.' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }
    // API requests — return offline JSON on failure
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ offline: true, message: 'You are offline.' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }
    // Web fonts — fetch directly
    if (event.request.url.match(/\.(woff2?|ttf|otf|eot)/)) {
        event.respondWith(fetch(event.request));
        return;
    }
    // Static assets — cache-first
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

// Push notifications
self.addEventListener('push', event => {
    if (!event.data) return;
    try {
        const data = event.data.json();
        const options = {
            body: data.body || '',
            icon: data.icon || '/img/icon-192.png',
            badge: '/img/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url: data.url || '/' }
        };
        event.waitUntil(
            self.registration.showNotification(data.title || 'Vincent IT', options)
        );
    } catch {}
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = event.notification.data?.url || '/client/portal.html';
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});