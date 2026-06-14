import { createPageUrl } from '@/utils';

/**
 * Öffentlicher Gäste-Link zur Getränkekarte.
 * Zeigt auf die React-Seite /PublicDrinkMenu — kein Login nötig.
 */
export function getGuestMenuLink() {
    return `${window.location.origin}/PublicDrinkMenu`;
}

/**
 * Öffentlicher Gäste-Link zur Online-Reservierung.
 */
export function getGuestReservationLink() {
    return `${window.location.origin}${createPageUrl('PublicReservation')}`;
}

/**
 * Link in Zwischenablage kopieren (mit Fallback für ältere Browser).
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }
}

/**
 * Native Share-API, Fallback auf Clipboard.
 */
export async function shareLink(url, title = 'Getränkekarte') {
    if (navigator.share) {
        await navigator.share({ title, url });
    } else {
        await copyToClipboard(url);
    }
}
