import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';

export default function PushNotificationManager({ userEmail }) {
    const [subscription, setSubscription] = useState(null);
    const [permission, setPermission] = useState('default');
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Prüfen ob Browser Push unterstützt
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
            checkSubscription();
        }
    }, []);

    const checkSubscription = async () => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                const sub = await registration.pushManager.getSubscription();
                setSubscription(sub);
            } catch (error) {
                console.error('Error checking subscription:', error);
            }
        }
    };

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribeToPush = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast.error('Push-Benachrichtigungen werden von diesem Browser nicht unterstützt');
            return;
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result !== 'granted') {
                toast.error('Benachrichtigungen wurden blockiert');
                return;
            }

            const registration = await navigator.serviceWorker.ready;

            // VAPID-Key vom Server abrufen
            const response = await fetch('/api/vapid-public-key');
            const { publicKey: vapidPublicKey } = await response.json();
            
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            setSubscription(sub);

            // Subscription im Backend speichern
            await base44.auth.updateMe({
                push_subscription: JSON.stringify(sub)
            });

            toast.success('Push-Benachrichtigungen aktiviert');
        } catch (error) {
            console.error('Error subscribing to push:', error);
            toast.error('Fehler beim Aktivieren der Benachrichtigungen');
        }
    };

    const unsubscribeFromPush = async () => {
        try {
            if (subscription) {
                await subscription.unsubscribe();
                setSubscription(null);
                
                // Subscription im Backend löschen
                await base44.auth.updateMe({
                    push_subscription: null
                });
                
                toast.success('Push-Benachrichtigungen deaktiviert');
            }
        } catch (error) {
            console.error('Error unsubscribing:', error);
            toast.error('Fehler beim Deaktivieren');
        }
    };

    if (!isSupported) {
        return null;
    }

    if (permission === 'denied') {
        return (
            <div className="text-xs text-red-400">
                Push-Benachrichtigungen blockiert. Bitte in den Browser-Einstellungen aktivieren.
            </div>
        );
    }

    return (
        <div>
            {subscription ? (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={unsubscribeFromPush}
                    className="border-slate-600 text-slate-300"
                >
                    <BellOff className="w-4 h-4 mr-2" />
                    Push deaktivieren
                </Button>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={subscribeToPush}
                    className="border-amber-600 text-amber-400"
                >
                    <Bell className="w-4 h-4 mr-2" />
                    Push aktivieren
                </Button>
            )}
        </div>
    );
}