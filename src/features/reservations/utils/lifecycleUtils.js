/**
 * lifecycleUtils.js
 * Pure, timezone-aware lifecycle logic for reservations.
 *
 * Design principles:
 *  - All functions are pure (no side effects, no API calls)
 *  - All operations are IDEMPOTENT — safe to call multiple times
 *  - Timezone: we always compare against "now in Europe/Berlin"
 *  - Recurring reservations: ONE live record per series, advanced forward
 */

import { addWeeks, addMonths, parseISO, isBefore, isAfter, format } from 'date-fns';

// ── Time helpers ──────────────────────────────────────────────────────────────

/**
 * Returns current Date. Using a function makes it easy to mock in tests.
 */
export function nowBerlin() {
    return new Date();
}

/**
 * Combines a date string ('yyyy-MM-dd') and time string ('HH:mm')
 * into a Date, interpreted as local time.
 */
export function reservationDateTime(dateStr, timeStr = '23:59') {
    // Parse as local time by splitting manually (avoids UTC ambiguity in new Date(iso))
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi]    = timeStr.split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi, 0);
}

/**
 * Returns true if a reservation's date+time has passed (in Berlin time).
 * A reservation is "past" once its time slot is over.
 */
export function isPast(reservation) {
    const dt = reservationDateTime(reservation.date, reservation.time);
    return isBefore(dt, nowBerlin());
}

// ── Recurrence helpers ────────────────────────────────────────────────────────

/**
 * Given a base date and a pattern, advances the date by one interval.
 */
export function addOneInterval(date, pattern) {
    if (pattern === 'weekly')   return addWeeks(date, 1);
    if (pattern === 'biweekly') return addWeeks(date, 2);
    if (pattern === 'monthly')  return addMonths(date, 1);
    return addWeeks(date, 1); // fallback
}

/**
 * Calculates the NEXT future occurrence from a given base date.
 *
 * If multiple intervals have been skipped (e.g. app was offline for weeks),
 * we skip forward until we find a future date — never create intermediary dates.
 *
 * Returns null if the next occurrence would exceed recurring_end_date.
 */
export function nextFutureDate(baseDate, pattern, endDateStr = null) {
    const now = nowBerlin();
    let candidate = parseISO(baseDate);

    // Safety cap: avoid infinite loop if pattern is broken
    let guard = 0;
    while (isBefore(candidate, now) && guard < 500) {
        candidate = addOneInterval(candidate, pattern);
        guard++;
    }

    // Check against series end date
    if (endDateStr) {
        const endDate = parseISO(endDateStr);
        if (isAfter(candidate, endDate)) return null;
    }

    return format(candidate, 'yyyy-MM-dd');
}

// ── Lifecycle decision engine ─────────────────────────────────────────────────

/**
 * Determines what action to take for a single past, non-archived reservation.
 *
 * Returns one of:
 *   { action: 'archive' }              — simple one-off, just archive
 *   { action: 'advance', nextDate }    — recurring, advance to next future date
 *   { action: 'archive_series' }       — recurring but end date exceeded
 *   { action: 'skip' }                 — already handled by another live record
 *
 * @param {object}   reservation      - the past reservation record
 * @param {object[]} allReservations  - full list (for duplicate detection)
 */
export function decideLLifecycleAction(reservation, allReservations) {
    // Non-recurring: simple archive
    if (!reservation.is_recurring || !reservation.recurring_pattern) {
        return { action: 'archive' };
    }

    const seriesId = reservation.recurring_series_id;

    // Idempotency guard: check if a LIVE (non-archived) future record already
    // exists for this series. If yes, just archive this one — nothing to create.
    if (seriesId) {
        const liveNextExists = allReservations.some(r =>
            r.id !== reservation.id &&
            r.recurring_series_id === seriesId &&
            !r.is_archived &&
            r.status !== 'storniert' &&
            !isPast(r)
        );
        if (liveNextExists) return { action: 'archive' };
    }

    // Calculate next future date
    const nextDate = nextFutureDate(
        reservation.date,
        reservation.recurring_pattern,
        reservation.recurring_end_date
    );

    if (!nextDate) {
        // Series has ended
        return { action: 'archive_series' };
    }

    return { action: 'advance', nextDate };
}

/**
 * Filters all reservations down to those that need lifecycle processing:
 * past, not archived, not storniert.
 */
export function findReservationsNeedingProcessing(allReservations) {
    return allReservations.filter(r =>
        !r.is_archived &&
        r.status !== 'storniert' &&
        isPast(r)
    );
}