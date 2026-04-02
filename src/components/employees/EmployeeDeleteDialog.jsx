/**
 * EmployeeDeleteDialog — Empfiehlt "Inaktiv setzen" statt direktes Löschen.
 * Zeigt zwei Optionen: Empfohlen (inaktiv + Ehemalige) vs. Endgültig löschen.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Archive, Trash2, AlertTriangle, Check, X, ChevronDown, ChevronUp,
    Shield, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function EmployeeDeleteDialog({ employee, currentUser, onClose, onDone }) {
    const [step, setStep] = useState('choose'); // 'choose' | 'confirm-delete'
    const [reason, setReason] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const queryClient = useQueryClient();

    const inactivateMutation = useMutation({
        mutationFn: async () => {
            // Set inactive + log
            await base44.entities.Employee.update(employee.id, {
                is_active: false,
                deactivated_at: new Date().toISOString(),
                deactivated_by: currentUser?.email || 'Manager',
                deactivation_reason: reason || 'Mitarbeiter verlässt das Unternehmen'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success(`${employee.name} wurde als inaktiv / ehemaliger Mitarbeiter gesetzt.`);
            onDone?.();
            onClose();
        },
        onError: (e) => toast.error('Fehler: ' + e.message)
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.Employee.delete(employee.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success(`${employee.name} wurde endgültig gelöscht.`);
            onDone?.();
            onClose();
        },
        onError: (e) => toast.error('Fehler: ' + e.message)
    });

    const canConfirmDelete = deleteConfirmText.trim().toLowerCase() === employee.name.trim().toLowerCase();

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Sheet */}
            <div className="relative z-10 w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                        <Archive className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-bold text-foreground">Mitarbeiter entfernen</h3>
                        <p className="text-xs text-muted-foreground">{employee.name} · {employee.role}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {step === 'choose' && (
                    <div className="p-5 space-y-4">
                        {/* Info */}
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-300">
                                In den meisten Fällen empfehlen wir, den Mitarbeiter <strong>inaktiv zu setzen</strong> statt zu löschen. So bleiben alle Historien, Zeiten, Aufgaben und Einträge erhalten.
                            </p>
                        </div>

                        {/* Option A — RECOMMENDED */}
                        <div className="rounded-2xl border-2 border-green-500/50 bg-green-500/5 p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <Archive className="w-4 h-4 text-green-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-foreground">Als inaktiv setzen</p>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 font-semibold">EMPFOHLEN</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Mitarbeiter wird in „Ehemalige" verschoben. Alle Daten, Historien und Verknüpfungen bleiben vollständig erhalten.
                                    </p>
                                </div>
                            </div>
                            <ul className="text-xs text-muted-foreground space-y-1 pl-11">
                                <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-400" />Zeiterfassungen bleiben erhalten</li>
                                <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-400" />Schichten & Aufgaben bleiben erhalten</li>
                                <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-400" />Notizen & Historien bleiben erhalten</li>
                                <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-400" />Jederzeit reaktivierbar</li>
                            </ul>

                            <div className="pl-11">
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Grund / Notiz (optional)"
                                    className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>

                            <div className="pl-11">
                                <Button
                                    onClick={() => inactivateMutation.mutate()}
                                    disabled={inactivateMutation.isPending}
                                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold gap-2"
                                >
                                    <Archive className="w-4 h-4" />
                                    Inaktiv setzen &amp; zu Ehemalige verschieben
                                </Button>
                            </div>
                        </div>

                        {/* Option B — DANGER */}
                        <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-foreground">Endgültig löschen</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Alle Mitarbeiterdaten werden unwiderruflich entfernt. Verknüpfungen in Historien können verloren gehen.
                                    </p>
                                </div>
                            </div>
                            <div className="pl-11">
                                <button
                                    onClick={() => setStep('confirm-delete')}
                                    className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 min-h-[44px] flex items-center"
                                >
                                    Trotzdem endgültig löschen →
                                </button>
                            </div>
                        </div>

                        <Button variant="outline" onClick={onClose} className="w-full h-11">
                            Abbrechen
                        </Button>
                    </div>
                )}

                {step === 'confirm-delete' && (
                    <div className="p-5 space-y-4">
                        <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300">
                                <strong>Achtung:</strong> Diese Aktion ist unwiderruflich. Alle Stammdaten werden gelöscht. Verknüpfte Daten (Zeiterfassung, Schichten, etc.) können verwaisen oder anonymisiert werden.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-foreground font-medium">
                                Tippe zur Bestätigung den Namen ein:
                            </p>
                            <p className="text-sm font-bold text-red-400 px-1">{employee.name}</p>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={e => setDeleteConfirmText(e.target.value)}
                                placeholder="Name zur Bestätigung eingeben"
                                className="w-full h-11 px-3 rounded-xl border border-red-500/40 bg-transparent text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setStep('choose')} className="flex-1 h-12">
                                Zurück
                            </Button>
                            <Button
                                onClick={() => deleteMutation.mutate()}
                                disabled={!canConfirmDelete || deleteMutation.isPending}
                                className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-semibold gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Endgültig löschen
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}