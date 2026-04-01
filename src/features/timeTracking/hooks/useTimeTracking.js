/**
 * useTimeTracking.js
 * React Query hooks for TimeEntries, ClockEntries and Vacation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
    timeTrackingService,
    calcTotalHours,
    summariseMonth,
    arbzgWarning,
} from '../services/timeTrackingService';
import { toast } from 'sonner';

export const TIME_KEYS = {
    allEntries:       ['timeEntries'],
    byEmployee:       (id)    => ['timeEntries', 'emp', id],
    byMonth:          (y, m)  => ['timeEntries', 'month', y, m],
    allVacations:            ['vacationRequests'],
    vacationByEmployee: (id) => ['vacationRequests', 'emp', id],
    clockActive:        (id) => ['clockEntries', 'active', id],
};

export function useTimeEntries() {
    return useQuery({
        queryKey: TIME_KEYS.allEntries,
        queryFn:  timeTrackingService.listEntries,
    });
}

export function useTimeEntriesForEmployee(employeeId) {
    return useQuery({
        queryKey: TIME_KEYS.byEmployee(employeeId),
        queryFn:  () => timeTrackingService.entriesForEmployee(employeeId),
        enabled:  !!employeeId,
    });
}

export function useTimeEntriesForMonth(year, month) {
    return useQuery({
        queryKey: TIME_KEYS.byMonth(year, month),
        queryFn:  () => timeTrackingService.entriesForMonth(year, month),
        enabled:  !!year && !!month,
    });
}

/** Returns per-employee summaries for a month — memoised */
export function useMonthSummaries(year, month, employees = []) {
    const { data: entries = [] } = useTimeEntriesForMonth(year, month);
    return useMemo(
        () => employees.map(emp => ({
            ...emp,
            ...summariseMonth(entries, emp.id),
        })),
        [entries, employees]
    );
}

export function useCreateTimeEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => {
            const hours   = calcTotalHours(data.start_time, data.end_time, data.break_minutes);
            const warning = arbzgWarning(hours);
            return timeTrackingService.createEntry({ ...data, total_hours: hours, arbzg_warning: warning });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: TIME_KEYS.allEntries });
            toast.success('Zeiteintrag gespeichert');
        },
    });
}

export function useUpdateTimeEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => {
            const hours   = calcTotalHours(data.start_time, data.end_time, data.break_minutes);
            const warning = arbzgWarning(hours);
            return timeTrackingService.updateEntry(id, { ...data, total_hours: hours, arbzg_warning: warning });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: TIME_KEYS.allEntries });
            toast.success('Zeiteintrag aktualisiert');
        },
    });
}

export function useApproveTimeEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, approvedBy }) => timeTrackingService.approveEntry(id, approvedBy),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: TIME_KEYS.allEntries });
            toast.success('Eintrag genehmigt');
        },
    });
}

// ── Clock ─────────────────────────────────────────────────────────────────────
export function useActiveClockEntry(employeeId) {
    return useQuery({
        queryKey: TIME_KEYS.clockActive(employeeId),
        queryFn:  () => timeTrackingService.activeClockEntry(employeeId),
        enabled:  !!employeeId,
        refetchInterval: 60_000,
    });
}

export function useClockIn() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ employeeId, employeeName }) =>
            timeTrackingService.clockIn(employeeId, employeeName),
        onSuccess: (_, { employeeId }) => {
            qc.invalidateQueries({ queryKey: TIME_KEYS.clockActive(employeeId) });
            toast.success('Eingestempelt');
        },
    });
}

export function useClockOut() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ entryId, employeeId }) =>
            timeTrackingService.clockOut(entryId).then(() =>
                timeTrackingService.clockOut(entryId) // returns updated entry
            ),
        onSuccess: (_, { employeeId }) => {
            qc.invalidateQueries({ queryKey: TIME_KEYS.clockActive(employeeId) });
            toast.success('Ausgestempelt');
        },
    });
}

// ── Vacation ──────────────────────────────────────────────────────────────────
export function useVacationRequests() {
    return useQuery({
        queryKey: TIME_KEYS.allVacations,
        queryFn:  timeTrackingService.allVacationRequests,
    });
}

export function useVacationRequestsForEmployee(employeeId) {
    return useQuery({
        queryKey: TIME_KEYS.vacationByEmployee(employeeId),
        queryFn:  () => timeTrackingService.vacationRequestsForEmployee(employeeId),
        enabled:  !!employeeId,
    });
}