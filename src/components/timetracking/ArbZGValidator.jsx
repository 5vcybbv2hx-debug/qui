import { differenceInHours, parseISO, subDays, format } from 'date-fns';

/**
 * Validiert Arbeitszeiten nach deutschem Arbeitszeitgesetz (ArbZG)
 */
export const validateArbZG = (timeEntry, allTimeEntries) => {
    const warnings = [];
    const { date, start_time, end_time, break_minutes = 0, total_hours } = timeEntry;
    
    // 1. Maximale tägliche Arbeitszeit: 10 Stunden (§3 ArbZG)
    if (total_hours > 10) {
        warnings.push({
            type: 'error',
            message: `Maximale Arbeitszeit überschritten: ${total_hours}h (max. 10h nach §3 ArbZG)`
        });
    } else if (total_hours > 8) {
        warnings.push({
            type: 'warning',
            message: `Mehr als 8h Arbeitszeit: ${total_hours}h. Ausgleich innerhalb von 6 Monaten erforderlich (§3 ArbZG)`
        });
    }

    // 2. Pausenregelung (§4 ArbZG)
    if (total_hours > 9 && break_minutes < 45) {
        warnings.push({
            type: 'error',
            message: `Bei mehr als 9h Arbeitszeit: mind. 45 Min Pause erforderlich (§4 ArbZG)`
        });
    } else if (total_hours > 6 && break_minutes < 30) {
        warnings.push({
            type: 'error',
            message: `Bei mehr als 6h Arbeitszeit: mind. 30 Min Pause erforderlich (§4 ArbZG)`
        });
    }

    // 3. Ruhezeit zwischen Arbeitstagen: 11 Stunden (§5 ArbZG)
    if (allTimeEntries && allTimeEntries.length > 0 && date && start_time) {
        // Suche den letzten Eintrag vor diesem (Vortag oder früher, aber nicht gleicher Tag)
        const currentStart = parseISO(`${date}T${start_time}`);
        const relevantPrevEntries = allTimeEntries.filter(e => {
            if (!e.date || !e.end_time || e.date === date) return false;
            // Nachtschicht-safe: end_time < start_time bedeutet Ende am Folgetag
            let endDateTime = parseISO(`${e.date}T${e.end_time}`);
            if (e.end_time < e.start_time) {
                // Nachtschicht: Ende ist am Tag danach
                endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
            }
            return endDateTime < currentStart;
        });

        if (relevantPrevEntries.length > 0) {
            // Letzten Eintrag vor dem aktuellen finden
            const previousEntry = relevantPrevEntries.sort((a, b) => b.date.localeCompare(a.date))[0];
            let prevEndDateTime = parseISO(`${previousEntry.date}T${previousEntry.end_time}`);
            if (previousEntry.end_time < previousEntry.start_time) {
                prevEndDateTime = new Date(prevEndDateTime.getTime() + 24 * 60 * 60 * 1000);
            }
            const restHours = differenceInHours(currentStart, prevEndDateTime);
            
            if (restHours < 11) {
                warnings.push({
                    type: 'error',
                    message: `Ruhezeit unterschritten: ${restHours}h (mind. 11h nach §5 ArbZG erforderlich)`
                });
            }
        }
    }

    // 4. Wochenarbeitszeit: durchschnittlich 48 Stunden (§3 ArbZG)
    // Wird als Info-Hinweis gezeigt, nicht als Fehler
    
    return warnings;
};

/**
 * Berechnet die Wochenarbeitszeit
 */
export const calculateWeeklyHours = (entries) => {
    return entries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
};

/**
 * Formatiert Warnungen für die Anzeige
 */
export const formatWarnings = (warnings) => {
    if (!warnings || warnings.length === 0) return null;
    return warnings.map(w => w.message).join(' | ');
};