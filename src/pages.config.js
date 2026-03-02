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
import ArticleEdit from './pages/ArticleEdit';
import Articles from './pages/Articles';
import Calendar from './pages/Calendar';
import CalendarIntegration from './pages/CalendarIntegration';
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
import PublicMenu from './pages/PublicMenu';
import PublicReservation from './pages/PublicReservation';
import QRCodes from './pages/QRCodes';
import Recipes from './pages/Recipes';
import Reports from './pages/Reports';
import Reservations from './pages/Reservations';
import Restock from './pages/Restock';
import SalesAnalysis from './pages/SalesAnalysis';
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
import Warehouse from './pages/Warehouse';
import Wastage from './pages/Wastage';
import WeeklyTasks from './pages/WeeklyTasks';
import SeatingChart from './pages/SeatingChart';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ArticleEdit": ArticleEdit,
    "Articles": Articles,
    "Calendar": Calendar,
    "CalendarIntegration": CalendarIntegration,
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
    "PublicMenu": PublicMenu,
    "PublicReservation": PublicReservation,
    "QRCodes": QRCodes,
    "Recipes": Recipes,
    "Reports": Reports,
    "Reservations": Reservations,
    "Restock": Restock,
    "SalesAnalysis": SalesAnalysis,
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
    "Warehouse": Warehouse,
    "Wastage": Wastage,
    "WeeklyTasks": WeeklyTasks,
    "SeatingChart": SeatingChart,
}

export const pagesConfig = {
    mainPage: "Articles",
    Pages: PAGES,
    Layout: __Layout,
};