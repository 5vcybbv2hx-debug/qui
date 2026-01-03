import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import CleaningList from '@/components/cleaning/CleaningList';
import AreasManager from '@/components/cleaning/AreasManager';

export default function Cleaning() {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        area: 'Theke',
        frequency: 'täglich'
    });

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['cleaning'],
        queryFn: () => base44.entities.CleaningTask.list('area')
    });

    const { data: allAreas = [] } = useQuery({
        queryKey: ['cleaning-areas'],
        queryFn: () => base44.entities.CleaningArea.list('order')
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
            setFormData({ title: '', area: 'Theke', frequency: 'täglich' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.CleaningTask.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['cleaning']);
        }
    });

    const handleComplete = (task) => {
        updateMutation.mutate({
            id: task.id,
            data: {
                is_completed: !task.is_completed,
                completed_by: task.is_completed ? null : user?.full_name || user?.email,
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

    const resetAllDaily = () => {
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
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const completedCount = tasks.filter(t => t.is_completed).length;
    const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="flex flex-col gap-3 mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Putzliste</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {format(new Date(), "EEEE, d. MMMM", { locale: de })}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <AreasManager />
                        <Button 
                            variant="outline"
                            onClick={resetAllDaily}
                            className="text-slate-300 border-slate-600 hover:bg-slate-700"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Tägl. zurücksetzen
                        </Button>
                        <Button 
                            onClick={() => setModalOpen(true)}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Aufgabe
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
                <CleaningList 
                    tasks={tasks}
                    areas={areas}
                    onComplete={handleComplete}
                    onReset={handleReset}
                    userName={user?.full_name || user?.email}
                />

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