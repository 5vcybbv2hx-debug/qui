import {
    Home, Utensils, Package, Wine, Users,
    Calendar, Clock, Shield, BookOpen, TrendingUp,
    CheckSquare, MapPin, ShoppingCart, RefreshCw,
    Settings, FileText, BarChart2, Trash2, ClipboardList,
    ArrowLeftRight, Star, Brush, FolderOpen, Wrench, QrCode, Palmtree
} from 'lucide-react';

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
            { name: 'Putzliste', page: 'Cleaning', icon: Brush, permission: 'canViewCleaning' },
            { name: 'Einkaufsliste', page: 'Shopping', icon: ShoppingCart, permission: 'canViewShopping' },
            { name: 'Events', page: 'Events', icon: Star, permission: 'canViewDashboard' },
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
            { name: 'Inventur', page: 'Inventory', icon: ClipboardList, permission: 'canViewInventory' },
            { name: 'Schwund', page: 'Wastage', icon: Trash2, permission: 'canViewWastage' },
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
            { name: 'Zeiterfassung', page: 'TimeManagement', icon: Clock, permission: 'canViewDashboard' },
            { name: 'Urlaub', page: 'Vacation', icon: Palmtree, permission: 'canViewDashboard' },
            { name: 'Schichttausch', page: 'ShiftSwaps', icon: ArrowLeftRight, permission: 'canViewShifts' },
            { name: 'Berechtigungen', page: 'Permissions', icon: Shield, permission: 'isAdmin' },
        ]
    },
];

/**
 * Zusätzliche Seiten — im "Mehr"-Drawer sichtbar
 */
export const additionalPages = [
    { name: 'Tagesabschluss', page: 'DailyAnalysis', icon: BarChart2, permission: 'isManager' },
    { name: 'Berichte', page: 'Reports', icon: FileText, permission: 'isManager' },
    { name: 'Umsatz', page: 'SalesAnalysis', icon: TrendingUp, permission: 'isManager' },
    { name: 'Dokumente', page: 'Documents', icon: FolderOpen, permission: 'canViewDashboard' },
    { name: 'Wartung', page: 'Maintenance', icon: Wrench, permission: 'isManager' },
    { name: 'QR-Codes', page: 'QRCodes', icon: QrCode, permission: 'isAdmin' },
    { name: 'Einstellungen', page: 'Settings', icon: Settings, permission: 'canViewDashboard' },
    { name: 'Firmendaten', page: 'CompanySettings', icon: FileText, permission: 'isManager' },
    { name: 'Einlernen', page: 'Onboarding', icon: Users, permission: 'canViewOnboarding' },
];

/**
 * Flattened list für einfache Suche über alle Seiten
 */
export const allPages = mainNavigation.flatMap(area => area.pages).concat(additionalPages);