import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];
        
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
        
        const archived = {
            shifts: 0,
            reservations: 0,
            cleaningTasks: 0,
            todos: 0,
            timeEntries: 0
        };
        
        // Archive old shifts (older than 6 months)
        const oldShifts = await base44.asServiceRole.entities.Shift.filter({});
        for (const shift of oldShifts) {
            if (shift.date < sixMonthsAgoStr) {
                await base44.asServiceRole.entities.Shift.delete(shift.id);
                archived.shifts++;
            }
        }
        
        // Archive old reservations (older than 1 year, already archived)
        const oldReservations = await base44.asServiceRole.entities.Reservation.filter({
            is_archived: true
        });
        for (const reservation of oldReservations) {
            if (reservation.date < oneYearAgoStr) {
                await base44.asServiceRole.entities.Reservation.delete(reservation.id);
                archived.reservations++;
            }
        }
        
        // Archive completed cleaning tasks (older than 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
        
        const completedTasks = await base44.asServiceRole.entities.CleaningTask.filter({
            is_completed: true
        });
        for (const task of completedTasks) {
            if (task.completed_at && task.completed_at.split('T')[0] < threeMonthsAgoStr) {
                await base44.asServiceRole.entities.CleaningTask.delete(task.id);
                archived.cleaningTasks++;
            }
        }
        
        // Archive completed todos (older than 3 months)
        const completedTodos = await base44.asServiceRole.entities.TodoItem.filter({
            status: 'erledigt',
            is_archived: true
        });
        for (const todo of completedTodos) {
            if (todo.completed_at && todo.completed_at.split('T')[0] < threeMonthsAgoStr) {
                await base44.asServiceRole.entities.TodoItem.delete(todo.id);
                archived.todos++;
            }
        }
        
        // Archive old time entries (older than 2 years)
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const twoYearsAgoStr = twoYearsAgo.toISOString().split('T')[0];
        
        const oldTimeEntries = await base44.asServiceRole.entities.TimeEntry.filter({});
        for (const entry of oldTimeEntries) {
            if (entry.date < twoYearsAgoStr) {
                await base44.asServiceRole.entities.TimeEntry.delete(entry.id);
                archived.timeEntries++;
            }
        }
        
        return Response.json({
            success: true,
            archived,
            total: Object.values(archived).reduce((a, b) => a + b, 0)
        });
    } catch (error) {
        console.error('Archive error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});