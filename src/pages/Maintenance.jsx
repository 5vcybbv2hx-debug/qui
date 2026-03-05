import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Clock, Plus, Wrench, Calendar, User, Filter, X, CalendarDays, GripVertical } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import MaintenanceModal from "../components/maintenance/MaintenanceModal";
import { usePermissions } from "../components/auth/usePermissions";
import PermissionDenied from "../components/auth/PermissionDenied";
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

export default function MaintenancePage() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [selectedTask, setSelectedTask] = useState(null);
    const [showModal, setShowModal] = useState(false);
    
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedEquipment, setSelectedEquipment] = useState("");
    const [selectedResponsible, setSelectedResponsible] = useState("");

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['maintenance-tasks'],
        queryFn: () => base44.entities.MaintenanceTask.filter({ is_active: true })
    });

    const completeMutation = useMutation({
        mutationFn: async (task) => {
            const today = new Date().toISOString().split('T')[0];
            const nextDate = calculateNextMaintenance(today, task.frequency);
            const updated = await base44.entities.MaintenanceTask.update(task.id, {
                last_maintenance: today,
                next_maintenance: nextDate,
                status: 'erledigt'
            });
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['maintenance-tasks']);
        }
    });

    function calculateNextMaintenance(date, frequency) {
        const d = new Date(date);
        switch (frequency) {
            case 'täglich': d.setDate(d.getDate() + 1); break;
            case 'wöchentlich': d.setDate(d.getDate() + 7); break;
            case 'monatlich': d.setMonth(d.getMonth() + 1); break;
            case 'quartalsweise': d.setMonth(d.getMonth() + 3); break;
            case 'halbjährlich': d.setMonth(d.getMonth() + 6); break;
            case 'jährlich': d.setFullYear(d.getFullYear() + 1); break;
        }
        return d.toISOString().split('T')[0];
    }

    function getTaskStatus(task) {
        if (!task.next_maintenance) return 'erledigt';
        const today = new Date();
        const nextDate = new Date(task.next_maintenance);
        const diffDays = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'überfällig';
        if (diffDays <= 7) return 'bald fällig';
        return 'erledigt';
    }

    const overdueTask = tasks.filter(t => getTaskStatus(t) === 'überfällig');
    const dueSoon = tasks.filter(t => getTaskStatus(t) === 'bald fällig');
    const completed = tasks.filter(t => getTaskStatus(t) === 'erledigt');

    const handleDragEnd = async (result) => {
        const { draggableId } = result;
        const task = tasks.find(t => t.id === draggableId);
        if (task) {
            completeMutation.mutate(task);
        }
    };

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    const completedTasks = tasks.filter(t => t.last_maintenance && t.status === 'erledigt');
    const filteredTasks = completedTasks.filter(task => {
        if (dateFrom && task.last_maintenance < dateFrom) return false;
        if (dateTo && task.last_maintenance > dateTo) return false;
        if (selectedEquipment && task.equipment_name !== selectedEquipment) return false;
        if (selectedResponsible && task.responsible !== selectedResponsible) return false;
        return true;
    });

    const maintenanceByMonth = useMemo(() => {
        const data = {};
        filteredTasks.forEach(task => {
            if (task.last_maintenance) {
                const date = new Date(task.last_maintenance);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                data[key] = (data[key] || 0) + 1;
            }
        });
        return Object.entries(data).map(([month, count]) => ({
            month: new Date(month + '-01').toLocaleDateString('de-DE', { year: '2-digit', month: 'short' }),
            count
        })).sort((a, b) => a.month.localeCompare(b.month));
    }, [filteredTasks]);

    const maintenanceByEquipment = useMemo(() => {
        const data = {};
        filteredTasks.forEach(task => {
            data[task.equipment_name] = (data[task.equipment_name] || 0) + 1;
        });
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [filteredTasks]);

    if (permissions.loading) return <div className="flex justify-center p-8">Lädt...</div>;
    if (!permissions.isManager) return <PermissionDenied />;

    return (
        <div className="p-3 md:p-4 max-w-7xl mx-auto space-y-6 pb-24 md:pb-0">
            <div className="flex justify-between items-start md:items-center gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        <Wrench className="h-6 md:h-8 w-6 md:w-8" />
                        Wartung
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Kanban-Board & Historie</p>
                </div>
                {permissions.canEditEmployees && (
                    <Button 
                        size="sm" 
                        onClick={() => { setSelectedTask(null); setShowModal(true); }}
                        className="md:h-10 h-9 text-xs md:text-sm"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Neue Wartung
                    </Button>
                )}
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
                <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-2 md:pb-3">
                        <CardTitle className="flex items-center gap-1 md:gap-2 text-red-700 text-xs md:text-base">
                            <AlertCircle className="h-4 md:h-5 w-4 md:w-5" />
                            Überfällig
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 md:p-6">
                        <div className="text-2xl md:text-3xl font-bold text-red-700">{overdueTask.length}</div>
                    </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader className="pb-2 md:pb-3">
                        <CardTitle className="flex items-center gap-1 md:gap-2 text-yellow-700 text-xs md:text-base">
                            <Clock className="h-4 md:h-5 w-4 md:w-5" />
                            Bald fällig
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 md:p-6">
                        <div className="text-2xl md:text-3xl font-bold text-yellow-700">{dueSoon.length}</div>
                    </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-2 md:pb-3">
                        <CardTitle className="flex items-center gap-1 md:gap-2 text-green-700 text-xs md:text-base">
                            <CheckCircle className="h-4 md:h-5 w-4 md:w-5" />
                            Erledigt
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 md:p-6">
                        <div className="text-2xl md:text-3xl font-bold text-green-700">{completed.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Kanban Board */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[400px]">
                    {/* Überfällig */}
                    <Droppable droppableId="overdue">
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`rounded-lg border-2 p-4 min-h-[500px] transition-colors ${
                                    snapshot.isDraggingOver
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-red-200 bg-red-50/30'
                                }`}
                            >
                                <h3 className="font-bold text-lg text-red-700 mb-4">🔴 Überfällig ({overdueTask.length})</h3>
                                <div className="space-y-3">
                                    {overdueTask.map((task, idx) => (
                                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`bg-white rounded-lg border-l-4 border-red-500 p-3 shadow-sm transition-all ${
                                                        snapshot.isDragging ? 'shadow-lg scale-105' : ''
                                                    }`}
                                                >
                                                    <div className="flex gap-2 items-start">
                                                        <div {...provided.dragHandleProps} className="mt-1 text-gray-400 flex-shrink-0">
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-sm break-words">{task.equipment_name}</h4>
                                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.task_description}</p>
                                                            <div className="flex gap-2 flex-wrap mb-2">
                                                                <Badge variant="outline" className="text-xs">{task.frequency}</Badge>
                                                                {task.next_maintenance && (
                                                                    <Badge variant="destructive" className="text-xs whitespace-nowrap">
                                                                        {new Date(task.next_maintenance).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {permissions.canEditEmployees && (
                                                                <div className="flex gap-2 flex-wrap">
                                                                    <Button 
                                                                        size="sm" 
                                                                        onClick={() => completeMutation.mutate(task)}
                                                                        className="text-xs h-7 flex-1"
                                                                    >
                                                                        Erledigt
                                                                    </Button>
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="outline" 
                                                                        onClick={() => { setSelectedTask(task); setShowModal(true); }}
                                                                        className="text-xs h-7 flex-1"
                                                                    >
                                                                        Bearbeiten
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                </div>
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>

                    {/* Bald fällig */}
                    <Droppable droppableId="duesoon">
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`rounded-lg border-2 p-4 min-h-[500px] transition-colors ${
                                    snapshot.isDraggingOver
                                        ? 'border-yellow-500 bg-yellow-50'
                                        : 'border-yellow-200 bg-yellow-50/30'
                                }`}
                            >
                                <h3 className="font-bold text-lg text-yellow-700 mb-4">🟡 Bald fällig ({dueSoon.length})</h3>
                                <div className="space-y-3">
                                    {dueSoon.map((task, idx) => (
                                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`bg-white rounded-lg border-l-4 border-yellow-500 p-3 shadow-sm transition-all ${
                                                        snapshot.isDragging ? 'shadow-lg scale-105' : ''
                                                    }`}
                                                >
                                                    <div className="flex gap-2 items-start">
                                                        <div {...provided.dragHandleProps} className="mt-1 text-gray-400 flex-shrink-0">
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-sm break-words">{task.equipment_name}</h4>
                                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.task_description}</p>
                                                            <div className="flex gap-2 flex-wrap mb-2">
                                                                <Badge variant="outline" className="text-xs">{task.frequency}</Badge>
                                                                {task.next_maintenance && (
                                                                    <Badge className="bg-yellow-100 text-yellow-800 text-xs whitespace-nowrap">
                                                                        {new Date(task.next_maintenance).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {permissions.canEditEmployees && (
                                                                <div className="flex gap-2 flex-wrap">
                                                                    <Button 
                                                                        size="sm" 
                                                                        onClick={() => completeMutation.mutate(task)}
                                                                        className="text-xs h-7 flex-1"
                                                                    >
                                                                        Erledigt
                                                                    </Button>
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="outline" 
                                                                        onClick={() => { setSelectedTask(task); setShowModal(true); }}
                                                                        className="text-xs h-7 flex-1"
                                                                    >
                                                                        Bearbeiten
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                </div>
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>

                    {/* Erledigt */}
                    <Droppable droppableId="completed">
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`rounded-lg border-2 p-4 min-h-[500px] transition-colors ${
                                    snapshot.isDraggingOver
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-green-200 bg-green-50/30'
                                }`}
                            >
                                <h3 className="font-bold text-lg text-green-700 mb-4">✅ Erledigt ({completed.length})</h3>
                                <div className="space-y-3">
                                    {completed.map((task, idx) => (
                                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`bg-white rounded-lg border-l-4 border-green-500 p-3 shadow-sm transition-all ${
                                                        snapshot.isDragging ? 'shadow-lg scale-105' : ''
                                                    }`}
                                                >
                                                    <div className="flex gap-2 items-start">
                                                        <div {...provided.dragHandleProps} className="mt-1 text-gray-400 flex-shrink-0">
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-sm break-words">{task.equipment_name}</h4>
                                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.task_description}</p>
                                                            <div className="flex gap-2 flex-wrap mb-2">
                                                                <Badge variant="outline" className="text-xs">{task.frequency}</Badge>
                                                                {task.last_maintenance && (
                                                                    <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                                                        {new Date(task.last_maintenance).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {permissions.canEditEmployees && (
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    onClick={() => { setSelectedTask(task); setShowModal(true); }}
                                                                    className="text-xs h-7 w-full"
                                                                >
                                                                    Bearbeiten
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                </div>
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>
            </DragDropContext>

            {/* Historie Section */}
            <div className="space-y-4 pt-6 border-t border-border">
                <h2 className="text-xl font-bold">Wartungs-Geschichte</h2>
                
                {/* Filter */}
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                                <Label className="text-xs md:text-sm">Von Datum</Label>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs md:text-sm">Bis Datum</Label>
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs md:text-sm">Gerät</Label>
                                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Alle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>Alle Geräte</SelectItem>
                                        {[...new Set(tasks.filter(t => t.last_maintenance).map(t => t.equipment_name))].map(eq => (
                                            <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs md:text-sm">Durchführt von</Label>
                                <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Alle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>Alle Personen</SelectItem>
                                        {[...new Set(tasks.filter(t => t.last_maintenance).map(t => t.responsible).filter(Boolean))].map(name => (
                                            <SelectItem key={name} value={name}>{name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {(dateFrom || dateTo || selectedEquipment || selectedResponsible) && (
                            <div className="flex justify-end">
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                        setDateFrom("");
                                        setDateTo("");
                                        setSelectedEquipment("");
                                        setSelectedResponsible("");
                                    }}
                                    className="text-xs h-8"
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Filter zurücksetzen
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    <Card>
                        <CardContent className="p-3 md:p-6 pt-6">
                            <div className="text-xs md:text-sm text-muted-foreground">Durchgeführte Wartungen</div>
                            <div className="text-2xl md:text-3xl font-bold mt-1">{filteredTasks.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3 md:p-6 pt-6">
                            <div className="text-xs md:text-sm text-muted-foreground">Unterschiedliche Geräte</div>
                            <div className="text-2xl md:text-3xl font-bold mt-1">{maintenanceByEquipment.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3 md:p-6 pt-6">
                            <div className="text-xs md:text-sm text-muted-foreground">Ø pro Monat</div>
                            <div className="text-2xl md:text-3xl font-bold mt-1">
                                {maintenanceByMonth.length > 0 ? (filteredTasks.length / maintenanceByMonth.length).toFixed(1) : 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3 md:p-6 pt-6">
                            <div className="text-xs md:text-sm text-muted-foreground">Letzte Wartung</div>
                            <div className="text-sm md:text-base font-bold mt-1">
                                {filteredTasks.length > 0 ? new Date(Math.max(...filteredTasks.map(t => new Date(t.last_maintenance)))).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '-'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {maintenanceByMonth.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm md:text-base">Wartungen pro Monat</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={maintenanceByMonth}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                            formatter={(value) => `${value} Wartungen`}
                                        />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {maintenanceByEquipment.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm md:text-base">Wartungen pro Gerät</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={maintenanceByEquipment}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name.substring(0, 12)}: ${value}`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {maintenanceByEquipment.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `${value} Wartungen`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm md:text-base">Detaillierte Liste</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {filteredTasks.length > 0 ? (
                                filteredTasks.map(task => (
                                    <div key={task.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-3 bg-slate-50 rounded-lg gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-sm md:text-base break-words">{task.equipment_name}</h4>
                                            <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">{task.task_description}</p>
                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                <Badge variant="outline" className="text-xs">
                                                    <Calendar className="h-3 w-3 mr-1" />
                                                    {new Date(task.last_maintenance).toLocaleDateString('de-DE')}
                                                </Badge>
                                                {task.responsible && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        <User className="h-3 w-3 mr-1" />
                                                        {task.responsible}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">Keine Wartungen für die gewählten Filter gefunden</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {showModal && (
                <MaintenanceModal
                    task={selectedTask}
                    open={showModal}
                    onClose={() => { setShowModal(false); setSelectedTask(null); }}
                />
            )}
        </div>
    );
}