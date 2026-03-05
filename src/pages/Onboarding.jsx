import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Users, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/components/auth/usePermissions';
import { cn } from '@/lib/utils';

const EINLERNLISTE = [
  {
    id: 'kasse',
    title: 'Kasse und EC Geräte',
    icon: '🖥️',
    items: [
      'Tischbuchung in Kasse, Aufteilung erklären',
      'Getränkebutton in Kasse erklären (wo ist was)',
      'Wechsel von Restaurant auf Direktverkauf erklären',
      'Plätze splitten (wie)',
      'Deckel schreiben bis 23uhr dann wird kassiert ab dann nur noch Direktverkauf',
      'Gutscheine (wie abkasieren und wie erstellen)',
      'Storno',
      'Rechnungen (wie splitten, Storno, Tische und Getränke umbuchen)',
      'Erklärung EC Geräte (Funktion, Transaktion überprüfen ob möglich) Geräte Sparkasse (schwarz) und Volksbank (weiß) immer auf Ladestation',
    ]
  },
  {
    id: 'spuelmaschine',
    title: 'Spülmaschine',
    icon: '🫧',
    items: [
      'Wie Einschalten',
      'Wie ausputzen',
      'Wie den Korb richtig füllen und wenn voll dann rein',
      'Wie abtrocknen, wie Gläser einräumen (warm/kalt)',
    ]
  },
  {
    id: 'kaffeemaschine',
    title: 'Kaffeemaschine',
    icon: '☕',
    items: [
      'Funktion, Knöpfe oben und unten (groß, klein, doppelt oder 2 Getränke)',
      'Getränke Auswahl (was gibt\'s alles)',
      'Welche Tasse zu welchem Getränk',
      'Zubehör (Milch, Zucker, Honig, Löffel und Kecks) wo braucht man was',
      'Wenn was leer – wo ist das Auffüllmaterial',
      'Reinigung (siehe Reinigungsliste für Kaffeemaschine)',
      'Platz für angefangene Milch usw.',
    ]
  },
  {
    id: 'keller',
    title: 'Keller',
    icon: '🏚️',
    items: [
      'Aufteilung – wo ist was',
      'Leergut – wo kommt was hin',
      'Nachschub – wo ist was',
    ]
  },
  {
    id: 'nachschubschrank',
    title: 'Nachschubschrank (Tunnel)',
    icon: '📦',
    items: [
      'Erklärung wo ist was, wenn hinten im Regal was leer ist',
      'Alles zum Auffüllen ist da drin – auch Strohhalme etc.',
      'Mülltonnen (zeigen wo und erklären was wohin muss)',
      'Wichtig: wenn was leer ist, auf die Tafel in der Küche oder auf ein Zettel schreiben als Info für Hugi',
    ]
  },
];

export default function Onboarding() {
  const permissions = usePermissions();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState({ kasse: true });
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => base44.entities.Employee.filter({ is_active: true }),
    enabled: permissions.isManager,
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ['onboarding-items', selectedEmployee],
    queryFn: () => base44.entities.OnboardingChecklistItem.list('-created_date'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ sectionId, itemIndex, employeeId, employeeName, currentItems }) => {
      const key = `${sectionId}_${itemIndex}`;
      const existing = currentItems.find(i => i.key === key && i.employee_id === employeeId);
      if (existing) {
        await base44.entities.OnboardingChecklistItem.delete(existing.id);
      } else {
        await base44.entities.OnboardingChecklistItem.create({
          key,
          employee_id: employeeId,
          employee_name: employeeName,
          section_id: sectionId,
          item_index: itemIndex,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['onboarding-items']),
  });

  const resetMutation = useMutation({
    mutationFn: async (employeeId) => {
      const toDelete = checklistItems.filter(i => i.employee_id === employeeId);
      await Promise.all(toDelete.map(i => base44.entities.OnboardingChecklistItem.delete(i.id)));
    },
    onSuccess: () => queryClient.invalidateQueries(['onboarding-items']),
  });

  const targetEmployee = permissions.isManager
    ? employees.find(e => e.id === selectedEmployee)
    : null;

  const isChecked = (sectionId, itemIndex, employeeId) => {
    const key = `${sectionId}_${itemIndex}`;
    return checklistItems.some(i => i.key === key && i.employee_id === employeeId);
  };

  const getSectionProgress = (sectionId, employeeId) => {
    const section = EINLERNLISTE.find(s => s.id === sectionId);
    if (!section) return { done: 0, total: 0 };
    const done = section.items.filter((_, idx) => isChecked(sectionId, idx, employeeId)).length;
    return { done, total: section.items.length };
  };

  const getTotalProgress = (employeeId) => {
    const total = EINLERNLISTE.reduce((sum, s) => sum + s.items.length, 0);
    const done = EINLERNLISTE.reduce((sum, s) =>
      sum + s.items.filter((_, idx) => isChecked(s.id, idx, employeeId)).length, 0);
    return { done, total };
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
    : { done: 0, total: EINLERNLISTE.reduce((s, c) => s + c.items.length, 0) };

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
            {EINLERNLISTE.map((section) => {
              const { done, total } = getSectionProgress(section.id, activeEmployeeId);
              const isOpen = expanded[section.id];
              const allDone = done === total;

              return (
                <Card key={section.id} className={cn('border overflow-hidden', allDone ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-card')}>
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-accent/30 transition-colors"
                  >
                    <span className="text-2xl">{section.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-bold text-base', allDone ? 'text-green-400' : 'text-foreground')}>
                          {section.title}
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
                          style={{ width: `${(done / total) * 100}%` }}
                        />
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {/* Items */}
                  {isOpen && (
                    <div className="border-t border-border divide-y divide-border/50">
                      {section.items.map((item, idx) => {
                        const checked = isChecked(section.id, idx, activeEmployeeId);
                        return (
                          <button
                            key={idx}
                            onClick={() => toggleMutation.mutate({
                              sectionId: section.id,
                              itemIndex: idx,
                              employeeId: activeEmployeeId,
                              employeeName: activeEmployeeName,
                              currentItems: checklistItems,
                            })}
                            className="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-accent/20 transition-colors"
                          >
                            {checked
                              ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                              : <Circle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                            }
                            <span className={cn('text-sm', checked ? 'text-muted-foreground line-through' : 'text-foreground')}>
                              {item}
                            </span>
                          </button>
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