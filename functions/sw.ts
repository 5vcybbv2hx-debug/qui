// Service Worker für Push-Benachrichtigungen
const CACHE_NAME = 'barmanager-v1';

self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(clients.claim());
});

// Push-Benachrichtigungen empfangen
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);
    
    let data = {
        title: 'Neue Benachrichtigung',
        body: 'Sie haben eine neue Nachricht',
        icon: '/icon-192.png',
        badge: '/icon-192.png'
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
            {
                action: 'open',
                title: 'Öffnen'
            },
            {
                action: 'close',
                title: 'Schließen'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Benachrichtigung geklickt
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    const urlToOpen = event.notification.data?.url || '/Notifications';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Prüfen ob bereits ein Fenster offen ist
                for (let client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.postMessage({
                            type: 'NOTIFICATION_CLICKED',
                            url: urlToOpen
                        });
                        return client.focus();
                    }
                }
                // Neues Fenster öffnen
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});