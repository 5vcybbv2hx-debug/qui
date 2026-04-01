/**
 * errorHandler.js
 * Global error handling utilities.
 *
 * Rules:
 *  1. Never expose raw error.message to the user — map to friendly strings.
 *  2. Always log the original error to the console for debugging.
 *  3. Use toast for transient feedback, dialogs for decisions, StateDisplay for page-level errors.
 */
import { toast } from 'sonner';

// ── Known error → user-friendly message map ───────────────────────────────────
const ERROR_MAP = [
    { match: /network|fetch|failed to fetch/i,  msg: 'Netzwerkfehler – bitte Verbindung prüfen.' },
    { match: /unauthorized|401/i,               msg: 'Sitzung abgelaufen – bitte neu anmelden.' },
    { match: /forbidden|403/i,                  msg: 'Keine Berechtigung für diese Aktion.' },
    { match: /not found|404/i,                  msg: 'Der Eintrag wurde nicht gefunden.' },
    { match: /timeout/i,                        msg: 'Zeitüberschreitung – bitte erneut versuchen.' },
    { match: /duplicate|already exists/i,       msg: 'Dieser Eintrag existiert bereits.' },
];

/**
 * Map any error to a safe, user-friendly string.
 * Falls back to a generic message so internal details are never shown.
 */
export function friendlyMessage(error, fallback = 'Ein unerwarteter Fehler ist aufgetreten.') {
    const raw = error?.message ?? String(error ?? '');
    const found = ERROR_MAP.find(e => e.match.test(raw));
    return found ? found.msg : fallback;
}

/**
 * Show a toast for a caught error.
 * Always logs the original error; never shows raw messages to the user.
 *
 * @param {unknown}  error        - The caught error
 * @param {string}   [context]    - Short description of what failed (shown as toast title)
 * @param {string}   [fallback]   - Custom fallback message
 */
export function toastError(error, context, fallback) {
    console.error(`[${context ?? 'Error'}]`, error);
    toast.error(context ?? 'Fehler', {
        description: friendlyMessage(error, fallback),
        duration: 5000,
    });
}

/**
 * Show a success toast.
 */
export function toastSuccess(message, description) {
    toast.success(message, { description, duration: 3000 });
}

/**
 * Show an info toast.
 */
export function toastInfo(message, description) {
    toast.info(message, { description, duration: 4000 });
}

/**
 * Wraps an async action with automatic error toasting.
 * Returns [result, error] — never throws.
 *
 * Usage:
 *   const [data, err] = await safeAsync(() => myService.load(id), 'Laden fehlgeschlagen');
 *   if (err) return;
 */
export async function safeAsync(fn, context, fallback) {
    try {
        const result = await fn();
        return [result, null];
    } catch (error) {
        toastError(error, context, fallback);
        return [null, error];
    }
}