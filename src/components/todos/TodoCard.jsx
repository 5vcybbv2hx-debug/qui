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
            "p-3 bg-slate-800 border-slate-700 transition-all hover:bg-slate-750",
            isCompleted && "opacity-60"
        )}>
            <div className="flex gap-3">
                {/* Checkbox */}
                <button
                    onClick={() => onStatusChange(todo, isCompleted ? 'offen' : 'erledigt')}
                    className={cn(
                        "w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-all shrink-0",
                        isCompleted 
                            ? "bg-green-600 border-green-600" 
                            : "border-slate-600 hover:border-green-500"
                    )}
                >
                    {isCompleted && <Check className="w-3 h-3 text-white" />}
                </button>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h4 className={cn(
                                "font-medium text-sm",
                                isCompleted ? "text-slate-500 line-through" : "text-white"
                            )}>
                                {todo.title}
                            </h4>
                            {todo.description && (
                                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                    {todo.description}
                                </p>
                            )}
                        </div>
                        
                        <div className="flex gap-1 shrink-0">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => onEdit(todo)}
                                className="h-7 w-7 text-slate-400 hover:text-slate-200"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {showArchiveButton && (
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => onArchive(todo.id)}
                                    className="h-7 w-7 text-slate-400 hover:text-amber-400"
                                >
                                    <Archive className="w-3.5 h-3.5" />
                                </Button>
                            )}
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => onDelete(todo.id)}
                                className="h-7 w-7 text-red-500 hover:text-red-400"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        {todo.category && (
                            <Badge className={cn("text-[10px] px-1.5 h-5", categoryColors[todo.category])}>
                                {todo.category}
                            </Badge>
                        )}
                        
                        {todo.due_date && (
                            <div className={cn(
                                "flex items-center gap-1 text-[10px]",
                                isOverdue ? "text-red-400" : "text-slate-500"
                            )}>
                                <Calendar className="w-3 h-3" />
                                {format(new Date(todo.due_date), 'd. MMM', { locale: de })}
                            </div>
                        )}
                        
                        {todo.assigned_to && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {todo.assigned_to}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}