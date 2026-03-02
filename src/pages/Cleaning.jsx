import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Sparkles, RefreshCw, FileText, AlertTriangle, Cloud, CloudOff, Archive } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CleaningList from '@/components/cleaning/CleaningList';
import AreasManager from '@/components/cleaning/AreasManager';
import PinVerification from '@/components/terminal/PinVerification';
import { usePermissions } from '@/components/auth/usePermissions';

export default function Cleaning() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [modalOpen, setModalOpen] = useState(false);
    const [reportsModalOpen, setReportsModalOpen] = useState(false);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        area: 'Theke',
        frequency: 'täglich',
        due_date: '',
        assigned_to: '',
        assigned_to_name: ''
    });
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingUpdates, setPendingUpdates] = useState([]);

    // Load pending updates from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('cleaning_pending_updates');
        if (saved) {
            setPendingUpdates(JSON.parse(saved));
        }
    }, []);

    // Save pending updates to localStorage
    useEffect(() => {
        localStorage.setItem('cleaning_pending_updates', JSON.stringify(pendingUpdates));
    }, [pendingUpdates]);

    // Online/offline detection
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncPendingUpdates();
        };
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Sync pending updates when online
    const syncPendingUpdates = async () => {
        if (pendingUpdates.length === 0) return;
        
        for (const update of pendingUpdates) {
            try {
                await base44.entities.CleaningTask.update(update.id, update.data);
            } catch (error) {
                console.error('Sync failed:', error);
            }
        }
        
        setPendingUpdates([]);
        queryClient.invalidateQueries(['cleaning']);
    };

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true }, 'name')
    });

    const { data: allTasks = [], isLoading } = useQuery({
        queryKey: ['cleaning'],
        queryFn: () => base44.entities.CleaningTask.list('area')
    });

    const tasks = allTasks.filter(t => t.is_active !== false);
    const deactivatedTasks = allTasks.filter(t => t.is_active === false);

    const { data: allAreas = [] } = useQuery({
        queryKey: ['cleaning-areas'],
        queryFn: () => base44.entities.CleaningArea.list('order')
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => base44.entities.Shift.list()
    });

    const { data: allEmployees = [] } = useQuery({
        queryKey: ['all-employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: reports = [] } = useQuery({
        queryKey: ['cleaning-reports'],
        queryFn: () => base44.entities.CleaningReport.list('-created_date', 20)
    });

    // Filtere saisonale Bereiche (April-Oktober)
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const isSeason = currentMonth >= 4 && currentMonth <= 10;
    const areas = allAreas.filter(area => !area.seasonal || isSeason);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.CleaningTask.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['cleaning']);
            setModalOpen(false);
            setFormData({ title: '', area: 'Theke', frequency: 'täglich', due_date: '', assigned_to: '', assigned_to_name: '' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => {
            if (!isOnline) {
                // Store for later sync
                setPendingUpdates(prev => [...prev, { id, data }]);
                // Optimistic update
                queryClient.setQueryData(['cleaning'], (old) => {
                    return old.map(task => task.id === id ? { ...task, ...data } : task);
                });
                return Promise.resolve();
            }
            return base44.entities.CleaningTask.update(id, data);
        },
        onSuccess: () => {
            if (isOnline) {
                queryClient.invalidateQueries(['cleaning']);
            }
        }
    });

    const handleComplete = (task) => {
        if (permissions.isTerminal && !task.is_completed) {
            setSelectedTask(task);
            setPinModalOpen(true);
        } else {
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
        }
    };

    const handlePinVerified = async (pin) => {
        const employee = employees.find(e => e.pin === pin);
        if (!employee) {
            alert('Falsche PIN!');
            return;
        }

        const displayName = employee.name.split(' ').reverse().join(', ');
        await updateMutation.mutateAsync({
            id: selectedTask.id,
            data: {
                is_completed: true,
                completed_by: displayName,
                completed_at: new Date().toISOString()
            }
        });

        setPinModalOpen(false);
        setSelectedTask(null);
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

    const endDay = async () => {
        if (!confirm('Tag beenden? Dies erstellt einen Tagesbericht und setzt alle täglichen Aufgaben zurück.')) return;

        // Erstelle Tagesbericht
        const today = new Date();
        const completedTasks = tasks.filter(t => 
            t.is_completed && 
            t.completed_at && 
            format(new Date(t.completed_at), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
        );

        const reportData = completedTasks.map(task => ({
            task_title: task.title,
            area: task.area,
            frequency: task.frequency,
            completed_by: task.completed_by,
            completed_at: task.completed_at
        }));

        const report = {
            week_start: format(today, 'yyyy-MM-dd'),
            week_end: format(today, 'yyyy-MM-dd'),
            report_data: reportData,
            total_tasks: tasks.filter(t => t.frequency === 'täglich').length,
            completed_tasks: completedTasks.length,
            completion_rate: tasks.filter(t => t.frequency === 'täglich').length > 0 
                ? Math.round((completedTasks.length / tasks.filter(t => t.frequency === 'täglich').length) * 100) 
                : 0
        };

        await base44.entities.CleaningReport.create(report);
        queryClient.invalidateQueries(['cleaning-reports']);

        // Setze tägliche Aufgaben zurück
        const dailyTasks = tasks.filter(t => t.frequency === 'täglich' && t.is_completed);
        dailyTasks.forEach(task => {
            updateMutation.mutate({
                id: task.id,
                data: {
                    is_completed: false,
                    completed_by: null,
                    completed_at: null,
                    last_reset: format(new Date(), 'yyyy-MM-dd')
                }
            });
        });

        alert('Tagesbericht erstellt und tägliche Aufgaben zurückgesetzt!');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Automatische Zuweisung für Wochentagsaufgaben mit Datum
        let finalData = { ...formData };
        if (formData.area === 'Wochentagsaufgaben' && formData.due_date && !formData.assigned_to) {
            // Finde Aushilfe die an diesem Tag arbeitet
            const dateShifts = shifts.filter(s => s.date === formData.due_date);
            const aushilfe = dateShifts
                .map(s => allEmployees.find(e => e.id === s.employee_id))
                .find(e => e && e.role === 'Aushilfe');
            
            if (aushilfe) {
                finalData.assigned_to = aushilfe.id;
                finalData.assigned_to_name = aushilfe.name;
            }
        }
        
        createMutation.mutate(finalData);
    };

    const generateWeeklyReport = async () => {
        if (!confirm('Wochenbericht erstellen? Dies archiviert alle erledigten Aufgaben der letzten Woche.')) return;

        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        
        const completedTasks = tasks.filter(t => 
            t.is_completed && 
            t.completed_at && 
            new Date(t.completed_at) >= weekStart
        );

        const reportData = completedTasks.map(task => ({
            task_title: task.title,
            area: task.area,
            frequency: task.frequency,
            completed_by: task.completed_by,
            completed_at: task.completed_at
        }));

        const report = {
            week_start: format(weekStart, 'yyyy-MM-dd'),
            week_end: format(today, 'yyyy-MM-dd'),
            report_data: reportData,
            total_tasks: tasks.length,
            completed_tasks: completedTasks.length,
            completion_rate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
        };

        await base44.entities.CleaningReport.create(report);
        queryClient.invalidateQueries(['cleaning-reports']);
        alert('Wochenbericht erstellt!');
    };

    const completedCount = tasks.filter(t => t.is_completed).length;
    const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:gap-3 mb-5 sm:mb-6">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Putzliste</h1>
                            <p className="text-slate-400 text-sm mt-1">
                                {format(new Date(), "EEEE, d. MMMM", { locale: de })}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isOnline ? (
                                <Cloud className="w-5 h-5 text-green-500" />
                            ) : (
                                <CloudOff className="w-5 h-5 text-amber-500" />
                            )}
                            <span className="text-xs text-slate-400">
                                {isOnline ? 'Online' : `Offline (${pendingUpdates.length})`}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-wrap">
                         <Button 
                             size="sm"
                             variant="outline"
                             onClick={() => setReportsModalOpen(true)}
                             className="text-slate-300 border-slate-600 hover:bg-slate-700 text-xs h-9"
                         >
                             <FileText className="w-3 h-3 mr-1" />
                             <span className="hidden sm:inline">Berichte</span>
                             <span className="sm:hidden">B</span>
                         </Button>
                         <Button 
                             size="sm"
                             variant="outline"
                             onClick={generateWeeklyReport}
                             className="text-white bg-green-600 hover:bg-green-700 border-green-600 text-xs h-9"
                         >
                             <FileText className="w-3 h-3 mr-1" />
                             <span className="hidden sm:inline">Wochenbericht</span>
                             <span className="sm:hidden">W</span>
                         </Button>
                         <AreasManager />
                         <Button 
                             size="sm"
                             variant="outline"
                             onClick={endDay}
                             className="text-white bg-orange-600 hover:bg-orange-700 border-orange-600 text-xs h-9"
                         >
                             <RefreshCw className="w-3 h-3 mr-1" />
                             <span className="hidden sm:inline">Tag beenden</span>
                             <span className="sm:hidden">Tag</span>
                         </Button>
                         <Button 
                             size="sm"
                             onClick={() => setModalOpen(true)}
                             className="bg-amber-600 hover:bg-amber-700 text-xs h-9"
                         >
                             <Plus className="w-3 h-3 mr-1" />
                             <span className="hidden sm:inline">Aufgabe</span>
                             <span className="sm:hidden">+</span>
                         </Button>
                     </div>
                </div>

                {/* Progress */}
                <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-emerald-500" />
                            <span className="font-medium text-slate-800">Fortschritt</span>
                        </div>
                        <span className="text-sm text-slate-500">
                            {completedCount} von {tasks.length} erledigt
                        </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Task List */}
                <Tabs defaultValue="active" className="space-y-4">
                    <TabsList className="bg-slate-800 border border-slate-700 grid w-full grid-cols-2">
                        <TabsTrigger value="active" className="text-slate-300">
                            Aktiv ({tasks.length})
                        </TabsTrigger>
                        <TabsTrigger value="deactivated" className="text-slate-300">
                            <Archive className="w-4 h-4 mr-2" />
                            Deaktiviert ({deactivatedTasks.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="active">
                        <CleaningList 
                            tasks={tasks}
                            areas={areas}
                            onComplete={handleComplete}
                            onReset={handleReset}
                            userName={user?.full_name ? user.full_name.split(' ').reverse().join(', ') : user?.email}
                        />
                    </TabsContent>

                    <TabsContent value="deactivated">
                        {deactivatedTasks.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Keine deaktivierten Aufgaben</p>
                            </div>
                        ) : (
                            <CleaningList 
                                tasks={deactivatedTasks}
                                areas={areas}
                                onComplete={handleComplete}
                                onReset={handleReset}
                                userName={user?.full_name ? user.full_name.split(' ').reverse().join(', ') : user?.email}
                            />
                        )}
                    </TabsContent>
                </Tabs>

                {/* Add Modal */}
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Neue Putzaufgabe</DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Aufgabe</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="z.B. Tresen abwischen"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Bereich</Label>
                                    <Select value={formData.area} onValueChange={(v) => setFormData({ ...formData, area: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {areas.map(area => (
                                                <SelectItem key={area.id} value={area.name}>
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: area.color }}
                                                        />
                                                        {area.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Häufigkeit</Label>
                                    <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="täglich">Täglich</SelectItem>
                                            <SelectItem value="am Wochenende">Am Wochenende (Fr+Sa)</SelectItem>
                                            <SelectItem value="wöchentlich">Wöchentlich</SelectItem>
                                            <SelectItem value="alle zwei Wochen">Alle zwei Wochen</SelectItem>
                                            <SelectItem value="monatlich">Monatlich</SelectItem>
                                            <SelectItem value="an Sonderöffnungstagen">An Sonderöffnungstagen</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {formData.area === 'Wochentagsaufgaben' && (
                                <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="space-y-2">
                                        <Label>Fälligkeitsdatum</Label>
                                        <Input
                                            type="date"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Zuweisen an (optional)</Label>
                                        <Select 
                                            value={formData.assigned_to} 
                                            onValueChange={(v) => {
                                                const emp = allEmployees.find(e => e.id === v);
                                                setFormData({ 
                                                    ...formData, 
                                                    assigned_to: v,
                                                    assigned_to_name: emp?.name || ''
                                                });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Automatisch zuweisen" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                   <SelectItem value={null}>Automatisch (Aushilfe des Tages)</SelectItem>
                                                {allEmployees.map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.name} ({emp.role})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-500">
                                            Ohne Auswahl wird automatisch die Aushilfe zugewiesen, die an diesem Tag arbeitet
                                        </p>
                                    </div>
                                </div>
                            )}

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

                {/* Pin Verification */}
                <PinVerification
                    open={pinModalOpen}
                    onClose={() => {
                        setPinModalOpen(false);
                        setSelectedTask(null);
                    }}
                    onVerified={handlePinVerified}
                    title="Aufgabe bestätigen"
                />

                {/* Reports Modal */}
                <Dialog open={reportsModalOpen} onOpenChange={setReportsModalOpen}>
                    <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Putzberichte</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4 mt-4">
                            {reports.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Noch keine Berichte vorhanden</p>
                                </div>
                            ) : (
                                reports.map(report => (
                                    <div key={report.id} className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                                       <div className="flex items-start justify-between mb-4">
                                           <div className="flex items-start gap-3">
                                               <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                   <FileText className="w-5 h-5 text-green-600" />
                                               </div>
                                               <div>
                                                   <h3 className="font-semibold text-slate-900 text-lg">
                                                       {format(new Date(report.week_start), 'dd.MM.', { locale: de })} - {format(new Date(report.week_end), 'dd.MM.yyyy', { locale: de })}
                                                   </h3>
                                                   <div className="flex items-center gap-3 mt-2">
                                                       <div className="flex items-center gap-1.5">
                                                           <span className="text-2xl font-bold text-green-600">{report.completion_rate}%</span>
                                                           <span className="text-xs text-slate-500">Erledigt</span>
                                                       </div>
                                                       <div className="h-4 w-px bg-slate-200" />
                                                       <span className="text-sm text-slate-600">
                                                           {report.completed_tasks} von {report.total_tasks} Aufgaben
                                                       </span>
                                                   </div>
                                               </div>
                                           </div>
                                       </div>
                                        
                                        {report.report_data && report.report_data.length > 0 && (
                                            <div className="mt-4 space-y-3">
                                                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Erledigte Aufgaben:</p>
                                                <div className="space-y-2">
                                                    {report.report_data.map((task, idx) => (
                                                        <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                                            <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                                                <span className="text-green-600 text-xs">✓</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-slate-900">{task.task_title}</p>
                                                                        <p className="text-xs text-slate-500 mt-0.5">{task.area} · {task.frequency}</p>
                                                                    </div>
                                                                </div>
                                                                {task.completed_by && (
                                                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                                                                        <span className="text-xs text-slate-600">
                                                                            👤 <span className="font-medium">{task.completed_by}</span>
                                                                        </span>
                                                                        {task.completed_at && (
                                                                            <span className="text-xs text-slate-400">
                                                                                · {format(new Date(task.completed_at), 'dd.MM. HH:mm', { locale: de })} Uhr
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}