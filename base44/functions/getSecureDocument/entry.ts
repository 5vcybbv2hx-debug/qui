import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return Response.json({ error: 'Missing documentId' }, { status: 400 });
    }

    // Fetch the document
    const doc = await base44.asServiceRole.entities.EmployeeDocument.get(documentId);

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Access control: User can see document if:
    // 1. They are the document owner (employee_id matches their employee record)
    // 2. They are an admin/manager
    // 3. They are the manager of that employee

    const userEmployee = await base44.asServiceRole.entities.Employee.filter({
      email: user.email
    });

    const isAdmin = user.role === 'admin';
    const isManager = user.role === 'manager' || user.role === 'Manager';
    const isOwner = userEmployee[0]?.id === doc.employee_id;

    if (!isAdmin && !isManager && !isOwner) {
      // Log unauthorized access attempt
      console.warn(`[SECURITY] Unauthorized access attempt to document ${documentId} by ${user.email}`);
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Log the access for audit trail
    try {
      await base44.asServiceRole.entities.AccessLog.create({
        user_email: user.email,
        action: 'view_document',
        resource_id: documentId,
        resource_type: 'EmployeeDocument',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
    } catch {
      // Silently fail audit log (not critical for access)
    }

    return Response.json({
      document: doc,
      access_granted: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});