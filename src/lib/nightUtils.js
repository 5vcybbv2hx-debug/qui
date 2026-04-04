/**
 * Night Gastronomy Utilities
 * Centralized logic for operation_date and night-shift handling.
 * 
 * NIGHT_CUTOFF: Times before this hour (06:00) belong to the PREVIOUS business day.
 * Example:
 *   04.04.2026 02:30 → operation_date = 2026-04-03
 *   04.04.2026 07:00 → operation_date = 2026-04-04
 */

export const NIGHT_CUTOFF_HOUR = 6; // 06:00 Uhr

/**
 * Get the operation_date (business day) for a given Date or ISO string.
 * Times before NIGHT_CUTOFF_HOUR belong to the previous calendar day.
 * @param {Date|string} date
 * @returns {string} YYYY-MM-DD
 */
export function getOperationDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return null;

  // If before cutoff, shift back one day
  if (d.getHours() < NIGHT_CUTOFF_HOUR) {
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    return formatDate(prev);
  }
  return formatDate(d);
}

/**
 * Get the current operation_date (business day) right now.
 * @returns {string} YYYY-MM-DD
 */
export function getTodayOperationDate() {
  return getOperationDate(new Date());
}

/**
 * Format a Date to YYYY-MM-DD in local time.
 * @param {Date} d
 * @returns {string}
 */
export function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format a Date to HH:MM in local time.
 * @param {Date|string} date
 * @returns {string}
 */
export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Calculate total working minutes between clock_in and clock_out.
 * Safe across midnight.
 * @param {string|Date} clockIn
 * @param {string|Date} clockOut
 * @returns {number} minutes
 */
export function calcWorkMinutes(clockIn, clockOut) {
  const inTime = new Date(clockIn);
  const outTime = clockOut ? new Date(clockOut) : new Date();
  if (isNaN(inTime) || isNaN(outTime)) return 0;
  return Math.max(0, Math.round((outTime - inTime) / 60000));
}

/**
 * Format minutes as "Xh Ym".
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Check if a ClockEntry is currently active (no clock_out, status is working/break).
 * Does NOT filter by calendar date — works correctly for night shifts.
 * @param {object} entry
 * @returns {boolean}
 */
export function isActiveEntry(entry) {
  return (entry.status === 'clocked_in' || entry.status === 'on_break') && !entry.clock_out;
}

/**
 * Get warning level for a shift based on duration.
 * @param {number} minutes
 * @returns {null|'info'|'warning'|'danger'}
 */
export function getShiftWarning(minutes) {
  if (minutes >= 600) return 'danger';  // 10h+
  if (minutes >= 480) return 'warning'; // 8h+
  if (minutes >= 360) return 'info';    // 6h+
  return null;
}

/**
 * Build a TimeEntry data object from a completed ClockEntry.
 * Uses operation_date as the fachlicher Betriebstag.
 * @param {object} clockEntry
 * @param {string|null} clockOutISO — ISO string, or null to use now
 * @returns {object}
 */
export function buildTimeEntryFromClock(clockEntry, clockOutISO = null) {
  const clockIn = new Date(clockEntry.clock_in);
  const clockOut = clockOutISO ? new Date(clockOutISO) : new Date();
  const totalMinutes = calcWorkMinutes(clockIn, clockOut);
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
  const opDate = getOperationDate(clockIn);

  return {
    employee_id: clockEntry.employee_id,
    employee_name: clockEntry.employee_name,
    date: opDate,                        // Betriebstag
    start_time: formatTime(clockIn),
    end_time: formatTime(clockOut),
    break_minutes: clockEntry.break_minutes || 0,
    total_hours: totalHours,
    notes: 'Automatisch von Stempeluhr übertragen',
    status: 'eingereicht',
    operation_date: opDate,
  };
}