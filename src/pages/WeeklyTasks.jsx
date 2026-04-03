import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, getDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Check, RotateCcw, Calendar, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';

export default function WeeklyTasks() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        weekday: 'Mittwoch',
        biweekly_pattern: null
    });

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: allTasks = [] } = useQuery({
        queryKey: ['weekly-cleaning-tasks'],
        queryFn: () => base44.entities.CleaningTask.filter({ 
            area: 'Wochentagsaufgaben',
            is_active: true 
        })
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list()
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    // Aktuelle Kalenderwoche (ungerade = 1, gerade = 2)
    const getWeekNumber = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
        return weekNo % 2 === 1 ? 1 : 2;
    };

    const currentWeek = getWeekNumber(new Date());
    const today = getDay(new Date()); // 0 = Sonntag, 3 = Mittwoch, 4 = Donnerstag

    // Filtere Aufgaben nach Wochentag
    const wednesdayTasks = allTasks.filter(t => 
        !t.biweekly_pattern || t.biweekly_pattern.startsWith('mi_')
    );
    const thursdayTasks = allTasks.filter(t => 
        !t.biweekly_pattern || t.biweekly_pattern.startsWith('do_')
    );

    // Finde Aushilfe für heute
    const getTodaysAushilfe = () => {
        const todayDate = format(new Date(), 'yyyy-MM-dd');
        const todayShifts = shifts.filter(s => s.date === todayDate);
        const aushilfe = todayShifts
            .map(s => employees.find(e => e.id === s.employee_id))
            .find(e => e && e.role === 'Aushilfe');
        return aushilfe;
    };

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.CleaningTask.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['weekly-cleaning-tasks']);
            setModalOpen(false);
            setFormData({ title: '', weekday: 'Mittwoch', biweekly_pattern: null });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.CleaningTask.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['weekly-cleaning-tasks']);
        }
    });

    const handleComplete = (task) => {
        const displayName = user?.full_name 
            ? user.full_name.split(' ').reverse().join(', ')
            : user?.email;
        
        updateMutation.mutate({
            id: task.id,
            data: {
                is_completed: !task.is_completed,
                completed_by: task.is_completed ? null : displayName,
                completed_at: task.is_completed ? null : new Date().toISOString()
            }
        });
    };

    const handleReset = (task) => {
        updateMutation.mutate({
            id: task.id,
            data: {
                is_completed: false,
                completed_by: null,
                completed_at: null
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const aushilfe = getTodaysAushilfe();
        const taskData = {
            title: formData.title,
            area: 'Wochentagsaufgaben',
            frequency: 'wöchentlich',
            biweekly_pattern: formData.biweekly_pattern,
            assigned_to: aushilfe?.id || null,
            assigned_to_name: aushilfe?.name || null
        };
        
        createMutation.mutate(taskData);
    };

    const TaskCard = ({ task, dayLabel }) => {
        const shouldShowToday = 
            (dayLabel === 'Mittwoch' && today === 3) || 
            (dayLabel === 'Donnerstag' && today === 4);
        
        const isCurrentWeekTask = !task.biweekly_pattern || 
            (task.biweekly_pattern.endsWith(`_${currentWeek}`));

        return (
            <div 
                className={cn(
                    "p-4 bg-card rounded-lg border border-border transition-all",
                    task.is_completed && "opacity-60",
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => handleComplete(task)}
                        className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                            task.is_completed 
                                ? "border-emerald-500 bg-emerald-500" 
                                : "border-slate-600 hover:border-emerald-500"
                        )}
                    >
                        {task.is_completed && <Check className="w-4 h-4 text-white" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                        <p className={cn(
                            "text-sm font-medium",
                            task.is_completed ? "text-muted-foreground line-through" : "text-foreground"
                        )}>
                            {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {task.biweekly_pattern && (
                                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                    {task.biweekly_pattern.endsWith('_1') ? 'Woche 1' : 'Woche 2'}
                                </Badge>
                            )}
                            {task.assigned_to_name && (
                                <Badge variant="outline" className="text-xs border-blue-600 text-blue-400">
                                    <User className="w-3 h-3 mr-1" />
                                    {task.assigned_to_name}
                                </Badge>
                            )}
                            {task.is_completed && task.completed_by && (
                                <span className="text-xs text-slate-500">
                                    ✓ {task.completed_by}
                                    {task.completed_at && ` · ${format(new Date(task.completed_at), 'HH:mm')}`}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {task.is_completed && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-300"
                            onClick={() => handleReset(task)}
                        >
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    if (!permissions.canViewCleaning) {
        return <PermissionDenied />;
    }

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                {/* Header */}
                <div className="flex flex-col gap-3 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                                Wochenaufgaben
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                {format(new Date(), "EEEE, d. MMMM", { locale: de })} · Woche {currentWeek}
                            </p>
                        </div>
                        <Button 
                            onClick={() => setModalOpen(true)}
                            className="bg-amber-600 hover:bg-amber-700"
                            disabled={!permissions.canEditCleaning}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Aufgabe
                        </Button>
                    </div>
                </div>

                {/* Tasks Tabs */}
<Tabs defaultValue={today === 4 ? 'thursday' : 'wednesday'} className="space-y-4">
                    <TabsList className="bg-card border border-border grid w-full grid-cols-2">
                        <TabsTrigger 
                            value="wednesday" 
                            className={cn(
                                "text-muted-foreground",
                                today === 3 && "data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                            )}
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Mittwoch ({wednesdayTasks.filter(t => t.is_completed).length}/{wednesdayTasks.length})
                        </TabsTrigger>
                        <TabsTrigger 
                            value="thursday"
                            className={cn(
                                "text-muted-foreground",
                                today === 4 && "data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                            )}
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Donnerstag ({thursdayTasks.filter(t => t.is_completed).length}/{thursdayTasks.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="wednesday" className="space-y-3">
                        {wednesdayTasks.length === 0 ? (
                            <Card className="p-8 text-center text-slate-400 bg-slate-800 border-slate-700">
                                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Keine Mittwochs-Aufgaben vorhanden</p>
                            </Card>
                        ) : (
                            wednesdayTasks
                                .sort((a, b) => {
                                    if (a.is_completed === b.is_completed) return 0;
                                    return a.is_completed ? 1 : -1;
                                })
                                .map(task => (
                                    <TaskCard key={task.id} task={task} dayLabel="Mittwoch" />
                                ))
                        )}
                    </TabsContent>

                    <TabsContent value="thursday" className="space-y-3">
                        {thursdayTasks.length === 0 ? (
                            <Card className="p-8 text-center bg-card border-border text-muted-foreground">
                                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Keine Donnerstags-Aufgaben vorhanden</p>
                            </Card>
                        ) : (
                            thursdayTasks
                                .sort((a, b) => {
                                    if (a.is_completed === b.is_completed) return 0;
                                    return a.is_completed ? 1 : -1;
                                })
                                .map(task => (
                                    <TaskCard key={task.id} task={task} dayLabel="Donnerstag" />
                                ))
                        )}
                    </TabsContent>
                </Tabs>

                {/* Add Modal */}
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Neue Wochentagsaufgabe</DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Aufgabe</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="z.B. Kühlschrank putzen"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Wochentag</Label>
                                <Select 
                                    value={formData.weekday} 
                                    onValueChange={(v) => {
                                        setFormData({ 
                                            ...formData, 
                                            weekday: v,
                                            biweekly_pattern: null
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Mittwoch">Mittwoch</SelectItem>
                                        <SelectItem value="Donnerstag">Donnerstag</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Turnus (optional)</Label>
                                <Select 
                                    value={formData.biweekly_pattern || "every"} 
                                    onValueChange={(v) => setFormData({ 
                                        ...formData, 
                                        biweekly_pattern: v === "every" ? null : v
                                    })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="every">Jede Woche</SelectItem>
                                        {formData.weekday === 'Mittwoch' && (
                                            <>
                                                <SelectItem value="mi_1">Nur Woche 1 (ungerade KW)</SelectItem>
                                                <SelectItem value="mi_2">Nur Woche 2 (gerade KW)</SelectItem>
                                            </>
                                        )}
                                        {formData.weekday === 'Donnerstag' && (
                                            <>
                                                <SelectItem value="do_1">Nur Woche 1 (ungerade KW)</SelectItem>
                                                <SelectItem value="do_2">Nur Woche 2 (gerade KW)</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Aktuelle Woche: {currentWeek === 1 ? 'Woche 1 (ungerade KW)' : 'Woche 2 (gerade KW)'}
                                </p>
                            </div>

                            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                                <p className="text-xs text-muted-foreground">
                                    💡 Die Aufgabe wird automatisch der Aushilfe zugewiesen, die am jeweiligen Tag arbeitet
                                </p>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                                    Hinzufügen
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}