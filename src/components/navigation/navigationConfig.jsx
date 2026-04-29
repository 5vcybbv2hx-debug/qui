import {
    Home, Utensils, Package, Wine, Users,
    Calendar, Clock, Shield, BookOpen, TrendingUp,
    CheckSquare, MapPin, ShoppingCart, RefreshCw,
    Settings, FileText, BarChart2, Trash2, ClipboardList,
    ArrowLeftRight, Star, Brush, FolderOpen, Wrench,
    Palmtree, ListChecks, Video, QrCode, Sun, Layers, Zap
} from 'lucide-react';

/**
 * Haupt-Navigation — gruppiert in fachliche Bereiche.
 * Jedes Item hat genau ein `permission` aus roleConfig/PERMISSION_MATRIX.
 * 
 * Gültige Permission-Keys (Quelle: roleConfig.js PERMISSION_MATRIX):
 * canViewDashboard, canViewShifts, canViewReservations, canViewEvents,
 * canViewWarehouse, canViewInventory, canViewSuppliers, canViewShopping,
 * canViewRestock, canViewCleaning, canViewTodos, canViewTeamNotes,
 * canViewEmployees, canViewRecipes, canViewDrinkMenu, canViewOwnTimeEntries,
 * canViewAnalytics, canViewWastage, canViewSettings, canEditCompanySettings,
 * canViewOnboarding, canViewPriceCalculator, isManager, isAdmin
 */
export const mainNavigation = [
    {
        id: 'dashboard',
        name: 'Dashboard',
        icon: Home,
        pages: [
            { name: 'Übersicht',  page: 'Dashboard', icon: Home,  permission: 'canViewDashboard' },
            { name: 'Mein Tag',   page: 'MeinTag',   icon: Sun,   permission: 'canViewDashboard' },
        ]
    },
    {
        id: 'betrieb',
        name: 'Betrieb',
        icon: Utensils,
        pages: [
            { name: 'Gäste & Tische',     page: 'GuestHub',        icon: MapPin,       permission: 'canViewReservations' },
            { name: 'Operative Listen',   page: 'OperativeListen', icon: Zap,          permission: 'canViewTodos'        },
            { name: 'Aufgaben',           page: 'Todos',           icon: CheckSquare,  permission: 'canViewTodos'        },
            { name: 'Putzliste',          page: 'Cleaning',        icon: Brush,        permission: 'canViewCleaning'     },
            { name: 'Auffüllliste',       page: 'Restock',         icon: RefreshCw,    permission: 'canViewRestock'      },
            { name: 'Einkaufsliste',      page: 'Shopping',        icon: ShoppingCart, permission: 'canViewShopping'     },
            { name: 'Events',             page: 'Events',          icon: Star,         permission: 'canViewEvents'       },
        ]
    },
    {
        id: 'lager',
        name: 'Lager',
        icon: Package,
        pages: [
            { name: 'Artikel',      page: 'Articles',  icon: Package,       permission: 'canViewWarehouse' },
            { name: 'Bestand',      page: 'Warehouse', icon: Package,       permission: 'canViewWarehouse' },
            { name: 'Inventur',     page: 'Inventory', icon: ClipboardList, permission: 'canViewInventory' },
            { name: 'Schwund',      page: 'Wastage',   icon: Trash2,        permission: 'canViewWastage'   },
            { name: 'Lieferanten',  page: 'Suppliers', icon: Package,       permission: 'canViewSuppliers' },
            { name: 'Lagerplätze',  page: 'Storage',   icon: Package,       permission: 'canViewWarehouse' },
        ]
    },
    {
        id: 'karte',
        name: 'Karte & Rezepte',
        icon: Wine,
        pages: [
            { name: 'Getränkekarte', page: 'DrinkMenu',       icon: Wine,       permission: 'canViewDrinkMenu'      },
            { name: 'Rezepte',       page: 'Recipes',         icon: BookOpen,   permission: 'canViewRecipes'        },
            { name: 'Preisrechner',  page: 'PriceCalculator', icon: TrendingUp, permission: 'canViewPriceCalculator'},
        ]
    },
    {
        id: 'team',
        name: 'Team',
        icon: Users,
        pages: [
            { name: 'Mitarbeiter',   page: 'Employees',      icon: Users,          permission: 'canViewEmployees'      },
            { name: 'Schichtplan',   page: 'Calendar',       icon: Calendar,       permission: 'canViewShifts'         },
            { name: 'Teamkalender',  page: 'TeamCalendar',   icon: Calendar,       permission: 'canViewShifts'         },
            { name: 'Zeiterfassung', page: 'TimeManagement', icon: Clock,          permission: 'canViewOwnTimeEntries' },
            { name: 'Urlaub',        page: 'Vacation',       icon: Palmtree,       permission: 'canViewVacation' },
            { name: 'Schichttausch', page: 'ShiftSwaps',     icon: ArrowLeftRight, permission: 'canRequestShiftSwap'   },
            { name: 'Berechtigungen',page: 'Permissions',    icon: Shield,         permission: 'canEditEmployeePermissions'},
            { name: 'Teamsitzung',   page: 'TeamMeeting',    icon: Video,          permission: 'canViewShifts'             },
        ]
    },
];

/**
 * Zusätzliche Seiten — erscheinen im "Mehr"-Drawer gruppiert unter "Einstellungen & Tools".
 * Nur für berechtigte Nutzer sichtbar.
 */
export const additionalPages = [
    { name: 'Stationsplan',   page: 'Stationsplan',   icon: MapPin,     permission: 'canViewShifts'           },
    { name: 'Tagesabschluss', page: 'DailyAnalysis',   icon: BarChart2,  permission: 'canViewAnalytics'        },
    { name: 'Lohnabrechnung', page: 'Reports',          icon: FileText,   permission: 'canViewAnalytics'        },
    { name: 'Verkaufsanalyse', page: 'SalesAnalysis',    icon: TrendingUp, permission: 'canViewAnalytics'        },
    { name: 'Dokumente',      page: 'Documents',        icon: FolderOpen, permission: 'canViewSettings'         },
    { name: 'Wartung',        page: 'Maintenance',      icon: Wrench,     permission: 'canViewSettings'         },
    { name: 'Einstellungen',  page: 'Settings',         icon: Settings,   permission: 'canViewSettings'         },
    { name: 'Firmendaten',    page: 'CompanySettings',  icon: FileText,   permission: 'canEditCompanySettings'  },
    { name: 'Einarbeitung',   page: 'Onboarding',       icon: Users,      permission: 'canViewOnboarding'       },
    { name: 'Visitenkarte',   page: 'BusinessCard',     icon: QrCode,     permission: 'canViewDashboard'        },
    { name: 'Modulcenter',       page: 'ModuleCenter',     icon: Layers,    permission: 'canViewSettings'        },
    { name: 'Betriebskalender',  page: 'BusinessCalendar', icon: Calendar,  permission: 'canViewSettings'        },
];

/**
 * Flat list aller Seiten — für GlobalSearch und Page-Title-Lookup.
 */
export const allPages = mainNavigation.flatMap(a => a.pages).concat(additionalPages);