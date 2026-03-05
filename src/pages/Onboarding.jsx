import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Users, RotateCcw, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/components/auth/usePermissions';
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: 'kasse', title: 'Kasse und EC Geräte', icon: '🖥️' },
  { id: 'spuelmaschine', title: 'Spülmaschine', icon: '🫧' },
  { id: 'kaffeemaschine', title: 'Kaffeemaschine', icon: '☕' },
  { id: 'keller', title: 'Keller', icon: '🏚️' },
  { id: 'nachschubschrank', title: 'Nachschubschrank (Tunnel)', icon: '📦' },
];

export default function Onboarding() {
  const permissions = usePermissions();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState({ kasse: true });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => base44.entities.Employee.filter({ is_active: true }),
    enabled: permissions.isManager,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['onboarding-tasks'],
    queryFn: () => base44.entities.OnboardingTask.list('order'),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['onboarding-progress', selectedEmployee],
    queryFn: () => selectedEmployee 
      ? base44.entities.OnboardingProgress.filter({ employee_id: selectedEmployee })
      : Promise.resolve([]),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ taskId, taskTitle, taskCategory, employeeId, employeeName, currentProgress }) => {
      const existing = currentProgress.find(p => p.task_id === taskId && p.employee_id === employeeId);
      if (existing) {
        await base44.entities.OnboardingProgress.delete(existing.id);
      } else {
        await base44.entities.OnboardingProgress.create({
          employee_id: employeeId,
          employee_name: employeeName,
          task_id: taskId,
          task_title: taskTitle,
          task_category: taskCategory,
          is_completed: true,
          completed_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['onboarding-progress']),
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ progressId, notes }) => {
      await base44.entities.OnboardingProgress.update(progressId, { notes });
    },
    onSuccess: () => queryClient.invalidateQueries(['onboarding-progress']),
  });

  const resetMutation = useMutation({
    mutationFn: async (employeeId) => {
      const toDelete = progress.filter(p => p.employee_id === employeeId);
      await Promise.all(toDelete.map(p => base44.entities.OnboardingProgress.delete(p.id)));
    },
    onSuccess: () => queryClient.invalidateQueries(['onboarding-progress']),
  });

  const targetEmployee = permissions.isManager
    ? employees.find(e => e.id === selectedEmployee)
    : null;

  const isTaskCompleted = (taskId, employeeId) => {
    return progress.some(p => p.task_id === taskId && p.employee_id === employeeId && p.is_completed);
  };

  const getTaskNotes = (taskId, employeeId) => {
    const prog = progress.find(p => p.task_id === taskId && p.employee_id === employeeId);
    return prog?.notes || '';
  };

  const getCategoryProgress = (categoryId, employeeId) => {
    const categoryTasks = tasks.filter(t => t.category === categoryId);
    const done = categoryTasks.filter(t => isTaskCompleted(t.id, employeeId)).length;
    return { done, total: categoryTasks.length };
  };

  const getTotalProgress = (employeeId) => {
    const done = tasks.filter(t => isTaskCompleted(t.id, employeeId)).length;
    return { done, total: tasks.length };
  };

  const toggleSection = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // For non-managers, use their own employee record
  const [myEmployee, setMyEmployee] = useState(null);
  useEffect(() => {
    if (!permissions.isManager) {
      base44.auth.me().then(user => {
        base44.entities.Employee.filter({ email: user.email, is_active: true }).then(emps => {
          if (emps[0]) setMyEmployee(emps[0]);
        });
      });
    }
  }, [permissions.isManager]);

  const activeEmployeeId = permissions.isManager ? selectedEmployee : myEmployee?.id;
  const activeEmployeeName = permissions.isManager
    ? targetEmployee?.name
    : myEmployee?.name;

  const { done: totalDone, total: totalAll } = activeEmployeeId
    ? getTotalProgress(activeEmployeeId)
    : { done: 0, total: tasks.length };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Einlernliste</h1>
          <p className="text-muted-foreground text-sm mt-1">Schritt-für-Schritt Einarbeitung für neue Mitarbeiter</p>
        </div>

        {/* Manager: Mitarbeiter auswählen */}
        {permissions.isManager && (
          <Card className="p-4 bg-card border-border mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users className="w-4 h-4 text-amber-500" />
                Mitarbeiter auswählen:
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                {employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                      selectedEmployee === emp.id
                        ? 'bg-amber-500 text-slate-900 border-amber-500'
                        : 'bg-card border-border text-muted-foreground hover:border-amber-500/50 hover:text-foreground'
                    )}
                  >
                    {emp.name}
                  </button>
                ))}
              </div>
              {selectedEmployee && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                  onClick={() => {
                    if (confirm('Einlernliste für diesen Mitarbeiter zurücksetzen?')) {
                      resetMutation.mutate(selectedEmployee);
                    }
                  }}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Zurücksetzen
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Fortschritt */}
        {activeEmployeeId && (
          <Card className="p-4 bg-card border-border mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">
                Gesamtfortschritt {activeEmployeeName && `– ${activeEmployeeName}`}
              </span>
              <Badge className={cn(
                'text-xs',
                totalDone === totalAll ? 'bg-green-600' : 'bg-amber-600'
              )}>
                {totalDone} / {totalAll}
              </Badge>
            </div>
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 rounded-full"
                style={{ width: `${totalAll > 0 ? (totalDone / totalAll) * 100 : 0}%` }}
              />
            </div>
            {totalDone === totalAll && totalAll > 0 && (
              <p className="text-sm text-green-400 mt-2 font-medium">🎉 Einlernliste vollständig abgehakt!</p>
            )}
          </Card>
        )}

        {/* Hint wenn kein Mitarbeiter ausgewählt (Manager) */}
        {permissions.isManager && !selectedEmployee && (
          <Card className="p-6 bg-card border-border text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Wähle oben einen Mitarbeiter aus, um dessen Einlernliste zu sehen.</p>
          </Card>
        )}

        {/* Checkliste */}
        {activeEmployeeId && (
          <div className="space-y-3">
            {CATEGORIES.map((category) => {
              const categoryTasks = tasks.filter(t => t.category === category.id);
              const { done, total } = getCategoryProgress(category.id, activeEmployeeId);
              const isOpen = expanded[category.id];
              const allDone = done === total && total > 0;

              return (
                <Card key={category.id} className={cn('border overflow-hidden', allDone ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-card')}>
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(category.id)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-accent/30 transition-colors"
                  >
                    <span className="text-2xl">{category.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-bold text-base', allDone ? 'text-green-400' : 'text-foreground')}>
                          {category.title}
                        </span>
                        {allDone && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{done} von {total} erledigt</span>
                    </div>
                    {/* Mini progress */}
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {/* Tasks */}
                  {isOpen && (
                    <div className="border-t border-border divide-y divide-border/50">
                      {categoryTasks.map((task) => {
                        const completed = isTaskCompleted(task.id, activeEmployeeId);
                        const notes = getTaskNotes(task.id, activeEmployeeId);
                        const notesExpanded = expandedNotes[task.id];
                        const progressRecord = progress.find(p => p.task_id === task.id && p.employee_id === activeEmployeeId);

                        return (
                          <div key={task.id} className="hover:bg-accent/20 transition-colors">
                            <button
                              onClick={() => toggleMutation.mutate({
                                taskId: task.id,
                                taskTitle: task.title,
                                taskCategory: task.category,
                                employeeId: activeEmployeeId,
                                employeeName: activeEmployeeName,
                                currentProgress: progress,
                              })}
                              className="w-full flex items-start gap-3 px-5 py-3.5 text-left"
                            >
                              {completed
                                ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                                : <Circle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                              }
                              <div className="flex-1">
                                <span className={cn('text-sm block', completed ? 'text-muted-foreground line-through' : 'text-foreground')}>
                                  {task.title}
                                </span>
                                {task.description && (
                                  <span className="text-xs text-muted-foreground mt-1">{task.description}</span>
                                )}
                              </div>
                              {completed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedNotes(prev => ({ ...prev, [task.id]: !notesExpanded }));
                                  }}
                                  className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                                  title="Notizen hinzufügen"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                              )}
                            </button>

                            {/* Notes Section */}
                            {completed && notesExpanded && progressRecord && (
                              <div className="px-5 pb-3 border-t border-border/50">
                                <textarea
                                  value={notes}
                                  onChange={(e) => {
                                    updateNotesMutation.mutate({
                                      progressId: progressRecord.id,
                                      notes: e.target.value,
                                    });
                                  }}
                                  placeholder="Notizen hinzufügen..."
                                  className="w-full text-xs p-2 bg-secondary/50 border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  rows="2"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}