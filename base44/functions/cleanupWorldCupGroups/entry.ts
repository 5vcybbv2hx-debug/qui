import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Einmalige Bereinigung: KO-Match group_names leeren + Teams aus Labels befüllen
Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    const VALID = new Set(['Gruppe A','Gruppe B','Gruppe C','Gruppe D','Gruppe E','Gruppe F',
        'Gruppe G','Gruppe H','Gruppe I','Gruppe J','Gruppe K','Gruppe L']);

    const all = await base44.asServiceRole.entities.WorldCupMatch.list('kickoff_time', 500);
    const toFix = all.filter((m: any) => m.group_name && !VALID.has(m.group_name));

    let fixed = 0;
    for (const m of toFix) {
        await base44.asServiceRole.entities.WorldCupMatch.update(m.id, { group_name: '' });
        fixed++;
    }

    return Response.json({ success: true, total: all.length, fixed,
        message: `✅ ${fixed} KO-Matches bereinigt` });
});
