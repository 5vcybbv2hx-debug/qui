import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { getTodayOperationDate } from '@/lib/nightUtils';
import { getTaskStatus } from '@/lib/maintenanceUtils';

export function useDashboardData({ isManager, currentEmployee }) {
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list('-date', 1000)
    });
    const { data: events = [] } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list('date', 50)
    });
    const { data: reservations = [] } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list('-date', 50)
    });
    const { data: todos = [] } = useQuery({
        queryKey: ['todos'],
        queryFn: () => base44.entities.TodoItem.filter({ is_archived: false })
    });
    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });
    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list()
    });
    const { data: shopping = [] } = useQuery({
        queryKey: ['shopping-list'],
        queryFn: () => base44.entities.ShoppingList.list()
    });
    const { data: maintenanceTasks = [] } = useQuery({
        queryKey: ['maintenance-tasks'],
        queryFn: () => base44.entities.MaintenanceTask.filter({ is_active: true }),
        enabled: isManager
    });
    const { data: timeEntries = [] } = useQuery({
        queryKey: ['time-entries'],
        queryFn: () => base44.entities.TimeEntry.list('-date', 100),
        staleTime: 2 * 60 * 1000,
    });
    const { data: pendingTimeEntries = [] } = useQuery({
        queryKey: ['pending-time-entries'],
        queryFn: () => base44.entities.TimeEntry.filter({ status: 'eingereicht' }),
        enabled: isManager,
        staleTime: 2 * 60 * 1000,
    });
    const { data: vacationRequests = [] } = useQuery({
        queryKey: ['vacation-requests'],
        queryFn: () => base44.entities.VacationRequest.list('-created_date', 50),
        enabled: isManager
    });

    // Derived values
    const todayShifts = shifts.filter(s => s.date === today);
    const todayEvents = events.filter(e => e.date === today && e.status !== 'abgesagt');
    const todayReservations = reservations.filter(r => r.date === today && r.status !== 'storniert');
    const upcomingEvents = events.filter(e => new Date(e.date) > new Date());
    const openTodos = todos.filter(t => t.status !== 'erledigt');

    const myTodos = currentEmployee
        ? openTodos.filter(t => t.assigned_to === currentEmployee.email || t.assigned_to === currentEmployee.name)
        : openTodos;

    const upcomingShifts = useMemo(() => {
        const future = shifts.filter(s => s.date >= today);
        return future.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);
    }, [shifts, today]);

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEntries = timeEntries.filter(e => {
        if (e.employee_id !== currentEmployee?.id) return false;
        const d = parseISO(e.date);
        return d >= weekStart && d <= weekEnd;
    });
    const hoursThisWeek = weekEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

    const myUpcomingShifts = shifts.filter(s => s.employee_id === currentEmployee?.id && s.date >= today);
    const approvedVacations = vacationRequests.filter(v => v.employee_id === currentEmployee?.id && v.status === 'genehmigt' && v.type === 'Urlaub');
    const usedVacationDays = approvedVacations.reduce((sum, v) => sum + (v.days_count || 0), 0);
    const remainingVacationDays = (currentEmployee?.vacation_days_per_year || 0) - usedVacationDays;

    const lowStockArticles = articles.filter(a => a.min_stock && a.current_stock <= a.min_stock);
    const pendingVacationRequests = vacationRequests.filter(r => r.status === 'beantragt');
    const urgentMaintenance = maintenanceTasks.filter(t => getTaskStatus(t) === 'überfällig');

    return {
        today,
        shifts,
        events,
        reservations,
        todos,
        employees,
        articles,
        shopping,
        maintenanceTasks,
        timeEntries,
        pendingTimeEntries,
        vacationRequests,
        // derived
        todayShifts,
        todayEvents,
        todayReservations,
        upcomingEvents,
        openTodos,
        myTodos,
        upcomingShifts,
        hoursThisWeek,
        myUpcomingShifts,
        remainingVacationDays,
        lowStockArticles,
        pendingVacationRequests,
        urgentMaintenance,
    };
}