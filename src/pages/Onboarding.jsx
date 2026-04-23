import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Users, RotateCcw, ChevronDown, ChevronUp, Trophy, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/components/auth/usePermissions';
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: 'kasse',             title: 'Kasse & EC-Geräte',          icon: '🖥️',  color: 'from-blue-500/20 to-blue-600/10',   accent: 'text-blue-400',  border: 'border-blue-500/30' },
  { id: 'spuelmaschine',     title: 'Spülmaschine',                icon: '🫧',  color: 'from-cyan-500/20 to-cyan-600/10',   accent: 'text-cyan-400',  border: 'border-cyan-500/30' },
  { id: 'kaffeemaschine',    title: 'Kaffeemaschine',              icon: '☕',  color: 'from-amber-500/20 to-amber-600/10', accent: 'text-amber-400', border: 'border-amber-500/30' },
  { id: 'keller',            title: 'Keller',                      icon: '🏚️', color: 'from-stone-500/20 to-stone-600/10', accent: 'text-stone-400', border: 'border-stone-500/30' },
  { id: 'nachschubschrank',  title: 'Nachschubschrank (Tunnel)',   icon: '📦',  color: 'from-orange-500/20 to-orange-600/10', accent: 'text-orange-400', border: 'border-orange-500/30' },
];

export default function Onboarding() {
  const permissions = usePermissions();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [myEmployee, setMyEmployee] = useState(null);

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
    queryKey: ['onboarding-progress', selectedEmployee ?? myEmployee?.id],
    queryFn: () => {
      const eid = selectedEmployee ?? myEmployee?.id;
      return eid ? base44.entities.OnboardingProgress.filter({ employee_id: eid }) : Promise.resolve([]);
    },
  });

  useEffect(() => {
    if (!permissions.isManager) {
      base44.auth.me().then(user => {
        base44.entities.Employee.filter({ email: user.email, is_active: true }).then(emps => {
          if (emps[0]) setMyEmployee(emps[0]);
        });
      });
    }
  }, [permissions.isManager]);

  const toggleMutation = useMutation({
    mutationFn: async ({ taskId, taskTitle, taskCategory, employeeId, employeeName }) => {
      const existing = progress.find(p => p.task_id === taskId && p.employee_id === employeeId);
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

  const resetMutation = useMutation({
    mutationFn: async (employeeId) => {
      const toDelete = progress.filter(p => p.employee_id === employeeId);
      await Promise.all(toDelete.map(p => base44.entities.OnboardingProgress.delete(p.id)));
    },
    onSuccess: () => queryClient.invalidateQueries(['onboarding-progress']),
  });

  const activeEmployeeId = permissions.isManager ? selectedEmployee : myEmployee?.id;
  const activeEmployeeName = permissions.isManager
    ? employees.find(e => e.id === selectedEmployee)?.name
    : myEmployee?.name;

  const isTaskCompleted = (taskId) => progress.some(p => p.task_id === taskId && p.employee_id === activeEmployeeId && p.is_completed);

  const getCategoryProgress = (categoryId) => {
    const cat = tasks.filter(t => t.category === categoryId);
    return { done: cat.filter(t => isTaskCompleted(t.id)).length, total: cat.length };
  };

  const totalDone = tasks.filter(t => isTaskCompleted(t.id)).length;
  const totalAll = tasks.length;
  const pct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Einlernliste</h1>
          <p className="text-muted-foreground text-sm mt-1">Einarbeitung neuer Mitarbeiter im Betrieb</p>
        </div>

        {/* Manager: Mitarbeiter auswählen */}
        {permissions.isManager && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="w-4 h-4 text-amber-500" />
              Mitarbeiter auswählen
            </div>
            <div className="flex flex-wrap gap-2">
              {employees.map(emp => {
                const { done, total } = (() => {
                  const empTasks = tasks;
                  const empDone = empTasks.filter(t =>
                    progress.some(p => p.task_id === t.id && p.employee_id === emp.id && p.is_completed)
                  ).length;
                  return { done: empDone, total: empTasks.length };
                })();
                const empPct = total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <button
                    key={emp.id}
                    onClick={() => { setSelectedEmployee(emp.id); setOpenCategory(null); }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all',
                      selectedEmployee === emp.id
                        ? 'bg-amber-500 text-slate-900 border-amber-500'
                        : 'bg-secondary/40 border-border text-muted-foreground hover:border-amber-500/50 hover:text-foreground'
                    )}
                  >
                    {emp.name}
                    {selectedEmployee !== emp.id && (
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full', empPct === 100 ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-muted-foreground')}>
                        {empPct}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedEmployee && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-600/40 text-red-400 hover:bg-red-900/20 w-fit"
                onClick={() => {
                  if (confirm('Einlernliste für diesen Mitarbeiter zurücksetzen?')) {
                    resetMutation.mutate(selectedEmployee);
                  }
                }}
              >
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Zurücksetzen
              </Button>
            )}
          </div>
        )}

        {/* Kein Mitarbeiter ausgewählt */}
        {permissions.isManager && !selectedEmployee && (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Mitarbeiter auswählen</p>
            <p className="text-sm mt-1">Wähle oben einen Mitarbeiter aus, um seine Einlernliste zu verwalten.</p>
          </div>
        )}

        {/* Gesamtfortschritt */}
        {activeEmployeeId && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Gesamtfortschritt</p>
                {activeEmployeeName && (
                  <p className="text-base font-bold text-foreground">{activeEmployeeName}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-foreground">{pct}<span className="text-lg text-muted-foreground">%</span></div>
                <div className="text-xs text-muted-foreground">{totalDone} / {totalAll} Aufgaben</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  pct === 100 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct === 100 && (
              <div className="flex items-center gap-2 mt-3 text-green-400 text-sm font-semibold">
                <Trophy className="w-4 h-4" />
                Einlernliste vollständig abgeschlossen! 🎉
              </div>
            )}
          </div>
        )}

        {/* Kategorien */}
        {activeEmployeeId && (
          <div className="space-y-3">
            {CATEGORIES.map((cat, catIdx) => {
              const categoryTasks = tasks.filter(t => t.category === cat.id);
              const { done, total } = getCategoryProgress(cat.id);
              const allDone = done === total && total > 0;
              const isOpen = openCategory === cat.id;

              return (
                <div
                  key={cat.id}
                  className={cn(
                    'rounded-xl border overflow-hidden transition-all',
                    allDone ? 'border-green-500/40' : cat.border,
                    'bg-card'
                  )}
                >
                  {/* Header */}
                  <button
                    onClick={() => setOpenCategory(isOpen ? null : cat.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-accent/20 transition-colors"
                  >
                    {/* Step number / checkmark */}
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg border-2 transition-all',
                      allDone
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-secondary border-border'
                    )}>
                      {allDone ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <span>{cat.icon}</span>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn('font-semibold text-sm', allDone ? 'text-green-400' : 'text-foreground')}>
                        {cat.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {/* Mini progress dots */}
                        <div className="flex gap-1">
                          {Array.from({ length: total }).map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                'w-2 h-2 rounded-full transition-all',
                                i < done ? 'bg-green-500' : 'bg-secondary'
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{done}/{total}</span>
                      </div>
                    </div>

                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>

                  {/* Tasks */}
                  {isOpen && (
                    <div className="border-t border-border divide-y divide-border/40">
                      {categoryTasks.length === 0 ? (
                        <div className="px-5 py-4 text-sm text-muted-foreground italic">Keine Aufgaben in dieser Kategorie.</div>
                      ) : categoryTasks.map((task) => {
                        const completed = isTaskCompleted(task.id);
                        return (
                          <button
                            key={task.id}
                            onClick={() => toggleMutation.mutate({
                              taskId: task.id,
                              taskTitle: task.title,
                              taskCategory: task.category,
                              employeeId: activeEmployeeId,
                              employeeName: activeEmployeeName,
                            })}
                            className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-accent/20 transition-colors"
                          >
                            <div className={cn(
                              'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                              completed
                                ? 'bg-green-500 border-green-500'
                                : 'border-border bg-transparent'
                            )}>
                              {completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-sm font-medium transition-all',
                                completed ? 'line-through text-muted-foreground' : 'text-foreground'
                              )}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{task.description}</p>
                              )}
                            </div>
                            {completed && (
                              <span className="text-xs text-green-500 font-medium shrink-0 mt-0.5">✓ Erledigt</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}