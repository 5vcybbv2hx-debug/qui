import Cleaning from './pages/Cleaning';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Events from './pages/Events';
import Recipes from './pages/Recipes';
import Reservations from './pages/Reservations';
import Restock from './pages/Restock';
import ShiftAnalytics from './pages/ShiftAnalytics';
import Shifts from './pages/Shifts';
import Shopping from './pages/Shopping';
import Todos from './pages/Todos';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Cleaning": Cleaning,
    "Dashboard": Dashboard,
    "Employees": Employees,
    "Events": Events,
    "Recipes": Recipes,
    "Reservations": Reservations,
    "Restock": Restock,
    "ShiftAnalytics": ShiftAnalytics,
    "Shifts": Shifts,
    "Shopping": Shopping,
    "Todos": Todos,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};