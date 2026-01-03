import React from 'react';
import { Check, Clock, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import TaskManager from './TaskManager';

const areaColors = {
    'Theke': 'bg-amber-100 text-amber-700',
    'Küche': 'bg-blue-100 text-blue-700',
    'Toiletten': 'bg-purple-100 text-purple-700',
    'Gastraum': 'bg-emerald-100 text-emerald-700',
    'Lager': 'bg-slate-100 text-slate-700',
    'Außenbereich': 'bg-cyan-100 text-cyan-700'
};

const frequencyLabels = {
    'täglich': 'Täglich',
    'am Wochenende': 'Wochenende',
    'wöchentlich': 'Wöchentlich',
    'alle zwei Wochen': 'Alle 2 Wochen',
    'monatlich': 'Monatlich',
    'an Sonderöffnungstagen': 'Sonderöffnungstage'
};

export default function CleaningList({ tasks, areas, onComplete, onReset, userName }) {
    const groupedTasks = tasks.reduce((acc, task) => {
        const area = task.area || 'Sonstiges';
        if (!acc[area]) acc[area] = [];
        acc[area].push(task);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {Object.entries(groupedTasks).map(([area, areaTasks]) => (
                <div key={area}>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge className={cn("text-xs font-medium", areaColors[area] || 'bg-slate-100 text-slate-700')}>
                            {area}
                        </Badge>
                        <span className="text-xs text-slate-400">
                            {areaTasks.filter(t => t.is_completed).length}/{areaTasks.length} erledigt
                        </span>
                    </div>
                    
                    <div className="space-y-2">
                        {areaTasks.map((task) => (
                            <Card 
                                key={task.id}
                                className={cn(
                                    "p-3 sm:p-4 border-0 shadow-sm transition-all duration-200",
                                    task.is_completed ? "bg-slate-50" : "bg-white hover:shadow-md"
                                )}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <button
                                            onClick={() => onComplete(task)}
                                            className={cn(
                                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                                task.is_completed 
                                                    ? "bg-emerald-500 border-emerald-500" 
                                                    : "border-slate-300 hover:border-emerald-400"
                                            )}
                                        >
                                            {task.is_completed && <Check className="w-3.5 h-3.5 text-white" />}
                                        </button>
                                        
                                        <div className="min-w-0">
                                            <p className={cn(
                                                "font-medium truncate text-sm sm:text-base",
                                                task.is_completed ? "text-slate-400 line-through" : "text-slate-800"
                                            )}>
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                                                    {frequencyLabels[task.frequency]}
                                                </span>
                                                {task.is_completed && task.completed_by && (
                                                    <span className="text-[10px] text-slate-400 truncate">
                                                        • {task.completed_by}
                                                        {task.completed_at && ` um ${format(new Date(task.completed_at), 'HH:mm', { locale: de })}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        <TaskManager task={task} areas={areas} />
                                        {task.is_completed && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                                onClick={() => onReset(task)}
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
            
            {tasks.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Keine Aufgaben vorhanden</p>
                </div>
            )}
        </div>
    );
}