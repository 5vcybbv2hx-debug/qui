/**
 * roleConfig.js
 * Central source of truth for all roles, permissions, and access rules.
 *
 * Architecture:
 *  - ROLES:       all possible user/employee role values
 *  - PERMISSION_MATRIX: maps every permission key → which roles have it by default
 *  - Terminal overrides: terminal mode disables most permissions regardless of role
 *  - can():       single function to check a permission at runtime
 *
 * Rule: every permission check in the app must trace back to this file.
 * Never hardcode role strings (e.g. 'admin', 'Manager') outside this module.
 */

// ── Role constants ────────────────────────────────────────────────────────────
// USER roles (base44 auth system)
export const USER_ROLES = {
    ADMIN:   'admin',   // Full access — base44 platform admin
    USER:    'user',    // Regular authenticated user — access controlled by employeeRole
};

// EMPLOYEE roles (stored on the Employee entity)
export const EMPLOYEE_ROLES = {
    MANAGER:    'Manager',
    VOLLZEIT:   'Vollzeit',
    BARKEEPER:  'Barkeeper',  // NEW: bar-specific role with recipe/inventory focus
    AUSHILFE:   'Aushilfe',
    TERMINAL:   'terminal',   // NEW: kiosk/clock-in terminal — severely restricted
};

// Backwards-compatible alias
export const ROLES = { ...USER_ROLES, ...EMPLOYEE_ROLES };

// ── Role hierarchy helpers ────────────────────────────────────────────────────
/** Returns true if the user has admin-level access */
export function isAdmin(userRole) {
    return userRole === USER_ROLES.ADMIN;
}

/** Returns true if the user is a manager or admin */
export function isManagerOrAdmin(userRole, employeeRole) {
    return isAdmin(userRole) || employeeRole === EMPLOYEE_ROLES.MANAGER;
}

/** Returns true if the session is a terminal kiosk */
export function isTerminalSession(userMeta) {
    return userMeta?.is_terminal === true || userMeta?.employeeRole === EMPLOYEE_ROLES.TERMINAL;
}

// ── Permission matrix ─────────────────────────────────────────────────────────
// Format: permKey → { roles: string[], terminalAllowed: boolean, description: string }
// roles: employee roles that have this permission by default (Admin always has everything)
// terminalAllowed: whether a terminal kiosk session may use this permission
const M = EMPLOYEE_ROLES; // alias for readability

export const PERMISSION_MATRIX = {
    // ── Dashboard ─────────────────────────────────────────────────────────
    canViewDashboard:        { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: false },

    // ── Schichten ──────────────────────────────────────────────────────────
    canViewShifts:           { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: true  },
    canEditShifts:           { roles: [M.MANAGER],                                      terminal: false },
    canApproveShiftSwaps:    { roles: [M.MANAGER],                                      terminal: false },
    canRequestShiftSwap:     { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: false },

    // ── Reservierungen ────────────────────────────────────────────────────
    canViewReservations:     { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: true  },
    canEditReservations:     { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: false },
    canDeleteReservations:   { roles: [M.MANAGER],                                      terminal: false },

    // ── Events ────────────────────────────────────────────────────────────
    canViewEvents:           { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: true  },
    canEditEvents:           { roles: [M.MANAGER],                                      terminal: false },

    // ── Einkauf / Lager ───────────────────────────────────────────────────
    canViewShopping:         { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: true  },
    canEditShopping:         { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: false },
    canViewRestock:          { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: true  },
    canEditRestock:          { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: false },
    canViewWarehouse:        { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER],             terminal: false },
    canViewInventory:        { roles: [M.MANAGER, M.BARKEEPER],                         terminal: false },

    // ── Putzliste ─────────────────────────────────────────────────────────
    canViewCleaning:         { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: true  },
    canEditCleaning:         { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: false },
    canManageCleaningAreas:  { roles: [M.MANAGER],                                      terminal: false },

    // ── Aufgaben ──────────────────────────────────────────────────────────
    canViewTodos:            { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER],             terminal: false },
    canEditTodos:            { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER],             terminal: false },

    // ── Mitarbeiter ───────────────────────────────────────────────────────
    canViewEmployees:        { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: false },
    canEditEmployees:        { roles: [M.MANAGER],                                      terminal: false },
    canViewEmployeeDetails:  { roles: [M.MANAGER],                                      terminal: false }, // IBAN, tax, salary

    // ── Bar-spezifisch ────────────────────────────────────────────────────
    canViewRecipes:          { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: true  },
    canEditRecipes:          { roles: [M.MANAGER, M.BARKEEPER],                         terminal: false },
    canViewWastage:          { roles: [M.MANAGER, M.BARKEEPER],                         terminal: false },

    // ── Analytik / Finanzen ───────────────────────────────────────────────
    canViewAnalytics:        { roles: [M.MANAGER],                                      terminal: false },
    canViewPriceCalculator:  { roles: [],          adminOnly: true,                     terminal: false }, // admin only
    canViewSalaryData:       { roles: [],          adminOnly: true,                     terminal: false }, // admin only

    // ── Zeiterfassung ─────────────────────────────────────────────────────
    canClockOutOthers:       { roles: [M.MANAGER],                                      terminal: false },
    canViewOwnTimeEntries:   { roles: [M.MANAGER, M.VOLLZEIT, M.BARKEEPER, M.AUSHILFE], terminal: false },
    canApproveTimeEntries:   { roles: [M.MANAGER],                                      terminal: false },

    // ── Einarbeitung ──────────────────────────────────────────────────────
    canViewOnboarding:       { roles: [M.MANAGER],                                      terminal: false },
};

// ── Core permission resolver ──────────────────────────────────────────────────
/**
 * Resolve a single permission for a given session context.
 *
 * @param {string}  permKey       - key from PERMISSION_MATRIX
 * @param {object}  ctx           - { userRole, employeeRole, isTerminal, customPerms }
 * @param {object}  [customPerms] - per-employee overrides from Employee.permissions
 * @returns {boolean}
 */
export function can(permKey, { userRole, employeeRole, isTerminal = false, customPerms = {} }) {
    // Admin always wins
    if (userRole === USER_ROLES.ADMIN) return true;

    const rule = PERMISSION_MATRIX[permKey];
    if (!rule) {
        console.warn(`[permissions] Unknown permission key: "${permKey}"`);
        return false;
    }

    // Admin-only permissions
    if (rule.adminOnly) return false;

    // Terminal sessions are heavily restricted
    if (isTerminal && !rule.terminal) return false;

    // Per-employee override takes precedence over role defaults
    if (typeof customPerms[permKey] === 'boolean') return customPerms[permKey];

    // Fall back to role-based default
    return rule.roles.includes(employeeRole);
}

/**
 * Build the full permissions map for a session.
 * Used by permissionsCache — call once, cache the result.
 */
export function buildPermissions(ctx) {
    const map = {};
    for (const key of Object.keys(PERMISSION_MATRIX)) {
        map[key] = can(key, ctx);
    }
    return map;
}