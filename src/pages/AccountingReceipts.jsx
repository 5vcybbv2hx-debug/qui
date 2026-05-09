import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Plus, Receipt, Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, Clock, FileText, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const fmt = (n) => n?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

const statusConfig = {
    'neu': { label: 'Neu', color: 'bg-secondary text-muted-foreground', icon: Clock },
    'ki_erkannt': { label: 'KI erkannt', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: Sparkles },
    'pruefung': { label: 'Prüfung nötig', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: AlertTriangle },
    'freigegeben': { label: 'Freigegeben', color: 'bg-green-500/15 text-green-400 border-green-500/20', icon: CheckCircle2 },
    'exportiert': { label: 'Exportiert', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20', icon: CheckCircle2 },
};

const RECEIPT_TYPES = ['Eingangsrechnung', 'Ausgangsrechnung', 'Kassenbeleg', 'Sonstiges'];

export default function AccountingReceipts() {
    const queryClient = useQueryClient();
    const [uploadOpen, setUploadOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('alle');
    const [uploading, setUploading] = useState(false);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [editData, setEditData] = useState({});
    const fileRef = useRef();
    const cameraRef = useRef();

    const { data: receipts = [] } = useQuery({
        queryKey: ['accounting-receipts'],
        queryFn: () => base44.entities.AccountingReceipt.list('-receipt_date')
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.AccountingReceipt.create(data),
        onSuccess: () => { queryClient.invalidateQueries(['accounting-receipts']); setUploadOpen(false); setAiResult(null); }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.AccountingReceipt.update(id, data),
        onSuccess: () => { queryClient.invalidateQueries(['accounting-receipts']); setDetailOpen(false); }
    });

    const handleFileUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        setAiProcessing(false);
        setAiResult(null);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setUploading(false);
            setAiProcessing(true);

            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Analysiere diesen Beleg/diese Rechnung und extrahiere alle relevanten Buchhaltungsdaten.
Gib folgende Felder zurück:
- supplier_name: Name des Lieferanten/Absenders
- receipt_date: Datum im Format YYYY-MM-DD
- receipt_number: Rechnungsnummer falls vorhanden
- amount_gross: Bruttobetrag als Zahl
- amount_net: Nettobetrag als Zahl
- tax_rate: Steuersatz in % (0, 7 oder 19)
- tax_amount: Steuerbetrag als Zahl
- category: Kostenkategorie (z.B. Getränke, Lebensmittel, Reinigung, Personal, Miete, Energie, Sonstiges)
- receipt_type: Art (Eingangsrechnung, Kassenbeleg, Ausgangsrechnung, Sonstiges)
- is_cash_relevant: true wenn Barzahlung, sonst false
- payment_method: Bar, EC, Überweisung, Kreditkarte oder Sonstiges
- confidence: Konfidenz 0-100`,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        supplier_name: { type: "string" },
                        receipt_date: { type: "string" },
                        receipt_number: { type: "string" },
                        amount_gross: { type: "number" },
                        amount_net: { type: "number" },
                        tax_rate: { type: "number" },
                        tax_amount: { type: "number" },
                        category: { type: "string" },
                        receipt_type: { type: "string" },
                        is_cash_relevant: { type: "boolean" },
                        payment_method: { type: "string" },
                        confidence: { type: "number" }
                    }
                }
            });

            setAiResult({ ...result, file_url });
            setEditData({ ...result, file_url, status: result.confidence > 80 ? 'ki_erkannt' : 'pruefung', ai_extracted: true, ai_confidence: result.confidence });
        } catch (e) {
            alert('Fehler beim Verarbeiten: ' + e.message);
        } finally {
            setAiProcessing(false);
        }
    };

    const handleSave = () => {
        createMutation.mutate(editData);
    };

    const openDetail = (r) => {
        setSelected(r);
        setEditData({ ...r });
        setDetailOpen(true);
    };

    const filtered = receipts.filter(r => {
        const matchSearch = !search || r.supplier_name?.toLowerCase().includes(search.toLowerCase()) || r.receipt_number?.includes(search);
        const matchStatus = statusFilter === 'alle' || r.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const pendingCount = receipts.filter(r => r.status === 'neu' || r.status === 'pruefung').length;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-6">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-blue-400" />
                        <h1 className="text-lg font-bold text-foreground">Belege</h1>
                        {pendingCount > 0 && (
                            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs">{pendingCount}</Badge>
                        )}
                    </div>
                    <Button size="sm" onClick={() => setUploadOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
                        <Plus className="w-4 h-4" /> Beleg
                    </Button>
                </div>

                {/* Filter bar */}
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['alle', 'neu', 'ki_erkannt', 'pruefung', 'freigegeben', 'exportiert'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                                statusFilter === s ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:bg-accent'
                            )}
                        >
                            {s === 'alle' ? 'Alle' : statusConfig[s]?.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 md:px-6 space-y-3 max-w-2xl mx-auto pt-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Lieferant, Belegnummer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>

                {filtered.length === 0 ? (
                    <Card className="p-12 text-center text-muted-foreground bg-card border-border">
                        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Keine Belege gefunden</p>
                        <Button onClick={() => setUploadOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                            <Camera className="w-4 h-4 mr-2" />Beleg hochladen
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(r => {
                            const sc = statusConfig[r.status] || statusConfig['neu'];
                            const Icon = sc.icon;
                            return (
                                <Card key={r.id} onClick={() => openDetail(r)} className="p-4 bg-card border-border hover:border-border/80 cursor-pointer transition-all">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {r.file_url ? (
                                                <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden shrink-0">
                                                    <img src={r.file_url} alt="Beleg" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                                    <FileText className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{r.supplier_name || 'Unbekannt'}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <p className="text-xs text-muted-foreground">{r.receipt_date}</p>
                                                    {r.category && <span className="text-xs text-muted-foreground">· {r.category}</span>}
                                                </div>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Badge className={cn('text-[10px] border gap-1', sc.color)}>
                                                        <Icon className="w-3 h-3" />{sc.label}
                                                    </Badge>
                                                    {r.ai_confidence && <span className="text-[10px] text-muted-foreground">KI: {r.ai_confidence}%</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-base font-bold text-foreground">{fmt(r.amount_gross)} €</p>
                                            <p className="text-xs text-muted-foreground">{r.receipt_type}</p>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* FAB */}
            <button
                onClick={() => setUploadOpen(true)}
                className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center z-40 transition-all hover:scale-110"
            >
                <Camera className="w-6 h-6" />
            </button>

            {/* Upload Modal */}
            <Dialog open={uploadOpen} onOpenChange={v => { setUploadOpen(v); if (!v) { setAiResult(null); setEditData({}); } }}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                            KI-Belegupload
                        </DialogTitle>
                    </DialogHeader>

                    {!aiResult && !uploading && !aiProcessing && (
                        <div className="space-y-3 mt-2">
                            <p className="text-sm text-muted-foreground">Lade einen Beleg hoch – die KI erkennt automatisch alle relevanten Daten.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="cursor-pointer">
                                    <div className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-blue-500/50 transition-colors text-center">
                                        <Camera className="w-8 h-8 text-blue-400" />
                                        <span className="text-sm font-medium">Kamera</span>
                                    </div>
                                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileUpload(e.target.files?.[0])} />
                                </label>
                                <label className="cursor-pointer">
                                    <div className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-blue-500/50 transition-colors text-center">
                                        <Upload className="w-8 h-8 text-blue-400" />
                                        <span className="text-sm font-medium">Datei wählen</span>
                                    </div>
                                    <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFileUpload(e.target.files?.[0])} />
                                </label>
                            </div>
                        </div>
                    )}

                    {(uploading || aiProcessing) && (
                        <div className="py-8 text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/15 flex items-center justify-center mx-auto">
                                <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">{uploading ? 'Wird hochgeladen...' : 'KI analysiert Beleg...'}</p>
                                <p className="text-sm text-muted-foreground mt-1">{aiProcessing ? 'Lieferant, Betrag & Steuer werden erkannt' : ''}</p>
                            </div>
                            <Progress value={uploading ? 40 : 80} className="h-1.5" />
                        </div>
                    )}

                    {aiResult && (
                        <div className="space-y-4 mt-2">
                            {/* Confidence */}
                            <div className={cn('flex items-center gap-2 p-3 rounded-xl text-sm font-medium',
                                aiResult.confidence > 80 ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                            )}>
                                {aiResult.confidence > 80
                                    ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    : <AlertTriangle className="w-4 h-4 shrink-0" />}
                                KI-Konfidenz: {aiResult.confidence}% — {aiResult.confidence > 80 ? 'Hohe Sicherheit' : 'Bitte prüfen'}
                            </div>

                            {/* Editable Fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Lieferant</Label>
                                    <Input value={editData.supplier_name || ''} onChange={e => setEditData({ ...editData, supplier_name: e.target.value })} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Datum</Label>
                                    <Input type="date" value={editData.receipt_date || ''} onChange={e => setEditData({ ...editData, receipt_date: e.target.value })} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Brutto (€)</Label>
                                    <Input type="number" value={editData.amount_gross || ''} onChange={e => setEditData({ ...editData, amount_gross: parseFloat(e.target.value) })} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Steuersatz (%)</Label>
                                    <Select value={String(editData.tax_rate || 19)} onValueChange={v => setEditData({ ...editData, tax_rate: Number(v) })}>
                                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">0%</SelectItem>
                                            <SelectItem value="7">7%</SelectItem>
                                            <SelectItem value="19">19%</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Kategorie</Label>
                                    <Input value={editData.category || ''} onChange={e => setEditData({ ...editData, category: e.target.value })} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Belegart</Label>
                                    <Select value={editData.receipt_type || 'Eingangsrechnung'} onValueChange={v => setEditData({ ...editData, receipt_type: v })}>
                                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {RECEIPT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => { setAiResult(null); setEditData({}); }} className="flex-1">Neu hochladen</Button>
                                <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'Speichern...' : 'Freigeben & Speichern'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Beleg bearbeiten</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-4 mt-2">
                            {selected.file_url && (
                                <img src={selected.file_url} alt="Beleg" className="w-full rounded-xl border border-border object-contain max-h-48" />
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Lieferant</Label>
                                    <Input value={editData.supplier_name || ''} onChange={e => setEditData({ ...editData, supplier_name: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Brutto (€)</Label>
                                    <Input type="number" value={editData.amount_gross || ''} onChange={e => setEditData({ ...editData, amount_gross: parseFloat(e.target.value) })} />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <Label className="text-xs">Status</Label>
                                    <Select value={editData.status || 'neu'} onValueChange={v => setEditData({ ...editData, status: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <Label className="text-xs">Notizen</Label>
                                    <Textarea value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })} rows={2} />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setDetailOpen(false)} className="flex-1">Abbrechen</Button>
                                <Button onClick={() => updateMutation.mutate({ id: selected.id, data: editData })}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                    disabled={updateMutation.isPending}>
                                    Speichern
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}