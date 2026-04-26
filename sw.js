const CACHE_NAME = 'hifdh-tracker-v2-unique';
const assets = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon.svg'
];

// Install Service Worker
self.addEventListener('install', e => {
    self.skipWaiting(); // Force update
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(assets);
        })
    );
});

// Activate & Cleanup old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// Fetch Assets
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request);
        })
    );
});
