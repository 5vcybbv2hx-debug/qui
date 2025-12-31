import Dashboard from './pages/Dashboard';
import Shifts from './pages/Shifts';
import Cleaning from './pages/Cleaning';
import Todos from './pages/Todos';
import Employees from './pages/Employees';


export const PAGES = {
    "Dashboard": Dashboard,
    "Shifts": Shifts,
    "Cleaning": Cleaning,
    "Todos": Todos,
    "Employees": Employees,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};