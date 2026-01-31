import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            // Service Worker Registration
            const registerServiceWorker = async () => {
                try {
                    // Erstelle Service Worker als Data URL
                    const swCode = `
                        const CACHE_NAME = 'barmanager-v1';
                        const urlsToCache = [
                            '/',
                        ];

                        self.addEventListener('install', (event) => {
                            event.waitUntil(
                                caches.open(CACHE_NAME)
                                    .then((cache) => cache.addAll(urlsToCache))
                            );
                        });

                        self.addEventListener('fetch', (event) => {
                            // Cache-First-Strategie für statische Assets
                            if (event.request.method === 'GET') {
                                event.respondWith(
                                    caches.match(event.request)
                                        .then((response) => {
                                            if (response) {
                                                return response;
                                            }
                                            return fetch(event.request).then((response) => {
                                                // Speichere erfolgreiche GET-Anfragen im Cache
                                                if (response.status === 200) {
                                                    const responseClone = response.clone();
                                                    caches.open(CACHE_NAME).then((cache) => {
                                                        cache.put(event.request, responseClone);
                                                    });
                                                }
                                                return response;
                                            }).catch(() => {
                                                // Offline-Fallback
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
                            }
                        });

                        self.addEventListener('activate', (event) => {
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
                                })
                            );
                        });

                        // Push-Benachrichtigungen
                        self.addEventListener('push', (event) => {
                            console.log('Push notification received');
                            
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

                    const blob = new Blob([swCode], { type: 'application/javascript' });
                    const swUrl = URL.createObjectURL(blob);

                    const registration = await navigator.serviceWorker.register(swUrl);
                    console.log('Service Worker registered:', registration);
                } catch (error) {
                    console.error('Service Worker registration failed:', error);
                }
            };

            registerServiceWorker();
        }

        // Manifest Link hinzufügen
        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = '/api/functions/pwa-manifest';
        document.head.appendChild(manifestLink);

        // Theme Color Meta Tag
        const themeColorMeta = document.createElement('meta');
        themeColorMeta.name = 'theme-color';
        themeColorMeta.content = '#d97706';
        document.head.appendChild(themeColorMeta);

        // Apple Mobile Web App Tags
        const appleMobileWebAppCapable = document.createElement('meta');
        appleMobileWebAppCapable.name = 'apple-mobile-web-app-capable';
        appleMobileWebAppCapable.content = 'yes';
        document.head.appendChild(appleMobileWebAppCapable);

        const appleMobileWebAppStatus = document.createElement('meta');
        appleMobileWebAppStatus.name = 'apple-mobile-web-app-status-bar-style';
        appleMobileWebAppStatus.content = 'black-translucent';
        document.head.appendChild(appleMobileWebAppStatus);

        const appleMobileWebAppTitle = document.createElement('meta');
        appleMobileWebAppTitle.name = 'apple-mobile-web-app-title';
        appleMobileWebAppTitle.content = 'BarManager';
        document.head.appendChild(appleMobileWebAppTitle);

        // Viewport Meta
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
            viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        }

        return () => {
            document.head.removeChild(manifestLink);
            document.head.removeChild(themeColorMeta);
            document.head.removeChild(appleMobileWebAppCapable);
            document.head.removeChild(appleMobileWebAppStatus);
            document.head.removeChild(appleMobileWebAppTitle);
        };
    }, []);

    return null;
}