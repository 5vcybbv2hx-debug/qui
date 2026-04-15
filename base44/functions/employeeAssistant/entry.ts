import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { messages, currentPage } = await req.json();

    // Load employee-specific data
    const today = new Date().toISOString().split('T')[0];
    let appContext = {};

    try {
        // Get current employee
        const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email, is_active: true });
        const currentEmployee = employees[0];

        if (currentEmployee) {
            // Deine Schichten heute
            const shifts = await base44.asServiceRole.entities.Shift.filter({
                date: today,
                employee_id: currentEmployee.id,
            });
            appContext.myShifts = shifts;

            // Deine Aufgaben (zugewiesen an dich)
            const allTodos = await base44.asServiceRole.entities.TodoItem.filter({ is_archived: false });
            const assigned = allTodos.filter(t => {
                const assignees = t.assigned_to_names?.length > 0 ? t.assigned_to_names : t.assigned_to ? [t.assigned_to] : [];
                return assignees.includes(user.full_name) || assignees.includes(user.email);
            });
            appContext.myTodos = assigned.filter(t => t.status !== 'erledigt');
            appContext.myCompletedTodos = assigned.filter(t => t.status === 'erledigt').slice(0, 5);

            // Putzaufgaben (falls Mitarbeiter die Seite anschaut)
            if (currentPage === 'Cleaning') {
                const cleaning = await base44.asServiceRole.entities.CleaningTask.filter({ is_active: true });
                appContext.cleaningTasks = cleaning;
                appContext.myCleaningTasks = cleaning.filter(t => t.assigned_to === currentEmployee.id || !t.assigned_to);
            }

            appContext.employeeName = currentEmployee.name;
            appContext.mySkills = currentEmployee.skills || [];
        }

        appContext.todayDate = today;
    } catch (e) {
        // continue with partial data
    }

    const systemPrompt = `Du bist "BarAssist" — ein freundlicher KI-Helfer für Mitarbeiter des Bar-Management-Systems "BarManager".

Du hilfst Mitarbeitern im Alltag bei der App:
- Funktionen finden und verstehen
- Putzlisten abarbeiten
- Aufgaben und Schichten checken
- Fragen zur App beantworten

DEIN DATENZUGRIFF:
- Du siehst nur die Daten des aktuellen Mitarbeiters (Schichten, zugewiesene Aufgaben, Berechtigungen)
- Du kannst Status von Aufgaben aktualisieren (z.B. als erledigt markieren)
- Du DARFST KEINE Daten löschen oder andere Mitarbeiter beeinflussen

AKTUELLER KONTEXT:
- Datum: ${today}
- Aktuelle Seite: ${currentPage || 'Dashboard'}
- Mitarbeiter: ${user.full_name || user.email}

MEINE DATEN:
${JSON.stringify(appContext, null, 2)}

VERHALTEN:
- Antworte auf Deutsch
- Sei freundlich und ermutigend
- Nutze einfache Sprache
- Halte Antworten kurz und prägnant
- Wenn Mitarbeiter eine Aufgabe als erledigt markieren möchte, zeige die ACTION

SICHERE AKTIONEN (Mitarbeiter können diese ausführen):
ACTION:{"type":"update_todo_status","data":{"id":"...","status":"erledigt","title":"..."}}
ACTION:{"type":"update_cleaning_status","data":{"id":"...","is_completed":true,"title":"..."}}

Beispiel — wenn ein Mitarbeiter sagt "Putzaufgabe XYZ ist fertig":
ACTION:{"type":"update_cleaning_status","data":{"id":"task-id","is_completed":true,"title":"XYZ"}}`;

    const conversationText = messages
        .map(m => `${m.role === 'user' ? 'Mitarbeiter' : 'Assistent'}: ${m.content}`)
        .join('\n\n');

    const fullPrompt = `${systemPrompt}\n\n---\n\nKONVERSATION:\n${conversationText}\n\nAssistent:`;

    const textResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
    });

    let reply = textResponse || '';
    let actions = [];

    // Parse ACTION lines
    const actionRegex = /ACTION:(\{[^\n]+\})/g;
    let match;
    while ((match = actionRegex.exec(reply)) !== null) {
        try {
            const action = JSON.parse(match[1]);
            actions.push(action);
        } catch (e) { /* skip */ }
    }
    reply = reply.replace(/ACTION:\{[^\n]+\}/g, '').trim();

    // Auto-execute safe actions
    const executedActions = [];
    for (const action of actions) {
        try {
            if (action.type === 'update_todo_status') {
                await base44.entities.TodoItem.update(action.data.id, { status: action.data.status });
                executedActions.push(`✅ Aufgabe aktualisiert: "${action.data.title}"`);
            }
            if (action.type === 'update_cleaning_status') {
                await base44.entities.CleaningTask.update(action.data.id, { is_completed: action.data.is_completed });
                executedActions.push(`✅ Putzaufgabe erledigt: "${action.data.title}"`);
            }
        } catch (e) {
            // skip failed actions
        }
    }

    if (executedActions.length > 0) {
        reply += '\n\n' + executedActions.join('\n');
    }

    return Response.json({ reply, executedActions });
});