import React, { useState } from 'react';
import { Check, Calendar, Pencil, Trash2, Archive, User, MoreVertical, Circle, Loader, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { de } from 'date-fns/locale';

const priorityConfig = {
    'niedrig': { color: 'bg-slate-500', label: 'Niedrig', cardBg: '', badge: 'text-slate-400' },
    'mittel':  { color: 'bg-blue-500',  label: 'Mittel',  cardBg: '', badge: 'text-blue-400' },
    'hoch':    { color: 'bg-orange-500', label: 'Hoch',    cardBg: 'bg-orange-500/5 border-orange-500/20', badge: 'text-orange-400' },
    'dringend':{ color: 'bg-red-500',   label: 'Dringend', cardBg: 'bg-red-500/10 border-red-500/30', badge: 'text-red-400' },
};

const categoryColors = {
    'Einkauf':   'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'Reparatur': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    'Event':     'bg-purple-500/15 text-purple-400 border-purple-500/20',
    'Sonstiges': 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

const statusCycle = { 'offen': 'in_bearbeitung', 'in_bearbeitung': 'erledigt', 'erledigt': 'offen' };
const statusConfig = {
    'offen':         { icon: Circle,      color: 'text-slate-400', label: 'Offen' },
    'in_bearbeitung':{ icon: Loader,      color: 'text-blue-400',  label: 'In Bearbeitung' },
    'erledigt':      { icon: CheckCircle, color: 'text-green-500', label: 'Erledigt' }
};

function formatDueDate(dateStr) {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Heute';
    if (isTomorrow(d)) return 'Morgen';
    return format(d, 'd. MMM', { locale: de });
}

export default function TodoCard({ todo, employees, onStatusChange, onEdit, onDelete, onArchive, onQuickUpdate, showArchiveButton, sortBy, allTodos, idx }) {
    const [showSubtasks, setShowSubtasks] = useState(false);

    const isCompleted = todo.status === 'erledigt';
    const isInProgress = todo.status === 'in_bearbeitung';
    const pCfg = priorityConfig[todo.priority] || priorityConfig['mittel'];
    const StatusIcon = statusConfig[todo.status]?.icon || Circle;
    const statusColor = statusConfig[todo.status]?.color || 'text-slate-400';

    const isOverdue = todo.due_date && isPast(new Date(todo.due_date)) && !isToday(new Date(todo.due_date)) && !isCompleted;
    const isDueToday = todo.due_date && isToday(new Date(todo.due_date)) && !isCompleted;

    const assignees = todo.assigned_to_names?.length > 0 ? todo.assigned_to_names : todo.assigned_to ? [todo.assigned_to] : [];
    const subtasks = todo.subtasks || [];
    const doneSubtasks = subtasks.filter(s => s.done).length;

    const handleSubtaskToggle = (subId) => {
        const updated = subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s);
        onQuickUpdate(todo, { subtasks: updated });
    };

    const handleMoveUp = () => {
        if (!allTodos || idx === 0) return;
        const prev = allTodos[idx - 1];
        onQuickUpdate(todo, { sort_order: (prev.sort_order ?? idx - 1) - 0.5 });
    };

    const handleMoveDown = () => {
        if (!allTodos || idx === allTodos.length - 1) return;
        const next = allTodos[idx + 1];
        onQuickUpdate(todo, { sort_order: (next.sort_order ?? idx + 1) + 0.5 });
    };

    return (
        <Card className={cn(
            "border transition-all overflow-hidden",
            pCfg.cardBg || "bg-card border-border/50 hover:border-border",
            isCompleted && "opacity-50"
        )}>
            <div className="flex">
                {/* Priority stripe */}
                <div className={cn("w-1 shrink-0", pCfg.color)} />

                <div className="flex gap-2 px-3 py-3 flex-1 min-w-0">
                    {/* Status toggle */}
                    <button
                        onClick={() => onStatusChange(todo, statusCycle[todo.status])}
                        className={cn("mt-0.5 shrink-0 transition-all hover:opacity-70", statusColor)}
                        title={`${statusConfig[todo.status]?.label} → weiterklicken`}
                    >
                        <StatusIcon className={cn("w-5 h-5", isInProgress && "animate-spin")} />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                                <h4 className={cn(
                                    "font-medium text-sm leading-snug",
                                    isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                                )}>
                                    {todo.title}
                                    {todo.priority === 'dringend' && !isCompleted && (
                                        <span className="ml-1.5 text-xs text-red-400 font-bold">❗</span>
                                    )}
                                </h4>
                                {!isCompleted && todo.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{todo.description}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                                {/* Manual sort arrows */}
                                {sortBy === 'manual' && allTodos && (
                                    <div className="flex flex-col">
                                        <button onClick={handleMoveUp} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5">
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={handleMoveDown} disabled={idx === allTodos.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5">
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}

                                {/* Quick edit button */}
                                <Button variant="ghost" size="icon" onClick={() => onEdit(todo)}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                    <Pencil className="w-3.5 h-3.5" />
                                </Button>

                                {/* More actions */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuLabel className="text-xs text-muted-foreground">Status</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => onStatusChange(todo, 'offen')}>
                                            <Circle className="w-4 h-4 mr-2 text-slate-400" /> Offen
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onStatusChange(todo, 'in_bearbeitung')}>
                                            <Loader className="w-4 h-4 mr-2 text-blue-400" /> In Bearbeitung
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onStatusChange(todo, 'erledigt')}>
                                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Erledigt
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-xs text-muted-foreground">Priorität ändern</DropdownMenuLabel>
                                        {['dringend', 'hoch', 'mittel', 'niedrig'].map(p => (
                                            <DropdownMenuItem key={p} onClick={() => onQuickUpdate(todo, { priority: p })}
                                                className={todo.priority === p ? 'font-bold' : ''}>
                                                <span className={cn("w-2 h-2 rounded-full mr-2 inline-block", priorityConfig[p].color)} />
                                                {priorityConfig[p].label}
                                                {todo.priority === p && ' ✓'}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-xs text-muted-foreground">Kategorie</DropdownMenuLabel>
                                        {['Einkauf', 'Reparatur', 'Event', 'Sonstiges'].map(cat => (
                                            <DropdownMenuItem key={cat} onClick={() => onQuickUpdate(todo, { category: cat })}
                                                className={todo.category === cat ? 'font-bold' : ''}>
                                                {cat} {todo.category === cat && '✓'}
                                            </DropdownMenuItem>
                                        ))}
                                        {employees?.length > 0 && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel className="text-xs text-muted-foreground">Zuweisen an</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => onQuickUpdate(todo, { assigned_to: '', assigned_to_names: [] })}>
                                                    Niemand
                                                </DropdownMenuItem>
                                                {employees.slice(0, 8).map(emp => (
                                                    <DropdownMenuItem key={emp.id} onClick={() => onQuickUpdate(todo, { assigned_to: emp.name, assigned_to_names: [emp.name] })}>
                                                        {emp.name}
                                                    </DropdownMenuItem>
                                                ))}
                                            </>
                                        )}
                                        <DropdownMenuSeparator />
                                        {showArchiveButton && (
                                            <DropdownMenuItem onClick={() => onArchive(todo.id)}>
                                                <Archive className="w-4 h-4 mr-2 text-amber-400" /> Archivieren
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => onDelete(todo.id)} className="text-red-400 focus:text-red-400">
                                            <Trash2 className="w-4 h-4 mr-2" /> Löschen
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {todo.category && (
                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", categoryColors[todo.category] || categoryColors['Sonstiges'])}>
                                    {todo.category}
                                </span>
                            )}
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", `${pCfg.badge}`)}>
                                {pCfg.label}
                            </span>
                            {todo.due_date && (
                                <span className={cn(
                                    "flex items-center gap-1 text-[10px] font-medium",
                                    isOverdue ? "text-red-400" : isDueToday ? "text-orange-400" : "text-muted-foreground"
                                )}>
                                    <Calendar className="w-3 h-3" />
                                    {formatDueDate(todo.due_date)}
                                    {isOverdue && ' ⚠️'}
                                </span>
                            )}
                            {assignees.length > 0 && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <User className="w-3 h-3" />
                                    {assignees.join(', ')}
                                </span>
                            )}
                            {subtasks.length > 0 && (
                                <button
                                    onClick={() => setShowSubtasks(s => !s)}
                                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                                >
                                    ☑ {doneSubtasks}/{subtasks.length}
                                    {showSubtasks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                            )}
                            {todo.completed_by && isCompleted && (
                                <span className="text-[10px] text-muted-foreground">✓ {todo.completed_by}</span>
                            )}
                        </div>

                        {/* Subtasks */}
                        {showSubtasks && subtasks.length > 0 && (
                            <div className="mt-2 space-y-1.5 pl-1 border-l-2 border-border ml-1">
                                {subtasks.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => handleSubtaskToggle(sub.id)}
                                        className="flex items-center gap-2 w-full text-left group"
                                    >
                                        <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                                            sub.done
                                                ? "bg-green-500 border-green-500"
                                                : "border-border group-hover:border-foreground"
                                        )}>
                                            {sub.done && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <span className={cn("text-xs", sub.done ? "line-through text-muted-foreground" : "text-foreground")}>
                                            {sub.title}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}