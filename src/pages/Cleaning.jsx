import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateDisplay';
import { ErrorFallback, useErrorHandler } from '@/components/error/ErrorHandler';
import { queueMutation, syncMutations } from '@/components/utils/offlineSync';
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
import CleaningQRGenerator from '@/components/cleaning/CleaningQRGenerator';
import AreasManager from '@/components/cleaning/AreasManager';
import PinVerification from '@/components/terminal/PinVerification';
import { usePermissions } from '@/components/auth/usePermissions';
import { getUserDisplayName } from '@/lib/userDisplayName';

export default function Cleaning() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [modalOpen, setModalOpen] = useState(false);
    const [reportsModalOpen, setReportsModalOpen] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const WEEKDAYS = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
    const [formData, setFormData] = useState({
        title: '',
        area: 'Theke',
        frequency: 'täglich',
        due_weekdays: [],
        due_date: '',
        assigned_to: '',
        assigned_to_name: '',
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

    // Online/offline detection + sync
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncMutations(base44).then(() => queryClient.invalidateQueries({ queryKey: ['cleaning'] })).catch(console.error);
        };
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true }, 'name')
    });

    const { data: allTasks = [], isLoading, isError: tasksError, error: tasksErrorObj } = useQuery({
         queryKey: ['cleaning'],
         queryFn: () => base44.entities.CleaningTask.list('area')
     });
     const { handleError } = useErrorHandler();

    // Wochentagsaufgaben gehören zu WeeklyTasks — hier ausschließen
    // due_weekdays: Aufgabe nur am passenden Wochentag zeigen
    const todayName = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][new Date().getDay()];
    const tasks = allTasks.filter(t => {
        if (t.is_active === false) return false;
        if (t.area === 'Wochentagsaufgaben') return false;
        if (t.due_weekdays && t.due_weekdays.length > 0 && !t.due_weekdays.includes(todayName)) return false;
        return true;
    });
    const deactivatedTasks = allTasks.filter(t => t.is_active === false && t.area !== 'Wochentagsaufgaben');

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
            queryClient.invalidateQueries({ queryKey: ['cleaning'] });
            setModalOpen(false);
            setFormData({ title: '', area: 'Theke', frequency: 'täglich', due_weekdays: [], due_date: '', assigned_to: '', assigned_to_name: '' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            if (!navigator.onLine) {
                await queueMutation({ entityName: 'CleaningTask', type: 'update', id, data });
                queryClient.setQueryData(['cleaning'], (old) => 
                    old?.map(task => task.id === id ? { ...task, ...data } : task) || old
                );
                return { queued: true };
            }
            return base44.entities.CleaningTask.update(id, data);
        },
        onSuccess: (result) => {
            if (!result?.queued) queryClient.invalidateQueries({ queryKey: ['cleaning'] });
        }
    });

    const handleComplete = (task) => {
        if (permissions.isTerminal && !task.is_completed) {
            setSelectedTask(task);
            setPinModalOpen(true);
        } else {
            const displayName = getUserDisplayName({ employeeName: permissions.employeeName, user });
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
        queryClient.invalidateQueries({ queryKey: ['cleaning-reports'] });

        // Setze tägliche Aufgaben zurück — sequenziell um Rate Limit zu vermeiden
        const dailyTasks = tasks.filter(t => t.frequency === 'täglich' && t.is_completed);
        for (const task of dailyTasks) {
            await base44.entities.CleaningTask.update(task.id, {
                is_completed: false,
                completed_by: null,
                completed_at: null,
                last_reset: format(new Date(), 'yyyy-MM-dd')
            });
        }
        queryClient.invalidateQueries({ queryKey: ['cleaning'] });

        alert('Tagesbericht erstellt und tägliche Aufgaben zurückgesetzt!');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate(formData);
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
        queryClient.invalidateQueries({ queryKey: ['cleaning-reports'] });
        alert('Wochenbericht erstellt!');
    };

    const completedCount = tasks.filter(t => t.is_completed).length;
     const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    if (tasksError) {
        return (
            <div className="min-h-screen bg-background p-4 flex items-center justify-center">
                {handleError({ error: tasksErrorObj, title: 'Putzaufgaben konnten nicht geladen werden', onRetry: () => queryClient.invalidateQueries({ queryKey: ['cleaning'] }) })}
            </div>
        );
    }

     return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:gap-3 mb-5 sm:mb-6">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Putzliste</h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                {format(new Date(), "EEEE, d. MMMM", { locale: de })}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isOnline ? (
                                <Cloud className="w-5 h-5 text-green-500" />
                            ) : (
                                <CloudOff className="w-5 h-5 text-amber-500" />
                            )}
                            <span className="text-xs text-muted-foreground">
                                {isOnline ? 'Online' : `Offline (${pendingUpdates.length})`}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-wrap">
                         <Button
                             size="sm"
                             variant="outline"
                             onClick={() => setQrModalOpen(true)}
                             className="text-amber-400 border-amber-500/40 hover:bg-amber-500/10 text-xs h-9"
                         >
                             <span className="hidden sm:inline">QR-Codes</span>
                             <span className="sm:hidden">QR</span>
                         </Button>
                         <Button 
                             size="sm"
                             variant="outline"
                             onClick={() => setReportsModalOpen(true)}
                             className="text-muted-foreground border-border text-xs h-9"
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
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-emerald-500" />
                            <span className="font-medium text-foreground">Fortschritt</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {completedCount} von {tasks.length} erledigt
                        </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Task List */}
                {isLoading ? <LoadingState text="Lade Putzaufgaben…" /> :
                 tasksError ? <ErrorFallback error={tasksErrorObj} title="Putzaufgaben konnten nicht geladen werden" onRetry={() => queryClient.invalidateQueries({ queryKey: ['cleaning'] })} /> : (
                    <Tabs defaultValue="active" className="space-y-4">
                        <TabsList className="bg-card border border-border grid w-full grid-cols-2">
                            <TabsTrigger value="active" className="text-muted-foreground">
                                Aktiv ({tasks.length})
                            </TabsTrigger>
                            <TabsTrigger value="deactivated" className="text-muted-foreground">
                                <Archive className="w-4 h-4 mr-2" />
                                Deaktiviert ({deactivatedTasks.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="active">
                            {tasks.length === 0 ? <EmptyState text="Keine aktiven Aufgaben" /> : (
                                <CleaningList 
                                    tasks={tasks}
                                    areas={areas}
                                    onComplete={handleComplete}
                                    onReset={handleReset}
                                    userName={getUserDisplayName({ employeeName: permissions.employeeName, user })}
                                    />
                                    )}
                                    </TabsContent>

                                    <TabsContent value="deactivated">
                                    {deactivatedTasks.length === 0 ? (
                                    <EmptyState text="Keine deaktivierten Aufgaben" />
                                    ) : (
                                    <CleaningList 
                                     tasks={deactivatedTasks}
                                     areas={areas}
                                     onComplete={handleComplete}
                                     onReset={handleReset}
                                     userName={getUserDisplayName({ employeeName: permissions.employeeName, user })}
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                )}

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
                                            {(areas.length > 0 ? areas : allAreas).filter(a => a.name !== 'Wochentagsaufgaben').map(area => (
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
                                                <SelectItem value="an Sonderöffnungstagen">An Sonderöffnungstagen</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Wochentage einschränken */}
                            <div className="space-y-2">
                                <Label className="text-sm">Nur an bestimmten Tagen <span className="text-muted-foreground font-normal">(leer = immer)</span></Label>
                                <div className="flex flex-wrap gap-2">
                                    {WEEKDAYS.map(day => {
                                        const selected = formData.due_weekdays.includes(day);
                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => {
                                                    const next = selected
                                                        ? formData.due_weekdays.filter(d => d !== day)
                                                        : [...formData.due_weekdays, day];
                                                    setFormData({ ...formData, due_weekdays: next });
                                                }}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                                    selected
                                                        ? 'bg-amber-500 text-black border-amber-500'
                                                        : 'bg-card text-muted-foreground border-border hover:border-amber-500/50'
                                                }`}
                                            >
                                                {day.slice(0, 2)}
                                            </button>
                                        );
                                    })}
                                </div>
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

                {/* QR Generator */}
                <CleaningQRGenerator open={qrModalOpen} onClose={() => setQrModalOpen(false)} />

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
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Noch keine Berichte vorhanden</p>
                                </div>
                            ) : (
                                reports.map(report => (
                                    <div key={report.id} className="p-5 bg-card rounded-xl border border-border shadow-sm">
                                       <div className="flex items-start justify-between mb-4">
                                           <div className="flex items-start gap-3">
                                               <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                                   <FileText className="w-5 h-5 text-green-500" />
                                               </div>
                                               <div>
                                                   <h3 className="font-semibold text-foreground text-lg">
                                                       {format(new Date(report.week_start), 'dd.MM.', { locale: de })} - {format(new Date(report.week_end), 'dd.MM.yyyy', { locale: de })}
                                                   </h3>
                                                   <div className="flex items-center gap-3 mt-2">
                                                       <div className="flex items-center gap-1.5">
                                                           <span className="text-2xl font-bold text-green-500">{report.completion_rate}%</span>
                                                           <span className="text-xs text-muted-foreground">Erledigt</span>
                                                       </div>
                                                       <div className="h-4 w-px bg-border" />
                                                       <span className="text-sm text-muted-foreground">
                                                           {report.completed_tasks} von {report.total_tasks} Aufgaben
                                                       </span>
                                                   </div>
                                               </div>
                                           </div>
                                       </div>
                                        
                                        {report.report_data && report.report_data.length > 0 && (
                                            <div className="mt-4 space-y-3">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Erledigte Aufgaben:</p>
                                                <div className="space-y-2">
                                                    {report.report_data.map((task, idx) => (
                                                        <div key={idx} className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border">
                                                            <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                                                <span className="text-green-500 text-xs">✓</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-foreground">{task.task_title}</p>
                                                                        <p className="text-xs text-muted-foreground mt-0.5">{task.area} · {task.frequency}</p>
                                                                    </div>
                                                                </div>
                                                                {task.completed_by && (
                                                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                                                                        <span className="text-xs text-muted-foreground">
                                                                            👤 <span className="font-medium text-foreground">{task.completed_by}</span>
                                                                        </span>
                                                                        {task.completed_at && (
                                                                            <span className="text-xs text-muted-foreground">
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