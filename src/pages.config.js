import Cleaning from './pages/Cleaning';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Reservations from './pages/Reservations';
import Shifts from './pages/Shifts';
import Todos from './pages/Todos';
import Restock from './pages/Restock';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Cleaning": Cleaning,
    "Dashboard": Dashboard,
    "Employees": Employees,
    "Reservations": Reservations,
    "Shifts": Shifts,
    "Todos": Todos,
    "Restock": Restock,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};