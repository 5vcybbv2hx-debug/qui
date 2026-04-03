/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
// Core pages (auto-generated alphabetically)
import ArticleEdit from './pages/ArticleEdit';
import Articles from './pages/Articles';
import Calendar from './pages/Calendar';
import Cleaning from './pages/Cleaning';
import CompanySettings from './pages/CompanySettings';
import DailyAnalysis from './pages/DailyAnalysis';
import DailySpecialsDisplay from './pages/DailySpecialsDisplay';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DrinkMenu from './pages/DrinkMenu';
import Employees from './pages/Employees';
import Events from './pages/Events';
import GuestReservationView from './pages/GuestReservationView';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import LazyReports from './pages/LazyReports';
import LazySalesAnalysis from './pages/LazySalesAnalysis';
import Maintenance from './pages/Maintenance';
import More from './pages/More';
import MyArea from './pages/MyArea';
import MyProfile from './pages/MyProfile';
import MyShifts from './pages/MyShifts';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import Onboarding from './pages/Onboarding';
import Permissions from './pages/Permissions';
import PriceCalculator from './pages/PriceCalculator';
import PublicDrinkMenu from './pages/PublicDrinkMenu';
import PublicMenu from './pages/PublicMenu';
import PublicReservation from './pages/PublicReservation';
import QRCodes from './pages/QRCodes';
import Recipes from './pages/Recipes';
import Reports from './pages/Reports';
import Reservations from './pages/Reservations';
import Restock from './pages/Restock';
import SalesAnalysis from './pages/SalesAnalysis';
import SeatingChart from './pages/SeatingChart';
import GuestHub from './pages/GuestHub';
import Settings from './pages/Settings';
import ShiftAnalytics from './pages/ShiftAnalytics';
import ShiftSwaps from './pages/ShiftSwaps';
import Shifts from './pages/Shifts';
import Shopping from './pages/Shopping';
import Suppliers from './pages/Suppliers';
import TeamCalendar from './pages/TeamCalendar';
import TeamMeeting from './pages/TeamMeeting';
import TerminalClock from './pages/TerminalClock';
import TimeManagement from './pages/TimeManagement';
import TimeTracking from './pages/TimeTracking';
import Todos from './pages/Todos';
import Vacation from './pages/Vacation';
import Storage from './pages/Storage';
import StorageLocationScan from './pages/StorageLocationScan';
import Warehouse from './pages/Warehouse';
import Wastage from './pages/Wastage';
import WeeklyTasks from './pages/WeeklyTasks';

// Special pages (manual imports — non-standard routing)
import CleaningChecklist from './pages/CleaningChecklist';
import Closing from './pages/Closing';
import ClosingDisplay from './pages/ClosingDisplay';
import Opening from './pages/Opening';
// EmployeeHome removed — Dashboard is now the central entry point
import EmployeeProfile from './pages/EmployeeProfile';
import EmployeesImproved from './pages/EmployeesImproved';
import Stationsplan from './pages/Stationsplan';
import OperatorDashboard from './pages/OperatorDashboard';
import DataProtection from './pages/DataProtection';
import Impressum from './pages/Impressum';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AGB from './pages/AGB';
import AuditLog from './pages/AuditLog';
import LegalImprint from './pages/LegalImprint';
import LegalPrivacy from './pages/LegalPrivacy';
import LegalAGB from './pages/LegalAGB';

import __Layout from './Layout.jsx';


// Page categories for layout and navigation
const CORE_PAGES = {
    "ArticleEdit": ArticleEdit,
    "Articles": Articles,
    "Calendar": Calendar,
    "Cleaning": Cleaning,
    "CompanySettings": CompanySettings,
    "DailyAnalysis": DailyAnalysis,
    "DailySpecialsDisplay": DailySpecialsDisplay,
    "Dashboard": Dashboard,
    "Documents": Documents,
    "DrinkMenu": DrinkMenu,
    "Employees": Employees,
    "Events": Events,
    "GuestReservationView": GuestReservationView,
    "Home": Home,
    "Inventory": Inventory,
    "LazyReports": LazyReports,
    "LazySalesAnalysis": LazySalesAnalysis,
    "Maintenance": Maintenance,
    "More": More,
    "MyArea": MyArea,
    "MyProfile": MyProfile,
    "MyShifts": MyShifts,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "Onboarding": Onboarding,
    "Permissions": Permissions,
    "PriceCalculator": PriceCalculator,
    "PublicDrinkMenu": PublicDrinkMenu,
    "PublicMenu": PublicMenu,
    "PublicReservation": PublicReservation,
    "QRCodes": QRCodes,
    "Recipes": Recipes,
    "Reports": Reports,
    "Reservations": Reservations,
    "Restock": Restock,
    "SalesAnalysis": SalesAnalysis,
    "SeatingChart": SeatingChart,
    "GuestHub": GuestHub,
    "Settings": Settings,
    "ShiftAnalytics": ShiftAnalytics,
    "ShiftSwaps": ShiftSwaps,
    "Shifts": Shifts,
    "Shopping": Shopping,
    "Suppliers": Suppliers,
    "TeamCalendar": TeamCalendar,
    "TeamMeeting": TeamMeeting,
    "TerminalClock": TerminalClock,
    "TimeManagement": TimeManagement,
    "TimeTracking": TimeTracking,
    "Todos": Todos,
    "Vacation": Vacation,
    "Storage": Storage,
    "Warehouse": Warehouse,
    "Wastage": Wastage,
    "WeeklyTasks": WeeklyTasks,
};

// Special pages: with Layout wrapper
const SPECIAL_PAGES_WITH_LAYOUT = {
    "CleaningChecklist": CleaningChecklist,
    "Closing": Closing,
    "Opening": Opening,

    "EmployeeProfile": EmployeeProfile,
    "EmployeesImproved": EmployeesImproved,
    "Stationsplan": Stationsplan,
    "OperatorDashboard": OperatorDashboard,
    "DataProtection": DataProtection,
    "Impressum": Impressum,
    "PrivacyPolicy": PrivacyPolicy,
    "AGB": AGB,
    "AuditLog": AuditLog,
};

// Public pages: NO layout wrapper (guest/public access)
const PUBLIC_PAGES = {
    "ClosingDisplay": ClosingDisplay,
    "LegalImprint": LegalImprint,
    "LegalPrivacy": LegalPrivacy,
    "LegalAGB": LegalAGB,
    "StorageLocationScan": StorageLocationScan,
};

// Combined pages object (all accessible pages)
export const PAGES = {
    ...CORE_PAGES,
    ...SPECIAL_PAGES_WITH_LAYOUT,
    ...PUBLIC_PAGES,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    CorePages: CORE_PAGES,
    SpecialPagesWithLayout: SPECIAL_PAGES_WITH_LAYOUT,
    PublicPages: PUBLIC_PAGES,
    Layout: __Layout,
};