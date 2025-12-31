import Dashboard from './pages/Dashboard';
import Shifts from './pages/Shifts';
import Cleaning from './pages/Cleaning';
import Todos from './pages/Todos';
import Employees from './pages/Employees';
import Reservations from './pages/Reservations';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Shifts": Shifts,
    "Cleaning": Cleaning,
    "Todos": Todos,
    "Employees": Employees,
    "Reservations": Reservations,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};