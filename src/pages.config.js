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
import Articles from './pages/Articles';
import Budget from './pages/Budget';
import CalendarIntegration from './pages/CalendarIntegration';
import Cleaning from './pages/Cleaning';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Events from './pages/Events';
import MyDashboard from './pages/MyDashboard';
import PriceCalculator from './pages/PriceCalculator';
import Recipes from './pages/Recipes';
import Reports from './pages/Reports';
import Reservations from './pages/Reservations';
import Restock from './pages/Restock';
import ShiftAnalytics from './pages/ShiftAnalytics';
import ShiftSwaps from './pages/ShiftSwaps';
import Shifts from './pages/Shifts';
import Shopping from './pages/Shopping';
import TeamMeeting from './pages/TeamMeeting';
import TimeTracking from './pages/TimeTracking';
import Todos from './pages/Todos';
import Vacation from './pages/Vacation';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Articles": Articles,
    "Budget": Budget,
    "CalendarIntegration": CalendarIntegration,
    "Cleaning": Cleaning,
    "Dashboard": Dashboard,
    "Employees": Employees,
    "Events": Events,
    "MyDashboard": MyDashboard,
    "PriceCalculator": PriceCalculator,
    "Recipes": Recipes,
    "Reports": Reports,
    "Reservations": Reservations,
    "Restock": Restock,
    "ShiftAnalytics": ShiftAnalytics,
    "ShiftSwaps": ShiftSwaps,
    "Shifts": Shifts,
    "Shopping": Shopping,
    "TeamMeeting": TeamMeeting,
    "TimeTracking": TimeTracking,
    "Todos": Todos,
    "Vacation": Vacation,
}

export const pagesConfig = {
    mainPage: "MyDashboard",
    Pages: PAGES,
    Layout: __Layout,
};