import React, { useState, useMemo } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/queryUtils';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, differenceInHours, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';

const COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#22c55e', '#8b5cf6', '#ec4899'];

export default function ShiftAnalytics() {
    const permissions = usePermissions();
    const [selectedWeek, setSelectedWeek] = useState(new Date());

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true }),
        staleTime: STALE.SLOW,
    });

    const { data: allShifts = [] } = useQuery({
        queryKey: ['shifts-analytics'],
        queryFn: () => {
            const from = format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd');
            const to = format(endOfMonth(new Date()), 'yyyy-MM-dd');
            return base44.entities.Shift.filter({ date_gte: from, date_lte: to }, '-date', 500);
        },
        staleTime: STALE.SLOW,
    });

    const weekStart = startOfWeek(selectedWeek, { locale: de, weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedWeek, { locale: de, weekStartsOn: 1 });

    // Filter shifts for selected week
    const weekShifts = allShifts.filter(shift => {
        const shiftDate = parseISO(shift.date);
        return shiftDate >= weekStart && shiftDate <= weekEnd;
    });

    // Calculate hours per employee
    const employeeHours = useMemo(() => {
        const hours = {};
        weekShifts.forEach(shift => {
            const start = new Date(`2000-01-01T${shift.start_time}`);
            const end = new Date(`2000-01-01T${shift.end_time}`);
            const duration = differenceInHours(end, start);
            
            if (!hours[shift.employee_name]) {
                hours[shift.employee_name] = 0;
            }
            hours[shift.employee_name] += duration;
        });
        
        return Object.entries(hours)
            .map(([name, hours]) => ({ name, hours }))
            .sort((a, b) => b.hours - a.hours);
    }, [weekShifts]);

    // Calculate shift type distribution
    const shiftTypeData = useMemo(() => {
        const types = {};
        weekShifts.forEach(shift => {
            const type = shift.shift_type || 'Nicht angegeben';
            types[type] = (types[type] || 0) + 1;
        });
        
        return Object.entries(types).map(([name, value]) => ({ name, value }));
    }, [weekShifts]);

    // Daily staffing levels
    const dailyStaffing = useMemo(() => {
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        
        return days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayShifts = weekShifts.filter(s => s.date === dayStr);
            
            return {
                date: format(day, 'EEE dd.MM', { locale: de }),
                count: dayShifts.length,
                hours: dayShifts.reduce((sum, shift) => {
                    const start = new Date(`2000-01-01T${shift.start_time}`);
                    const end = new Date(`2000-01-01T${shift.end_time}`);
                    return sum + differenceInHours(end, start);
                }, 0)
            };
        });
    }, [weekShifts, weekStart, weekEnd]);

    // Detect issues
    const issues = useMemo(() => {
        const problems = [];
        
        dailyStaffing.forEach(day => {
            if (day.count === 0) {
                problems.push({
                    type: 'critical',
                    message: `${day.date}: Keine Schichten geplant`,
                    icon: AlertTriangle
                });
            } else if (day.count < 2) {
                problems.push({
                    type: 'warning',
                    message: `${day.date}: Nur ${day.count} Mitarbeiter eingeplant`,
                    icon: AlertTriangle
                });
            } else if (day.count > 6) {
                problems.push({
                    type: 'info',
                    message: `${day.date}: Überbesetzung mit ${day.count} Mitarbeitern`,
                    icon: Users
                });
            }
        });
        
        // Check for employees with too many/few hours
        employeeHours.forEach(emp => {
            if (emp.hours > 48) {
                problems.push({
                    type: 'warning',
                    message: `${emp.name}: ${emp.hours}h (über 48h/Woche)`,
                    icon: Clock
                });
            } else if (emp.hours < 10 && emp.hours > 0) {
                problems.push({
                    type: 'info',
                    message: `${emp.name}: Nur ${emp.hours}h eingeplant`,
                    icon: Clock
                });
            }
        });
        
        return problems;
    }, [dailyStaffing, employeeHours]);

    const totalHours = employeeHours.reduce((sum, emp) => sum + emp.hours, 0);
    const avgHoursPerDay = dailyStaffing.reduce((sum, day) => sum + day.hours, 0) / 7;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Schichtplan-Analyse</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {format(weekStart, 'd. MMM', { locale: de })} - {format(weekEnd, 'd. MMM yyyy', { locale: de })}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Select 
                            value={format(selectedWeek, 'yyyy-MM-dd')}
                            onValueChange={(v) => setSelectedWeek(parseISO(v))}
                        >
                            <SelectTrigger className="w-48 bg-card border-border">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 8 }).map((_, i) => {
                                    const date = new Date();
                                    date.setDate(date.getDate() - (i * 7));
                                    const ws = startOfWeek(date, { locale: de, weekStartsOn: 1 });
                                    const we = endOfWeek(date, { locale: de, weekStartsOn: 1 });
                                    return (
                                        <SelectItem key={i} value={format(ws, 'yyyy-MM-dd')}>
                                            KW {format(ws, 'I', { locale: de })} ({format(ws, 'd.MM')} - {format(we, 'd.MM')})
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{totalHours}h</p>
                                <p className="text-sm text-muted-foreground">Gesamt-Stunden</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{weekShifts.length}</p>
                                <p className="text-sm text-muted-foreground">Schichten</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{avgHoursPerDay.toFixed(1)}h</p>
                                <p className="text-sm text-muted-foreground">Ø Stunden/Tag</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{employeeHours.length}</p>
                                <p className="text-sm text-muted-foreground">Aktive Mitarbeiter</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Issues Alert */}
                {issues.length > 0 && (
                    <Card className="p-6 bg-card border-border mb-8">
                        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Hinweise zur Planung ({issues.length})
                        </h3>
                        <div className="grid gap-2">
                            {issues.slice(0, 5).map((issue, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                    <issue.icon className={`w-4 h-4 mt-0.5 ${
                                        issue.type === 'critical' ? 'text-red-500' : 
                                        issue.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                                    }`} />
                                    <span className="text-sm text-muted-foreground">{issue.message}</span>
                                </div>
                            ))}
                            {issues.length > 5 && (
                                <p className="text-sm text-muted-foreground pl-7">
                                    + {issues.length - 5} weitere Hinweise
                                </p>
                            )}
                        </div>
                    </Card>
                )}

                {/* Charts Grid */}
                <div className="grid lg:grid-cols-2 gap-6 mb-6">
                    {/* Hours per Employee */}
                    <Card className="p-6 bg-card border-border">
                        <h3 className="font-semibold text-foreground mb-4">Stunden pro Mitarbeiter</h3>
                        {employeeHours.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={employeeHours}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis 
                                        dataKey="name" 
                                        angle={-45} 
                                        textAnchor="end" 
                                        height={100}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    />
                                    <YAxis tick={{ fill: '#94a3b8' }} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1e293b', 
                                            border: '1px solid #334155',
                                            borderRadius: '8px'
                                        }}
                                        labelStyle={{ color: '#f1f5f9' }}
                                    />
                                    <Bar dataKey="hours" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                Keine Daten verfügbar
                            </div>
                        )}
                    </Card>

                    {/* Shift Type Distribution */}
                    <Card className="p-6 bg-card border-border">
                        <h3 className="font-semibold text-foreground mb-4">Schichttypen-Verteilung</h3>
                        {shiftTypeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={shiftTypeData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {shiftTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1e293b', 
                                            border: '1px solid #334155',
                                            borderRadius: '8px',
                                            color: '#f1f5f9'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                Keine Daten verfügbar
                            </div>
                        )}
                    </Card>
                </div>

                {/* Daily Staffing */}
                <Card className="p-6 bg-card border-border">
                    <h3 className="font-semibold text-foreground mb-4">Tägliche Besetzung</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyStaffing}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fill: '#94a3b8' }}
                            />
                            <YAxis tick={{ fill: '#94a3b8' }} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: '1px solid #334155',
                                    borderRadius: '8px'
                                }}
                                labelStyle={{ color: '#f1f5f9' }}
                            />
                            <Legend wrapperStyle={{ color: '#94a3b8' }} />
                            <Line 
                                type="monotone" 
                                dataKey="count" 
                                name="Anzahl Mitarbeiter"
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 5 }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="hours" 
                                name="Gesamt-Stunden"
                                stroke="#22c55e" 
                                strokeWidth={2}
                                dot={{ fill: '#22c55e', r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
}