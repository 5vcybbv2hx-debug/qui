/**
 * Alte PublicWeeklySpecialDisplay-Seite
 * Wird jetzt auf die vereinigte PublicDrinkMenu mit integriertem Wochenspecial-Banner weitergeleitet.
 * 
 * Diese Datei bleibt aus Kompatibilität erhalten, leitet aber direkt weiter.
 */
import { useEffect } from 'react';

export default function PublicWeeklySpecialDisplay() {
    useEffect(() => {
        // Weiterleitung zur einheitlichen Getränkekarte
        window.location.replace(window.location.origin + '/PublicDrinkMenu#wochenspecial');
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium">Wird weitergeleitet...</p>
                <p className="text-sm mt-2">Zur Getränkekarte mit Wochenspecial</p>
            </div>
        </div>
    );
}