import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Returns the Employee entity record for the currently logged-in user.
 * Centralizes the pattern: auth.me() → Employee.filter({ email }) used across multiple pages.
 */
export function useCurrentEmployee() {
    return useQuery({
        queryKey: ['current-employee'],
        queryFn: async () => {
            const user = await base44.auth.me();
            const employees = await base44.entities.Employee.filter({
                email: user.email,
                is_active: true
            });
            return employees[0] || null;
        },
        staleTime: 5 * 60 * 1000 // 5 minutes
    });
}