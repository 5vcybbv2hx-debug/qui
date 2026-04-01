import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, parseISO, subWeeks, getDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Save, Send, RotateCcw, Copy, Users, LayoutGrid, List,
    AlertCircle, CheckCircle2, ChevronDown, X, MapPin, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_AREAS = [
    {
        name: 'Nichtraucher',
        roles: ['Service', 'Theke', 'Nachschub', 'Spülen'],
        color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
        badge: 'bg-blue-500/20 text-blue-300'
    },
    {
        name: 'Raucher',
        roles: ['Service', 'Theke', 'Nachschub', 'Spülen', 'Türe'],
        color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
        badge: 'bg-orange-500/20 text-orange-300'
    },
    {
        name: 'Tunnel',
        roles: ['Service', 'Theke', 'Nachschub', 'Spülen'],
        color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
        badge: 'bg-purple-500/20 text-purple-300'
    },
];

function slotKey(area, role) {
    return `${area}||${role}`;
}

function EmployeeChip({ emp, dragging, onRemove, compact }) {
    return (
        <div className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium select-none',
            'bg-amber-500/20 border border-amber-500/30 text-amber-200',
            dragging && 'opacity-50',
            compact ? 'text-xs' : ''
        )}>
            <div className="w-5 h-5 rounded-full bg-amber-500/40 flex items-center justify-center text-[10px] font-bold text-amber-200 shrink-0">
                {emp.employee_name?.charAt(0)}
            </div>
            <span className="truncate max-w-[80px]">{emp.employee_name?.split(' ')[0]}</span>
            {onRemove && (
                <button onClick={onRemove} className="text-amber-400/60 hover:text-red-400 transition-colors shrink-0">
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

function SlotDropZone({ area, role, assigned, onRemove }) {
    const key = slotKey(area, role);
    return (
        <Droppable droppableId={key} direction="horizontal">
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                        'min-h-[42px] rounded-lg border border-dashed px-2 py-1 flex flex-wrap gap-1 items-center transition-all',
                        snapshot.isDraggingOver
                            ? 'border-amber-400 bg-amber-500/10'
                            : 'border-slate-600 bg-slate-800/40'
                    )}
                >
                    {assigned.map((emp, idx) => (
                        <Draggable key={emp.id} draggableId={emp.id} index={idx}>
                            {(drag, snap) => (
                                <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}>
                                    <EmployeeChip emp={emp} dragging={snap.isDragging} onRemove={() => onRemove(emp.id)} compact />
                                </div>
                            )}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                    {assigned.length === 0 && (
                        <span className="text-slate-500 text-[10px] italic pointer-events-none">leer</span>
                    )}
                </div>
            )}
        </Droppable>
    );
}

export default function Stationsplan() {
    const queryClient = useQueryClient();
    const today = format(new Date(), 'yyyy-MM-dd');
    const [selectedDate, setSelectedDate] = useState(today);
    const [selectedShiftId, setSelectedShiftId] = useState('');
    const [view, setView] = useState('bereiche'); // 'bereiche' | 'mitarbeiter'
    const [planId, setPlanId] = useState(null);
    // assignments: { [employeeId]: { area, role, secondary_role, note, id } }
    const [assignments, setAssignments] = useState({});
    const [notes, setNotes] = useState({});

    // Load all shifts for the selected date
    const { data: shiftsForDay = [] } = useQuery({
        queryKey: ['shifts-for-stationsplan', selectedDate],
        queryFn: () => base44.entities.Shift.filter({ date: selectedDate }),
        enabled: !!selectedDate
    });

    // Unique shifts (by shift_type or id) for the dropdown
    const shiftOptions = useMemo(() => {
        const seen = new Set();
        return shiftsForDay.filter(s => {
            const key = s.shift_type || s.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [shiftsForDay]);

    // Employees in the selected shift
    const employeesInShift = useMemo(() => {
        if (!selectedShiftId) return shiftsForDay;
        const chosen = shiftOptions.find(s => s.id === selectedShiftId);
        if (!chosen) return shiftsForDay;
        return shiftsForDay.filter(s => s.shift_type === chosen.shift_type || s.id === selectedShiftId);
    }, [shiftsForDay, selectedShiftId, shiftOptions]);

    // Load existing stationsplan
    const { data: existingPlans = [] } = useQuery({
        queryKey: ['stationsplan', selectedDate, selectedShiftId],
        queryFn: async () => {
            const plans = await base44.entities.Stationsplan.filter({ date: selectedDate });
            return plans.filter(p => !selectedShiftId || p.shift_id === selectedShiftId || (!p.shift_id && !selectedShiftId));
        },
        enabled: !!selectedDate
    });

    const { data: existingAssignments = [] } = useQuery({
        queryKey: ['station-assignments', planId],
        queryFn: () => base44.entities.StationAssignment.filter({ stationsplan_id: planId }),
        enabled: !!planId,
        onSuccess: (data) => {
            const a = {};
            const n = {};
            data.forEach(d => {
                a[d.employee_id] = { area: d.area || '', role: d.role || '', secondary_role: d.secondary_role || '', id: d.id };
                if (d.note) n[d.employee_id] = d.note;
            });
            setAssignments(a);
            setNotes(n);
        }
    });

    // Sync planId when existingPlans changes
    React.useEffect(() => {
        if (existingPlans.length > 0) {
            setPlanId(existingPlans[0].id);
        } else {
            setPlanId(null);
            setAssignments({});
            setNotes({});
        }
    }, [existingPlans]);

    // Sync assignments from loaded data
    React.useEffect(() => {
        if (existingAssignments.length > 0) {
            const a = {};
            const n = {};
            existingAssignments.forEach(d => {
                a[d.employee_id] = { area: d.area || '', role: d.role || '', secondary_role: d.secondary_role || '', id: d.id };
                if (d.note) n[d.employee_id] = d.note;
            });
            setAssignments(a);
            setNotes(n);
        }
    }, [existingAssignments]);

    const saveMutation = useMutation({
        mutationFn: async (status) => {
            let pid = planId;
            if (!pid) {
                const plan = await base44.entities.Stationsplan.create({
                    date: selectedDate,
                    shift_id: selectedShiftId || null,
                    shift_name: shiftOptions.find(s => s.id === selectedShiftId)?.shift_type || '',
                    status
                });
                pid = plan.id;
                setPlanId(pid);
            } else {
                await base44.entities.Stationsplan.update(pid, { status });
            }
            // Upsert all assignments
            for (const emp of employeesInShift) {
                const asgn = assignments[emp.employee_id] || {};
                const existing = existingAssignments.find(a => a.employee_id === emp.employee_id);
                const payload = {
                    stationsplan_id: pid,
                    employee_id: emp.employee_id,
                    employee_name: emp.employee_name,
                    area: asgn.area || '',
                    role: asgn.role || '',
                    secondary_role: asgn.secondary_role || '',
                    note: notes[emp.employee_id] || ''
                };
                if (existing) {
                    await base44.entities.StationAssignment.update(existing.id, payload);
                } else {
                    await base44.entities.StationAssignment.create(payload);
                }
            }
            return pid;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stationsplan', selectedDate, selectedShiftId] });
            queryClient.invalidateQueries({ queryKey: ['station-assignments', planId] });
            toast.success('Stationsplan gespeichert');
        }
    });

    // Build slot map: { "area||role": [empId, ...] }
    const slotMap = useMemo(() => {
        const map = {};
        Object.entries(assignments).forEach(([empId, asgn]) => {
            if (asgn.area && asgn.role) {
                const key = slotKey(asgn.area, asgn.role);
                if (!map[key]) map[key] = [];
                map[key].push(empId);
            }
        });
        return map;
    }, [assignments]);

    // Unassigned employees
    const unassigned = useMemo(() => {
        return employeesInShift.filter(e => {
            const a = assignments[e.employee_id];
            return !a || !a.area || !a.role;
        });
    }, [employeesInShift, assignments]);

    const onDragEnd = useCallback((result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId) return;

        const empId = draggableId;
        const destKey = destination.droppableId;

        if (destKey === 'pool') {
            // Remove from assignment
            setAssignments(prev => {
                const next = { ...prev };
                if (next[empId]) next[empId] = { ...next[empId], area: '', role: '' };
                return next;
            });
            return;
        }

        const [area, role] = destKey.split('||');
        setAssignments(prev => ({
            ...prev,
            [empId]: { ...(prev[empId] || {}), area, role }
        }));
    }, []);

    const removeFromSlot = useCallback((empId) => {
        setAssignments(prev => ({
            ...prev,
            [empId]: { ...(prev[empId] || {}), area: '', role: '' }
        }));
    }, []);

    const handleReset = () => {
        setAssignments({});
        setNotes({});
    };

    const setSecondaryRole = (empId, val) => {
        setAssignments(prev => ({ ...prev, [empId]: { ...(prev[empId] || {}), secondary_role: val } }));
    };

    // Hints
    const hints = useMemo(() => {
        const h = [];
        if (unassigned.length > 0) h.push(`${unassigned.length} Mitarbeiter ohne Zuweisung`);
        DEFAULT_AREAS.forEach(area => {
            const hasTheke = area.roles.includes('Theke') && (slotMap[slotKey(area.name, 'Theke')]?.length || 0) === 0;
            const hasService = area.roles.includes('Service') && (slotMap[slotKey(area.name, 'Service')]?.length || 0) === 0;
            if (hasTheke) h.push(`${area.name} ohne Theke`);
            if (hasService) h.push(`${area.name} ohne Service`);
        });
        return h;
    }, [unassigned, slotMap]);

    const currentPlan = existingPlans[0];

    const getEmpById = (id) => employeesInShift.find(e => e.employee_id === id);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-amber-400" />
                        Stationsplan
                    </h1>
                    {currentPlan && (
                        <Badge className={cn('mt-1 text-xs', currentPlan.status === 'published' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300')}>
                            {currentPlan.status === 'published' ? '✓ Veröffentlicht' : '● Entwurf'}
                        </Badge>
                    )}
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" /> Zurücksetzen
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => saveMutation.mutate('draft')} disabled={saveMutation.isPending} className="gap-1.5">
                        <Save className="w-3.5 h-3.5" /> Speichern
                    </Button>
                    <Button size="sm" onClick={() => saveMutation.mutate('published')} disabled={saveMutation.isPending} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                        <Send className="w-3.5 h-3.5" /> Veröffentlichen
                    </Button>
                </div>
            </div>

            {/* Selectors */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="flex flex-col gap-1 flex-1">
                        <label className="text-xs text-muted-foreground font-medium">Datum</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => { setSelectedDate(e.target.value); setSelectedShiftId(''); setAssignments({}); }}
                            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                        />
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                        <label className="text-xs text-muted-foreground font-medium">Schicht</label>
                        <select
                            value={selectedShiftId}
                            onChange={e => setSelectedShiftId(e.target.value)}
                            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                        >
                            <option value="">Alle Schichten ({shiftsForDay.length} MA)</option>
                            {shiftOptions.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.shift_type || 'Schicht'} – {s.start_time}–{s.end_time}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* View toggle */}
                    <div className="flex bg-secondary rounded-xl p-1 gap-1 self-end">
                        <button onClick={() => setView('bereiche')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all', view === 'bereiche' ? 'bg-card text-foreground shadow' : 'text-muted-foreground')}>
                            <LayoutGrid className="w-3.5 h-3.5" /> Bereiche
                        </button>
                        <button onClick={() => setView('mitarbeiter')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all', view === 'mitarbeiter' ? 'bg-card text-foreground shadow' : 'text-muted-foreground')}>
                            <List className="w-3.5 h-3.5" /> Mitarbeiter
                        </button>
                    </div>
                </div>
            </Card>

            {/* Hints */}
            {hints.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {hints.map((hint, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {hint}
                        </div>
                    ))}
                </div>
            )}

            {employeesInShift.length === 0 ? (
                <Card className="p-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">Keine Schichten für dieses Datum gefunden.</p>
                    <p className="text-xs text-muted-foreground mt-1">Bitte zuerst Schichten im Kalender einplanen.</p>
                </Card>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    {view === 'bereiche' ? (
                        <div className="space-y-4">
                            {/* Area Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {DEFAULT_AREAS.map(area => (
                                    <Card key={area.name} className={cn('p-4 bg-gradient-to-br border', area.color)}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge className={cn('text-xs font-bold px-2', area.badge)}>{area.name}</Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {area.roles.reduce((acc, r) => acc + (slotMap[slotKey(area.name, r)]?.length || 0), 0)} MA
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {area.roles.map(role => (
                                                <div key={role}>
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <Briefcase className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground font-medium">{role}</span>
                                                    </div>
                                                    <SlotDropZone
                                                        area={area.name}
                                                        role={role}
                                                        assigned={(slotMap[slotKey(area.name, role)] || []).map(id => {
                                                            const e = getEmpById(id);
                                                            return e ? { id, employee_name: e.employee_name } : null;
                                                        }).filter(Boolean)}
                                                        onRemove={removeFromSlot}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Pool */}
                            <Card className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-semibold text-foreground text-sm">Nicht eingeteilt</span>
                                    {unassigned.length > 0 && (
                                        <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">{unassigned.length}</Badge>
                                    )}
                                </div>
                                <Droppable droppableId="pool" direction="horizontal">
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={cn(
                                                'min-h-[50px] flex flex-wrap gap-2 p-2 rounded-xl border border-dashed transition-all',
                                                snapshot.isDraggingOver ? 'border-amber-400 bg-amber-500/5' : 'border-slate-600'
                                            )}
                                        >
                                            {unassigned.map((emp, idx) => (
                                                <Draggable key={emp.employee_id} draggableId={emp.employee_id} index={idx}>
                                                    {(drag, snap) => (
                                                        <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}>
                                                            <EmployeeChip emp={{ id: emp.employee_id, employee_name: emp.employee_name }} dragging={snap.isDragging} />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                            {unassigned.length === 0 && (
                                                <span className="text-slate-500 text-xs italic py-2 px-1">Alle Mitarbeiter eingeteilt ✓</span>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </Card>
                        </div>
                    ) : (
                        /* Mitarbeiter-Ansicht */
                        <div className="space-y-2">
                            {employeesInShift.map(emp => {
                                const asgn = assignments[emp.employee_id] || {};
                                const note = notes[emp.employee_id] || '';
                                return (
                                    <Card key={emp.employee_id} className="p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-amber-400 shrink-0">
                                                    {emp.employee_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-foreground">{emp.employee_name}</p>
                                                    <p className="text-xs text-muted-foreground">{emp.start_time}–{emp.end_time}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 flex-1">
                                                <select
                                                    value={asgn.area || ''}
                                                    onChange={e => setAssignments(prev => ({ ...prev, [emp.employee_id]: { ...(prev[emp.employee_id] || {}), area: e.target.value } }))}
                                                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground flex-1 min-w-[110px]"
                                                >
                                                    <option value="">Kein Bereich</option>
                                                    {DEFAULT_AREAS.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                                                </select>
                                                <select
                                                    value={asgn.role || ''}
                                                    onChange={e => setAssignments(prev => ({ ...prev, [emp.employee_id]: { ...(prev[emp.employee_id] || {}), role: e.target.value } }))}
                                                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground flex-1 min-w-[100px]"
                                                >
                                                    <option value="">Keine Rolle</option>
                                                    {(asgn.area ? DEFAULT_AREAS.find(a => a.name === asgn.area)?.roles : DEFAULT_AREAS.flatMap(a => a.roles).filter((v, i, arr) => arr.indexOf(v) === i))?.map(r => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={asgn.secondary_role || ''}
                                                    onChange={e => setSecondaryRole(emp.employee_id, e.target.value)}
                                                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground flex-1 min-w-[110px]"
                                                >
                                                    <option value="">Zusatzrolle</option>
                                                    {['Service', 'Theke', 'Spülen', 'Nachschub', 'Türe'].map(r => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    placeholder="Notiz..."
                                                    value={note}
                                                    onChange={e => setNotes(prev => ({ ...prev, [emp.employee_id]: e.target.value }))}
                                                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground flex-1 min-w-[120px]"
                                                />
                                            </div>
                                            {(asgn.area || asgn.role) && (
                                                <Badge className="bg-green-500/20 text-green-300 text-xs shrink-0">
                                                    {[asgn.area, asgn.role].filter(Boolean).join(' / ')}
                                                </Badge>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </DragDropContext>
            )}
        </div>
    );
}