import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle, User, ClipboardList, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STEPS = ['scribe', 'notes', 'ai', 'approve'];

export default function MeetingProtocolModal({ open, onClose, schedule, openTopics, employees, isManager, currentUser }) {
    const queryClient = useQueryClient();
    const [step, setStep] = useState('scribe');
    const [scribeId, setScribeId] = useState('');
    const [liveNotes, setLiveNotes] = useState('');
    const [aiSummary, setAiSummary] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [protocolId, setProtocolId] = useState(null);

    const selectedScribe = employees.find(e => e.id === scribeId);

    // Load existing draft for this meeting date
    const meetingDate = schedule?.date || format(new Date(), 'yyyy-MM-dd');

    const saveDraftMutation = useMutation({
        mutationFn: (data) => {
            if (protocolId) {
                return base44.entities.MeetingProtocol.update(protocolId, data);
            }
            return base44.entities.MeetingProtocol.create(data);
        },
        onSuccess: (result) => {
            if (!protocolId && result?.id) setProtocolId(result.id);
            queryClient.invalidateQueries({ queryKey: ['meeting-protocols'] });
        }
    });

    const approveMutation = useMutation({
        mutationFn: async () => {
            // 1. Alle offenen Topics auf "besprochen" setzen
            const topicIds = openTopics.filter(t => t.status === 'offen').map(t => t.id);
            await Promise.all(topicIds.map(id =>
                base44.entities.TeamMeetingTopic.update(id, {
                    status: 'besprochen',
                    discussed_at: new Date().toISOString()
                })
            ));

            // 2. Protokoll freigeben
            const agendaSnapshot = JSON.stringify(openTopics.map(t => ({
                id: t.id,
                topic: t.topic,
                description: t.description,
                priority: t.priority,
                status: t.status,
                employee_name: t.employee_name,
                manager_notes: t.manager_notes
            })));

            return base44.entities.MeetingProtocol.update(protocolId, {
                ai_summary: aiSummary,
                agenda_snapshot: agendaSnapshot,
                status: 'freigegeben',
                approved_by: currentUser?.full_name || currentUser?.email,
                approved_at: new Date().toISOString(),
                topics_marked_discussed: topicIds
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meeting-protocols'] });
            queryClient.invalidateQueries({ queryKey: ['team-meeting-topics'] });
            onClose();
            resetState();
        }
    });

    const resetState = () => {
        setStep('scribe');
        setScribeId('');
        setLiveNotes('');
        setAiSummary('');
        setProtocolId(null);
    };

    const handleClose = () => {
        onClose();
        // Don't reset — keep draft state
    };

    const handleScribeNext = async () => {
        if (!scribeId) return;
        // Save initial draft
        await saveDraftMutation.mutateAsync({
            meeting_date: meetingDate,
            meeting_time: schedule?.time || '',
            meeting_location: schedule?.location || '',
            scribe_employee_id: scribeId,
            scribe_employee_name: selectedScribe?.name || '',
            live_notes: '',
            status: 'entwurf'
        });
        setStep('notes');
    };

    const handleNotesNext = async () => {
        await saveDraftMutation.mutateAsync({ live_notes: liveNotes, status: 'entwurf' });
        setStep('ai');
    };

    const handleGenerateAI = async () => {
        setIsGenerating(true);
        const topicsList = openTopics.map(t =>
            `- ${t.topic}${t.description ? ` (${t.description})` : ''}${t.manager_notes ? ` → Notizen: ${t.manager_notes}` : ''} [Priorität: ${t.priority}]`
        ).join('\n');

        const prompt = `Du bist ein professioneller Protokollant für ein Gastronomie-Team. 
Erstelle ein strukturiertes, professionelles Teamsitzungsprotokoll auf Deutsch.

Datum: ${format(new Date(meetingDate), 'EEEE, dd. MMMM yyyy', { locale: de })}
${schedule?.time ? `Uhrzeit: ${schedule.time} Uhr` : ''}
${schedule?.location ? `Ort: ${schedule.location}` : ''}
Protokollant: ${selectedScribe?.name || 'Unbekannt'}

Agenda-Punkte:
${topicsList || 'Keine Agenda-Punkte vorhanden'}

Live-Notizen aus der Sitzung:
${liveNotes || 'Keine Live-Notizen'}

Erstelle ein Protokoll mit folgender Struktur:
1. Besprechungspunkte (jeden Punkt kurz zusammenfassen, Ergebnisse/Beschlüsse hervorheben)
2. Beschlüsse & Maßnahmen (klare Handlungspunkte mit Verantwortlichen falls erwähnt)
3. Sonstiges

Schreibe klar, präzise und professionell. Halte es kompakt.`;

        const result = await base44.integrations.Core.InvokeLLM({ prompt });
        setAiSummary(result);
        setIsGenerating(false);
        await saveDraftMutation.mutateAsync({ ai_summary: result, status: 'wartet_auf_freigabe' });
        setStep('approve');
    };

    const stepIndex = STEPS.indexOf(step);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-amber-400" />
                        Sitzungsprotokoll erstellen
                    </DialogTitle>
                </DialogHeader>

                {/* Step Indicator */}
                <div className="flex items-center gap-1 mb-4">
                    {[
                        { key: 'scribe', label: 'Protokollant' },
                        { key: 'notes', label: 'Live-Notizen' },
                        { key: 'ai', label: 'KI-Protokoll' },
                        { key: 'approve', label: 'Freigabe' }
                    ].map((s, i) => (
                        <React.Fragment key={s.key}>
                            <div className={cn(
                                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium',
                                step === s.key ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                                i < stepIndex ? 'text-green-400' : 'text-muted-foreground'
                            )}>
                                {i < stepIndex ? <CheckCircle className="w-3 h-3" /> : <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">{i + 1}</span>}
                                <span className="hidden sm:inline">{s.label}</span>
                            </div>
                            {i < 3 && <div className="flex-1 h-px bg-border" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step: Scribe Selection */}
                {step === 'scribe' && (
                    <div className="space-y-4">
                        <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground">
                            <p>📅 <strong className="text-foreground">{format(new Date(meetingDate), 'EEEE, dd. MMMM yyyy', { locale: de })}</strong>
                            {schedule?.time && ` um ${schedule.time} Uhr`}
                            {schedule?.location && ` · ${schedule.location}`}</p>
                            <p className="mt-1">Agenda: <strong className="text-foreground">{openTopics.length} offene Punkte</strong></p>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Wer schreibt heute das Protokoll?
                            </Label>
                            <Select value={scribeId} onValueChange={setScribeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Protokollant auswählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedScribe && (
                            <Card className="bg-amber-500/5 border-amber-500/30">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                        style={{ backgroundColor: selectedScribe.color || '#f59e0b' }}>
                                        {selectedScribe.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{selectedScribe.name}</p>
                                        <p className="text-xs text-muted-foreground">{selectedScribe.role}</p>
                                    </div>
                                    <Badge className="ml-auto bg-amber-500/20 text-amber-400 border-amber-500/30">Protokollant</Badge>
                                </CardContent>
                            </Card>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={handleScribeNext}
                                disabled={!scribeId || saveDraftMutation.isPending}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                {saveDraftMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Sitzung starten →
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step: Live Notes */}
                {step === 'notes' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                            <User className="w-4 h-4 shrink-0" />
                            Protokollant: <strong className="text-foreground">{selectedScribe?.name}</strong>
                        </div>

                        {/* Agenda Übersicht */}
                        <div className="space-y-1.5">
                            <Label>Agenda ({openTopics.length} Punkte)</Label>
                            <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                                {openTopics.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-2">Keine offenen Agenda-Punkte</p>
                                ) : openTopics.map(t => (
                                    <div key={t.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-secondary/30">
                                        <Badge className={cn('text-[10px] shrink-0', t.priority === 'hoch' ? 'bg-red-500/20 text-red-400' : t.priority === 'niedrig' ? 'bg-blue-500/20 text-blue-400' : 'bg-secondary text-muted-foreground')}>
                                            {t.priority}
                                        </Badge>
                                        <span className="text-foreground truncate">{t.topic}</span>
                                        <span className="text-muted-foreground shrink-0">— {t.employee_name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Live-Notizen während der Sitzung</Label>
                            <Textarea
                                value={liveNotes}
                                onChange={(e) => setLiveNotes(e.target.value)}
                                placeholder="Notizen während der Besprechung tippen... z.B.:&#10;- Neue Öffnungszeiten ab Juli beschlossen&#10;- Max übernimmt die Getränkebestellung&#10;- Reinigungsplan wird überarbeitet"
                                rows={10}
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">Die KI fasst diese Notizen anschließend zu einem Protokoll zusammen.</p>
                        </div>

                        <div className="flex justify-between pt-2">
                            <Button variant="outline" onClick={() => setStep('scribe')}>← Zurück</Button>
                            <Button
                                onClick={handleNotesNext}
                                disabled={saveDraftMutation.isPending}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                {saveDraftMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                KI-Protokoll generieren →
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step: AI Generation */}
                {step === 'ai' && (
                    <div className="space-y-4">
                        {!aiSummary ? (
                            <div className="text-center py-8 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
                                    <Sparkles className="w-8 h-8 text-amber-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">KI-Protokoll generieren</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Die KI fasst deine Live-Notizen und die Agenda zu einem professionellen Protokoll zusammen.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleGenerateAI}
                                    disabled={isGenerating}
                                    className="bg-amber-600 hover:bg-amber-700"
                                >
                                    {isGenerating ? (
                                        <><Loader2 className="w-4 h-4 animate-spin mr-2" />Protokoll wird erstellt…</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4 mr-2" />Protokoll generieren</>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>KI-Protokoll (bearbeitbar)</Label>
                                    <Button variant="outline" size="sm" onClick={() => setAiSummary('')}>
                                        <Sparkles className="w-3 h-3 mr-1" />Neu generieren
                                    </Button>
                                </div>
                                <Textarea
                                    value={aiSummary}
                                    onChange={(e) => setAiSummary(e.target.value)}
                                    rows={14}
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">Du kannst das Protokoll vor der Freigabe noch bearbeiten.</p>
                                <div className="flex justify-between pt-2">
                                    <Button variant="outline" onClick={() => setStep('notes')}>← Zurück</Button>
                                    <Button
                                        onClick={() => setStep('approve')}
                                        className="bg-amber-600 hover:bg-amber-700"
                                    >
                                        Zur Freigabe →
                                    </Button>
                                </div>
                            </div>
                        )}
                        {!aiSummary && (
                            <div className="flex justify-start">
                                <Button variant="outline" onClick={() => setStep('notes')}>← Zurück</Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step: Manager Approval */}
                {step === 'approve' && (
                    <div className="space-y-4">
                        <Card className="bg-green-500/5 border-green-500/30">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex items-center gap-2 text-green-400 font-semibold">
                                    <FileCheck className="w-5 h-5" />
                                    Protokoll zur Freigabe bereit
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>📅 {format(new Date(meetingDate), 'EEEE, dd. MMMM yyyy', { locale: de })}</p>
                                    <p>✍️ Protokollant: <strong className="text-foreground">{selectedScribe?.name}</strong></p>
                                    <p>📋 Agenda: <strong className="text-foreground">{openTopics.length} Punkte</strong></p>
                                </div>
                            </CardContent>
                        </Card>

                        {isManager && (
                            <Card className="bg-amber-500/5 border-amber-500/30">
                                <CardContent className="p-3 text-sm text-amber-400">
                                    <p className="font-medium mb-1">⚡ Bei Freigabe wird automatisch:</p>
                                    <ul className="space-y-0.5 text-amber-300 text-xs">
                                        <li>• Alle offenen Agenda-Punkte auf "besprochen" gesetzt ({openTopics.filter(t => t.status === 'offen').length} Punkte)</li>
                                        <li>• Protokoll für alle Mitarbeiter sichtbar</li>
                                        <li>• Agenda-Snapshot für Manager gespeichert</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        )}

                        <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3 bg-secondary/20">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Protokollvorschau:</p>
                            <pre className="text-xs text-foreground whitespace-pre-wrap font-sans">{aiSummary}</pre>
                        </div>

                        <div className="flex justify-between pt-2">
                            <Button variant="outline" onClick={() => setStep('ai')}>← Bearbeiten</Button>
                            {isManager ? (
                                <Button
                                    onClick={() => approveMutation.mutate()}
                                    disabled={approveMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {approveMutation.isPending ? (
                                        <><Loader2 className="w-4 h-4 animate-spin mr-2" />Wird freigegeben…</>
                                    ) : (
                                        <><CheckCircle className="w-4 h-4 mr-2" />Protokoll freigeben</>
                                    )}
                                </Button>
                            ) : (
                                <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg px-4 py-2">
                                    Wartet auf Manager-Freigabe
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}