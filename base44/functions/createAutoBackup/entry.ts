import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Scheduled backup function - run daily
 * Exports all user data as JSON
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check auth
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can trigger backups
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all entities (as admin)
    const entities = [
      'Article',
      'Employee',
      'Shift',
      'Reservation',
      'Event',
      'TodoItem',
      'CleaningTask',
      'ShoppingList',
      'RestockItem',
      'Recipe',
      'Room',
      'Table',
      'Supplier',
      'CompanyInfo',
      'OpeningHours',
      'Wastage',
      'DailyRevenue',
      'TipDistribution'
    ];

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {}
    };

    // Collect all entity data
    for (const entityName of entities) {
      try {
        const data = await base44.asServiceRole.entities[entityName].list('', 10000);
        backup.data[entityName] = data;
      } catch (err) {
        console.error(`Failed to backup ${entityName}:`, err);
      }
    }

    // Save backup to private file storage
    const backupJson = JSON.stringify(backup, null, 2);
    const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
    
    // Create file
    const blob = new Blob([backupJson], { type: 'application/json' });
    const file = new File([blob], filename);
    
    // Upload to private storage
    const uploadResult = await base44.integrations.Core.UploadPrivateFile({
      file: file
    });

    // Store backup metadata
    try {
      await base44.asServiceRole.entities.Backup?.create?.({
        filename: filename,
        file_uri: uploadResult.file_uri,
        entity_count: Object.keys(backup.data).length,
        total_records: Object.values(backup.data).reduce((sum, arr) => sum + arr.length, 0),
        backed_up_at: new Date().toISOString()
      });
    } catch (e) {
      // Backup entity might not exist, that's okay
    }

    return Response.json({
      success: true,
      filename,
      entityCount: Object.keys(backup.data).length,
      recordCount: Object.values(backup.data).reduce((sum, arr) => sum + arr.length, 0)
    });
  } catch (error) {
    console.error('Backup failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});