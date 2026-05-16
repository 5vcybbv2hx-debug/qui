/**
 * Nachtbetrieb & Betriebstag Utilities
 * 
 * Nachtgastronomie-spezifisch:
 * - Betriebstag = „Operation Date" unabhängig von Kalendertag
 * - Standard Cutoff: 06:00 (konfigurierbar)
 * - 00:00–05:59 → gehören zum vorherigen Betriebstag
 * - 06:00+ → neuer Betriebstag
 */

/**
 * Globale Konfiguration für Betriebstag-Cutoff
 * Kann pro App konfiguriert werden (z. B. in CompanySettings)
 */
export const NIGHT_CUTOFF_HOUR = 6; // 06:00 UTC
export const NIGHT_CUTOFF_MINUTES = 0;

/**
 * Berechne den Betriebstag für einen gegebenen Timestamp
 * 
 * @param {Date|string|number} timestamp - Moment in Zeit
 * @returns {Date} - Betriebstag als Date (00:00 in UTC)
 * 
 * Beispiele:
 * - 2024-01-15 02:00 → 2024-01-14 (noch vorheriger Betriebstag)
 * - 2024-01-15 06:30 → 2024-01-15 (neuer Betriebstag)
 */
export function getOperationDate(timestamp) {
  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();

  // Vor Cutoff-Zeit → gehört zum vorherigen Betriebstag
  if (hour < NIGHT_CUTOFF_HOUR || (hour === NIGHT_CUTOFF_HOUR && minute < NIGHT_CUTOFF_MINUTES)) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  // Setze auf Mitternacht (Start des Betriebstages)
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Berechne den aktuellen Betriebstag (heute)
 */
export function getTodayOperationDate() {
  return getOperationDate(new Date());
}

/**
 * Gib zwei Betriebstage als ISO-String zurück: [start, end]
 * start = 00:00 des Betriebstages
 * end = 06:00 des nächsten Kalendertages (= 24:00 des Betriebstages)
 * 
 * Wird verwendet für Queries, die einen ganzen Betriebstag abdecken sollen
 */
export function getOperationDateRange(operationDate) {
  const start = new Date(operationDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCHours(NIGHT_CUTOFF_HOUR, NIGHT_CUTOFF_MINUTES, 0, 0);

  return [start.toISOString(), end.toISOString()];
}

/**
 * Formatiere einen Betriebstag lesbar
 * z. B. „2024-01-15" oder „15. Jan 2024"
 */
export function formatOperationDate(date, format = 'ISO') {
  const d = new Date(date);
  
  if (format === 'ISO') {
    return d.toISOString().split('T')[0];
  }
  
  if (format === 'de') {
    return d.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return d.toISOString().split('T')[0];
}

/**
 * Validiere, ob eine ClockEntry im Nachtbetrieb korrekt ist
 * (z. B. Zeiten über Mitternacht)
 */
export function validateNightShift(clockIn, clockOut) {
  if (!clockIn || !clockOut) return true;

  const inDate = new Date(clockIn);
  const outDate = new Date(clockOut);

  // clockOut muss nach clockIn sein
  if (outDate <= inDate) {
    return false; // Fehler
  }

  // Wenn über Mitternacht, ist das OK (z. B. 22:00 bis 06:00)
  return true;
}

/**
 * Berechne Arbeitszeit über Mitternacht korrekt (in Minuten)
 */
export function calculateWorkDuration(clockIn, clockOut) {
  const inDate = new Date(clockIn);
  const outDate = new Date(clockOut);
  
  const durationMs = outDate.getTime() - inDate.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  
  return Math.max(0, durationMinutes);
}

/**
 * Konvertiere Minuten zu HH:MM Format
 */
export function minutesToHHMM(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Hilfsfunktion: Betriebstag für Queries
 * Wird in vielen Queries verwendet, um korrekt nach Betriebstag zu filtern
 */
export function buildOperationDateFilter(operationDate = null) {
  const date = operationDate || getTodayOperationDate();
  const [start, end] = getOperationDateRange(date);
  
  return {
    operationDate: formatOperationDate(date, 'ISO'),
    startISO: start,
    endISO: end,
  };
}

/**
 * Zusätzliche Legacy-Funktionen (für Kompatibilität)
 */
export function getShiftWarning(clockEntry) {
  if (!clockEntry || !clockEntry.clock_out) return null;
  const duration = calculateWorkDuration(clockEntry.clock_in, clockEntry.clock_out);
  const hours = duration / 60;
  
  if (hours > 12) return 'Warnung: ArbZG-Verstoß über 12h';
  if (hours > 10) return 'Warnung: Schicht über 10h';
  return null;
}

export function buildTimeEntryFromClock(clockEntry, employeeId) {
  if (!clockEntry.clock_in || !clockEntry.clock_out) return null;
  
  return {
    employee_id: employeeId,
    clock_in: clockEntry.clock_in,
    clock_out: clockEntry.clock_out,
    duration_minutes: calculateWorkDuration(clockEntry.clock_in, clockEntry.clock_out),
    status: 'recorded',
  };
}

export function isActiveEntry(clockEntry) {
  return clockEntry && clockEntry.clock_in && !clockEntry.clock_out;
}

export function calcWorkMinutes(clockIn, clockOut) {
  if (!clockIn) return 0;
  return calculateWorkDuration(clockIn, clockOut || new Date());
}

export function formatDuration(minutes) {
  return minutesToHHMM(minutes);
}

export function formatTime(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default {
  getOperationDate,
  getTodayOperationDate,
  getOperationDateRange,
  formatOperationDate,
  validateNightShift,
  calculateWorkDuration,
  minutesToHHMM,
  buildOperationDateFilter,
  getShiftWarning,
  buildTimeEntryFromClock,
  isActiveEntry,
  calcWorkMinutes,
  formatDuration,
  formatTime,
  NIGHT_CUTOFF_HOUR,
};