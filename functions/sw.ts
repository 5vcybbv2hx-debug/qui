const CACHE_NAME = 'barmanager-v1';
const urlsToCache = ['/'];

Deno.serve(() => {
    const swCode = `
        const CACHE_NAME = 'barmanager-v1';
        const urlsToCache = ['/'];

        self.addEventListener('install', (event) => {
            console.log('[SW] Installing...');
            event.waitUntil(
                caches.open(CACHE_NAME)
                    .then((cache) => cache.addAll(urlsToCache))
                    .then(() => self.skipWaiting())
            );
        });

        self.addEventListener('activate', (event) => {
            console.log('[SW] Activating...');
            const cacheWhitelist = [CACHE_NAME];
            event.waitUntil(
                caches.keys().then((cacheNames) => {
                    return Promise.all(
                        cacheNames.map((cacheName) => {
                            if (cacheWhitelist.indexOf(cacheName) === -1) {
                                return caches.delete(cacheName);
                            }
                        })
                    );
                }).then(() => self.clients.claim())
            );
        });

        self.addEventListener('fetch', (event) => {
            if (event.request.method !== 'GET') return;
            
            event.respondWith(
                caches.match(event.request)
                    .then((response) => {
                        if (response) {
                            return response;
                        }
                        return fetch(event.request).then((response) => {
                            if (response.status === 200) {
                                const responseClone = response.clone();
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                            }
                            return response;
                        }).catch(() => {
                            return new Response(
                                JSON.stringify({ 
                                    error: 'Offline', 
                                    message: 'Diese Anfrage ist offline nicht verfügbar' 
                                }),
                                { 
                                    headers: { 'Content-Type': 'application/json' },
                                    status: 503
                                }
                            );
                        });
                    })
            );
        });

        // Push-Benachrichtigungen
        self.addEventListener('push', (event) => {
            console.log('[SW] Push notification received');
            
            let data = {
                title: 'Neue Benachrichtigung',
                body: 'Sie haben eine neue Nachricht',
                icon: '/icon-192.png'
            };
            
            if (event.data) {
                try {
                    data = event.data.json();
                } catch (e) {
                    data.body = event.data.text();
                }
            }
            
            const options = {
                body: data.body,
                icon: data.icon || '/icon-192.png',
                badge: data.badge || '/icon-192.png',
                vibrate: [200, 100, 200],
                data: data.data || {},
                actions: [
                    { action: 'open', title: 'Öffnen' },
                    { action: 'close', title: 'Schließen' }
                ]
            };
            
            event.waitUntil(
                self.registration.showNotification(data.title, options)
            );
        });

        self.addEventListener('notificationclick', (event) => {
            console.log('[SW] Notification clicked');
            event.notification.close();
            
            if (event.action === 'close') {
                return;
            }
            
            const urlToOpen = event.notification.data?.url || '/Notifications';
            
            event.waitUntil(
                clients.matchAll({ type: 'window', includeUncontrolled: true })
                    .then((clientList) => {
                        for (let client of clientList) {
                            if (client.url.includes(self.location.origin) && 'focus' in client) {
                                return client.focus().then(() => {
                                    client.postMessage({ type: 'NOTIFICATION_CLICKED', url: urlToOpen });
                                });
                            }
                        }
                        if (clients.openWindow) {
                            return clients.openWindow(urlToOpen);
                        }
                    })
            );
        });
    `;

    return new Response(swCode, {
        headers: {
            'Content-Type': 'application/javascript',
            'Service-Worker-Allowed': '/'
        }
    });
});