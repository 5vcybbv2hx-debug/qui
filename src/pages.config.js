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
import Shifts from './pages/Shifts';
import Shopping from './pages/Shopping';
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
    "Shifts": Shifts,
    "Shopping": Shopping,
    "TimeTracking": TimeTracking,
    "Todos": Todos,
    "Vacation": Vacation,
}

export const pagesConfig = {
    mainPage: "MyDashboard",
    Pages: PAGES,
    Layout: __Layout,
};