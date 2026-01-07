import React, { useState } from 'react';
import { format, addDays, startOfWeek, getDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Sparkles, Check, X, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export default function ShiftSuggestions({ shifts, employees, onCreateShifts }) {
    const [open, setOpen] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());

    const generateSuggestions = () => {
        // Analysiere historische Daten (letzte 4 Wochen)
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const historicalShifts = shifts.filter(s => new Date(s.date) >= fourWeeksAgo);

        // Finde Muster pro Wochentag und Schichttyp
        const patterns = {};
        historicalShifts.forEach(shift => {
            const dayOfWeek = getDay(new Date(shift.date));
            const key = `${dayOfWeek}-${shift.shift_type}`;
            
            if (!patterns[key]) {
                patterns[key] = {
                    dayOfWeek,
                    shiftType: shift.shift_type,
                    startTime: shift.start_time,
                    endTime: shift.end_time,
                    employees: {}
                };
            }
            
            patterns[key].employees[shift.employee_id] = (patterns[key].employees[shift.employee_id] || 0) + 1;
        });

        // Generiere Vorschläge für die nächste Woche
        const nextWeekStart = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });
        const newSuggestions = [];

        Object.values(patterns).forEach(pattern => {
            // Finde die häufigsten Mitarbeiter für dieses Muster
            const sortedEmployees = Object.entries(pattern.employees)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3);

            sortedEmployees.forEach(([employeeId, count]) => {
                const employee = employees.find(e => e.id === employeeId);
                if (!employee) return;

                // Erstelle Vorschlag für nächste Woche
                const suggestionDate = addDays(nextWeekStart, pattern.dayOfWeek - 1);
                
                // Prüfe ob schon eine Schicht existiert
                const existingShift = shifts.find(s => 
                    s.date === format(suggestionDate, 'yyyy-MM-dd') &&
                    s.employee_id === employeeId &&
                    s.shift_type === pattern.shiftType
                );

                if (!existingShift) {
                    newSuggestions.push({
                        id: `${suggestionDate}-${employeeId}-${pattern.shiftType}`,
                        date: format(suggestionDate, 'yyyy-MM-dd'),
                        employee_id: employeeId,
                        employee_name: employee.name,
                        color: employee.color,
                        shift_type: pattern.shiftType,
                        start_time: pattern.startTime,
                        end_time: pattern.endTime,
                        confidence: Math.min(100, count * 25),
                        notes: `Vorschlag basierend auf ${count}x in den letzten 4 Wochen`
                    });
                }
            });
        });

        // Sortiere nach Datum und Konfidenz
        newSuggestions.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return b.confidence - a.confidence;
        });

        setSuggestions(newSuggestions);
        setSelectedSuggestions(new Set());
        setOpen(true);
    };

    const toggleSuggestion = (id) => {
        setSelectedSuggestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleCreateSelected = async () => {
        const toCreate = suggestions.filter(s => selectedSuggestions.has(s.id));
        await onCreateShifts(toCreate);
        setOpen(false);
    };

    const groupedByDate = suggestions.reduce((acc, s) => {
        if (!acc[s.date]) acc[s.date] = [];
        acc[s.date].push(s);
        return acc;
    }, {});

    return (
        <>
            <Button
                onClick={generateSuggestions}
                variant="outline"
                className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
            >
                <Sparkles className="w-4 h-4 mr-2" />
                Schichtvorschläge
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            Intelligente Schichtvorschläge
                        </DialogTitle>
                    </DialogHeader>

                    {suggestions.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">Keine Vorschläge verfügbar</p>
                            <p className="text-sm mt-1">
                                Erstelle mehr Schichten, um bessere Vorschläge zu erhalten
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 mb-4">
                                <p className="text-sm text-purple-900">
                                    🤖 {suggestions.length} Schichtvorschläge basierend auf deinen letzten 4 Wochen. 
                                    Wähle die gewünschten Schichten aus.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {Object.entries(groupedByDate).map(([date, dateSuggestions]) => (
                                    <Card key={date} className="p-4 bg-slate-50 border-slate-200">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Calendar className="w-4 h-4 text-slate-600" />
                                            <h3 className="font-semibold text-slate-900">
                                                {format(new Date(date), "EEEE, d. MMMM", { locale: de })}
                                            </h3>
                                        </div>
                                        <div className="space-y-2">
                                            {dateSuggestions.map(suggestion => (
                                                <div
                                                    key={suggestion.id}
                                                    onClick={() => toggleSuggestion(suggestion.id)}
                                                    className={`
                                                        flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                                                        ${selectedSuggestions.has(suggestion.id)
                                                            ? 'border-purple-500 bg-purple-50'
                                                            : 'border-slate-200 hover:border-purple-300 bg-white'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex-shrink-0">
                                                        {selectedSuggestions.has(suggestion.id) ? (
                                                            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                                                                <Check className="w-4 h-4 text-white" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full border-2 border-slate-300" />
                                                        )}
                                                    </div>

                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                                        style={{ backgroundColor: suggestion.color || '#64748b' }}
                                                    >
                                                        {suggestion.employee_name?.charAt(0)}
                                                    </div>

                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-900">
                                                            {suggestion.employee_name}
                                                        </p>
                                                        <p className="text-sm text-slate-600">
                                                            {suggestion.start_time} - {suggestion.end_time} · {suggestion.shift_type}
                                                        </p>
                                                    </div>

                                                    <Badge
                                                        className={
                                                            suggestion.confidence >= 75
                                                                ? 'bg-green-100 text-green-700'
                                                                : suggestion.confidence >= 50
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : 'bg-orange-100 text-orange-700'
                                                        }
                                                    >
                                                        {suggestion.confidence}% Match
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            <div className="flex gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    className="flex-1"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Abbrechen
                                </Button>
                                <Button
                                    onClick={handleCreateSelected}
                                    disabled={selectedSuggestions.size === 0}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    {selectedSuggestions.size} Schicht{selectedSuggestions.size !== 1 ? 'en' : ''} erstellen
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}