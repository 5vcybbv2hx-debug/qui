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

    const getAreaColor = (areaName) => {
        const area = areas.find(a => a.name === areaName);
        return area?.color || '#64748b';
    };

    return (
        <div className="space-y-4">
            {Object.entries(groupedTasks).map(([area, areaTasks]) => {
                const completedCount = areaTasks.filter(t => t.is_completed).length;
                const progress = (completedCount / areaTasks.length) * 100;
                
                return (
                    <Card key={area} className="bg-slate-800 border-slate-700 overflow-hidden">
                        {/* Area Header */}
                        <div 
                            className="px-4 py-3 flex items-center justify-between"
                            style={{ borderLeft: `4px solid ${getAreaColor(area)}` }}
                        >
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: getAreaColor(area) }}
                                />
                                <h3 className="font-semibold text-white text-base">{area}</h3>
                                <Badge 
                                    variant="outline" 
                                    className={cn(
                                        "text-xs",
                                        completedCount === areaTasks.length 
                                            ? "border-emerald-500 text-emerald-500" 
                                            : "border-slate-600 text-slate-400"
                                    )}
                                >
                                    {completedCount}/{areaTasks.length}
                                </Badge>
                            </div>
                            <span className="text-xs text-slate-400">
                                {Math.round(progress)}%
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1 bg-slate-700">
                            <div 
                                className="h-full transition-all duration-300"
                                style={{ 
                                    width: `${progress}%`,
                                    backgroundColor: getAreaColor(area)
                                }}
                            />
                        </div>
                        
                        {/* Tasks */}
                        <div className="divide-y divide-slate-700">
                            {areaTasks.map((task) => (
                                <div 
                                    key={task.id}
                                    className={cn(
                                        "px-4 py-3 transition-colors",
                                        task.is_completed ? "bg-slate-800/50" : "bg-slate-800 hover:bg-slate-750"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => onComplete(task)}
                                            className={cn(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                                task.is_completed 
                                                    ? "border-emerald-500 bg-emerald-500" 
                                                    : "border-slate-600 hover:border-emerald-500"
                                            )}
                                        >
                                            {task.is_completed && <Check className="w-3 h-3 text-white" />}
                                        </button>
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm font-medium",
                                                task.is_completed ? "text-slate-500 line-through" : "text-white"
                                            )}>
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                                    {frequencyLabels[task.frequency]}
                                                </span>
                                                {task.is_completed && task.completed_by && (
                                                    <span className="text-[10px] text-slate-500">
                                                        • {task.completed_by.split(' ')[0]}
                                                        {task.completed_at && ` · ${format(new Date(task.completed_at), 'HH:mm')}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                            <TaskManager task={task} areas={areas} />
                                            {task.is_completed && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-slate-500 hover:text-slate-300 hover:bg-slate-700"
                                                    onClick={() => onReset(task)}
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                );
            })}
            
            {tasks.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Keine Aufgaben vorhanden</p>
                </div>
            )}
        </div>
    );
}