import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Logs critical actions to AccessLog entity
 * Called by automation when:
 * - Employee records are accessed
 * - Documents are uploaded/deleted
 * - Sensitive roles are modified
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      action,
      resource_id,
      resource_type,
      status = 'success',
      notes = null
    } = await req.json();

    // Log the action
    await base44.entities.AccessLog.create({
      user_email: user.email,
      action,
      resource_id,
      resource_type,
      status,
      timestamp: new Date().toISOString(),
      notes,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown'
    });

    return Response.json({ 
      success: true, 
      message: 'Action logged' 
    });

  } catch (error) {
    console.error('Logging error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});