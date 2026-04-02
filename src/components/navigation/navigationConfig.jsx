import {
    Home, Utensils, Package, Wine, Users,
    Calendar, Clock, Shield, BookOpen, TrendingUp,
    CheckSquare, MapPin, ShoppingCart, RefreshCw, 
    Settings, FileText
} from 'lucide-react';

/**
 * Neue Navigation strukturiert nach Arbeitsalltag, nicht nach Features.
 * 5 Hauptbereiche in Bottom Navigation, keine Überladung.
 */

export const mainNavigation = [
    {
        id: 'dashboard',
        name: 'Dashboard',
        icon: Home,
        color: 'from-amber-500 to-orange-500',
        pages: [
            { name: 'Übersicht', page: 'Dashboard', icon: Home, permission: 'canViewDashboard' },
        ]
    },
    {
        id: 'betrieb',
        name: 'Betrieb',
        icon: Utensils,
        color: 'from-blue-500 to-indigo-600',
        pages: [
            { name: 'Gäste & Tische', page: 'GuestHub', icon: MapPin, permission: 'canViewReservations' },
            { name: 'Auffüllliste', page: 'Restock', icon: RefreshCw, permission: 'canViewRestock' },
            { name: 'Aufgaben', page: 'Todos', icon: CheckSquare, permission: 'canViewTodos' },
            { name: 'Team-Notizen', page: 'More', icon: FileText, permission: 'canViewDashboard' },
        ]
    },
    {
        id: 'lager',
        name: 'Lager',
        icon: Package,
        color: 'from-orange-500 to-amber-600',
        pages: [
            { name: 'Artikel', page: 'Articles', icon: Package, permission: 'canViewInventory' },
            { name: 'Bestand', page: 'Warehouse', icon: Package, permission: 'canViewWarehouse' },
            { name: 'Lieferanten', page: 'Suppliers', icon: Package, permission: 'isManager' },
            { name: 'Lagerplätze', page: 'Storage', icon: Package, permission: 'canViewWarehouse' },
        ]
    },
    {
        id: 'karte',
        name: 'Karte',
        icon: Wine,
        color: 'from-rose-500 to-pink-600',
        pages: [
            { name: 'Getränkekarte', page: 'DrinkMenu', icon: Wine, permission: 'canViewEmployees' },
            { name: 'Rezepte', page: 'Recipes', icon: BookOpen, permission: 'canViewDashboard' },
            { name: 'Preisrechner', page: 'PriceCalculator', icon: TrendingUp, permission: 'canViewPriceCalculator' },
        ]
    },
    {
        id: 'team',
        name: 'Team',
        icon: Users,
        color: 'from-green-500 to-teal-600',
        pages: [
            { name: 'Mitarbeiter', page: 'Employees', icon: Users, permission: 'canViewEmployees' },
            { name: 'Schichtplan', page: 'Calendar', icon: Calendar, permission: 'canViewShifts' },
            { name: 'Zeit', page: 'TimeManagement', icon: Clock, permission: 'canViewDashboard' },
            { name: 'Berechtigungen', page: 'Permissions', icon: Shield, permission: 'isAdmin' },
        ]
    },
];

/**
 * Zusätzliche Seiten (nur für berechtigte Nutzer, z.B. in Drawer/Settings):
 */
export const additionalPages = [
    { name: 'Einstellungen', page: 'Settings', icon: Settings, permission: 'canViewDashboard' },
    { name: 'Firmendaten', page: 'CompanySettings', icon: FileText, permission: 'isManager' },
    { name: 'Einlernen', page: 'Onboarding', icon: Users, permission: 'canViewOnboarding' },
];

/**
 * Flattened list für einfache Suche über alle Seiten
 */
export const allPages = mainNavigation.flatMap(area => area.pages).concat(additionalPages);