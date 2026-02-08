import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { hasPermission, isManagerOrAdmin, ROLES } from './roleConfig';

export function usePermissions() {
    const [permissions, setPermissions] = useState({
        role: null,
        employeeRole: null,
        employeeName: null,
        isLoading: true,
        isAdmin: false,
        isManager: false,
        
        // Berechtigungen
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
    });

    useEffect(() => {
        const loadPermissions = async () => {
            try {
                const user = await base44.auth.me();
                const employees = await base44.entities.Employee.filter({ 
                    email: user.email,
                    is_active: true 
                });
                
                const employee = employees[0];
                const employeeRole = employee?.role || null;
                const userRole = user.role;
                const isTerminal = user.is_terminal === true;
                const isManager = isManagerOrAdmin(userRole, employeeRole);

                // Verwende individuelle Berechtigungen des Mitarbeiters, falls vorhanden
                const perms = employee?.permissions || {};

                setPermissions({
                    role: userRole,
                    employeeRole,
                    employeeName: employee?.name || user.full_name,
                    isLoading: false,
                    isAdmin: userRole === ROLES.ADMIN,
                    isManager,
                    isTerminal,
                    
                    // Terminal-Modus überschreibt alles
                    canViewDashboard: isTerminal ? false : (perms.canViewDashboard ?? true),
                    canViewShifts: isTerminal ? true : (perms.canViewShifts ?? true),
                    canEditShifts: isTerminal ? false : (perms.canEditShifts ?? isManager),
                    canApproveShiftSwaps: isTerminal ? false : (perms.canApproveShiftSwaps ?? isManager),
                    canRequestShiftSwap: isTerminal ? false : (perms.canRequestShiftSwap ?? true),
                    canViewReservations: isTerminal ? true : (perms.canViewReservations ?? true),
                    canEditReservations: isTerminal ? false : (perms.canEditReservations ?? true),
                    canDeleteReservations: isTerminal ? false : (perms.canDeleteReservations ?? isManager),
                    canViewEvents: isTerminal ? true : (perms.canViewEvents ?? true),
                    canEditEvents: isTerminal ? false : (perms.canEditEvents ?? isManager),
                    canViewShopping: isTerminal ? true : (perms.canViewShopping ?? true),
                    canEditShopping: isTerminal ? false : (perms.canEditShopping ?? true),
                    canViewRestock: isTerminal ? true : (perms.canViewRestock ?? true),
                    canEditRestock: isTerminal ? false : (perms.canEditRestock ?? true),
                    canViewCleaning: isTerminal ? true : (perms.canViewCleaning ?? true),
                    canEditCleaning: isTerminal ? false : (perms.canEditCleaning ?? true),
                    canManageCleaningAreas: isTerminal ? false : (perms.canManageCleaningAreas ?? isManager),
                    canViewTodos: isTerminal ? false : (perms.canViewTodos ?? true),
                    canEditTodos: isTerminal ? false : (perms.canEditTodos ?? true),
                    canViewEmployees: isTerminal ? false : (perms.canViewEmployees ?? true),
                    canEditEmployees: isTerminal ? false : (perms.canEditEmployees ?? isManager),
                    canViewEmployeeDetails: isTerminal ? false : (perms.canViewEmployeeDetails ?? isManager),
                    canViewRecipes: isTerminal ? true : (perms.canViewRecipes ?? true),
                    canEditRecipes: isTerminal ? false : (perms.canEditRecipes ?? (employeeRole === 'Barkeeper' || isManager)),
                    canViewAnalytics: isTerminal ? false : (perms.canViewAnalytics ?? isManager),
                    canViewPriceCalculator: isTerminal ? false : (perms.canViewPriceCalculator ?? (userRole === ROLES.ADMIN)),
                    canClockOutOthers: isTerminal ? false : (perms.canClockOutOthers ?? isManager),
                    canViewOnboarding: isTerminal ? false : (perms.canViewOnboarding ?? isManager),
                    canViewInventory: isTerminal ? false : (perms.canViewInventory ?? isManager),
                });
            } catch (error) {
                console.error('Error loading permissions:', error);
                setPermissions(prev => ({ ...prev, isLoading: false }));
            }
        };

        loadPermissions();
    }, []);

    return permissions;
}