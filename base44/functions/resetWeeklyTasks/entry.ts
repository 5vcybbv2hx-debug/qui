import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Resets all completed weekly tasks (CleaningTask with area: 'Wochentagsaufgaben')
 * to incomplete status every Sunday at midnight.
 * Only resets tasks that have is_completed = true.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all active weekly tasks
    const allTasks = await base44.asServiceRole.entities.CleaningTask.filter({
      area: 'Wochentagsaufgaben',
      is_active: true
    });

    // Filter only completed tasks
    const completedTasks = allTasks.filter(t => t.is_completed === true);

    if (completedTasks.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No completed tasks to reset',
        resetCount: 0 
      });
    }

    // Reset each completed task
    const resetPromises = completedTasks.map(task =>
      base44.asServiceRole.entities.CleaningTask.update(task.id, {
        is_completed: false,
        completed_by: null,
        completed_at: null
      })
    );

    await Promise.all(resetPromises);

    return Response.json({ 
      success: true, 
      message: `Reset ${completedTasks.length} weekly tasks`,
      resetCount: completedTasks.length 
    });
  } catch (error) {
    console.error('Error resetting weekly tasks:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});