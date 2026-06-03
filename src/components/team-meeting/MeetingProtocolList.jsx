import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, ChevronDown, ChevronUp, Lock, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function ProtocolDetailModal({ protocol, isManager, onClose }) {
    let agendaItems = [];
    if (isManager && protocol.agenda_snapshot) {
        try { agendaItems = JSON.parse(protocol.agenda_snapshot); } catch (_) {}
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-400" />
                        Protokoll — {format(new Date(protocol.meeting_date), 'dd. MMMM yyyy', { locale: de })}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-secondary/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Protokollant</p>
                            <p className="font-medium text-foreground">{protocol.scribe_employee_name}</p>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Status</p>
                            <StatusBadge status={protocol.status} />
                        </div>
                        {protocol.approved_by && (
                            <div className="bg-secondary/30 rounded-lg p-3 col-span-2">
                                <p className="text-xs text-muted-foreground">Freigegeben von</p>
                                <p className="font-medium text-foreground">{protocol.approved_by} · {protocol.approved_at ? format(new Date(protocol.approved_at), 'dd.MM.yyyy HH:mm', { locale: de }) : ''}</p>
                            </div>
                        )}
                    </div>

                    {/* KI-Protokoll */}
                    <div>
                        <p className="text-sm font-semibold text-foreground mb-2">Protokoll</p>
                        <div className="bg-secondary/20 rounded-lg p-4 border border-border">
                            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                                {protocol.ai_summary || 'Kein Protokolltext vorhanden.'}
                            </pre>
                        </div>
                    </div>

                    {/* Agenda (nur Manager) */}
                    {isManager && agendaItems.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm font-semibold text-foreground">Agenda-Snapshot</p>
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                                    <Lock className="w-2.5 h-2.5 mr-1" />Nur Manager
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                {agendaItems.map((item, i) => (
                                    <div key={i} className="bg-secondary/30 rounded-lg p-3 text-sm border border-border/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-foreground">{item.topic}</span>
                                            <Badge className={cn('text-[10px]', item.priority === 'hoch' ? 'bg-red-500/20 text-red-400' : 'bg-secondary text-muted-foreground')}>
                                                {item.priority}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground ml-auto">von {item.employee_name}</span>
                                        </div>
                                        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                                        {item.manager_notes && (
                                            <p className="text-xs text-amber-400 mt-1">📝 {item.manager_notes}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button variant="outline" onClick={onClose}>Schließen</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function StatusBadge({ status }) {
    if (status === 'freigegeben') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Freigegeben</Badge>;
    if (status === 'wartet_auf_freigabe') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs"><Clock className="w-3 h-3 mr-1" />Wartet auf Freigabe</Badge>;
    return <Badge className="bg-secondary text-muted-foreground text-xs">Entwurf</Badge>;
}

export default function MeetingProtocolList({ isManager }) {
    const [selectedProtocol, setSelectedProtocol] = useState(null);

    const { data: protocols = [], isLoading } = useQuery({
        queryKey: ['meeting-protocols'],
        queryFn: () => isManager
            ? base44.entities.MeetingProtocol.list('-meeting_date', 50)
            : base44.entities.MeetingProtocol.filter({ status: 'freigegeben' }, '-meeting_date', 50),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (protocols.length === 0) {
        return (
            <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground">Noch keine Protokolle vorhanden</p>
                <p className="text-xs text-muted-foreground mt-1">Starte eine Sitzung mit dem "Protokoll"-Button</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {protocols.map(protocol => (
                <Card
                    key={protocol.id}
                    className="bg-card border-border hover:bg-accent/30 transition-colors cursor-pointer card-pressable"
                    onClick={() => setSelectedProtocol(protocol)}
                >
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="font-semibold text-foreground">
                                    {format(new Date(protocol.meeting_date), 'dd. MMMM yyyy', { locale: de })}
                                    {protocol.meeting_time && ` · ${protocol.meeting_time} Uhr`}
                                </p>
                                <StatusBadge status={protocol.status} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Protokollant: {protocol.scribe_employee_name}
                                {protocol.topics_marked_discussed?.length > 0 && ` · ${protocol.topics_marked_discussed.length} Punkte besprochen`}
                            </p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </CardContent>
                </Card>
            ))}

            {selectedProtocol && (
                <ProtocolDetailModal
                    protocol={selectedProtocol}
                    isManager={isManager}
                    onClose={() => setSelectedProtocol(null)}
                />
            )}
        </div>
    );
}