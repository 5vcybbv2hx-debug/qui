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
                const isTerminal = userRole === 'terminal';

                setPermissions({
                    role: userRole,
                    employeeRole,
                    employeeName: employee?.name || user.full_name,
                    isLoading: false,
                    isAdmin: userRole === ROLES.ADMIN,
                    isManager: isManagerOrAdmin(userRole, employeeRole),
                    isTerminal,
                    
                    canViewDashboard: isTerminal ? false : hasPermission(userRole, employeeRole, 'VIEW_DASHBOARD'),
                    canViewShifts: isTerminal ? true : hasPermission(userRole, employeeRole, 'VIEW_SHIFTS'),
                    canEditShifts: isTerminal ? false : hasPermission(userRole, employeeRole, 'EDIT_SHIFTS'),
                    canApproveShiftSwaps: isTerminal ? false : hasPermission(userRole, employeeRole, 'APPROVE_SHIFT_SWAPS'),
                    canRequestShiftSwap: isTerminal ? false : hasPermission(userRole, employeeRole, 'REQUEST_SHIFT_SWAP'),
                    canViewReservations: isTerminal ? true : hasPermission(userRole, employeeRole, 'VIEW_RESERVATIONS'),
                    canEditReservations: isTerminal ? false : hasPermission(userRole, employeeRole, 'EDIT_RESERVATIONS'),
                    canDeleteReservations: isTerminal ? false : hasPermission(userRole, employeeRole, 'DELETE_RESERVATIONS'),
                    canViewEvents: isTerminal ? true : hasPermission(userRole, employeeRole, 'VIEW_EVENTS'),
                    canEditEvents: isTerminal ? false : hasPermission(userRole, employeeRole, 'EDIT_EVENTS'),
                    canViewShopping: isTerminal ? true : hasPermission(userRole, employeeRole, 'VIEW_SHOPPING'),
                    canEditShopping: isTerminal ? false : hasPermission(userRole, employeeRole, 'EDIT_SHOPPING'),
                    canViewRestock: isTerminal ? true : hasPermission(userRole, employeeRole, 'VIEW_RESTOCK'),
                    canEditRestock: isTerminal ? false : hasPermission(userRole, employeeRole, 'EDIT_RESTOCK'),
                    canViewCleaning: isTerminal ? true : hasPermission(userRole, employeeRole, 'VIEW_CLEANING'),
                    canEditCleaning: isTerminal ? false : hasPermission(userRole, employeeRole, 'EDIT_CLEANING'),
                    canManageCleaningAreas: isTerminal ? false : hasPermission(userRole, employeeRole, 'MANAGE_CLEANING_AREAS'),
                    canViewTodos: isTerminal ? false : hasPermission(userRole, employeeRole, 'VIEW_TODOS'),
                    canEditTodos: isTerminal ? false : hasPermission(userRole, employeeRole, 'EDIT_TODOS'),
                    canViewEmployees: isTerminal ? false : hasPermission(userRole, employeeRole, 'VIEW_EMPLOYEES'),
                    canEditEmployees: isTerminal ? false : hasPermission(userRole, employeeRole, 'EDIT_EMPLOYEES'),
                    canViewEmployeeDetails: isTerminal ? false : hasPermission(userRole, employeeRole, 'VIEW_EMPLOYEE_DETAILS'),
                    canViewRecipes: isTerminal ? true : hasPermission(userRole, employeeRole, 'VIEW_RECIPES'),
                    canEditRecipes: isTerminal ? false : hasPermission(userRole, employeeRole, 'EDIT_RECIPES'),
                    canViewAnalytics: isTerminal ? false : hasPermission(userRole, employeeRole, 'VIEW_ANALYTICS'),
                    canViewPriceCalculator: isTerminal ? false : hasPermission(userRole, employeeRole, 'VIEW_PRICE_CALCULATOR'),
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