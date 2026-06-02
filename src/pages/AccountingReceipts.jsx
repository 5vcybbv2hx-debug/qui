import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { STALE } from '@/lib/queryUtils';;
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Receipt, Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, Clock, FileText, Search, ExternalLink, Trash2, ShieldCheck, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import MonthNavigator from '@/components/accounting/MonthNavigator';

const fmt = (n) => n?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

const statusConfig = {
    'neu': { label: 'Neu', color: 'bg-secondary text-muted-foreground', icon: Clock },
    'ki_erkannt': { label: 'KI erkannt', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: Sparkles },
    'pruefung': { label: 'Prüfung nötig', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: AlertTriangle },
    'freigegeben': { label: 'Freigegeben', color: 'bg-green-500/15 text-green-400 border-green-500/20', icon: CheckCircle2 },
    'exportiert': { label: 'Exportiert', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20', icon: CheckCircle2 },
};

const TAX_RATES = ['0', '7', '19'];
const RECEIPT_TYPES = ['Eingangsrechnung', 'Ausgangsrechnung', 'Kassenbeleg', 'Einzahlungsquittung', 'Sonstiges'];
const PAYMENT_METHODS = ['Bar', 'EC', 'Überweisung', 'Kreditkarte', 'Sonstiges'];

// Zuordnungsoptionen inkl. Übertrag
const ASSIGNMENT_OPTIONS = [
    { key: 'kreditor',  label: 'Kreditor',  sub: 'Eingangsrechnung' },
    { key: 'debitor',   label: 'Debitor',   sub: 'Ausgangsrechnung' },
    { key: 'uebertrag', label: 'Übertrag',  sub: 'Kasse → Bank' },
    { key: 'both',      label: 'Beides',    sub: 'Kred. & Deb.' },
];

const ASSIGNMENT_LABELS = {
    kreditor: 'Kreditor',
    debitor: 'Debitor',
    uebertrag: 'Übertrag',
    both: 'Kred. & Deb.',
};
const CATEGORIES = ['Getränke', 'Lebensmittel', 'Reinigung', 'Personal', 'Miete', 'Energie', 'GEMA', 'Versicherung', 'Software', 'Marketing', 'Sonstiges'];

// Native select — works perfectly on mobile
function NativeSelect({ label, value, onChange, options }) {
    return (
        <div className="space-y-1.5">
            {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
            <select
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
                {options.map(o => (
                    <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                ))}
            </select>
        </div>
    );
}

// Vollständiges Beleg-Formular (Upload + Detail)
function ReceiptForm({ data, onChange }) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs text-muted-foreground">Lieferant / Absender</Label>
                    <Input value={data.supplier_name || ''} onChange={e => onChange({ ...data, supplier_name: e.target.value })} placeholder="Firmenname..." />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Belegdatum</Label>
                    <Input type="date" value={data.receipt_date || ''} onChange={e => onChange({ ...data, receipt_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Belegnummer</Label>
                    <Input value={data.receipt_number || ''} onChange={e => onChange({ ...data, receipt_number: e.target.value })} placeholder="RE-2024-001" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Brutto (€)</Label>
                    <Input type="number" step="0.01" value={data.amount_gross || ''} onChange={e => onChange({ ...data, amount_gross: parseFloat(e.target.value) || '' })} placeholder="0,00" />
                </div>
                <NativeSelect
                    label="Steuersatz"
                    value={String(data.tax_rate ?? 19)}
                    onChange={v => onChange({ ...data, tax_rate: Number(v) })}
                    options={TAX_RATES.map(r => ({ value: r, label: r + '%' }))}
                />
                <NativeSelect
                    label="Belegart"
                    value={data.receipt_type || 'Eingangsrechnung'}
                    onChange={v => onChange({ ...data, receipt_type: v })}
                    options={RECEIPT_TYPES}
                />
                <NativeSelect
                    label="Zahlungsart"
                    value={data.payment_method || 'Bar'}
                    onChange={v => onChange({ ...data, payment_method: v })}
                    options={PAYMENT_METHODS}
                />
                <NativeSelect
                    label="Kategorie"
                    value={data.category || ''}
                    onChange={v => onChange({ ...data, category: v })}
                    options={[{ value: '', label: '— wählen —' }, ...CATEGORIES]}
                />
            </div>

            {/* Zuordnung */}
            <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Zuordnung</Label>
                <div className="grid grid-cols-2 gap-2">
                    {ASSIGNMENT_OPTIONS.map(opt => (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => onChange({ ...data, assignment: opt.key })}
                            className={cn(
                                'py-2 px-2 rounded-xl border text-xs font-semibold transition-all text-center',
                                data.assignment === opt.key
                                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                                    : 'border-border text-muted-foreground hover:border-blue-500/50'
                            )}
                        >
                            {opt.label}
                            <span className="block text-[10px] font-normal opacity-70">{opt.sub}</span>
                        </button>
                    ))}
                </div>
                {data.assignment === 'uebertrag' && (
                    <p className="text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2 leading-relaxed">
                        💡 Übertrag = Kasse-Ausgabe + Bank-Einnahme (kein Aufwand). Wird im Kassenbuch als Ausgabe &amp; auf dem Bankkonto als Einzahlung gebucht — kein MwSt.-Ansatz.
                    </p>
                )}
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notizen</Label>
                <Textarea value={data.notes || ''} onChange={e => onChange({ ...data, notes: e.target.value })} rows={2} placeholder="Interne Anmerkungen..." />
            </div>
        </div>
    );
}

export default function AccountingReceipts() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [uploadOpen, setUploadOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [reviewMode, setReviewMode] = useState(false); // true = Prüfmodus, false = Bearbeiten
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('alle');
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [uploading, setUploading] = useState(false);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [editData, setEditData] = useState({});
    const fileRef = useRef();
    const cameraRef = useRef();

    const { data: receipts = [] } = useQuery({
        queryKey: ['accounting-receipts'],
        queryFn: () => base44.entities.AccountingReceipt.list('-receipt_date', 500),
        staleTime: STALE.MEDIUM,
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.AccountingReceipt.create(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounting-receipts'] }); setUploadOpen(false); setAiResult(null); setEditData({}); }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.AccountingReceipt.update(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounting-receipts'] }); setDetailOpen(false); }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.AccountingReceipt.delete(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounting-receipts'] }); setDetailOpen(false); }
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

            // Immer als "pruefung" speichern — manuelle Freigabe erforderlich
            const detected = { ...result, file_url, status: 'pruefung', ai_extracted: true, ai_confidence: result.confidence, assignment: null };
            setAiResult(detected);
            setEditData(detected);
        } catch (e) {
            alert('Fehler beim Verarbeiten: ' + e.message);
        } finally {
            setAiProcessing(false);
        }
    };

    const openDetail = (r) => {
        setSelected(r);
        setEditData({ ...r });
        // Belege in Prüfung → direkt in den Prüfmodus
        setReviewMode(r.status === 'pruefung' || r.status === 'neu');
        setDetailOpen(true);
    };

    const handleFreigabe = () => {
        if (!editData.assignment) {
            alert('Bitte Zuordnung wählen (Kreditor / Debitor / Beides).');
            return;
        }
        updateMutation.mutate({ id: selected.id, data: { ...editData, status: 'freigegeben' } });
    };

    const filtered = receipts.filter(r => {
        const matchMonth = r.receipt_date?.startsWith(selectedMonth);
        const matchSearch = !search || r.supplier_name?.toLowerCase().includes(search.toLowerCase()) || r.receipt_number?.includes(search);
        const matchStatus = statusFilter === 'alle' || r.status === statusFilter;
        return matchMonth && matchSearch && matchStatus;
    });

    const pendingCount = receipts.filter(r => r.status === 'neu' || r.status === 'pruefung').length;

    if (!permissions.canViewAccountingReceipts) return <PermissionDenied message="Kein Zugriff auf Belege." />;

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
                    <div className="flex items-center gap-2">
                        <MonthNavigator value={selectedMonth} onChange={setSelectedMonth} />
                        <Button size="sm" onClick={() => { setAiResult(null); setEditData({}); setUploadOpen(true); }} className="bg-blue-500 hover:bg-blue-600 text-primary-foreground gap-1">
                            <Camera className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['alle', 'neu', 'ki_erkannt', 'pruefung', 'freigegeben', 'exportiert'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                                statusFilter === s ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:bg-accent'
                            )}>
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
                        <p className="font-medium">Keine Belege für diesen Monat</p>
                        <Button onClick={() => { setAiResult(null); setEditData({}); setUploadOpen(true); }} className="mt-4 bg-blue-500 hover:bg-blue-600 text-primary-foreground">
                            <Camera className="w-4 h-4 mr-2" />Beleg scannen
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(r => {
                            const sc = statusConfig[r.status] || statusConfig['neu'];
                            const Icon = sc.icon;
                            return (
                                <Card key={r.id} onClick={() => openDetail(r)} className="p-4 bg-card border-border hover:border-border/80 cursor-pointer transition-all active:scale-[0.99]">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {r.file_url ? (
                                                <div className="w-12 h-12 rounded-xl bg-secondary overflow-hidden shrink-0">
                                                    <img src={r.file_url} alt="Beleg" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                                                    <FileText className="w-6 h-6 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{r.supplier_name || 'Unbekannt'}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{r.receipt_date} {r.category ? `· ${r.category}` : ''}</p>
                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    <Badge className={cn('text-[10px] border gap-1', sc.color)}>
                                                        <Icon className="w-3 h-3" />{sc.label}
                                                    </Badge>
                                                    {r.assignment && (
                                                        <Badge variant="outline" className={cn('text-[10px]', r.assignment === 'uebertrag' && 'border-sky-500/40 text-sky-400')}>
                                                            {ASSIGNMENT_LABELS[r.assignment] || r.assignment}
                                                        </Badge>
                                                    )}
                                                    {r.ai_confidence && <span className="text-[10px] text-muted-foreground">KI {r.ai_confidence}%</span>}
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
                onClick={() => { setAiResult(null); setEditData({}); setUploadOpen(true); }}
                className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-primary-foreground rounded-full shadow-2xl flex items-center justify-center z-40 transition-all hover:scale-110"
            >
                <Camera className="w-6 h-6" />
            </button>

            {/* ── Upload / Scanner Modal ── */}
            {uploadOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-background">
                    {/* Scanner Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                            <span className="font-bold text-foreground">Beleg scannen</span>
                        </div>
                        <button onClick={() => { setUploadOpen(false); setAiResult(null); setEditData({}); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent">
                            ✕
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                        {/* Step 1 — Aufnahme */}
                        {!uploading && !aiProcessing && !aiResult && (
                            <>
                                <p className="text-sm text-muted-foreground text-center">Fotografiere oder lade einen Beleg hoch. Die KI erkennt automatisch alle Daten.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="cursor-pointer">
                                        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-blue-500/40 bg-blue-500/5 active:bg-blue-500/10 transition-colors text-center">
                                            <Camera className="w-10 h-10 text-blue-400" />
                                            <span className="text-sm font-semibold text-foreground">Kamera</span>
                                            <span className="text-xs text-muted-foreground">Foto aufnehmen</span>
                                        </div>
                                        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileUpload(e.target.files?.[0])} />
                                    </label>
                                    <label className="cursor-pointer">
                                        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-border bg-secondary/30 active:bg-secondary/60 transition-colors text-center">
                                            <Upload className="w-10 h-10 text-muted-foreground" />
                                            <span className="text-sm font-semibold text-foreground">Datei</span>
                                            <span className="text-xs text-muted-foreground">Bild oder PDF</span>
                                        </div>
                                        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFileUpload(e.target.files?.[0])} />
                                    </label>
                                </div>
                            </>
                        )}

                        {/* Step 2 — Loading */}
                        {(uploading || aiProcessing) && (
                            <div className="flex flex-col items-center justify-center py-16 gap-6">
                                <div className="w-20 h-20 rounded-3xl bg-blue-500/15 flex items-center justify-center">
                                    <Sparkles className="w-10 h-10 text-blue-400 animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-foreground text-lg">{uploading ? 'Wird hochgeladen…' : 'KI analysiert…'}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{aiProcessing ? 'Lieferant, Betrag & Steuer werden erkannt' : ''}</p>
                                </div>
                                <Progress value={uploading ? 35 : 75} className="h-2 w-48" />
                            </div>
                        )}

                        {/* Step 3 — Ergebnis bearbeiten */}
                        {aiResult && (
                            <>
                                <div className={cn('flex items-center gap-2 p-3 rounded-xl text-sm font-medium',
                                    aiResult.confidence > 80 ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                                )}>
                                    {aiResult.confidence > 80 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                                    KI-Konfidenz: {aiResult.confidence}% — {aiResult.confidence > 80 ? 'Hohe Sicherheit' : 'Bitte prüfen'}
                                </div>

                                {aiResult.file_url && (
                                    <img src={aiResult.file_url} alt="Beleg" className="w-full rounded-xl border border-border object-contain max-h-40" />
                                )}

                                <ReceiptForm data={editData} onChange={setEditData} />
                            </>
                        )}
                    </div>

                    {/* Sticky Footer */}
                    {aiResult && (
                        <div className="px-4 py-3 border-t border-border bg-card space-y-2">
                            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                Beleg wird zur Prüfung gespeichert — Zuordnung & Freigabe danach
                            </p>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => { setAiResult(null); setEditData({}); }} className="flex-1">
                                    Neu scannen
                                </Button>
                                <Button onClick={() => createMutation.mutate({ ...editData, status: 'pruefung', assignment: null })} className="flex-1 bg-blue-500 hover:bg-blue-600 text-primary-foreground" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'Speichern…' : 'Zur Prüfung speichern'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Detail / Bearbeiten Modal ── */}
            {detailOpen && selected && (
                <div className="fixed inset-0 z-50 flex flex-col bg-background">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
                        <div className="flex items-center gap-2">
                            {reviewMode
                                ? <><ShieldCheck className="w-5 h-5 text-amber-400" /><span className="font-bold text-foreground">Beleg prüfen</span></>
                                : <><Edit3 className="w-4 h-4 text-muted-foreground" /><span className="font-bold text-foreground">Beleg bearbeiten</span></>
                            }
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Toggle zwischen Prüf- und Bearbeiten-Modus */}
                            <button
                                onClick={() => setReviewMode(m => !m)}
                                className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
                            >
                                {reviewMode ? 'Bearbeiten' : 'Prüfmodus'}
                            </button>
                            <button onClick={() => setDetailOpen(false)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent">
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Body — side-by-side on desktop, stacked on mobile */}
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                        {/* LEFT: Belegbild — groß */}
                        {selected.file_url && (
                            <div className="md:w-1/2 bg-card/50 flex items-start justify-center overflow-y-auto p-3 md:p-4 shrink-0 max-h-[45vh] md:max-h-none">
                                <div className="relative w-full">
                                    <img
                                        src={selected.file_url}
                                        alt="Beleg"
                                        className="w-full rounded-xl border border-border object-contain"
                                        style={{ maxHeight: 'calc(100vh - 200px)' }}
                                    />
                                    <a href={selected.file_url} target="_blank" rel="noopener noreferrer"
                                        className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded-lg text-xs text-blue-400 flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" /> Öffnen
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* RIGHT: Prüfmodus ODER Formular */}
                        <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 ${!selected.file_url ? 'md:max-w-xl md:mx-auto' : ''}`}>

                            {reviewMode ? (
                                /* ── PRÜFMODUS: kompakte KI-Felder zum schnellen Bestätigen ── */
                                <>
                                    {/* KI-Konfidenz Banner */}
                                    {editData.ai_confidence && (
                                        <div className={cn('flex items-center gap-2 p-3 rounded-xl text-sm font-medium',
                                            editData.ai_confidence > 80 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        )}>
                                            {editData.ai_confidence > 80
                                                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                : <AlertTriangle className="w-4 h-4 shrink-0" />}
                                            KI-Konfidenz: {editData.ai_confidence}% — {editData.ai_confidence > 80 ? 'Hohe Sicherheit' : 'Bitte sorgfältig prüfen'}
                                        </div>
                                    )}

                                    {/* Kompakte Prüf-Felder: nur die wichtigsten */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">KI-Ergebnis prüfen & ggf. korrigieren</p>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Lieferant / Absender</Label>
                                            <Input value={editData.supplier_name || ''} onChange={e => setEditData({ ...editData, supplier_name: e.target.value })} placeholder="Firmenname..." />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Belegdatum</Label>
                                                <Input type="date" value={editData.receipt_date || ''} onChange={e => setEditData({ ...editData, receipt_date: e.target.value })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Brutto (€)</Label>
                                                <Input type="number" step="0.01" value={editData.amount_gross || ''} onChange={e => setEditData({ ...editData, amount_gross: parseFloat(e.target.value) || '' })} placeholder="0,00" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <NativeSelect label="Steuersatz" value={String(editData.tax_rate ?? 19)} onChange={v => setEditData({ ...editData, tax_rate: Number(v) })} options={TAX_RATES.map(r => ({ value: r, label: r + '%' }))} />
                                            <NativeSelect label="Kategorie" value={editData.category || ''} onChange={v => setEditData({ ...editData, category: v })} options={[{ value: '', label: '— wählen —' }, ...CATEGORIES]} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <NativeSelect label="Belegart" value={editData.receipt_type || 'Eingangsrechnung'} onChange={v => setEditData({ ...editData, receipt_type: v })} options={RECEIPT_TYPES} />
                                            <NativeSelect label="Zahlungsart" value={editData.payment_method || 'Bar'} onChange={v => setEditData({ ...editData, payment_method: v })} options={PAYMENT_METHODS} />
                                        </div>
                                    </div>

                                    {/* Zuordnung — Pflicht für Freigabe */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zuordnung wählen <span className="text-red-400">*</span></p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {ASSIGNMENT_OPTIONS.map(opt => (
                                                <button key={opt.key} type="button"
                                                    onClick={() => setEditData({ ...editData, assignment: opt.key })}
                                                    className={cn(
                                                        'py-3 px-2 rounded-xl border text-xs font-semibold transition-all text-center',
                                                        editData.assignment === opt.key
                                                            ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                                            : 'border-border text-muted-foreground hover:border-green-500/50 hover:bg-green-500/5'
                                                    )}>
                                                    {opt.label}
                                                    <span className="block text-[10px] font-normal opacity-70 mt-0.5">{opt.sub}</span>
                                                </button>
                                            ))}
                                        </div>
                                        {editData.assignment === 'uebertrag' && (
                                            <p className="text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2 leading-relaxed">
                                                💡 Übertrag = Kasse-Ausgabe + Bank-Einnahme (kein Aufwand, kein MwSt.-Ansatz). Bitte Steuersatz auf 0% setzen.
                                            </p>
                                        )}
                                        {!editData.assignment && (
                                            <p className="text-xs text-amber-400 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Zuordnung ist Pflicht für die Freigabe
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* ── BEARBEITUNGSMODUS: vollständiges Formular ── */
                                <>
                                    <NativeSelect
                                        label="Status"
                                        value={editData.status || 'neu'}
                                        onChange={v => setEditData({ ...editData, status: v })}
                                        options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))}
                                    />
                                    <ReceiptForm data={editData} onChange={setEditData} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-border bg-card flex gap-3 shrink-0">
                        <button
                            onClick={() => { if (confirm('Beleg wirklich löschen?')) deleteMutation.mutate(selected.id); }}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        {reviewMode ? (
                            <>
                                <Button variant="outline" onClick={() => setDetailOpen(false)} className="flex-1">Abbrechen</Button>
                                <Button
                                    onClick={handleFreigabe}
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-primary-foreground gap-2"
                                    disabled={updateMutation.isPending || !editData.assignment}
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    {updateMutation.isPending ? 'Wird freigegeben…' : 'Freigeben'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setDetailOpen(false)} className="flex-1">Abbrechen</Button>
                                <Button onClick={() => updateMutation.mutate({ id: selected.id, data: editData })}
                                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-primary-foreground"
                                    disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? 'Speichern…' : 'Speichern'}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}