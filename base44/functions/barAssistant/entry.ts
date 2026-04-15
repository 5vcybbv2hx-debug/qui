import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'manager') {
        return Response.json({ error: 'Nur Manager haben Zugriff auf den Assistenten' }, { status: 403 });
    }

    const { messages, currentPage, contextData, executeAction } = await req.json();

    // ── Direct action execution (called from frontend confirmation) ──────────
    if (executeAction) {
        const result = await runAction(base44, executeAction, user);
        return Response.json(result);
    }

    // ── Load relevant app data ────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    let appContext = {};

    try {
        const [todos, shopping, employees] = await Promise.all([
            base44.asServiceRole.entities.TodoItem.filter({ is_archived: false }),
            base44.asServiceRole.entities.ShoppingList.list(),
            base44.asServiceRole.entities.Employee.filter({ is_active: true }),
        ]);

        appContext.openTodos = todos.filter(t => t.status !== 'erledigt').length;
        appContext.doneTodos = todos.filter(t => t.status === 'erledigt');
        appContext.urgentTodos = todos.filter(t => t.priority === 'dringend' && t.status !== 'erledigt');
        appContext.openShoppingItems = shopping.filter(s => s.status === 'offen').length;
        appContext.receivedShoppingItems = shopping.filter(s => s.status === 'erhalten');
        appContext.employeeCount = employees.length;

        if (currentPage === 'Shopping' || currentPage === 'Warehouse' || currentPage === 'Articles') {
            const [articles, wastage] = await Promise.all([
                base44.asServiceRole.entities.Article.list(),
                base44.asServiceRole.entities.Wastage.list('-created_date', 30),
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
            appContext.todosByPriority = {
                dringend: todos.filter(t => t.priority === 'dringend' && t.status !== 'erledigt'),
                hoch: todos.filter(t => t.priority === 'hoch' && t.status !== 'erledigt'),
                erledigt_alt: todos.filter(t => t.status === 'erledigt').slice(0, 10),
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

Du hast Zugriff auf die aktuellen Betriebsdaten der Bar und kannst aktiv helfen, die App aufzuräumen und zu verbessern.

DEINE FÄHIGKEITEN:
1. Verknüpfungen erkennen und vorschlagen (z.B. Schwund → Todo, Mindestbestand → Einkaufsliste)
2. Kontextbezogene Hinweise geben (was ist jetzt wichtig?)
3. App aufräumen: Alte/erledigte Daten archivieren, Duplikate melden, Ordnung herstellen
4. Aktionen vorschlagen und SAFE-Aktionen direkt ausführen
5. Destruktive Aktionen (Löschen) NUR vorschlagen — niemals ohne Manager-Bestätigung ausführen

AKTUELLER KONTEXT:
- Datum: ${today}
- Aktuelle Seite: ${currentPage || 'Dashboard'}
- Nutzer: ${user.full_name || user.email}

APP-DATEN (aktuell):
${JSON.stringify(appContext, null, 2)}

${contextData ? `ZUSÄTZLICHER KONTEXT:\n${JSON.stringify(contextData)}` : ''}

VERHALTEN:
- Antworte immer auf Deutsch
- Sei präzise und handlungsorientiert
- Nutze Emojis sparsam aber gezielt
- Halte Antworten kompakt (max 3-4 Absätze, außer wenn Details gefragt)

AKTIONEN — wichtig: Trenne SAFE von DESTRUCTIVE!

SAFE-Aktionen (automatisch ausführbar, kein Confirm nötig):
ACTION:{"type":"create_todo","data":{"title":"...","priority":"mittel","description":"...","category":"Sonstiges"}}
ACTION:{"type":"add_shopping","data":{"item":"...","quantity":1,"category":"..."}}
ACTION:{"type":"archive_todo","data":{"id":"...","title":"..."}}
ACTION:{"type":"update_todo_status","data":{"id":"...","status":"erledigt","title":"..."}}
ACTION:{"type":"mark_shopping_received","data":{"id":"...","item_name":"..."}}

DESTRUCTIVE-Aktionen (IMMER Bestätigung anfordern, NIE automatisch):
ACTION:{"type":"delete_todo","data":{"id":"...","title":"..."},"confirm_required":true,"confirm_label":"Todo \"...\" löschen"}
ACTION:{"type":"delete_shopping","data":{"id":"...","item_name":"..."},"confirm_required":true,"confirm_label":"Einkaufsartikel \"...\" löschen"}
ACTION:{"type":"bulk_archive_done_todos","data":{},"confirm_required":true,"confirm_label":"Alle erledigten Todos archivieren"}
ACTION:{"type":"bulk_delete_received_shopping","data":{},"confirm_required":true,"confirm_label":"Alle erhaltenen Einkaufsartikel löschen"}

Wenn du Aufräum-Vorschläge machst, liste sie konkret auf und füge die passenden ACTION-Zeilen ein.
Der Manager sieht Bestätigungs-Buttons für alles was confirm_required:true hat.`;

    const conversationText = messages
        .map(m => `${m.role === 'user' ? 'Nutzer' : 'Assistent'}: ${m.content}`)
        .join('\n\n');

    const fullPrompt = `${systemPrompt}\n\n---\n\nKONVERSATION:\n${conversationText}\n\nAssistent:`;

    const textResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        model: 'claude_sonnet_4_6',
    });

    let reply = textResponse || '';
    let safeActions = [];
    let confirmActions = [];

    // Parse ACTION lines
    const actionRegex = /ACTION:(\{[^\n]+\})/g;
    let match;
    while ((match = actionRegex.exec(reply)) !== null) {
        try {
            const action = JSON.parse(match[1]);
            if (action.confirm_required) {
                confirmActions.push(action);
            } else {
                safeActions.push(action);
            }
        } catch (e) { /* skip */ }
    }
    reply = reply.replace(/ACTION:\{[^\n]+\}/g, '').trim();

    // Auto-execute safe actions
    const executedActions = [];
    for (const action of safeActions) {
        const result = await runAction(base44, action, user);
        if (result.success) executedActions.push(result.label);
    }

    if (executedActions.length > 0) {
        reply += '\n\n' + executedActions.map(l => `✅ ${l}`).join('\n');
    }

    return Response.json({ reply, confirmActions, executedActions });
});

// ── Action runner ─────────────────────────────────────────────────────────────
async function runAction(base44, action, user) {
    const label = action.confirm_label || action.type;
    try {
        switch (action.type) {

            case 'create_todo':
                await base44.asServiceRole.entities.TodoItem.create({
                    title: action.data.title,
                    priority: action.data.priority || 'mittel',
                    description: action.data.description || '',
                    status: 'offen',
                    category: action.data.category || 'Sonstiges',
                });
                return { success: true, label: `Todo erstellt: "${action.data.title}"` };

            case 'add_shopping':
                await base44.asServiceRole.entities.ShoppingList.create({
                    item_name: action.data.item,
                    quantity: action.data.quantity || 1,
                    category: action.data.category || 'Sonstiges',
                    status: 'offen',
                });
                return { success: true, label: `Einkauf hinzugefügt: "${action.data.item}"` };

            case 'archive_todo':
                await base44.asServiceRole.entities.TodoItem.update(action.data.id, { is_archived: true });
                return { success: true, label: `Todo archiviert: "${action.data.title}"` };

            case 'update_todo_status':
                await base44.asServiceRole.entities.TodoItem.update(action.data.id, { status: action.data.status });
                return { success: true, label: `Todo aktualisiert: "${action.data.title}"` };

            case 'mark_shopping_received':
                await base44.asServiceRole.entities.ShoppingList.update(action.data.id, { status: 'erhalten' });
                return { success: true, label: `Als erhalten markiert: "${action.data.item_name}"` };

            // ── Destructive (only via confirmed execution) ──
            case 'delete_todo':
                await base44.asServiceRole.entities.TodoItem.delete(action.data.id);
                return { success: true, label: `Todo gelöscht: "${action.data.title}"` };

            case 'delete_shopping':
                await base44.asServiceRole.entities.ShoppingList.delete(action.data.id);
                return { success: true, label: `Einkaufsartikel gelöscht: "${action.data.item_name}"` };

            case 'bulk_archive_done_todos': {
                const doneTodos = await base44.asServiceRole.entities.TodoItem.filter({ status: 'erledigt', is_archived: false });
                await Promise.all(doneTodos.map(t => base44.asServiceRole.entities.TodoItem.update(t.id, { is_archived: true })));
                return { success: true, label: `${doneTodos.length} erledigte Todos archiviert` };
            }

            case 'bulk_delete_received_shopping': {
                const received = await base44.asServiceRole.entities.ShoppingList.filter({ status: 'erhalten' });
                await Promise.all(received.map(s => base44.asServiceRole.entities.ShoppingList.delete(s.id)));
                return { success: true, label: `${received.length} erhaltene Einkaufsartikel gelöscht` };
            }

            default:
                return { success: false, label: `Unbekannte Aktion: ${action.type}` };
        }
    } catch (e) {
        return { success: false, label: `Fehler bei "${label}": ${e.message}` };
    }
}