/**
 * timeTrackingService.js
 * All TimeEntry and ClockEntry data access + pure business logic.
 */
import { entities } from '@/lib/serviceBase';

const TE  = entities.TimeEntry;
const CE  = entities.ClockEntry;
const VR  = entities.VacationRequest;

export const timeTrackingService = {
    // ── TimeEntry ──────────────────────────────────────────────────────────
    listEntries: () => TE.list('-date'),

    entriesForEmployee: (employeeId) =>
        TE.filter({ employee_id: employeeId }, '-date'),

    entriesForMonth: async (year, month) => {
        const all = await TE.list('-date');
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        return all.filter(e => e.date?.startsWith(prefix));
    },

    createEntry:  (data) => TE.create(data),
    updateEntry:  (id, data) => TE.update(id, data),
    deleteEntry:  (id)  => TE.delete(id),

    approveEntry: (id, approvedBy) =>
        TE.update(id, {
            status:              'genehmigt',
            manager_approved_by: approvedBy,
            manager_approved_at: new Date().toISOString(),
        }),

    confirmByEmployee: (id) =>
        TE.update(id, {
            employee_confirmed:    true,
            employee_confirmed_at: new Date().toISOString(),
        }),

    // ── ClockEntry (Stempeluhr) ────────────────────────────────────────────
    clockIn: (employeeId, employeeName) =>
        CE.create({
            employee_id:   employeeId,
            employee_name: employeeName,
            clock_in:      new Date().toISOString(),
            date:          new Date().toISOString().split('T')[0],
        }),

    clockOut: (id) =>
        CE.update(id, { clock_out: new Date().toISOString() }),

    activeClockEntry: async (employeeId) => {
        const entries = await CE.filter({ employee_id: employeeId });
        return entries.find(e => !e.clock_out) ?? null;
    },

    // ── Vacation ──────────────────────────────────────────────────────────
    vacationRequestsForEmployee: (employeeId) =>
        VR.filter({ employee_id: employeeId }, '-start_date'),

    allVacationRequests: () => VR.list('-start_date'),
    createVacationRequest: (data) => VR.create(data),
    updateVacationRequest: (id, data) => VR.update(id, data),
};

// ── Pure business logic ───────────────────────────────────────────────────────

/** Calculate total hours for a time entry, respecting break */
export function calcTotalHours(startTime, endTime, breakMinutes = 0) {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let minutes = (eh * 60 + em) - (sh * 60 + sm) - breakMinutes;
    if (minutes < 0) minutes += 24 * 60; // overnight shift
    return Math.round((minutes / 60) * 100) / 100;
}

/** Summarise entries for a given employee within a month */
export function summariseMonth(entries, employeeId) {
    const emp = entries.filter(e => e.employee_id === employeeId);
    const total    = emp.reduce((s, e) => s + (e.total_hours ?? 0), 0);
    const approved = emp.filter(e => e.status === 'genehmigt')
                       .reduce((s, e) => s + (e.total_hours ?? 0), 0);
    const pending  = emp.filter(e => e.status === 'eingereicht').length;
    return { total, approved, pending, entryCount: emp.length };
}

/** ArbZG check: warn if daily hours exceed legal limit */
export function arbzgWarning(totalHours) {
    if (totalHours > 10) return 'Überschreitet 10h Tagesgrenze (ArbZG §3)';
    if (totalHours > 8)  return 'Über 8h: Pausenregelung prüfen (ArbZG §4)';
    return null;
}