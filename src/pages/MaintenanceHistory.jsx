import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, User, Wrench, TrendingUp, Filter, X } from "lucide-react";
import { usePermissions } from "../components/auth/usePermissions";
import PermissionDenied from "../components/auth/PermissionDenied";

export default function MaintenanceHistoryPage() {
    const permissions = usePermissions();
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedEquipment, setSelectedEquipment] = useState("");
    const [selectedResponsible, setSelectedResponsible] = useState("");

    const { data: tasks = [] } = useQuery({
        queryKey: ['maintenance-tasks'],
        queryFn: () => base44.entities.MaintenanceTask.filter({ is_active: true })
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const completedTasks = useMemo(() => {
        return tasks.filter(t => t.last_maintenance && t.status === 'erledigt');
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return completedTasks.filter(task => {
            if (dateFrom && task.last_maintenance < dateFrom) return false;
            if (dateTo && task.last_maintenance > dateTo) return false;
            if (selectedEquipment && task.equipment_name !== selectedEquipment) return false;
            if (selectedResponsible && task.responsible !== selectedResponsible) return false;
            return true;
        });
    }, [completedTasks, dateFrom, dateTo, selectedEquipment, selectedResponsible]);

    const equipmentList = [...new Set(completedTasks.map(t => t.equipment_name))];
    const responsibleList = [...new Set(completedTasks.map(t => t.responsible).filter(Boolean))];

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

    const maintenanceByResponsible = useMemo(() => {
        const data = {};
        filteredTasks.forEach(task => {
            if (task.responsible) {
                data[task.responsible] = (data[task.responsible] || 0) + 1;
            }
        });
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [filteredTasks]);

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    if (permissions.loading) return <div className="flex justify-center p-8">Lädt...</div>;
    if (!permissions.canViewEmployees) return <PermissionDenied />;

    const resetFilters = () => {
        setDateFrom("");
        setDateTo("");
        setSelectedEquipment("");
        setSelectedResponsible("");
    };

    const hasActiveFilters = dateFrom || dateTo || selectedEquipment || selectedResponsible;

    return (
        <div className="p-3 md:p-4 max-w-7xl mx-auto space-y-6 pb-24 md:pb-0">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                    <TrendingUp className="h-6 md:h-8 w-6 md:w-8" />
                    <span className="hidden sm:inline">Wartungshistorie</span>
                    <span className="sm:hidden">Historie</span>
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Übersicht aller durchgeführten Wartungsaufgaben</p>
            </div>

            {/* Filter Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <Filter className="h-5 w-5" />
                        Filter
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                                    {equipmentList.map(eq => (
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
                                    {responsibleList.map(name => (
                                        <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="flex justify-end">
                            <Button 
                                size="sm" 
                                variant="outline"
                                onClick={resetFilters}
                                className="text-xs h-8"
                            >
                                <X className="h-3 w-3 mr-1" />
                                Filter zurücksetzen
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Statistics Cards */}
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
                        <div className="text-xs md:text-sm text-muted-foreground">Techniker</div>
                        <div className="text-2xl md:text-3xl font-bold mt-1">{maintenanceByResponsible.length}</div>
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
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Timeline Chart */}
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

                {/* Equipment Distribution */}
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

            {/* Responsible Distribution */}
            {maintenanceByResponsible.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm md:text-base">Wartungen pro Techniker</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={maintenanceByResponsible}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    formatter={(value) => `${value} Wartungen`}
                                />
                                <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Detailed List */}
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
    );
}