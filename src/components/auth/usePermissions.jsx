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

                setPermissions({
                    role: userRole,
                    employeeRole,
                    employeeName: employee?.name || user.full_name,
                    isLoading: false,
                    isAdmin: userRole === ROLES.ADMIN,
                    isManager: isManagerOrAdmin(userRole, employeeRole),
                    
                    canViewDashboard: hasPermission(userRole, employeeRole, 'VIEW_DASHBOARD'),
                    canViewShifts: hasPermission(userRole, employeeRole, 'VIEW_SHIFTS'),
                    canEditShifts: hasPermission(userRole, employeeRole, 'EDIT_SHIFTS'),
                    canApproveShiftSwaps: hasPermission(userRole, employeeRole, 'APPROVE_SHIFT_SWAPS'),
                    canRequestShiftSwap: hasPermission(userRole, employeeRole, 'REQUEST_SHIFT_SWAP'),
                    canViewReservations: hasPermission(userRole, employeeRole, 'VIEW_RESERVATIONS'),
                    canEditReservations: hasPermission(userRole, employeeRole, 'EDIT_RESERVATIONS'),
                    canViewEvents: hasPermission(userRole, employeeRole, 'VIEW_EVENTS'),
                    canEditEvents: hasPermission(userRole, employeeRole, 'EDIT_EVENTS'),
                    canViewShopping: hasPermission(userRole, employeeRole, 'VIEW_SHOPPING'),
                    canEditShopping: hasPermission(userRole, employeeRole, 'EDIT_SHOPPING'),
                    canViewRestock: hasPermission(userRole, employeeRole, 'VIEW_RESTOCK'),
                    canEditRestock: hasPermission(userRole, employeeRole, 'EDIT_RESTOCK'),
                    canViewCleaning: hasPermission(userRole, employeeRole, 'VIEW_CLEANING'),
                    canEditCleaning: hasPermission(userRole, employeeRole, 'EDIT_CLEANING'),
                    canManageCleaningAreas: hasPermission(userRole, employeeRole, 'MANAGE_CLEANING_AREAS'),
                    canViewTodos: hasPermission(userRole, employeeRole, 'VIEW_TODOS'),
                    canEditTodos: hasPermission(userRole, employeeRole, 'EDIT_TODOS'),
                    canViewEmployees: hasPermission(userRole, employeeRole, 'VIEW_EMPLOYEES'),
                    canEditEmployees: hasPermission(userRole, employeeRole, 'EDIT_EMPLOYEES'),
                    canViewEmployeeDetails: hasPermission(userRole, employeeRole, 'VIEW_EMPLOYEE_DETAILS'),
                    canViewRecipes: hasPermission(userRole, employeeRole, 'VIEW_RECIPES'),
                    canEditRecipes: hasPermission(userRole, employeeRole, 'EDIT_RECIPES'),
                    canViewAnalytics: hasPermission(userRole, employeeRole, 'VIEW_ANALYTICS'),
                    canViewPriceCalculator: hasPermission(userRole, employeeRole, 'VIEW_PRICE_CALCULATOR'),
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