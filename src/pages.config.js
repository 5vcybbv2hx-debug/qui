import Cleaning from './pages/Cleaning';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Reservations from './pages/Reservations';
import Restock from './pages/Restock';
import Shifts from './pages/Shifts';
import Todos from './pages/Todos';
import Shopping from './pages/Shopping';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Cleaning": Cleaning,
    "Dashboard": Dashboard,
    "Employees": Employees,
    "Reservations": Reservations,
    "Restock": Restock,
    "Shifts": Shifts,
    "Todos": Todos,
    "Shopping": Shopping,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};