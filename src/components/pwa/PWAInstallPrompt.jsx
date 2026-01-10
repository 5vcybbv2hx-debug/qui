import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Download, Smartphone } from 'lucide-react';

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            // Zeige Prompt nur wenn nicht bereits installiert und nicht dismissed
            const isDismissed = localStorage.getItem('pwa-prompt-dismissed');
            if (!isDismissed) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowPrompt(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <Card className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 p-4 bg-slate-800 border-amber-600 shadow-2xl animate-in slide-in-from-bottom">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-slate-400 hover:text-white"
            >
                <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                    <h3 className="font-semibold text-white text-sm">App installieren</h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Füge BarManager zu deinem Startbildschirm hinzu für schnellen Zugriff
                    </p>
                </div>
            </div>

            <div className="flex gap-2">
                <Button
                    onClick={handleDismiss}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"
                >
                    Später
                </Button>
                <Button
                    onClick={handleInstall}
                    size="sm"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-xs"
                >
                    <Download className="w-3 h-3 mr-1" />
                    Installieren
                </Button>
            </div>
        </Card>
    );
}