import { addDays } from 'date-fns';

// Berechnet Ostersonntag für ein gegebenes Jahr (Gauß'sche Osterformel)
function getEasterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month - 1, day);
}

// Feiertage für Baden-Württemberg
export function getHolidaysBW(year) {
    const easter = getEasterSunday(year);
    
    const holidays = [
        { date: new Date(year, 0, 1), name: 'Neujahr' },
        { date: new Date(year, 0, 6), name: 'Heilige Drei Könige' },
        { date: addDays(easter, -2), name: 'Karfreitag' },
        { date: addDays(easter, 1), name: 'Ostermontag' },
        { date: new Date(year, 4, 1), name: 'Tag der Arbeit' },
        { date: addDays(easter, 39), name: 'Christi Himmelfahrt' },
        { date: addDays(easter, 50), name: 'Pfingstmontag' },
        { date: addDays(easter, 60), name: 'Fronleichnam' },
        { date: new Date(year, 9, 3), name: 'Tag der Deutschen Einheit' },
        { date: new Date(year, 10, 1), name: 'Allerheiligen' },
        { date: new Date(year, 11, 25), name: '1. Weihnachtstag' },
        { date: new Date(year, 11, 26), name: '2. Weihnachtstag' }
    ];
    
    return holidays;
}

// Prüft, ob ein Datum ein Feiertag ist
export function isHoliday(date, holidays) {
    return holidays.some(holiday => 
        holiday.date.getFullYear() === date.getFullYear() &&
        holiday.date.getMonth() === date.getMonth() &&
        holiday.date.getDate() === date.getDate()
    );
}

// Gibt den Namen des Feiertags zurück, falls vorhanden
export function getHolidayName(date, holidays) {
    const holiday = holidays.find(h => 
        h.date.getFullYear() === date.getFullYear() &&
        h.date.getMonth() === date.getMonth() &&
        h.date.getDate() === date.getDate()
    );
    return holiday?.name || null;
}