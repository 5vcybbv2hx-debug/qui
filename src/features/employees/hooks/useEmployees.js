/**
 * useEmployees.js
 * React Query hooks for the Employee feature.
 * Business logic (filtering, derived data) lives here, not in JSX.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../services/employeeService';
import { toast } from 'sonner';

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
        staleTime: 5 * 60_000,
    });
}

/** Employees filtered by role */
export function useEmployeesByRole(role) {
    return useQuery({
        queryKey: EMPLOYEE_KEYS.byRole(role),
        queryFn:  () => employeeService.byRole(role),
        enabled:  !!role,
    });
}

/** Single employee by id */
export function useEmployee(id) {
    return useQuery({
        queryKey: EMPLOYEE_KEYS.detail(id),
        queryFn:  () => employeeService.get(id),
        enabled:  !!id,
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
/** Returns a name→id lookup map — useful for dropdowns */
export function useEmployeeMap() {
    const { data = [] } = useEmployees();
    return Object.fromEntries(data.map(e => [e.id, e]));
}