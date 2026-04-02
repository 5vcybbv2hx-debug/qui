/**
 * shortNameUtils — Hilfsfunktionen für Kurznamen (Kürzel) von Mitarbeitern.
 *
 * Kurzname ist reines Anzeigefeld, keine Identität.
 * Fallback-Kette: short_name → generierte Initialen → erster Vorname → voller Name
 */

/**
 * Gibt den anzuzeigenden Kurznamen für einen Mitarbeiter zurück.
 * Niemals leer.
 */
export function getShortName(employee) {
    if (!employee) return '?';
    if (employee.short_name?.trim()) return employee.short_name.trim();
    return generateShortName(employee.name);
}

/**
 * Generiert automatisch einen Kurznamen aus dem Namen.
 * Beispiel: "Max Mustermann" → "MM"
 *           "Max" → "MAX"
 */
export function generateShortName(fullName) {
    if (!fullName?.trim()) return '??';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].substring(0, 3).toUpperCase();
    }
    // Initialen aus Vor- und Nachname(n)
    return parts.map(p => p.charAt(0).toUpperCase()).join('').substring(0, 4);
}

/**
 * Gibt einen Vorschlag für einen Kurznamen zurück (für das Eingabefeld).
 */
export function suggestShortName(fullName) {
    return generateShortName(fullName);
}

/**
 * Speichert einen History-Eintrag für eine Kurzname-Änderung.
 */
export async function saveShortNameHistory(base44, { employeeId, employeeName, oldShortName, newShortName, changedByEmail, changedByName, note }) {
    const now = new Date();
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    await base44.entities.ShortNameHistory.create({
        employee_id: employeeId,
        employee_name: employeeName,
        old_short_name: oldShortName || '',
        new_short_name: newShortName,
        changed_by_email: changedByEmail,
        changed_by_name: changedByName,
        change_date: now.toISOString().split('T')[0],
        change_time: now.toTimeString().substring(0, 5),
        weekday: weekdays[now.getDay()],
        note: note || ''
    });
}