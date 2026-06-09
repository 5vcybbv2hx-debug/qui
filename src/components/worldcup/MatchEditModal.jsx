import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const EMPTY = {
    home_team: '',
    away_team: '',
    kickoff_time: '',
    round: 'Gruppenphase',
    group_name: '',
    venue: '',
    tv_channel: '',
    status: 'geplant',
    is_germany_game: false,
    is_top_game: false,
    expected_bar_traffic: 'normal',
    staff_recommendation: '',
    notes: '',
    home_score: '',
    away_score: '',
};

// Convert ISO to datetime-local input value
const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function MatchEditModal({ match, open, onClose }) {
    const queryClient = useQueryClient();
    const isNew = !match?.id;
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (open) {
            if (match) {
                setForm({
                    ...EMPTY,
                    ...match,
                    kickoff_time: toLocalInput(match.kickoff_time),
                    home_score: match.home_score ?? '',
                    away_score: match.away_score ?? '',
                });
            } else {
                setForm(EMPTY);
            }
        }
    }, [open, match]);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleSave = async () => {
        if (!form.home_team || !form.away_team || !form.kickoff_time) {
            toast.error('Bitte Heimteam, Auswärtsteam und Anstoßzeit ausfüllen.');
            return;
        }
        setSaving(true);
        const payload = {
            ...form,
            kickoff_time: new Date(form.kickoff_time).toISOString(),
            home_score: form.home_score !== '' ? Number(form.home_score) : null,
            away_score: form.away_score !== '' ? Number(form.away_score) : null,
        };
        try {
            if (isNew) {
                await base44.entities.WorldCupMatch.create(payload);
                toast.success('Spiel hinzugefügt!');
            } else {
                await base44.entities.WorldCupMatch.update(match.id, payload);
                toast.success('Spiel gespeichert!');
            }
            queryClient.invalidateQueries(['world-cup-matches']);
            onClose();
        } catch (e) {
            toast.error('Fehler: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!match?.id) return;
        if (!confirm(`${match.home_team} – ${match.away_team} wirklich löschen?`)) return;
        setDeleting(true);
        try {
            await base44.entities.WorldCupMatch.delete(match.id);
            toast.success('Spiel gelöscht');
            queryClient.invalidateQueries(['world-cup-matches']);
            onClose();
        } catch (e) {
            toast.error('Fehler: ' + e.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isNew ? 'Neues Spiel hinzufügen' : 'Spiel bearbeiten'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Teams */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Heimteam *</Label>
                            <Input value={form.home_team} onChange={e => set('home_team', e.target.value)} placeholder="z.B. Deutschland" />
                        </div>
                        <div className="space-y-1">
                            <Label>Auswärts *</Label>
                            <Input value={form.away_team} onChange={e => set('away_team', e.target.value)} placeholder="z.B. Frankreich" />
                        </div>
                    </div>

                    {/* Kickoff */}
                    <div className="space-y-1">
                        <Label>Anstoßzeit *</Label>
                        <Input type="datetime-local" value={form.kickoff_time} onChange={e => set('kickoff_time', e.target.value)} />
                    </div>

                    {/* Runde + Gruppe */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Runde</Label>
                            <Input value={form.round} onChange={e => set('round', e.target.value)} placeholder="z.B. Gruppenphase" />
                        </div>
                        <div className="space-y-1">
                            <Label>Gruppe</Label>
                            <Input value={form.group_name} onChange={e => set('group_name', e.target.value)} placeholder="z.B. Gruppe A" />
                        </div>
                    </div>

                    {/* Stadion */}
                    <div className="space-y-1">
                        <Label>Stadion / Spielort</Label>
                        <Input value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="z.B. Allianz Arena, München" />
                    </div>

                    {/* TV-Sender */}
                    <div className="space-y-1">
                        <Label>📺 TV-Sender</Label>
                        <Input value={form.tv_channel} onChange={e => set('tv_channel', e.target.value)} placeholder="z.B. ARD, ZDF, MagentaTV, DAZN" />
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={v => set('status', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="geplant">Geplant</SelectItem>
                                <SelectItem value="live">Live</SelectItem>
                                <SelectItem value="beendet">Beendet</SelectItem>
                                <SelectItem value="verschoben">Verschoben</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Score (bei live/beendet) */}
                    {(form.status === 'live' || form.status === 'beendet') && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Tore Heim</Label>
                                <Input type="number" min="0" value={form.home_score} onChange={e => set('home_score', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Tore Auswärts</Label>
                                <Input type="number" min="0" value={form.away_score} onChange={e => set('away_score', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Bar-Auslastung */}
                    <div className="space-y-1">
                        <Label>Erwartete Bar-Auslastung</Label>
                        <Select value={form.expected_bar_traffic} onValueChange={v => set('expected_bar_traffic', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="busy">Belebt</SelectItem>
                                <SelectItem value="very_busy">Sehr belebt</SelectItem>
                                <SelectItem value="extreme">Extrem voll</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Personalempfehlung */}
                    <div className="space-y-1">
                        <Label>Personalempfehlung</Label>
                        <Input value={form.staff_recommendation} onChange={e => set('staff_recommendation', e.target.value)} placeholder="z.B. +2 Mitarbeiter einplanen" />
                    </div>

                    {/* Flags */}
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <Switch checked={form.is_germany_game} onCheckedChange={v => set('is_germany_game', v)} />
                            <Label>🇩🇪 Deutschlandspiel</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={form.is_top_game} onCheckedChange={v => set('is_top_game', v)} />
                            <Label>⭐ Toppspiel</Label>
                        </div>
                    </div>

                    {/* Notizen */}
                    <div className="space-y-1">
                        <Label>Notizen</Label>
                        <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Interne Notizen..." />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        {!isNew && (
                            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="shrink-0">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                        <Button variant="outline" onClick={onClose} className="flex-1">Abbrechen</Button>
                        <Button onClick={handleSave} disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700">
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Speichern...' : 'Speichern'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}