// Zentrale Rollendefinition und Berechtigungskonfiguration

export const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'Manager',
    VOLLZEIT: 'Vollzeit',
    AUSHILFE: 'Aushilfe'
};

// Berechtigungsmatrix
export const PERMISSIONS = {
    // Dashboard
    VIEW_DASHBOARD: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Dashboard anzeigen'
    },
    
    // Schichtplanung
    VIEW_SHIFTS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Schichtplan ansehen'
    },
    EDIT_SHIFTS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        description: 'Schichten bearbeiten'
    },
    APPROVE_SHIFT_SWAPS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        description: 'Schichttausch genehmigen'
    },
    REQUEST_SHIFT_SWAP: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Schichttausch anfragen'
    },
    
    // Reservierungen
    VIEW_RESERVATIONS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Reservierungen ansehen'
    },
    EDIT_RESERVATIONS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Reservierungen bearbeiten'
    },
    DELETE_RESERVATIONS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        description: 'Reservierungen löschen'
    },
    
    // Events
    VIEW_EVENTS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Events ansehen'
    },
    EDIT_EVENTS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        description: 'Events bearbeiten'
    },
    
    // Einkauf
    VIEW_SHOPPING: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Einkaufsliste ansehen'
    },
    EDIT_SHOPPING: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Einkaufsliste bearbeiten'
    },
    
    // Auffüllen
    VIEW_RESTOCK: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Auffüllen ansehen'
    },
    EDIT_RESTOCK: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Auffüllen bearbeiten'
    },
    
    // Putzliste
    VIEW_CLEANING: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Putzliste ansehen'
    },
    EDIT_CLEANING: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Putzliste bearbeiten'
    },
    MANAGE_CLEANING_AREAS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        description: 'Putzbereiche verwalten'
    },
    
    // Aufgaben
    VIEW_TODOS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT],
        description: 'Aufgaben ansehen'
    },
    EDIT_TODOS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT],
        description: 'Aufgaben bearbeiten'
    },
    
    // Team / Mitarbeiter
    VIEW_EMPLOYEES: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Mitarbeiter ansehen'
    },
    EDIT_EMPLOYEES: {
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        description: 'Mitarbeiter bearbeiten'
    },
    VIEW_EMPLOYEE_DETAILS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        description: 'Mitarbeiterdetails ansehen (Adresse, Größen, etc.)'
    },
    
    // Rezepte
    VIEW_RECIPES: {
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.VOLLZEIT, ROLES.AUSHILFE],
        description: 'Rezepte ansehen'
    },
    EDIT_RECIPES: {
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        description: 'Rezepte bearbeiten'
    },
    
    // Analytics
    VIEW_ANALYTICS: {
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        description: 'Analysen ansehen'
    },
    
    // Preiskalkulation
    VIEW_PRICE_CALCULATOR: {
        roles: [ROLES.ADMIN],
        description: 'Preiskalkulation ansehen'
    }
};

// Hilfsfunktion zum Prüfen von Berechtigungen
export function hasPermission(userRole, employeeRole, permissionKey) {
    const permission = PERMISSIONS[permissionKey];
    if (!permission) return false;
    
    // Admin hat immer alle Rechte
    if (userRole === ROLES.ADMIN) return true;
    
    // Prüfe ob die Mitarbeiterrolle in den erlaubten Rollen ist
    return permission.roles.includes(employeeRole);
}

// Hilfsfunktion zum Prüfen ob Manager oder Admin
export function isManagerOrAdmin(userRole, employeeRole) {
    return userRole === ROLES.ADMIN || employeeRole === ROLES.MANAGER;
}