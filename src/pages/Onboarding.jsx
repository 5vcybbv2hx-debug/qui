import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Users, CheckCircle2, Circle, ChevronDown, ChevronRight, Award } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';

const ONBOARDING_TEMPLATE = [
    {
        category: "Kasse und EC Geräte",
        items: [
            "Tischbuchung in Kasse, Aufteilung erklären",
            "Getränkebutton in Kasse erklären (wo ist was)",
            "Wechsel von Restaurant auf Direktverkauf erklären",
            "Plätze splitten (wie)",
            "Deckel schreiben bis 23uhr dann wird kassiert ab dann nur noch Direktverkauf",
            "Gutscheine (wie abkasieren und wie erstellen)",
            "Storno",
            "Rechnungen (wie splitten, Storno, Tische und Getränke umbuchen)",
            "Erklärung EC Geräte (funktion, transaktion überprüfen ob möglich) Geräte sparkasse (schwarz) und volksbank (weiss) immer auf ladestation"
        ]
    },
    {
        category: "Spülmaschine",
        items: [
            "Wie Einschalten",
            "Wie ausputzen",
            "Wie den Korb richtig füllen und wenn voll dann rein",
            "Wie abtrocknen, wie Gläser einräumen (warm/kalt)"
        ]
    },
    {
        category: "Kaffeemaschine",
        items: [
            "Funktion, knöpfe oben und unten (gross, klein, doppelt oder 2 getränke)",
            "Getränke Auswahl (was gibt's alles)",
            "Welche Tasse zu welchem getränk",
            "Zubehör (Milch, Zucker, Honig, Löffel und kecks) wo Brauch man was",
            "Wenn was leer wo ist das auffüllmaterial",
            "Reinigung (siehe reinigungsliste für Kaffeemaschine)",
            "Platz für angefangene milch usw"
        ]
    },
    {
        category: "Keller",
        items: [
            "Aufteilung wo ist was",
            "Leergut wo kommt was hin",
            "Nachschub wo ist was"
        ]
    },
    {
        category: "Nachschubschrank (Tunnel)",
        items: [
            "Erklärung wo ist was wenn hinten im regal was leer ist",
            "Alles zum auffüllen ist da drin auch Strohhalme etc"
        ]
    },
    {
        category: "Mülltonnen & Wichtiges",
        items: [
            "Mülltonnen (zeigen wo und erklären was wohin muss)",
            "Wichtig wenn was leer ist auf die tafel in der küche oder auf ein zettel schreiben als info für hugi"
        ]
    }
];

export default function Onboarding() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState({});

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list('name')
    });

    const { data: currentUser } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: checklistItems = [] } = useQuery({
        queryKey: ['onboarding-checklist', selectedEmployeeId],
        queryFn: () => selectedEmployeeId 
            ? base44.entities.OnboardingChecklistItem.filter({ employee_id: selectedEmployeeId })
            : Promise.resolve([]),
        enabled: !!selectedEmployeeId
    });

    const initializeMutation = useMutation({
        mutationFn: async (employeeId) => {
            const employee = employees.find(e => e.id === employeeId);
            const items = [];
            
            ONBOARDING_TEMPLATE.forEach((category, catIndex) => {
                category.items.forEach((item, itemIndex) => {
                    items.push({
                        employee_id: employeeId,
                        employee_name: employee.name,
                        category: category.category,
                        item_title: item,
                        item_order: itemIndex,
                        is_completed: false
                    });
                });
            });

            await base44.entities.OnboardingChecklistItem.bulkCreate(items);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['onboarding-checklist']);
        }
    });

    const toggleItemMutation = useMutation({
        mutationFn: async ({ itemId, isCompleted }) => {
            const updateData = {
                is_completed: !isCompleted,
                completed_by: !isCompleted ? currentUser?.email : null,
                completed_at: !isCompleted ? new Date().toISOString() : null
            };
            await base44.entities.OnboardingChecklistItem.update(itemId, updateData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['onboarding-checklist']);
        }
    });

    const resetChecklistMutation = useMutation({
        mutationFn: async (employeeId) => {
            const items = await base44.entities.OnboardingChecklistItem.filter({ employee_id: employeeId });
            await Promise.all(items.map(item => base44.entities.OnboardingChecklistItem.delete(item.id)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['onboarding-checklist']);
            setSelectedEmployeeId(null);
        }
    });

    if (!permissions.canViewDashboard) {
        return <PermissionDenied />;
    }

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    const hasChecklist = checklistItems.length > 0;
    
    const groupedItems = ONBOARDING_TEMPLATE.map(template => ({
        category: template.category,
        items: checklistItems.filter(item => item.category === template.category)
    }));

    const totalItems = checklistItems.length;
    const completedItems = checklistItems.filter(item => item.is_completed).length;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    return (
        <div className="min-h-screen bg-slate-900 pb-20">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Einlernliste</h1>
                            <p className="text-slate-400 text-sm">Onboarding für neue Mitarbeiter</p>
                        </div>
                    </div>
                </div>

                {/* Mitarbeiter Auswahl */}
                <Card className="p-6 bg-slate-800 border-slate-700 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-semibold text-white">Mitarbeiter wählen</h2>
                    </div>
                    <Select value={selectedEmployeeId || ''} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                            <SelectValue placeholder="Mitarbeiter auswählen..." />
                        </SelectTrigger>
                        <SelectContent>
                            {employees.filter(e => e.is_active !== false).map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>
                                    {emp.name} - {emp.role}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Card>

                {selectedEmployee && (
                    <>
                        {!hasChecklist ? (
                            <Card className="p-8 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-700 text-center">
                                <GraduationCap className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                                <h3 className="text-xl font-bold text-white mb-2">Einlernung starten</h3>
                                <p className="text-slate-300 mb-6">
                                    Erstelle eine persönliche Checkliste für {selectedEmployee.name}
                                </p>
                                <Button
                                    onClick={() => initializeMutation.mutate(selectedEmployeeId)}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    <Award className="w-4 h-4 mr-2" />
                                    Checkliste erstellen
                                </Button>
                            </Card>
                        ) : (
                            <>
                                {/* Progress Card */}
                                <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-700 mb-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">
                                                {selectedEmployee.name}
                                            </h3>
                                            <p className="text-purple-300 text-sm">{selectedEmployee.role}</p>
                                        </div>
                                        <Badge className="bg-purple-600 text-white text-lg px-4 py-1">
                                            {completedItems} / {totalItems}
                                        </Badge>
                                    </div>
                                    <Progress value={progress} className="h-3 mb-2" />
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-300">{Math.round(progress)}% abgeschlossen</span>
                                        {progress === 100 && (
                                            <div className="flex items-center gap-1 text-green-400">
                                                <Award className="w-4 h-4" />
                                                <span className="font-semibold">Einlernung abgeschlossen!</span>
                                            </div>
                                        )}
                                    </div>
                                </Card>

                                {/* Checklist Categories */}
                                <div className="space-y-4">
                                    {groupedItems.map((group, index) => {
                                        const categoryCompleted = group.items.filter(item => item.is_completed).length;
                                        const categoryTotal = group.items.length;
                                        const categoryProgress = categoryTotal > 0 ? (categoryCompleted / categoryTotal) * 100 : 0;
                                        const isExpanded = expandedCategories[group.category] !== false;

                                        return (
                                            <Card key={index} className="bg-slate-800 border-slate-700 overflow-hidden">
                                                <button
                                                    onClick={() => toggleCategory(group.category)}
                                                    className="w-full p-4 flex items-center justify-between hover:bg-slate-750 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                                        ) : (
                                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                                        )}
                                                        <h3 className="text-lg font-semibold text-white">{group.category}</h3>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-slate-400">
                                                            {categoryCompleted} / {categoryTotal}
                                                        </span>
                                                        {categoryProgress === 100 && (
                                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                        )}
                                                    </div>
                                                </button>

                                                {isExpanded && (
                                                    <div className="border-t border-slate-700 p-4 space-y-2">
                                                        {group.items.map((item) => (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => toggleItemMutation.mutate({
                                                                    itemId: item.id,
                                                                    isCompleted: item.is_completed
                                                                })}
                                                                className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors ${
                                                                    item.is_completed
                                                                        ? 'bg-green-900/20 border border-green-700/30'
                                                                        : 'bg-slate-900 border border-slate-700 hover:bg-slate-750'
                                                                }`}
                                                            >
                                                                {item.is_completed ? (
                                                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                                ) : (
                                                                    <Circle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                                                                )}
                                                                <div className="flex-1 text-left">
                                                                    <p className={`text-sm ${
                                                                        item.is_completed ? 'text-green-300 line-through' : 'text-white'
                                                                    }`}>
                                                                        {item.item_title}
                                                                    </p>
                                                                    {item.completed_by && (
                                                                        <p className="text-xs text-slate-500 mt-1">
                                                                            Abgehakt von {item.completed_by}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </Card>
                                        );
                                    })}
                                </div>

                                {/* Reset Button */}
                                {permissions.isManager && (
                                    <div className="mt-6 text-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm('Checkliste wirklich zurücksetzen? Alle Fortschritte gehen verloren.')) {
                                                    resetChecklistMutation.mutate(selectedEmployeeId);
                                                }
                                            }}
                                            className="border-red-600 text-red-400 hover:bg-red-900/20"
                                        >
                                            Checkliste zurücksetzen
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {!selectedEmployee && (
                    <Card className="p-12 bg-slate-800 border-slate-700 text-center">
                        <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-400">Wähle einen Mitarbeiter aus, um die Einlernliste zu starten</p>
                    </Card>
                )}
            </div>
        </div>
    );
}