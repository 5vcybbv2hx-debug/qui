import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const barshift = createClientFromRequest(req);
    const user = await barshift.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const reports = await barshift.asServiceRole.entities.DailyRevenue.list('-date', 90);

    const response = await fetch("https://api.base44.com/api/apps/69cc90e7dfcefd0c92a3f68a/functions/receiveDailyRevenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        secret: "87b3ea5e27454880af3ea82c048fb19b", 
        records: reports 
      })
    });

    const result = await response.json();
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});