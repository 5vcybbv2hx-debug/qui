import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PROMPT_KEY = 'push_prompt_seen';

export default function PushPermissionPrompt({ employeeId, isAuthenticated }) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        console.log('[PushPrompt] check', { isAuthenticated, employeeId, seen: localStorage.getItem(PROMPT_KEY), notifPerm: 'Notification' in window ? Notification.permission : 'N/A' });
        if (!isAuthenticated || !employeeId) return;
        // Nur zeigen wenn noch nicht gesehen
        if (localStorage.getItem(PROMPT_KEY)) return;
        // Browser muss Notifications unterstützen
        if (!('Notification' in window)) return;
        // Nur zeigen wenn noch nicht entschieden (default) ODER wenn bereits granted (dann trotzdem kein Prompt nötig)
        if (Notification.permission === 'denied') return;

        // Kurz warten damit die App erstmal geladen ist
        const t = setTimeout(() => setShow(true), 2000);
        return () => clearTimeout(t);
    }, [isAuthenticated, employeeId]);

    const handleEnable = async () => {
        setShow(false);
        localStorage.setItem(PROMPT_KEY, '1');

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function (OneSignal) {
            try {
                await OneSignal.Notifications.requestPermission();
            } catch (err) {
                console.error('[PushPrompt] requestPermission error:', err);
            }
        });
    };

    const handleDecline = () => {
        setShow(false);
        localStorage.setItem(PROMPT_KEY, '1');
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-5">
                <button
                    onClick={handleDecline}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">Push-Benachrichtigungen aktivieren?</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Erhalte Benachrichtigungen für Schichten, Schichttausch, Urlaubsanträge und Aufgaben — auch wenn die App geschlossen ist.
                        </p>
                        <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={handleEnable} className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs flex-1">
                                <Bell className="w-3 h-3 mr-1" />
                                Aktivieren
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleDecline} className="text-xs flex-1">
                                <BellOff className="w-3 h-3 mr-1" />
                                Nein danke
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}