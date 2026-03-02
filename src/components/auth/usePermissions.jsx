import { useState, useEffect } from 'react';
import { loadPermissions } from './permissionsCache';

const defaultPermissions = {
    role: null,
    employeeRole: null,
    employeeName: null,
    isLoading: true,
    isAdmin: false,
    isManager: false,
    canViewDashboard: false,
    canViewShifts: false,
    canEditShifts: false,
    canApproveShiftSwaps: false,
    canRequestShiftSwap: false,
    canViewReservations: false,
    canEditReservations: false,
    canViewEvents: false,
    canEditEvents: false,
    canViewShopping: false,
    canEditShopping: false,
    canViewRestock: false,
    canEditRestock: false,
    canViewCleaning: false,
    canEditCleaning: false,
    canManageCleaningAreas: false,
    canViewTodos: false,
    canEditTodos: false,
    canViewEmployees: false,
    canEditEmployees: false,
    canViewEmployeeDetails: false,
    canViewRecipes: false,
    canEditRecipes: false,
    canViewAnalytics: false,
    canClockOutOthers: false,
    canViewOnboarding: false,
    canViewInventory: false,
    canViewWastage: false,
};

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