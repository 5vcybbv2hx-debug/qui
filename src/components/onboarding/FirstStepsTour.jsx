import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, X, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FirstStepsTour({ employee, open, onClose }) {
    const queryClient = useQueryClient();
    const [currentIndex, setCurrentIndex] = useState(0);

    const { data: checklistItems = [] } = useQuery({
        queryKey: ['onboarding-items', employee?.id],
        queryFn: () => base44.entities.OnboardingChecklistItem.filter({ employee_id: employee.id }),
        enabled: !!employee?.id,
        initialData: []
    });

    const completeMutation = useMutation({
        mutationFn: async (item) => {
            const user = await base44.auth.me();
            return base44.entities.OnboardingChecklistItem.update(item.id, {
                is_completed: true,
                completed_by: user.full_name,
                completed_at: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['onboarding-items']);
        }
    });

    // Gruppiere nach Kategorie
    const grouped = checklistItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    // Sortiere Items innerhalb jeder Kategorie
    Object.keys(grouped).forEach(category => {
        grouped[category].sort((a, b) => (a.item_order || 0) - (b.item_order || 0));
    });

    const allItems = Object.entries(grouped).flatMap(([category, items]) => 
        items.map(item => ({ ...item, category }))
    );

    const completedCount = allItems.filter(i => i.is_completed).length;
    const progress = allItems.length > 0 ? Math.round((completedCount / allItems.length) * 100) : 0;

    const currentItem = allItems[currentIndex];
    const currentCategory = currentItem?.category;
    const categoryItems = currentItem ? grouped[currentCategory] : [];
    const itemIndexInCategory = categoryItems.findIndex(i => i.id === currentItem?.id);

    const handleNext = () => {
        if (currentIndex < allItems.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleComplete = () => {
        if (currentItem && !currentItem.is_completed) {
            completeMutation.mutate(currentItem);
        }
        handleNext();
    };

    if (!currentItem) {
        return (
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GraduationCap className="w-6 h-6 text-green-500" />
                            Erste Schritte
                        </DialogTitle>
                    </DialogHeader>
                    <div className="text-center py-8">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-lg font-semibold">Alle Schritte abgeschlossen!</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Du hast die Erste-Schritte-Tour erfolgreich abgeschlossen.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={onClose}>Schließen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <GraduationCap className="w-6 h-6 text-amber-500" />
                            Erste Schritte für {employee?.name}
                        </DialogTitle>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Schritt {currentIndex + 1} von {allItems.length}
                            </span>
                            <span className="font-semibold text-amber-500">{progress}% abgeschlossen</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-6 space-y-6">
                    {/* Kategorie Badge */}
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {currentCategory}
                    </Badge>

                    {/* Aktueller Schritt */}
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold">{currentItem.item_title}</h3>
                        
                        {currentItem.notes && (
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">{currentItem.notes}</p>
                            </div>
                        )}

                        {currentItem.is_completed && (
                            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-green-500">Abgeschlossen</p>
                                    <p className="text-xs text-muted-foreground">
                                        Von {currentItem.completed_by} am {new Date(currentItem.completed_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fortschritt in dieser Kategorie */}
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                            Fortschritt in {currentCategory}
                        </p>
                        <div className="space-y-2">
                            {categoryItems.map((item, idx) => (
                                <div 
                                    key={item.id}
                                    className={cn(
                                        "flex items-center gap-3 p-2 rounded-lg transition-all",
                                        itemIndexInCategory === idx && "bg-amber-500/10 border border-amber-500/30"
                                    )}
                                >
                                    {item.is_completed ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    ) : (
                                        <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                    )}
                                    <span className={cn(
                                        "text-sm flex-1",
                                        item.is_completed && "line-through text-muted-foreground",
                                        itemIndexInCategory === idx && "font-semibold text-amber-500"
                                    )}>
                                        {item.item_title}
                                    </span>
                                    {itemIndexInCategory === idx && (
                                        <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                                            Aktuell
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex items-center justify-between border-t pt-4">
                    <Button
                        variant="outline"
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Zurück
                    </Button>
                    <div className="flex gap-2">
                        {!currentItem.is_completed && (
                            <Button
                                variant="outline"
                                onClick={() => completeMutation.mutate(currentItem)}
                                disabled={completeMutation.isPending}
                                className="text-green-500 border-green-500 hover:bg-green-500/10"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Als erledigt markieren
                            </Button>
                        )}
                        <Button onClick={handleNext} disabled={currentIndex === allItems.length - 1}>
                            Weiter
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}