import React from 'react';
import { Check, Calendar, Flag, MoreHorizontal, Pencil, Trash2, Archive, Clock, User, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const priorityConfig = {
    'niedrig': { color: 'text-slate-400', bg: 'bg-slate-100' },
    'mittel': { color: 'text-blue-500', bg: 'bg-blue-50' },
    'hoch': { color: 'text-orange-500', bg: 'bg-orange-50' },
    'dringend': { color: 'text-red-500', bg: 'bg-red-50' }
};

const categoryColors = {
    'Einkauf': 'bg-emerald-100 text-emerald-700',
    'Reparatur': 'bg-orange-100 text-orange-700',
    'Inventur': 'bg-blue-100 text-blue-700',
    'Event': 'bg-purple-100 text-purple-700',
    'Sonstiges': 'bg-slate-100 text-slate-700'
};

export default function TodoCard({ todo, onStatusChange, onEdit, onDelete, onArchive, showArchiveButton }) {
    const priority = priorityConfig[todo.priority] || priorityConfig['mittel'];
    const isCompleted = todo.status === 'erledigt';
    const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && !isCompleted;

    return (
        <Card className={cn(
            "p-4 border-0 shadow-sm transition-all duration-200 hover:shadow-md",
            isCompleted && "opacity-60 bg-slate-50"
        )}>
            <div className="flex gap-3">
                {/* Checkbox */}
                <button
                    onClick={() => onStatusChange(todo, isCompleted ? 'offen' : 'erledigt')}
                    className={cn(
                        "w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        isCompleted 
                            ? "bg-emerald-500 border-emerald-500" 
                            : "border-slate-300 hover:border-emerald-400"
                    )}
                >
                    {isCompleted && <Check className="w-3 h-3 text-white" />}
                </button>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h4 className={cn(
                                "font-medium",
                                isCompleted ? "text-slate-400 line-through" : "text-slate-800"
                            )}>
                                {todo.title}
                            </h4>
                            {todo.description && (
                                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                                    {todo.description}
                                </p>
                            )}
                        </div>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(todo)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Bearbeiten
                                </DropdownMenuItem>
                                {showArchiveButton && (
                                    <DropdownMenuItem onClick={() => onArchive(todo.id)}>
                                        <Archive className="w-4 h-4 mr-2" />
                                        Archivieren
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                    onClick={() => onDelete(todo.id)}
                                    className="text-red-600"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Löschen
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    
                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        {todo.category && (
                            <Badge variant="secondary" className={cn("text-[10px]", categoryColors[todo.category])}>
                                {todo.category}
                            </Badge>
                        )}
                        
                        <div className={cn("flex items-center gap-1", priority.color)}>
                            <Flag className="w-3 h-3" />
                            <span className="text-[10px] uppercase tracking-wider">{todo.priority}</span>
                        </div>
                        
                        {todo.due_date && (
                            <div className={cn(
                                "flex items-center gap-1 text-[10px]",
                                isOverdue ? "text-red-500" : "text-slate-400"
                            )}>
                                <Calendar className="w-3 h-3" />
                                {format(new Date(todo.due_date), 'd. MMM', { locale: de })}
                            </div>
                        )}
                        
                        {todo.assigned_to && (
                            <Link 
                                to={createPageUrl('Employees')}
                                className="text-[10px] text-slate-400 hover:text-amber-500 transition-colors flex items-center gap-1"
                            >
                                → {todo.assigned_to}
                                <ExternalLink className="w-2 h-2" />
                            </Link>
                        )}

                        {todo.completed_by && (
                            <div className="flex items-center gap-1 text-green-600">
                                <User className="w-3 h-3" />
                                <span className="text-[10px]">{todo.completed_by}</span>
                                {todo.completed_at && (
                                    <>
                                        <Clock className="w-3 h-3 ml-1" />
                                        <span className="text-[10px]">
                                            {format(new Date(todo.completed_at), 'dd.MM. HH:mm', { locale: de })}
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}