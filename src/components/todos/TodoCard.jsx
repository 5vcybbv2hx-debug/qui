import React from 'react';
import { Check, Calendar, Pencil, Trash2, Archive, User, MoreVertical, Circle, Loader, CheckCircle } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { de } from 'date-fns/locale';

const priorityStripe = {
    'niedrig': 'bg-slate-500',
    'mittel': 'bg-blue-500',
    'hoch': 'bg-orange-500',
    'dringend': 'bg-red-500'
};

const priorityLabel = {
    'niedrig': 'Niedrig',
    'mittel': 'Mittel',
    'hoch': 'Hoch',
    'dringend': 'Dringend'
};

const categoryColors = {
    'Einkauf': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'Reparatur': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    'Inventur': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'Event': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    'Sonstiges': 'bg-slate-500/15 text-slate-400 border-slate-500/20'
};

const statusCycle = {
    'offen': 'in_bearbeitung',
    'in_bearbeitung': 'erledigt',
    'erledigt': 'offen'
};

const statusConfig = {
    'offen': { icon: Circle, color: 'text-slate-400', label: 'Offen' },
    'in_bearbeitung': { icon: Loader, color: 'text-blue-400', label: 'In Bearbeitung' },
    'erledigt': { icon: CheckCircle, color: 'text-green-500', label: 'Erledigt' }
};

function formatDueDate(dateStr) {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Heute';
    if (isTomorrow(d)) return 'Morgen';
    return format(d, 'd. MMM', { locale: de });
}

export default function TodoCard({ todo, onStatusChange, onEdit, onDelete, onArchive, showArchiveButton }) {
    const isCompleted = todo.status === 'erledigt';
    const isInProgress = todo.status === 'in_bearbeitung';
    const stripeColor = priorityStripe[todo.priority] || priorityStripe['mittel'];
    const StatusIcon = statusConfig[todo.status]?.icon || Circle;
    const statusColor = statusConfig[todo.status]?.color || 'text-slate-400';

    const isOverdue = todo.due_date && isPast(new Date(todo.due_date)) && !isToday(new Date(todo.due_date)) && !isCompleted;
    const isDueToday = todo.due_date && isToday(new Date(todo.due_date)) && !isCompleted;

    return (
        <Card className={cn(
            "bg-card border-border/50 transition-all hover:border-border overflow-hidden",
            isCompleted && "opacity-50"
        )}>
            <div className="flex">
                {/* Priority stripe */}
                <div className={cn("w-1 shrink-0", stripeColor)} />

                <div className="flex gap-3 px-3 py-3 flex-1 min-w-0">
                    {/* Status toggle button */}
                    <button
                        onClick={() => onStatusChange(todo, statusCycle[todo.status])}
                        title={`Status: ${statusConfig[todo.status]?.label} → klicken zum Wechseln`}
                        className={cn("mt-0.5 shrink-0 transition-all", statusColor, "hover:opacity-70")}
                    >
                        <StatusIcon className={cn("w-5 h-5", isInProgress && "animate-spin")} />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h4 className={cn(
                                "font-medium text-sm leading-snug",
                                isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                            )}>
                                {todo.title}
                            </h4>

                            {/* Actions dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground -mt-0.5">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
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
                                    <DropdownMenuItem onClick={() => onEdit(todo)}>
                                        <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                                    </DropdownMenuItem>
                                    {showArchiveButton && (
                                        <DropdownMenuItem onClick={() => onArchive(todo.id)}>
                                            <Archive className="w-4 h-4 mr-2 text-amber-400" /> Archivieren
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDelete(todo.id)} className="text-red-400 focus:text-red-400">
                                        <Trash2 className="w-4 h-4 mr-2" /> Löschen
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {!isCompleted && todo.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{todo.description}</p>
                        )}

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {todo.category && (
                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", categoryColors[todo.category])}>
                                    {todo.category}
                                </span>
                            )}

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

                            {todo.assigned_to && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <User className="w-3 h-3" />
                                    {todo.assigned_to}
                                </span>
                            )}

                            {todo.completed_by && isCompleted && (
                                <span className="text-[10px] text-muted-foreground">
                                    ✓ {todo.completed_by}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}