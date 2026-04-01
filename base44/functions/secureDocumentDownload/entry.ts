import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Secure document download with access control & logging
 * - Validates user permissions
 * - Logs access
 * - Returns signed download URL
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await req.json();

    // Fetch document
    const docs = await base44.entities.EmployeeDocument.filter({ 
      id: documentId 
    });

    if (docs.length === 0) {
      await base44.asServiceRole.functions.invoke('logAccessAction', {
        action: 'view_document',
        resource_id: documentId,
        resource_type: 'EmployeeDocument',
        status: 'denied',
        notes: 'Document not found'
      });

      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docs[0];

    // Access control: Only owner, manager, or admin can access
    const isOwner = doc.employee_id === user.email;
    const isManager = user.role === 'manager' || user.role === 'admin';

    if (!isOwner && !isManager) {
      await base44.asServiceRole.functions.invoke('logAccessAction', {
        action: 'view_document',
        resource_id: documentId,
        resource_type: 'EmployeeDocument',
        status: 'denied',
        notes: 'Insufficient permissions'
      });

      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Log successful access
    await base44.asServiceRole.functions.invoke('logAccessAction', {
      action: 'view_document',
      resource_id: documentId,
      resource_type: 'EmployeeDocument',
      status: 'success',
      notes: `Document: ${doc.file_name}`
    });

    // Create signed URL for download
    const signedUrl = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: doc.file_url,
      expires_in: 3600 // 1 hour
    });

    return Response.json({ 
      signed_url: signedUrl.signed_url,
      file_name: doc.file_name,
      file_type: doc.file_type
    });

  } catch (error) {
    console.error('Download error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});