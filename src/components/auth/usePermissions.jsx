import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function usePermissions() {
    const [permissions, setPermissions] = useState({
        role: null,
        employeeRole: null,
        isLoading: true,
        canViewDashboard: false,
        canViewShifts: false,
        canEditShifts: false,
        canViewReservations: false,
        canEditReservations: false,
        canViewShopping: false,
        canEditShopping: false,
        canViewRestock: false,
        canEditRestock: false,
        canViewCleaning: false,
        canEditCleaning: false,
        canViewTodos: false,
        canEditTodos: false,
        canViewEmployees: false,
        canEditEmployees: false,
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
                const isAdmin = user.role === 'admin';

                // Manager und Admins haben Vollzugriff
                const isManager = employeeRole === 'Manager' || isAdmin;
                
                // Barkeeper und Servicekräfte haben erweiterte Rechte
                const isBarkeeper = employeeRole === 'Barkeeper';
                const isServicekraft = employeeRole === 'Servicekraft';
                
                // Aushilfe hat eingeschränkte Rechte
                const isAushilfe = employeeRole === 'Aushilfe';

                setPermissions({
                    role: user.role,
                    employeeRole,
                    isLoading: false,
                    
                    canViewDashboard: true, // Alle können Dashboard sehen
                    
                    canViewShifts: true, // Alle können Schichten sehen
                    canEditShifts: isManager, // Nur Manager können Schichten bearbeiten
                    
                    canViewReservations: isManager || isBarkeeper || isServicekraft,
                    canEditReservations: isManager || isBarkeeper || isServicekraft,
                    
                    canViewShopping: isManager || isBarkeeper,
                    canEditShopping: isManager || isBarkeeper,
                    
                    canViewRestock: true, // Alle können auffüllen
                    canEditRestock: true,
                    
                    canViewCleaning: true, // Alle können Putzliste sehen
                    canEditCleaning: true,
                    
                    canViewTodos: isManager || isBarkeeper || isServicekraft,
                    canEditTodos: isManager || isBarkeeper || isServicekraft,
                    
                    canViewEmployees: isManager, // Nur Manager sehen Team
                    canEditEmployees: isManager,
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