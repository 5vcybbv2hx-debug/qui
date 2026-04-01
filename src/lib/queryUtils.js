/**
 * queryUtils.js
 * Shared utilities for React Query — standardised stale times,
 * date helpers for query keys, and a typed invalidation helper.
 *
 * Import these constants instead of hardcoding milliseconds everywhere.
 */

// ── Standard stale times ──────────────────────────────────────────────────────
export const STALE = {
    /** Near-static data: employees, articles, recipes — 10 min */
    SLOW:   10 * 60_000,
    /** Operational data: reservations, shifts — 2 min */
    MEDIUM:  2 * 60_000,
    /** Real-time data: clock entries, notifications — 30 s */
    FAST:   30_000,
    /** Never auto-stale (only invalidated by mutations) */
    FOREVER: Infinity,
};

// ── Standard GC (garbage collection) times ───────────────────────────────────
export const GC = {
    /** Keep in memory for 15 min after last subscriber */
    DEFAULT: 15 * 60_000,
    /** Short-lived detail views */
    SHORT:    5 * 60_000,
};

// ── Date helpers for scoped query keys ───────────────────────────────────────
/**
 * Formats a year+month into the ISO prefix used in date fields.
 * e.g. yearMonth(2026, 4) → '2026-04'
 */
export function yearMonth(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Returns the first and last day of a month as ISO date strings.
 * e.g. monthRange(2026, 4) → { from: '2026-04-01', to: '2026-04-30' }
 */
export function monthRange(year, month) {
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0);          // day 0 of next month = last day
    const fmt  = d => d.toISOString().split('T')[0];
    return { from: fmt(from), to: fmt(to) };
}

/**
 * Returns the ISO date string for today.
 */
export function today() {
    return new Date().toISOString().split('T')[0];
}