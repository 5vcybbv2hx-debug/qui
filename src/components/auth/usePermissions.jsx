import { useState, useEffect } from 'react';
import { loadPermissions, clearPermissionsCache, invalidatePermissionsCache } from './permissionsCache';
import { PERMISSION_MATRIX } from './roleConfig';

export { clearPermissionsCache, invalidatePermissionsCache };

// Build default (all-false) state from the matrix so it stays in sync automatically
const defaultPermissions = Object.fromEntries(
    Object.keys(PERMISSION_MATRIX).map(k => [k, false])
);
Object.assign(defaultPermissions, {
    role: null, employeeRole: null, employeeName: null, employeeId: null,
    isLoading: true, isAdmin: false, isManager: false, isTerminal: false,
});

export function usePermissions() {
    const [permissions, setPermissions] = useState(defaultPermissions);

    useEffect(() => {
        loadPermissions()
            .then(setPermissions)
            .catch(error => {
                console.error('Error loading permissions:', error);
                setPermissions(prev => ({ ...prev, isLoading: false }));
            });
    }, []);

    return permissions;
}