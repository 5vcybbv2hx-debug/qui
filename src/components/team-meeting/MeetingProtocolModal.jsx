import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle, User, ClipboardList, FileCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STEPS = ['scribe', 'notes', 'ai', 'approve'];

const TOPIC_STATUSES = [
    { value: 'offen', label: '⬜ Offen', color: 'bg-secondary text-muted-foreground' },
    { value: 'beschlossen', label: '✅ Beschlossen', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    { value: 'zu_klaeren', label: '🔄 Noch zu klären', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { value: 'keine_einigung', label: '❌ Keine Einigung', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    { value: 'vertagt', label: '⏭️ Vertagt', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
];

function TopicStatusRow({ topic, statusEntry, onChange }) {
    const [expanded, setExpanded] = useState(false);
    const current = TOPIC_STATUSES.find(s => s.value === (statusEntry?.status || 'offen'));

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 p-2.5 bg-secondary/20">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{topic.topic}</p>
                    <p className="text-xs text-muted-foreground">{topic.employee_name} · {topic.priority}</p>
                </div>
                <Select
                    value={statusEntry?.status || 'offen'}
                    onValueChange={(val) => onChange({ ...statusEntry, status: val })}
                >
                    <SelectTrigger className="w-44 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TOPIC_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground"
                    title="Notiz hinzufügen"
                >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>
            {expanded && (
                <div className="p-2 border-t border-border bg-background">
                    <Input
                        placeholder="Kurze Notiz zu diesem Punkt..."
                        value={statusEntry?.notes || ''}
                        onChange={(e) => onChange({ ...statusEntry, notes: e.target.value })}
                        className="text-xs h-8"
                    />
                </div>
            )}
        </div>
    );
}

export default function MeetingProtocolModal({ open, onClose, schedule, openTopics, employees, isManager, currentUser, existingProtocol }) {
    const queryClient = useQueryClient();
    const [step, setStep] = useState('scribe');
    const [scribeId, setScribeId] = useState('');
    const [liveNotes, setLiveNotes] = useState('');
    const [aiSummary, setAiSummary] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [protocolId, setProtocolId] = useState(null);
    // { [topicId]: { status: string, notes: string } }
    const [topicStatuses, setTopicStatuses] = useState({});

    // Load existing protocol when scribe opens their own draft
    useEffect(() => {
        if (open && existingProtocol) {
            setProtocolId(existingProtocol.id);
            setScribeId(existingProtocol.scribe_employee_id);
            setLiveNotes(existingProtocol.live_notes || '');
            setAiSummary(existingProtocol.ai_summary || '');
            if (existingProtocol.topic_statuses) {
                try { setTopicStatuses(JSON.parse(existingProtocol.topic_statuses)); } catch (_) {}
            }
            setStep('notes'); // Protokollant startet direkt bei den Notizen
        }
    }, [open, existingProtocol?.id]);

    const selectedScribe = employees.find(e => e.id === scribeId);
    const meetingDate = schedule?.date || format(new Date(), 'yyyy-MM-dd');

    const updateTopicStatus = (topicId, entry) => {
        setTopicStatuses(prev => ({ ...prev, [topicId]: entry }));
    };

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
            // Mark topics based on their individual statuses
            const topicUpdates = openTopics.map(t => {
                const ts = topicStatuses[t.id];
                let newStatus = t.status;
                if (ts?.status === 'beschlossen' || ts?.status === 'zu_klaeren' || ts?.status === 'keine_einigung') {
                    newStatus = 'besprochen';
                } else if (ts?.status === 'vertagt') {
                    newStatus = 'offen'; // bleibt offen, wird vertagt
                } else if (!ts || ts.status === 'offen') {
                    newStatus = 'besprochen'; // default: alle besprochenen
                }
                return base44.entities.TeamMeetingTopic.update(t.id, {
                    status: newStatus,
                    discussed_at: new Date().toISOString(),
                    manager_notes: ts?.notes ? (t.manager_notes ? t.manager_notes + '\n' + ts.notes : ts.notes) : t.manager_notes
                });
            });
            await Promise.all(topicUpdates);

            const agendaSnapshot = JSON.stringify(openTopics.map(t => ({
                id: t.id,
                topic: t.topic,
                description: t.description,
                priority: t.priority,
                status: topicStatuses[t.id]?.status || 'besprochen',
                protocol_notes: topicStatuses[t.id]?.notes || '',
                employee_name: t.employee_name,
                manager_notes: t.manager_notes
            })));

            return base44.entities.MeetingProtocol.update(protocolId, {
                ai_summary: aiSummary,
                topic_statuses: JSON.stringify(topicStatuses),
                agenda_snapshot: agendaSnapshot,
                status: 'freigegeben',
                approved_by: currentUser?.full_name || currentUser?.email,
                approved_at: new Date().toISOString(),
                topics_marked_discussed: openTopics.map(t => t.id)
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
        setTopicStatuses({});
    };

    const handleClose = () => { onClose(); };

    const handleScribeNext = async () => {
        if (!scribeId) return;
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
        await saveDraftMutation.mutateAsync({
            live_notes: liveNotes,
            topic_statuses: JSON.stringify(topicStatuses),
            status: 'entwurf'
        });
        setStep('ai');
    };

    const handleGenerateAI = async () => {
        setIsGenerating(true);

        const topicsList = openTopics.map(t => {
            const ts = topicStatuses[t.id];
            const statusLabel = TOPIC_STATUSES.find(s => s.value === (ts?.status || 'offen'))?.label || '';
            return `- ${t.topic}${t.description ? ` (${t.description})` : ''} → Ergebnis: ${statusLabel}${ts?.notes ? ` — Notiz: ${ts.notes}` : ''}${t.manager_notes ? ` — Manager-Notiz: ${t.manager_notes}` : ''} [Priorität: ${t.priority}]`;
        }).join('\n');

        const prompt = `Du bist ein professioneller Protokollant für ein Gastronomie-Team. 
Erstelle ein strukturiertes, professionelles Teamsitzungsprotokoll auf Deutsch.

Datum: ${format(new Date(meetingDate), 'EEEE, dd. MMMM yyyy', { locale: de })}
${schedule?.time ? `Uhrzeit: ${schedule.time} Uhr` : ''}
${schedule?.location ? `Ort: ${schedule.location}` : ''}
Protokollant: ${selectedScribe?.name || 'Unbekannt'}

Agenda-Punkte mit Ergebnissen:
${topicsList || 'Keine Agenda-Punkte vorhanden'}

Live-Notizen aus der Sitzung:
${liveNotes || 'Keine Live-Notizen'}

Erstelle ein Protokoll mit folgender Struktur:
1. Besprechungspunkte (jeden Punkt mit Ergebnis: Beschlossen / Noch zu klären / Keine Einigung / Vertagt)
2. Beschlüsse & Maßnahmen (klare Handlungspunkte mit Verantwortlichen falls erwähnt)
3. Offene Punkte / nächste Sitzung

Schreibe klar, präzise und professionell.`;

        const result = await base44.integrations.Core.InvokeLLM({ prompt });
        setAiSummary(result);
        setIsGenerating(false);
        await saveDraftMutation.mutateAsync({ ai_summary: result, status: 'wartet_auf_freigabe' });
        setStep('approve');
    };

    const stepIndex = STEPS.indexOf(step);

    const statusSummary = openTopics.reduce((acc, t) => {
        const s = topicStatuses[t.id]?.status || 'offen';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {});

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
                        { key: 'notes', label: 'Agenda & Notizen' },
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

                        {selectedScribe && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-300">
                                <p className="font-medium mb-1">💡 So funktioniert es:</p>
                                <p>{selectedScribe.name} öffnet auf seinem Gerät die Teamsitzungsseite und klickt auf "Protokoll führen". Dort kann er/sie alle Agendapunkte abhaken und Live-Notizen schreiben.</p>
                            </div>
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

                {/* Step: Agenda + Live Notes */}
                {step === 'notes' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                            <User className="w-4 h-4 shrink-0" />
                            Protokollant: <strong className="text-foreground">{selectedScribe?.name}</strong>
                        </div>

                        {/* Agendapunkte mit Status */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Agendapunkte abhaken ({openTopics.length})</Label>
                                <div className="flex gap-1 flex-wrap justify-end">
                                    {Object.entries(statusSummary).filter(([k]) => k !== 'offen').map(([k, v]) => {
                                        const s = TOPIC_STATUSES.find(x => x.value === k);
                                        return s ? <Badge key={k} className={cn('text-[10px]', s.color)}>{v} {s.label.split(' ')[0]}</Badge> : null;
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {openTopics.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">Keine offenen Agenda-Punkte</p>
                                ) : openTopics.map(t => (
                                    <TopicStatusRow
                                        key={t.id}
                                        topic={t}
                                        statusEntry={topicStatuses[t.id]}
                                        onChange={(entry) => updateTopicStatus(t.id, entry)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Live-Notizen */}
                        <div className="space-y-2">
                            <Label>Sonstige Live-Notizen</Label>
                            <Textarea
                                value={liveNotes}
                                onChange={(e) => setLiveNotes(e.target.value)}
                                placeholder="Weitere Notizen, Diskussionen, spontane Punkte...&#10;- z.B. Neue Öffnungszeiten ab Juli&#10;- Max übernimmt die Getränkebestellung"
                                rows={6}
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">Die KI fasst die Agendapunkte + Notizen zu einem strukturierten Protokoll zusammen.</p>
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
                                        Die KI fasst die Agendapunkte mit Ergebnissen und deine Notizen zu einem professionellen Protokoll zusammen.
                                    </p>
                                </div>
                                <Button onClick={handleGenerateAI} disabled={isGenerating} className="bg-amber-600 hover:bg-amber-700">
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
                                    <Button onClick={() => setStep('approve')} className="bg-amber-600 hover:bg-amber-700">
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
                                {/* Agendapunkt-Zusammenfassung */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {TOPIC_STATUSES.filter(s => s.value !== 'offen').map(s => {
                                        const count = openTopics.filter(t => topicStatuses[t.id]?.status === s.value).length;
                                        if (!count) return null;
                                        return <Badge key={s.value} className={cn('text-xs', s.color)}>{count}× {s.label}</Badge>;
                                    })}
                                    {(() => {
                                        const unset = openTopics.filter(t => !topicStatuses[t.id] || topicStatuses[t.id].status === 'offen').length;
                                        return unset > 0 ? <Badge className="text-xs bg-secondary text-muted-foreground">{unset}× werden als besprochen markiert</Badge> : null;
                                    })()}
                                </div>
                            </CardContent>
                        </Card>

                        {isManager && (
                            <Card className="bg-amber-500/5 border-amber-500/30">
                                <CardContent className="p-3 text-sm text-amber-400">
                                    <p className="font-medium mb-1">⚡ Bei Freigabe wird automatisch:</p>
                                    <ul className="space-y-0.5 text-amber-300 text-xs">
                                        <li>• Agenda-Punkte erhalten ihren jeweiligen Status (Beschlossen / Zu klären / etc.)</li>
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