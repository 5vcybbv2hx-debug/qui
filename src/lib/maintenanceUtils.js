/**
 * Maintenance utility functions
 * All date/status logic lives here — never directly in JSX.
 */

// Days-until-due threshold for "bald fällig"
export const WARNING_DAYS = 30;

/**
 * Calculate the next maintenance date from a base date + frequency string.
 * Returns ISO date string (YYYY-MM-DD).
 */
export function calculateNextMaintenance(dateStr, frequency) {
    const d = new Date(dateStr);
    switch (frequency) {
        case 'täglich':         d.setDate(d.getDate() + 1);       break;
        case 'wöchentlich':     d.setDate(d.getDate() + 7);       break;
        case 'monatlich':       d.setMonth(d.getMonth() + 1);     break;
        case 'quartalsweise':   d.setMonth(d.getMonth() + 3);     break;
        case 'halbjährlich':    d.setMonth(d.getMonth() + 6);     break;
        case 'jährlich':        d.setFullYear(d.getFullYear() + 1); break;
        case 'alle zwei Jahre': d.setFullYear(d.getFullYear() + 2); break;
        default: break;
    }
    return d.toISOString().split('T')[0];
}

/**
 * Derive the visual status of a task purely from its next_maintenance date.
 * Returns: 'überfällig' | 'bald fällig' | 'ok'
 */
export function getTaskStatus(task) {
    if (!task.next_maintenance) return 'ok';
    const today   = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDate = new Date(task.next_maintenance);
    const diffDays = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0)             return 'überfällig';
    if (diffDays <= WARNING_DAYS) return 'bald fällig';
    return 'ok';
}

/**
 * Sort tasks by urgency: überfällig → bald fällig → ok.
 * Within same status sort by next_maintenance ascending.
 */
export function sortTasksByUrgency(tasks) {
    const order = { 'überfällig': 0, 'bald fällig': 1, 'ok': 2 };
    return [...tasks].sort((a, b) => {
        const sa = order[getTaskStatus(a)];
        const sb = order[getTaskStatus(b)];
        if (sa !== sb) return sa - sb;
        return (a.next_maintenance || '').localeCompare(b.next_maintenance || '');
    });
}

/**
 * Human-readable label for a date string, relative to today.
 */
export function formatRelativeDate(dateStr) {
    if (!dateStr) return '–';
    const today   = new Date();
    today.setHours(0, 0, 0, 0);
    const d       = new Date(dateStr);
    const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0)  return 'Heute';
    if (diffDays === 1)  return 'Morgen';
    if (diffDays === -1) return 'Gestern';
    if (diffDays < 0)   return `${Math.abs(diffDays)} Tage überfällig`;
    if (diffDays <= 30) return `in ${diffDays} Tagen`;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: diffDays > 365 ? 'numeric' : undefined });
}

export const STATUS_CONFIG = {
    'überfällig': {
        label: 'Überfällig',
        bg:    'bg-red-100 dark:bg-red-900/30',
        text:  'text-red-700 dark:text-red-400',
        badge: 'bg-red-100 text-red-700 border-red-200',
        border:'border-l-red-500',
        dot:   'bg-red-500',
    },
    'bald fällig': {
        label: 'Bald fällig',
        bg:    'bg-yellow-50 dark:bg-yellow-900/20',
        text:  'text-yellow-700 dark:text-yellow-400',
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        border:'border-l-yellow-500',
        dot:   'bg-yellow-500',
    },
    'ok': {
        label: 'OK',
        bg:    'bg-green-50 dark:bg-green-900/20',
        text:  'text-green-700 dark:text-green-400',
        badge: 'bg-green-100 text-green-700 border-green-200',
        border:'border-l-green-500',
        dot:   'bg-green-500',
    },
};

export const CATEGORY_ICONS = {
    'Sicherheit': '🔥',
    'Technik':    '⚙️',
    'Hygiene':    '🧴',
    'Elektrik':   '⚡',
    'Sonstiges':  '🔧',
};