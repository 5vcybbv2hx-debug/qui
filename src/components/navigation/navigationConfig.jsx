import {
    Home, Calendar, Users, Package, Wine, BookOpen,
    CalendarCheck, CheckSquare, Sparkles, Wrench, TrendingUp,
    Bell, Shield, GraduationCap, Clock, Settings, QrCode,
    RepeatIcon, BarChart2, FileText, Building2, BellRing, ShoppingCart, RefreshCw, Archive, ClipboardCheck
} from 'lucide-react';

export const navigationSections = [
    {
        title: 'Übersicht',
        items: [
            { name: 'Dashboard', page: 'Dashboard', icon: Home, permission: 'canViewDashboard', color: 'from-amber-500 to-orange-500' },
            { name: 'Benachrichtigungen', page: 'Notifications', icon: Bell, permission: 'isManager', color: 'from-red-500 to-rose-600' },
        ]
    },
    {
        title: 'Team',
        items: [
            { name: 'Kalender', page: 'Calendar', icon: Calendar, permission: 'canViewShifts', color: 'from-blue-500 to-indigo-600' },
            { name: 'Meine Schichten', page: 'MyShifts', icon: CalendarCheck, permission: 'canViewShifts', color: 'from-violet-500 to-purple-600' },
            { name: 'Zeit', page: 'TimeManagement', icon: Clock, permission: 'canViewDashboard', color: 'from-cyan-500 to-blue-600' },
            { name: 'Mein Bereich', page: 'MyArea', icon: Users, permission: 'canViewDashboard', color: 'from-teal-500 to-emerald-600' },
            { name: 'Einlernen', page: 'Onboarding', icon: GraduationCap, permission: 'canViewOnboarding', color: 'from-lime-500 to-green-600' },
            { name: 'Mitarbeiter', page: 'Employees', icon: Users, permission: 'canViewEmployees', color: 'from-green-500 to-teal-600' },
            { name: 'Berechtigungen', page: 'Permissions', icon: Shield, permission: 'isAdmin', color: 'from-slate-500 to-slate-700' },
        ]
    },
    {
        title: 'Bar',
        items: [
            { name: 'Lager', page: 'Warehouse', icon: Package, permission: 'canViewWarehouse', color: 'from-orange-500 to-amber-600' },
            { name: 'Einkaufen', page: 'Shopping', icon: ShoppingCart, permission: 'canViewShopping', color: 'from-yellow-500 to-orange-500' },
            { name: 'Auffüllen', page: 'Restock', icon: RefreshCw, permission: 'canViewRestock', color: 'from-lime-500 to-green-600' },
            { name: 'Getränkekarte', page: 'DrinkMenu', icon: Wine, permission: 'canViewEmployees', color: 'from-rose-500 to-pink-600' },
            { name: 'Rezepte', page: 'Recipes', icon: BookOpen, permission: 'canViewDashboard', color: 'from-pink-500 to-fuchsia-600' },
            { name: 'Preisrechner', page: 'PriceCalculator', icon: TrendingUp, permission: 'canViewPriceCalculator', color: 'from-amber-400 to-yellow-500' },
            { name: 'Lieferanten', page: 'Suppliers', icon: Package, permission: 'isManager', color: 'from-yellow-500 to-orange-500' },
            { name: 'Lagerplätze', page: 'Storage', icon: Archive, permission: 'canViewWarehouse', color: 'from-stone-400 to-zinc-500' },
        ]
    },
    {
        title: 'Gäste',
        items: [
            { name: 'Tischplan', page: 'SeatingChart', icon: QrCode, permission: 'isManager', color: 'from-indigo-400 to-blue-500' },
            { name: 'QR-Codes', page: 'QRCodes', icon: QrCode, permission: 'isManager', color: 'from-slate-400 to-slate-600' },
        ]
    },
    {
        title: 'Events',
        items: [
            { name: 'Events', page: 'Events', icon: Calendar, permission: 'canViewDashboard', color: 'from-indigo-500 to-violet-600' },
            { name: 'Reservierungen', page: 'Reservations', icon: CalendarCheck, permission: 'canViewReservations', color: 'from-blue-500 to-cyan-600' },
        ]
    },
    {
        title: 'Organisation',
        items: [
            { name: 'Tagesabschluss', page: 'Closing', icon: ClipboardCheck, permission: 'canViewCleaning', color: 'from-violet-500 to-purple-600' },
            { name: 'Aufgaben', page: 'Todos', icon: CheckSquare, permission: 'canViewTodos', color: 'from-emerald-500 to-green-600' },
            { name: 'Putzen', page: 'Cleaning', icon: Sparkles, permission: 'canViewCleaning', color: 'from-sky-400 to-blue-500' },
            { name: 'Wochentagsaufgaben', page: 'WeeklyTasks', icon: RepeatIcon, permission: 'canViewCleaning', color: 'from-teal-400 to-cyan-500' },
            { name: 'Wartung', page: 'Maintenance', icon: Wrench, permission: 'isManager', color: 'from-stone-500 to-zinc-600' },
            { name: 'Teamsitzung', page: 'TeamMeeting', icon: Users, permission: 'canViewDashboard', color: 'from-violet-400 to-purple-500' },
        ]
    },
    {
        title: 'Analysen',
        items: [
            { name: 'Tagesanalyse', page: 'DailyAnalysis', icon: TrendingUp, permission: 'canViewAnalytics', color: 'from-yellow-500 to-amber-600' },
            { name: 'Verkäufe', page: 'SalesAnalysis', icon: TrendingUp, permission: 'canViewAnalytics', color: 'from-green-500 to-emerald-600' },
            { name: 'Berichte', page: 'Reports', icon: FileText, permission: 'canViewAnalytics', color: 'from-cyan-500 to-teal-600' },
        ]
    },
    {
        title: 'Einstellungen',
        items: [
            { name: 'Einstellungen', page: 'Settings', icon: Settings, permission: 'canViewDashboard', color: 'from-slate-500 to-slate-600' },

            { name: 'Dokumente', page: 'Documents', icon: BookOpen, permission: 'isManager', color: 'from-indigo-400 to-blue-500' },
            { name: 'Firmendaten', page: 'CompanySettings', icon: Building2, permission: 'isManager', color: 'from-zinc-500 to-slate-600' },
        ]
    },
];

// Flattened list for Layout sidebar (without color)
export const navigationFlat = navigationSections.flatMap(s => s.items);