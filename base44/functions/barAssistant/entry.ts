import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'manager') {
        return Response.json({ error: 'Nur Manager haben Zugriff auf den Assistenten' }, { status: 403 });
    }

    const { messages, currentPage, contextData } = await req.json();

    // Load relevant app data based on context
    const today = new Date().toISOString().split('T')[0];
    
    let appContext = {};

    try {
        // Always load todos and shopping
        const [todos, shopping, employees] = await Promise.all([
            base44.asServiceRole.entities.TodoItem.filter({ is_archived: false }),
            base44.asServiceRole.entities.ShoppingList.filter({ status: 'offen' }),
            base44.asServiceRole.entities.Employee.filter({ is_active: true }),
        ]);

        appContext.openTodos = todos.filter(t => t.status !== 'erledigt').length;
        appContext.urgentTodos = todos.filter(t => t.priority === 'dringend' && t.status !== 'erledigt');
        appContext.openShoppingItems = shopping.length;
        appContext.employeeCount = employees.length;

        // Load page-specific data
        if (currentPage === 'Shopping' || currentPage === 'Warehouse' || currentPage === 'Articles') {
            const [articles, wastage] = await Promise.all([
                base44.asServiceRole.entities.Article.list(),
                base44.asServiceRole.entities.Wastage.list('-created_date', 20),
            ]);
            appContext.lowStockArticles = articles.filter(a => a.min_stock && a.current_stock <= a.min_stock);
            appContext.recentWastage = wastage.slice(0, 10);
        }

        if (currentPage === 'Calendar' || currentPage === 'TeamCalendar' || currentPage === 'Dashboard') {
            const shifts = await base44.asServiceRole.entities.Shift.filter({ date: today });
            appContext.todayShifts = shifts;
            appContext.todayDate = today;
        }

        if (currentPage === 'Todos') {
            const allTodos = await base44.asServiceRole.entities.TodoItem.filter({ is_archived: false });
            appContext.todosByPriority = {
                dringend: allTodos.filter(t => t.priority === 'dringend' && t.status !== 'erledigt'),
                hoch: allTodos.filter(t => t.priority === 'hoch' && t.status !== 'erledigt'),
            };
        }

        if (currentPage === 'Cleaning') {
            const cleaning = await base44.asServiceRole.entities.CleaningTask.filter({ is_active: true });
            appContext.overdueCleaning = cleaning.filter(t => !t.is_completed);
        }

        if (currentPage === 'Wastage') {
            const wastage = await base44.asServiceRole.entities.Wastage.list('-created_date', 50);
            appContext.recentWastage = wastage;
        }

        if (currentPage === 'GuestHub' || currentPage === 'Reservations') {
            const reservations = await base44.asServiceRole.entities.Reservation.filter({ date: today });
            appContext.todayReservations = reservations;
        }

    } catch (e) {
        // continue with partial data
    }

    const systemPrompt = `Du bist "BarAssist" — ein intelligenter KI-Assistent für das Bar-Management-System "BarManager".

Du hast Zugriff auf die aktuellen Betriebsdaten der Bar und hilfst dem Manager proaktiv.

DEINE FÄHIGKEITEN:
1. Verknüpfungen erkennen und vorschlagen (z.B. Schwund-Einträge → Todo erstellen, Artikel-Mindestbestand → Einkaufsliste)
2. Kontextbezogene Hinweise geben (was ist gerade wichtig?)
3. Aktionen vorschlagen (konkrete nächste Schritte)
4. Daten analysieren und Muster erkennen

AKTUELLER KONTEXT:
- Datum: ${today}
- Aktuelle Seite: ${currentPage || 'Dashboard'}
- Nutzer: ${user.full_name || user.email}

APP-DATEN (aktuell):
${JSON.stringify(appContext, null, 2)}

ZUSÄTZLICHER KONTEXT VOM NUTZER:
${contextData ? JSON.stringify(contextData) : 'keiner'}

VERHALTEN:
- Antworte immer auf Deutsch
- Sei präzise und handlungsorientiert
- Wenn du Verknüpfungen siehst, zeige sie konkret auf
- Wenn du Aktionen empfiehlst, sei spezifisch (was genau, warum)
- Nutze Emojis sparsam aber gezielt
- Halte Antworten kompakt (max 3-4 Absätze, außer wenn Details gefragt)
- Wenn du eine Aktion ausführen kannst (z.B. Todo erstellen), beschreibe was du tust mit dem Präfix "ACTION:" gefolgt von JSON

AKTIONS-FORMAT (wenn du eine Aktion ausführen sollst):
ACTION:{"type":"create_todo","title":"...","priority":"hoch","description":"..."}
ACTION:{"type":"add_shopping","item":"...","quantity":1,"category":"..."}
ACTION:{"type":"link_suggestion","from":"...","to":"...","reason":"..."}`;

    const conversationText = messages
        .map(m => `${m.role === 'user' ? 'Nutzer' : 'Assistent'}: ${m.content}`)
        .join('\n\n');

    const fullPrompt = `${systemPrompt}\n\n---\n\nKONVERSATION:\n${conversationText}\n\nAssistent:`;

    const textResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
    });

    let reply = textResponse || '';
    let actions = [];
    let suggestions = [];

    // Extract ACTION lines
    const actionMatches = reply.match(/ACTION:\{[^\n]+\}/g) || [];
    actions = actionMatches.map(a => {
        try { return JSON.parse(a.replace('ACTION:', '')); } catch { return null; }
    }).filter(Boolean);
    reply = reply.replace(/ACTION:\{[^\n]+\}/g, '').trim();

    // Execute approved actions automatically for safe ones
    const executedActions = [];
    for (const action of actions) {
        try {
            if (action.type === 'create_todo' && action.data) {
                await base44.asServiceRole.entities.TodoItem.create({
                    title: action.data.title,
                    priority: action.data.priority || 'mittel',
                    description: action.data.description || '',
                    status: 'offen',
                    category: action.data.category || 'Sonstiges',
                });
                executedActions.push(`✅ Todo erstellt: "${action.data.title}"`);
            }
            if (action.type === 'add_shopping' && action.data) {
                await base44.asServiceRole.entities.ShoppingList.create({
                    item_name: action.data.item,
                    quantity: action.data.quantity || 1,
                    category: action.data.category || 'Sonstiges',
                    status: 'offen',
                });
                executedActions.push(`✅ Einkauf hinzugefügt: "${action.data.item}"`);
            }
        } catch (e) {
            // skip failed actions
        }
    }

    if (executedActions.length > 0) {
        reply += '\n\n' + executedActions.join('\n');
    }

    return Response.json({ reply, actions, suggestions, executedActions });
});