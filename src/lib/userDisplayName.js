/**
 * Zentrale Hilfsfunktion für die Anzeige von Benutzernamen.
 * 
 * Reihenfolge:
 * 1. employee.name aus der DB (über permissions.employeeName)
 * 2. user.full_name (wenn es kein Email-Kürzel ist)
 * 3. Leer-String (kein Fallback auf Email)
 */

/**
 * Gibt den sauberen Anzeigenamen zurück — niemals eine E-Mail-Adresse.
 * @param {object} params
 * @param {string|null} params.employeeName - aus usePermissions().employeeName
 * @param {object|null} params.user - aus base44.auth.me()
 * @returns {string}
 */
export function getUserDisplayName({ employeeName, user } = {}) {
    // 1. Mitarbeitername aus DB (bevorzugt)
    if (employeeName) return employeeName;

    // 2. full_name nur wenn es keine E-Mail ist
    const fullName = user?.full_name;
    if (fullName && !fullName.includes('@')) return fullName;

    // 3. Kein Name verfügbar
    return '';
}