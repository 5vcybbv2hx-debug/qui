import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MessageSquare, CheckCircle, Clock, AlertCircle, Archive, RotateCcw, Check, ThumbsUp, ThumbsDown, Settings, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from '@/components/auth/usePermissions';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import PDFExportButton from '@/components/export/PDFExportButton';
import UnavailabilityManager from '@/components/availability/UnavailabilityManager';

const priorityColors = {
    'niedrig': 'bg-blue-500/15 text-primary',
    'normal': 'bg-secondary/50 text-foreground',
    'hoch': 'bg-red-100 text-red-700'
};

const statusColors = {
    'offen': 'bg-amber-100 text-amber-700',
    'besprochen': 'bg-purple-100 text-purple-700',
    'erledigt': 'bg-green-100 text-green-700'
};

export default function TeamMeeting() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [modalOpen, setModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [showArchive, setShowArchive] = useState(false);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        topic: '',
        description: '',
        priority: 'normal'
    });
    const [scheduleData, setScheduleData] = useState({
        date: '',
        time: '',
        location: '',
        notes: ''
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            return base44.entities.Employee.filter({ is_active: true });
        }
    });

    const { data: currentEmployee } = useQuery({
        queryKey: ['current-employee'],
        queryFn: async () => {
            const user = await base44.auth.me();
            const emps = await base44.entities.Employee.filter({ email: user.email });
            return emps[0] || null;
        }
    });

    const { data: allTopics = [] } = useQuery({
        queryKey: ['team-meeting-topics', permissions.isManager, currentEmployee?.id],
        queryFn: async () => {
            if (permissions.isManager) {
                // Manager sehen alle Themen
                return base44.entities.TeamMeetingTopic.list('-created_date');
            }
            if (currentEmployee?.id) {
                // Mitarbeiter sehen nur ihre eigenen
                return base44.entities.TeamMeetingTopic.filter({ employee_id: currentEmployee.id }, '-created_date');
            }
            // Kein Employee-Profil verknüpft → leere Liste
            return [];
        },
        enabled: permissions.isManager || !!currentEmployee?.id
    });

    // Get meeting schedule
    const { data: scheduleList = [] } = useQuery({
        queryKey: ['team-meeting-schedule'],
        queryFn: async () => {
            const items = await base44.entities.TeamMeetingSchedule.list('-created_date');
            return items;
        }
    });

    const currentSchedule = scheduleList[0] || null;

    // Get today's meeting RSVP
    const { data: rsvpData = [] } = useQuery({
        queryKey: ['team-meeting-rsvp-today', currentSchedule?.date],
        queryFn: async () => {
            if (!currentSchedule) return [];
            return base44.entities.TeamMeetingRSVP.filter({ meeting_date: currentSchedule.date });
        },
        enabled: !!currentSchedule
    });

    const createRsvpMutation = useMutation({
        mutationFn: (data) => base44.entities.TeamMeetingRSVP.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['team-meeting-rsvp-today']);
        }
    });

    const updateRsvpMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.TeamMeetingRSVP.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['team-meeting-rsvp-today']);
        }
    });

    const createScheduleMutation = useMutation({
        mutationFn: (data) => {
            if (currentSchedule) {
                return base44.entities.TeamMeetingSchedule.update(currentSchedule.id, data);
            }
            return base44.entities.TeamMeetingSchedule.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['team-meeting-schedule']);
            queryClient.invalidateQueries(['team-meeting-rsvp-today']);
            setScheduleModalOpen(false);
        }
    });

    const handleRsvp = (status) => {
        if (!currentEmployee || !currentSchedule) return;
        
        const existingRsvp = rsvpData.find(r => r.employee_id === currentEmployee.id);
        
        if (existingRsvp) {
            updateRsvpMutation.mutate({
                id: existingRsvp.id,
                data: { status }
            });
        } else {
            createRsvpMutation.mutate({
                meeting_date: currentSchedule.date,
                employee_id: currentEmployee.id,
                employee_name: currentEmployee.name,
                status
            });
        }
    };

    const handleScheduleSubmit = (e) => {
        e.preventDefault();
        if (!scheduleData.date || !scheduleData.time) {
            alert('Bitte Datum und Uhrzeit eintragen');
            return;
        }
        createScheduleMutation.mutate(scheduleData);
    };

    const topics = showArchive 
        ? allTopics.filter(t => t.is_archived)
        : allTopics.filter(t => !t.is_archived);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.TeamMeetingTopic.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['team-meeting-topics']);
            setModalOpen(false);
            setFormData({ topic: '', description: '', priority: 'normal' });
            alert('✓ Dein Thema wurde erfolgreich eingereicht und an die Manager weitergeleitet.');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.TeamMeetingTopic.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['team-meeting-topics']);
            setDetailModalOpen(false);
            setSelectedTopic(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.TeamMeetingTopic.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['team-meeting-topics']);
            setDetailModalOpen(false);
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let employeeId = currentEmployee?.id;
        let employeeName = currentEmployee?.name;

        // Fallback: User-Account ohne verknüpftes Employee-Profil
        if (!employeeName) {
            const user = await base44.auth.me();
            employeeName = user?.full_name || user?.email || 'Unbekannt';
        }
        
        createMutation.mutate({
            ...formData,
            employee_id: employeeId || '',
            employee_name: employeeName
        });
    };

    const handleStatusChange = (status, topic = selectedTopic) => {
        if (!topic) return;
        
        const updateData = {
            ...topic,
            status: status
        };
        
        if (status === 'besprochen' && !topic.discussed_at) {
            updateData.discussed_at = new Date().toISOString();
        }
        
        if (status === 'erledigt') {
            updateData.is_archived = true;
            updateData.archived_at = new Date().toISOString();
        }
        
        updateMutation.mutate({ id: topic.id, data: updateData });
    };

    const handleArchiveToggle = (topic) => {
        updateMutation.mutate({
            id: topic.id,
            data: {
                ...topic,
                is_archived: !topic.is_archived,
                archived_at: !topic.is_archived ? new Date().toISOString() : null
            }
        });
    };

    const handleNotesUpdate = (notes) => {
        updateMutation.mutate({
            id: selectedTopic.id,
            data: { ...selectedTopic, manager_notes: notes }
        });
    };

    const openDetail = (topic) => {
        setSelectedTopic(topic);
        setDetailModalOpen(true);
    };

    const groupedTopics = {
        offen: topics.filter(t => t.status === 'offen'),
        besprochen: topics.filter(t => t.status === 'besprochen'),
        erledigt: topics.filter(t => t.status === 'erledigt')
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Teamsitzung</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {currentSchedule ? `${format(new Date(currentSchedule.date), 'EEEE, dd.MM.yyyy', { locale: de })} um ${currentSchedule.time} Uhr` : 'Noch kein Termin festgelegt'}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Manager: Termin konfigurieren */}
                        {permissions.isManager && (
                            <Button
                                onClick={() => {
                                    if (currentSchedule) {
                                        setScheduleData(currentSchedule);
                                    }
                                    setScheduleModalOpen(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="border-primary text-primary hover:bg-primary/10"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Termin
                            </Button>
                        )}

                        {/* WhatsApp Erinnerung – nur Manager, nur wenn Termin vorhanden */}
                        {permissions.isManager && currentSchedule && (
                            <Button
                                onClick={() => {
                                    const datum = format(new Date(currentSchedule.date), 'EEEE, dd.MM.yyyy', { locale: de });
                                    const uhrzeit = currentSchedule.time + ' Uhr';
                                    const ort = currentSchedule.location ? `📍 Ort: ${currentSchedule.location}\n` : '';
                                    const notizen = currentSchedule.notes ? `\n💬 ${currentSchedule.notes}\n` : '';
                                    const appUrl = window.location.origin + '/TeamMeeting';
                                    const text =
                                        `📋 *Erinnerung: Teamsitzung*\n\n` +
                                        `📅 ${datum}\n` +
                                        `🕐 ${uhrzeit}\n` +
                                        `${ort}${notizen}\n` +
                                        `Bitte gebt bis spätestens morgen Bescheid, ob ihr teilnehmen könnt.\n\n` +
                                        `✅ Zusage oder ❌ Absage direkt in der App:\n${appUrl}`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                variant="outline"
                                size="sm"
                                className="border-green-600 text-green-600 hover:bg-green-50"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                WhatsApp
                            </Button>
                        )}
                        
                        {/* RSVP für Teamsitzung */}
                        {currentEmployee && currentSchedule && (
                            <div className="flex gap-2 bg-card rounded-lg p-2">
                                <Button
                                    onClick={() => handleRsvp('zusage')}
                                    variant={rsvpData.find(r => r.employee_id === currentEmployee.id)?.status === 'zusage' ? 'default' : 'outline'}
                                    size="sm"
                                    className={rsvpData.find(r => r.employee_id === currentEmployee.id)?.status === 'zusage' ? 'bg-green-600 hover:bg-green-700' : ''}
                                    title={`Zusage zur Teamsitzung am ${currentSchedule.date}`}
                                >
                                    ✓ Zusage
                                </Button>
                                <Button
                                    onClick={() => handleRsvp('absage')}
                                    variant={rsvpData.find(r => r.employee_id === currentEmployee.id)?.status === 'absage' ? 'default' : 'outline'}
                                    size="sm"
                                    className={rsvpData.find(r => r.employee_id === currentEmployee.id)?.status === 'absage' ? 'bg-red-600 hover:bg-red-700' : ''}
                                    title={`Absage zur Teamsitzung am ${currentSchedule.date}`}
                                >
                                    ✗ Absage
                                </Button>
                            </div>
                        )}
                        {permissions.isManager && (
                            <PDFExportButton
                                data={topics}
                                filename="teamsitzung"
                                title="Teamsitzung - Besprechungspunkte"
                                columns={[
                                    { label: 'Von', field: 'employee_name' },
                                    { label: 'Thema', field: 'topic' },
                                    { label: 'Priorität', field: 'priority' },
                                    { label: 'Status', field: 'status' },
                                    { label: 'Erstellt', render: (t) => format(new Date(t.created_date), 'dd.MM.yyyy') }
                                ]}
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50"
                            />
                        )}
                        <Button 
                            onClick={() => setModalOpen(true)}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Thema einreichen
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <Button
                        onClick={() => setShowArchive(false)}
                        variant={!showArchive ? 'default' : 'outline'}
                        className={!showArchive ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' : ''}
                    >
                        Aktiv
                    </Button>
                    <Button
                        onClick={() => setShowArchive(true)}
                        variant={showArchive ? 'default' : 'outline'}
                        className={showArchive ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' : ''}
                    >
                        <Archive className="w-4 h-4 mr-2" />
                        Archiv
                    </Button>
                </div>

                {/* Stats - nur für aktive Themen */}
                {!showArchive && (
                    <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in">
                        <Card className="bg-card border-border">
                            <CardContent className="p-4 text-center">
                                <Clock className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                                <p className="text-2xl font-bold text-foreground">{groupedTopics.offen.length}</p>
                                <p className="text-xs text-muted-foreground">Offen</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card border-border">
                            <CardContent className="p-4 text-center">
                                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                                <p className="text-2xl font-bold text-foreground">{groupedTopics.besprochen.length}</p>
                                <p className="text-xs text-muted-foreground">Besprochen</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card border-border">
                            <CardContent className="p-4 text-center">
                                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
                                <p className="text-2xl font-bold text-foreground">{groupedTopics.erledigt.length}</p>
                                <p className="text-xs text-muted-foreground">Erledigt</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Manager RSVP Übersicht */}
                {permissions.isManager && currentSchedule && (
                    <Card className="bg-card border-border p-4 mb-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-foreground">Zusagen für {format(new Date(currentSchedule.date), 'dd.MM.yyyy', { locale: de })}</h3>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-green-400">{rsvpData.filter(r => r.status === 'zusage').length}</p>
                                    <p className="text-xs text-green-400">Zugesagt</p>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-red-400">{rsvpData.filter(r => r.status === 'absage').length}</p>
                                    <p className="text-xs text-red-400">Abgesagt</p>
                                </div>
                                <div className="bg-secondary/50 border border-border/70 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-foreground/80">{employees.length - rsvpData.length}</p>
                                    <p className="text-xs text-muted-foreground">Offen</p>
                                </div>
                            </div>

                            {/* Detaillierte Liste */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                {/* Zugesagt */}
                                {rsvpData.filter(r => r.status === 'zusage').length > 0 && (
                                    <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                                        <p className="text-xs font-semibold text-green-300 mb-2">ZUGESAGT ({rsvpData.filter(r => r.status === 'zusage').length})</p>
                                        <div className="space-y-1">
                                            {rsvpData.filter(r => r.status === 'zusage').map(rsvp => (
                                                <p key={rsvp.id} className="text-sm text-green-400">✓ {rsvp.employee_name}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Abgesagt */}
                                {rsvpData.filter(r => r.status === 'absage').length > 0 && (
                                    <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                                        <p className="text-xs font-semibold text-red-300 mb-2">ABGESAGT ({rsvpData.filter(r => r.status === 'absage').length})</p>
                                        <div className="space-y-1">
                                            {rsvpData.filter(r => r.status === 'absage').map(rsvp => (
                                                <p key={rsvp.id} className="text-sm text-red-400">✗ {rsvp.employee_name}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Offen */}
                                {(() => {
                                    const respondedEmployeeIds = new Set(rsvpData.map(r => r.employee_id));
                                    const pendingEmployees = employees.filter(emp => !respondedEmployeeIds.has(emp.id));
                                    return pendingEmployees.length > 0 ? (
                                        <div className="bg-secondary/30 border border-border/70/50 rounded-lg p-3">
                                            <p className="text-xs font-semibold text-foreground/80 mb-2">OFFEN ({pendingEmployees.length})</p>
                                            <div className="space-y-1">
                                                {pendingEmployees.map(emp => (
                                                    <p key={emp.id} className="text-sm text-muted-foreground">○ {emp.name}</p>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Info für Mitarbeiter */}
                {!permissions.isManager && (
                    <Card className="bg-blue-500/10 border-blue-500/30 p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm text-primary font-semibold mb-1">Vertrauliche Themen</p>
                                <p className="text-xs text-primary">
                                    Eingereichte Themen werden direkt an die Manager weitergeleitet und sind nur für dich und das Management einsehbar. Du siehst hier nur deine eigenen Einreichungen.
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Topics by Status */}
                {!showArchive ? (
                    ['offen', 'besprochen', 'erledigt'].map(status => (
                        groupedTopics[status].length > 0 && (
                            <div key={status} className="mb-6">
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                                    {status === 'offen' ? 'Offene Themen' : status === 'besprochen' ? 'Besprochen' : 'Erledigt'}
                                </h2>
                                <div className="space-y-3">
                                    {groupedTopics[status].map((topic, tidx) => (
                                        <Card 
                                            key={topic.id}
                                            className="bg-card border-border hover:bg-accent/30 transition-colors animate-stagger card-pressable"
                                            style={{ '--delay': `${tidx * 40}ms` }}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div 
                                                        className="flex-1 cursor-pointer"
                                                        onClick={() => openDetail(topic)}
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="font-semibold text-foreground">{topic.topic}</h3>
                                                            <Badge className={priorityColors[topic.priority]}>
                                                                {topic.priority}
                                                            </Badge>
                                                        </div>
                                                        {topic.description && (
                                                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                                                {topic.description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                            <span>Von: {topic.employee_name}</span>
                                                            <span>•</span>
                                                            <span>{format(new Date(topic.created_date), 'dd.MM.yyyy', { locale: de })}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Badge className={statusColors[topic.status]}>
                                                            {topic.status}
                                                        </Badge>
                                                        {status === 'erledigt' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleStatusChange('offen', topic);
                                                                }}
                                                                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                                                                title="Zurück zu offen"
                                                            >
                                                                <RotateCcw className="w-4 h-4 text-primary" />
                                                            </button>
                                                        )}
                                                        {status !== 'erledigt' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleStatusChange('erledigt', topic);
                                                                }}
                                                                className="p-2 rounded-lg hover:bg-green-500/20 transition-colors"
                                                                title="Als erledigt abhaken"
                                                            >
                                                                <Check className="w-4 h-4 text-green-400" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )
                    ))
                ) : (
                    <div className="space-y-3">
                        {topics.map((topic, tidx) => (
                            <Card 
                                key={topic.id}
                                className="bg-card border-border hover:bg-accent/30 transition-colors animate-stagger card-pressable"
                                style={{ '--delay': `${tidx * 40}ms` }}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div 
                                            className="flex-1 cursor-pointer"
                                            onClick={() => openDetail(topic)}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold text-foreground">{topic.topic}</h3>
                                                <Badge className={priorityColors[topic.priority]}>
                                                    {topic.priority}
                                                </Badge>
                                            </div>
                                            {topic.description && (
                                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                                    {topic.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span>Von: {topic.employee_name}</span>
                                                <span>•</span>
                                                <span>{format(new Date(topic.archived_at || topic.created_date), 'dd.MM.yyyy', { locale: de })}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge className={statusColors[topic.status]}>
                                                {topic.status}
                                            </Badge>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTopic(topic);
                                                    handleArchiveToggle(topic);
                                                }}
                                                className="p-2 rounded-lg hover:bg-primary/15 transition-colors"
                                                title="Aus Archiv entfernen"
                                            >
                                                <RotateCcw className="w-4 h-4 text-primary" />
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {topics.length === 0 && (
                    <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">Noch keine Besprechungspunkte</p>
                    </div>
                )}

                {/* Terminwünsche – nur für Manager sichtbar */}
                {permissions.isManager && (
                    <div className="mt-8 border-t border-border pt-6">
                        <h2 className="text-lg font-bold text-foreground mb-4">Wunschtage der Aushilfen</h2>
                        <UnavailabilityManager />
                    </div>
                )}

                {/* Schedule Modal – Manager nur */}
                {permissions.isManager && (
                    <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Teamsitzung planen</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleScheduleSubmit} className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label>Datum *</Label>
                                    <Input
                                        type="date"
                                        value={scheduleData.date}
                                        onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Uhrzeit *</Label>
                                    <Input
                                        type="time"
                                        value={scheduleData.time}
                                        onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Ort</Label>
                                    <Input
                                        value={scheduleData.location}
                                        onChange={(e) => setScheduleData({ ...scheduleData, location: e.target.value })}
                                        placeholder="z.B. Konferenzraum"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Notizen</Label>
                                    <Textarea
                                        value={scheduleData.notes}
                                        onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                                        placeholder="Besondere Hinweise..."
                                        rows={2}
                                    />
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setScheduleModalOpen(false)} className="flex-1">
                                        Abbrechen
                                    </Button>
                                    <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                                        Speichern
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Create Modal */}
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Thema für Teamsitzung einreichen</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Thema *</Label>
                                <Input
                                    value={formData.topic}
                                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                    placeholder="z.B. Neue Cocktails für die Karte"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Beschreibung</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Detaillierte Beschreibung..."
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Priorität</Label>
                                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="niedrig">Niedrig</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="hoch">Hoch</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                                    Einreichen
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Detail Modal */}
                {selectedTopic && (
                    <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Besprechungspunkt Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <h3 className="font-semibold text-lg">{selectedTopic.topic}</h3>
                                        <Badge className={priorityColors[selectedTopic.priority]}>
                                            {selectedTopic.priority}
                                        </Badge>
                                    </div>
                                    {selectedTopic.description && (
                                        <p className="text-sm text-muted-foreground mb-3">{selectedTopic.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>Von: {selectedTopic.employee_name}</span>
                                        <span>•</span>
                                        <span>{format(new Date(selectedTopic.created_date), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                                    </div>
                                </div>

                                {permissions.isManager && (
                                    <>
                                        <div className="border-t pt-4">
                                            <Label className="mb-2 block">Status ändern</Label>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant={selectedTopic.status === 'offen' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handleStatusChange('offen')}
                                                    className={selectedTopic.status === 'offen' ? 'bg-amber-600' : ''}
                                                >
                                                    Offen
                                                </Button>
                                                <Button
                                                    variant={selectedTopic.status === 'besprochen' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handleStatusChange('besprochen')}
                                                    className={selectedTopic.status === 'besprochen' ? 'bg-purple-600' : ''}
                                                >
                                                    Besprochen
                                                </Button>
                                                <Button
                                                    variant={selectedTopic.status === 'erledigt' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handleStatusChange('erledigt')}
                                                    className={selectedTopic.status === 'erledigt' ? 'bg-green-600' : ''}
                                                >
                                                    Erledigt
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Manager-Notizen</Label>
                                            <Textarea
                                                value={selectedTopic.manager_notes || ''}
                                                onChange={(e) => setSelectedTopic({ ...selectedTopic, manager_notes: e.target.value })}
                                                placeholder="Notizen, Entscheidungen, Maßnahmen..."
                                                rows={3}
                                            />
                                            <Button
                                                onClick={() => handleNotesUpdate(selectedTopic.manager_notes)}
                                                size="sm"
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                            >
                                                Notizen speichern
                                            </Button>
                                        </div>

                                        <div className="flex gap-2 pt-4 border-t">
                                            {selectedTopic.is_archived && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        handleArchiveToggle(selectedTopic);
                                                        setDetailModalOpen(false);
                                                    }}
                                                    className="flex-1 border-primary text-primary hover:bg-primary/10"
                                                >
                                                    <RotateCcw className="w-4 h-4 mr-2" />
                                                    Wiederherstellen
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    if (confirm('Besprechungspunkt wirklich löschen?')) {
                                                        deleteMutation.mutate(selectedTopic.id);
                                                    }
                                                }}
                                                className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                                            >
                                                Löschen
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setDetailModalOpen(false)}
                                                className="flex-1"
                                            >
                                                Schließen
                                            </Button>
                                        </div>
                                    </>
                                )}

                                {!permissions.isManager && (
                                    <div className="flex justify-end pt-4 border-t">
                                        <Button onClick={() => setDetailModalOpen(false)}>
                                            Schließen
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </div>
    );
}