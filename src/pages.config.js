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
import Home from './pages/Home';
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
import Recipes from './pages/Recipes';
import Reports from './pages/Reports';
import Restock from './pages/Restock';
import SalesAnalysis from './pages/SalesAnalysis';
import GuestHub from './pages/GuestHub';
import Settings from './pages/Settings';
import ShiftSwaps from './pages/ShiftSwaps';
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
import BusinessCard from './pages/BusinessCard';
import ShiftAnalytics from './pages/ShiftAnalytics';
import WeeklyTasks from './pages/WeeklyTasks';
import WorldCupSchedule from './pages/WorldCupSchedule';

// Special pages (manual imports — non-standard routing)
import CleaningChecklist from './pages/CleaningChecklist';
import Closing from './pages/Closing';
import Opening from './pages/Opening';
// EmployeeHome removed — Dashboard is now the central entry point
import EmployeeProfile from './pages/EmployeeProfile';

import Stationsplan from './pages/Stationsplan';
import DataProtection from './pages/DataProtection';
import Impressum from './pages/Impressum';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AGB from './pages/AGB';
import AuditLog from './pages/AuditLog';


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
    "Home": Home,
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
    "Recipes": Recipes,
    "Reports": Reports,
    "Restock": Restock,
    "SalesAnalysis": SalesAnalysis,
    "GuestHub": GuestHub,
    "Settings": Settings,
    "ShiftSwaps": ShiftSwaps,
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
    "BusinessCard": BusinessCard,
    "ShiftAnalytics": ShiftAnalytics,
    "WeeklyTasks": WeeklyTasks,
    "WorldCupSchedule": WorldCupSchedule,
};

// Special pages: with Layout wrapper
const SPECIAL_PAGES_WITH_LAYOUT = {
    "CleaningChecklist": CleaningChecklist,
    "Closing": Closing,
    "Opening": Opening,

    "EmployeeProfile": EmployeeProfile,

    "Stationsplan": Stationsplan,
    "DataProtection": DataProtection,
    "Impressum": Impressum,
    "PrivacyPolicy": PrivacyPolicy,
    "AGB": AGB,
    "AuditLog": AuditLog,
};

// Public pages: NO layout wrapper (guest/public access)
const PUBLIC_PAGES = {
    "PublicDrinkMenu": PublicDrinkMenu,
    "StorageLocationScan": StorageLocationScan,
    // PublicReservation + GuestReservationView entfernt — nur interne Reservierungen
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