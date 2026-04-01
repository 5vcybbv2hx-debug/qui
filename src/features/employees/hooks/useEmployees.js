/**
 * useEmployees.js
 * React Query hooks for the Employee feature.
 * Business logic (filtering, derived data) lives here, not in JSX.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../services/employeeService';
import { toast } from 'sonner';
import { STALE, GC } from '@/lib/queryUtils';

export const EMPLOYEE_KEYS = {
    all:      ['employees'],
    active:   ['employees', 'active'],
    byRole:   (role) => ['employees', 'role', role],
    detail:   (id)   => ['employees', id],
};

/** All active employees */
export function useEmployees() {
    return useQuery({
        queryKey: EMPLOYEE_KEYS.active,
        queryFn:  () => employeeService.list(true),
        staleTime: STALE.SLOW,
        gcTime:    GC.DEFAULT,
    });
}

/**
 * Employees filtered by role.
 * ✅ Uses select to derive from the already-cached active list — avoids a second API call.
 */
export function useEmployeesByRole(role) {
    return useQuery({
        queryKey: EMPLOYEE_KEYS.active,         // same key → reuses cached data
        queryFn:  () => employeeService.list(true),
        enabled:  !!role,
        select:   (employees) => employees.filter(e => e.role === role),
        staleTime: STALE.SLOW,
    });
}

/** Single employee by id — seeded from the list cache to avoid an extra round-trip */
export function useEmployee(id) {
    const qc = useQueryClient();
    return useQuery({
        queryKey: EMPLOYEE_KEYS.detail(id),
        queryFn:  () => employeeService.get(id),
        enabled:  !!id,
        staleTime: STALE.SLOW,
        // Seed initial data from the list cache — shows data immediately
        initialData: () => {
            const list = qc.getQueryData(EMPLOYEE_KEYS.active);
            return list?.find(e => e.id === id);
        },
        initialDataUpdatedAt: () =>
            qc.getQueryState(EMPLOYEE_KEYS.active)?.dataUpdatedAt,
    });
}

/** Create mutation */
export function useCreateEmployee() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => employeeService.create(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
            toast.success('Mitarbeiter angelegt');
        },
    });
}

/** Update mutation */
export function useUpdateEmployee() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => employeeService.update(id, data),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
            qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(id) });
            toast.success('Mitarbeiter aktualisiert');
        },
    });
}

/** Deactivate mutation */
export function useDeactivateEmployee() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => employeeService.deactivate(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
            toast.success('Mitarbeiter deaktiviert');
        },
    });
}

// ── Derived / computed helpers ────────────────────────────────────────────────
/** Returns an id→employee lookup map — useful for resolving IDs in tables */
export function useEmployeeMap() {
    const { data = [] } = useEmployees();
    return Object.fromEntries(data.map(e => [e.id, e]));
}