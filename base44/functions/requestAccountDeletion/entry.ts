import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();

    // Verify the email matches the authenticated user
    if (email !== user.email) {
      return Response.json({ error: 'Email mismatch' }, { status: 403 });
    }

    // Create a deletion request record (for audit trail)
    await base44.asServiceRole.entities.DeletionRequest.create({
      user_email: email,
      requested_date: new Date().toISOString(),
      status: 'pending',
      reason: 'User requested account deletion (Art. 17 DSGVO)'
    });

    // Send confirmation email (if available)
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Bestätigung: Löschanfrage eingegangen',
        body: `Hallo,\n\nWir haben Ihre Anfrage zur Löschung Ihres Kontos und Ihrer personenbezogenen Daten erhalten. Wir werden diese verarbeitet und Sie innerhalb von 30 Tagen kontaktieren.\n\nMit freundlichen Grüßen,\nDas Team`
      });
    } catch {
      // Silently fail email (not critical)
    }

    return Response.json({ 
      message: 'Deletion request received. You will be contacted within 30 days.',
      status: 'pending'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});