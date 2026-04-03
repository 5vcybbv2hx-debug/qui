import { createPageUrl } from '@/utils';

/**
 * Zentrale Funktion für den öffentlichen Gäste-Link zur Getränkekarte.
 * Wird auf der QR-Code-Seite, der Getränkekarte-Seite und überall sonst verwendet.
 */
export function getGuestMenuLink() {
    return `${window.location.origin}${createPageUrl('PublicDrinkMenu')}`;
}

/**
 * Öffentlicher Gäste-Link zur Online-Reservierung.
 */
export function getGuestReservationLink() {
    return `${window.location.origin}${createPageUrl('PublicReservation')}`;
}

/**
 * Hilfsfunktion: Link in Zwischenablage kopieren.
 * Gibt true zurück bei Erfolg.
 */
export async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text);
}

/**
 * Hilfsfunktion: Native Share-API (falls verfügbar), sonst Fallback auf Clipboard.
 */
export async function shareLink(url, title = 'Getränkekarte') {
    if (navigator.share) {
        await navigator.share({ title, url });
    } else {
        await copyToClipboard(url);
    }
}