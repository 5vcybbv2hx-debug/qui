import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Plus, Wrench } from "lucide-react";
import MaintenanceModal from "../components/maintenance/MaintenanceModal";
import { usePermissions } from "../components/auth/usePermissions";
import PermissionDenied from "../components/auth/PermissionDenied";


export default function MaintenancePage() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [selectedTask, setSelectedTask] = useState(null);
    const [showModal, setShowModal] = useState(false);

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

    if (permissions.loading) return <div className="flex justify-center p-8">Lädt...</div>;
    if (!permissions.canViewEmployees) return <PermissionDenied />;

    const overdueTask = tasks.filter(t => getTaskStatus(t) === 'überfällig');
    const dueSoon = tasks.filter(t => getTaskStatus(t) === 'bald fällig');
    const completed = tasks.filter(t => getTaskStatus(t) === 'erledigt');

    return (
        <div className="p-3 md:p-4 max-w-7xl mx-auto space-y-6 pb-24 md:pb-0">
            <div className="flex justify-between items-start md:items-center gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        <Wrench className="h-6 md:h-8 w-6 md:w-8" />
                        <span className="hidden sm:inline">Wartungsplan</span>
                        <span className="sm:hidden">Wartung</span>
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Geräte und regelmäßige Wartungen</p>
                </div>
                {permissions.canEditEmployees && (
                    <Button 
                        size="sm" 
                        onClick={() => { setSelectedTask(null); setShowModal(true); }}
                        className="md:h-10 h-9 text-xs md:text-sm"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Neue Wartung</span>
                        <span className="sm:hidden">Neu</span>
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
                <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-2 md:pb-3">
                        <CardTitle className="flex items-center gap-1 md:gap-2 text-red-700 text-xs md:text-base">
                            <AlertCircle className="h-4 md:h-5 w-4 md:w-5" />
                            <span className="hidden sm:inline">Überfällig</span>
                            <span className="sm:hidden">Überfällig</span>
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
                            <span className="hidden sm:inline">Bald fällig</span>
                            <span className="sm:hidden">Bald</span>
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
                            <span className="hidden sm:inline">Erledigt</span>
                            <span className="sm:hidden">OK</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 md:p-6">
                        <div className="text-2xl md:text-3xl font-bold text-green-700">{completed.length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                {overdueTask.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-3 text-red-700">Überfällig</h2>
                        <div className="grid gap-3">
                            {overdueTask.map(task => (
                                <Card key={task.id} className="border-red-200">
                                    <CardContent className="p-4">
                                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                                                             <div className="flex-1 min-w-0">
                                                                 <h3 className="font-semibold text-base md:text-lg break-words">{task.equipment_name}</h3>
                                                                 <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{task.task_description}</p>
                                                                 <div className="flex gap-2 mt-2 flex-wrap">
                                                                     <Badge variant="outline" className="text-xs">{task.frequency}</Badge>
                                                                     {task.next_maintenance && (
                                                                         <Badge variant="destructive" className="text-xs whitespace-nowrap">
                                                                             {new Date(task.next_maintenance).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                                                                         </Badge>
                                                                     )}
                                                                     {task.responsible && (
                                                                         <Badge variant="secondary" className="text-xs hidden md:inline-block">{task.responsible}</Badge>
                                                                     )}
                                                                 </div>
                                                             </div>
                                                             {permissions.canEditEmployees && (
                                                                 <div className="flex gap-2 w-full md:w-auto md:flex-col lg:flex-row">
                                                                     <Button 
                                                                         size="sm" 
                                                                         onClick={() => completeMutation.mutate(task)}
                                                                         className="flex-1 md:flex-none text-xs h-8 md:h-9"
                                                                     >
                                                                         <span className="hidden md:inline">Erledigt</span>
                                                                         <span className="md:hidden">OK</span>
                                                                     </Button>
                                                                     <Button 
                                                                         size="sm" 
                                                                         variant="outline" 
                                                                         onClick={() => { setSelectedTask(task); setShowModal(true); }}
                                                                         className="flex-1 md:flex-none text-xs h-8 md:h-9"
                                                                     >
                                                                         <span className="hidden md:inline">Bearbeiten</span>
                                                                         <span className="md:hidden">Edit</span>
                                                                     </Button>
                                                                 </div>
                                                             )}
                                                         </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {dueSoon.length > 0 && (
                    <div>
                        <h2 className="text-lg md:text-xl font-semibold mb-3 text-yellow-700">Bald fällig</h2>
                        <div className="grid gap-3">
                            {dueSoon.map(task => (
                                <Card key={task.id} className="border-yellow-200">
                                    <CardContent className="p-3 md:p-4">
                                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                                             <div className="flex-1 min-w-0">
                                                 <h3 className="font-semibold text-base md:text-lg break-words">{task.equipment_name}</h3>
                                                 <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{task.task_description}</p>
                                                 <div className="flex gap-2 mt-2 flex-wrap">
                                                     <Badge variant="outline" className="text-xs">{task.frequency}</Badge>
                                                     {task.next_maintenance && (
                                                         <Badge className="bg-yellow-100 text-yellow-800 text-xs whitespace-nowrap">
                                                             {new Date(task.next_maintenance).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                                                         </Badge>
                                                     )}
                                                     {task.responsible && (
                                                         <Badge variant="secondary" className="text-xs hidden md:inline-block">{task.responsible}</Badge>
                                                     )}
                                                 </div>
                                             </div>
                                             {permissions.canEditEmployees && (
                                                 <div className="flex gap-2 w-full md:w-auto md:flex-col lg:flex-row">
                                                     <Button 
                                                         size="sm" 
                                                         onClick={() => completeMutation.mutate(task)}
                                                         className="flex-1 md:flex-none text-xs h-8 md:h-9"
                                                     >
                                                         <span className="hidden md:inline">Erledigt</span>
                                                         <span className="md:hidden">OK</span>
                                                     </Button>
                                                     <Button 
                                                         size="sm" 
                                                         variant="outline" 
                                                         onClick={() => { setSelectedTask(task); setShowModal(true); }}
                                                         className="flex-1 md:flex-none text-xs h-8 md:h-9"
                                                     >
                                                         <span className="hidden md:inline">Bearbeiten</span>
                                                         <span className="md:hidden">Edit</span>
                                                     </Button>
                                                 </div>
                                             )}
                                         </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {completed.length > 0 && (
                    <div>
                        <h2 className="text-lg md:text-xl font-semibold mb-3 text-green-700">Erledigt</h2>
                        <div className="grid gap-3">
                            {completed.map(task => (
                                <Card key={task.id}>
                                    <CardContent className="p-3 md:p-4">
                                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                                             <div className="flex-1 min-w-0">
                                                 <h3 className="font-semibold text-base md:text-lg break-words">{task.equipment_name}</h3>
                                                 <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{task.task_description}</p>
                                                 <div className="flex gap-2 mt-2 flex-wrap">
                                                     <Badge variant="outline" className="text-xs">{task.frequency}</Badge>
                                                     {task.next_maintenance && (
                                                         <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                                             {new Date(task.next_maintenance).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                                                         </Badge>
                                                     )}
                                                     {task.responsible && (
                                                         <Badge variant="secondary" className="text-xs hidden md:inline-block">{task.responsible}</Badge>
                                                     )}
                                                 </div>
                                             </div>
                                             {permissions.canEditEmployees && (
                                                 <Button 
                                                     size="sm" 
                                                     variant="outline" 
                                                     onClick={() => { setSelectedTask(task); setShowModal(true); }}
                                                     className="w-full md:w-auto text-xs h-8 md:h-9"
                                                 >
                                                     <span className="hidden md:inline">Bearbeiten</span>
                                                     <span className="md:hidden">Edit</span>
                                                 </Button>
                                             )}
                                         </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
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