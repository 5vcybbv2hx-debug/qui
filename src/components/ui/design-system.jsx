// Zentrales Design-System für die gesamte App

export const colors = {
    // Hauptfarben
    primary: 'bg-amber-600 hover:bg-amber-700 text-white',
    primaryOutline: 'border-amber-600 text-amber-400 hover:bg-amber-600 hover:text-white',
    
    // Status-Farben
    success: 'bg-green-600 hover:bg-green-700 text-white',
    successOutline: 'border-green-600 text-green-400 hover:bg-green-600 hover:text-white',
    
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    dangerOutline: 'border-red-600 text-red-400 hover:bg-red-600 hover:text-white',
    
    warning: 'bg-orange-600 hover:bg-orange-700 text-white',
    warningOutline: 'border-orange-600 text-orange-400 hover:bg-orange-600 hover:text-white',
    
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
    infoOutline: 'border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white',
    
    // Neutrale Farben
    neutral: 'bg-slate-700 hover:bg-slate-600 text-slate-300',
    neutralOutline: 'border-slate-600 text-slate-300 hover:bg-slate-700',
};

export const badges = {
    primary: 'bg-amber-100 text-amber-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-orange-100 text-orange-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-slate-100 text-slate-700',
};

export const cardStyles = {
    base: 'p-4 bg-slate-800 border-slate-700 rounded-xl',
    hover: 'p-4 bg-slate-800 border-slate-700 rounded-xl hover:border-amber-600 transition-colors',
    selected: 'p-4 bg-slate-800 border-amber-600 rounded-xl',
};

export const spacing = {
    page: 'max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8',
    section: 'mb-6 sm:mb-8',
    card: 'p-4 sm:p-5',
    grid: 'grid gap-4',
};

// Standard-Kategorien für verschiedene Bereiche
export const categories = {
    article: [
        { name: 'Spirituosen', color: badges.primary },
        { name: 'Bier', color: badges.warning },
        { name: 'Wein & Sekt', color: badges.danger },
        { name: 'Softdrinks', color: badges.info },
        { name: 'Säfte', color: badges.success },
        { name: 'Zutaten', color: badges.neutral },
        { name: 'Sonstiges', color: badges.neutral },
    ],
    recipe: [
        { name: 'Cocktail', color: badges.primary },
        { name: 'Longdrink', color: badges.info },
        { name: 'Shot', color: badges.warning },
        { name: 'Mocktail', color: badges.success },
        { name: 'Moonshiner-Cocktails', color: badges.danger },
        { name: 'Sonstiges', color: badges.neutral },
    ],
    event: [
        { name: 'Party', color: badges.primary },
        { name: 'Livemusik', color: badges.warning },
        { name: 'Special Event', color: badges.info },
    ],
    task: [
        { name: 'Einkauf', color: badges.info },
        { name: 'Reparatur', color: badges.warning },
        { name: 'Event', color: badges.primary },
        { name: 'Sonstiges', color: badges.neutral },
    ],
    priority: [
        { name: 'niedrig', color: badges.neutral },
        { name: 'mittel', color: badges.info },
        { name: 'hoch', color: badges.warning },
        { name: 'dringend', color: badges.danger },
    ],
    status: {
        open: { name: 'offen', color: badges.neutral },
        inProgress: { name: 'in Bearbeitung', color: badges.info },
        done: { name: 'erledigt', color: badges.success },
        confirmed: { name: 'bestätigt', color: badges.success },
        pending: { name: 'vorgemerkt', color: badges.warning },
    },
};