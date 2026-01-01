import Cleaning from './pages/Cleaning';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Reservations from './pages/Reservations';
import Restock from './pages/Restock';
import Shifts from './pages/Shifts';
import Shopping from './pages/Shopping';
import Todos from './pages/Todos';
import Recipes from './pages/Recipes';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Cleaning": Cleaning,
    "Dashboard": Dashboard,
    "Employees": Employees,
    "Reservations": Reservations,
    "Restock": Restock,
    "Shifts": Shifts,
    "Shopping": Shopping,
    "Todos": Todos,
    "Recipes": Recipes,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};