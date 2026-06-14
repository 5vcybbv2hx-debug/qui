/**
 * Belege — Belegerfassung für DATEV-Vorbereitung
 *
 * Radikal simpel:
 *  1. Foto aufnehmen oder Datei hochladen
 *  2. KI liest Betrag, Datum, Lieferant, MwSt automatisch aus
 *  3. Kurz prüfen / korrigieren → Speichern
 *  4. Am Monatsende → Export-Seite → DATEV-CSV + ZIP
 *
 * Kein Status-Flow, kein Prüfmodus, keine Zuordnung.
 */
import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE } from '@/lib/queryUtils';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, Receipt,
    Trash2, ExternalLink, Plus, Search, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Konstanten ────────────────────────────────────────────────────────────────
const TAX_RATES = ['0', '7', '19'];
const CATEGORIES = [
    'Getränke', 'Lebensmittel', 'Reinigung', 'Personal',
    'Miete', 'Energie', 'GEMA', 'Versicherung', 'Software',
    'Bewirtung', 'Büro', 'Marketing', 'Sonstiges',
];

const fmt = n => (n ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// DATEV Sachkonten-Mapping (SKR03) — vereinfacht
const CATEGORY_ACCOUNT = {
    'Getränke':      '3400',
    'Lebensmittel':  '3200',
    'Reinigung':     '4140',
    'Personal':      '4100',
    'Miete':         '4210',
    'Energie':       '4240',
    'GEMA':          '4990',
    'Versicherung':  '4360',
    'Software':      '4980',
    'Bewirtung':     '4650',
    'Büro':          '4930',
    'Marketing':     '4600',
    'Sonstiges':     '4990',
};

// ── Monatsnavigation ──────────────────────────────────────────────────────────
function MonthNav({ value, onChange }) {
    const date = new Date(value + '-01');
    return (
        <div className="flex items-center gap-2">
            <button onClick={() => onChange(format(subMonths(date, 1), 'yyyy-MM'))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground min-w-[110px] text-center">
                {format(date, 'MMMM yyyy', { locale: de })}
            </span>
            <button onClick={() => onChange(format(addMonths(date, 1), 'yyyy-MM'))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}

// ── Beleg-Formular ─────────────────────────────────────────────────────────────
function ReceiptForm({ data, onChange }) {
    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Lieferant / Absender *</Label>
                <Input value={data.supplier_name || ''}
                    onChange={e => onChange({ ...data, supplier_name: e.target.value })}
                    placeholder="z.B. Metro, Edeka, Stadtwerke…" className="h-10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Datum *</Label>
                    <Input type="date" value={data.receipt_date || ''}
                        onChange={e => onChange({ ...data, receipt_date: e.target.value })}
                        className="h-10" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Brutto (€) *</Label>
                    <Input type="number" step="0.01" value={data.amount_gross || ''}
                        onChange={e => onChange({ ...data, amount_gross: parseFloat(e.target.value) || '' })}
                        placeholder="0,00" className="h-10" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">MwSt.</Label>
                    <Select value={String(data.tax_rate ?? 19)}
                        onValueChange={v => onChange({ ...data, tax_rate: Number(v) })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {TAX_RATES.map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Kategorie</Label>
                    <Select value={data.category || ''}
                        onValueChange={v => onChange({ ...data, category: v })}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Wählen…" /></SelectTrigger>
                        <SelectContent>
                            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}

// ── Beleg-Karte ───────────────────────────────────────────────────────────────
function ReceiptCard({ receipt, onEdit, onDelete }) {
    const taxAmt = receipt.amount_gross
        ? (receipt.amount_gross / (1 + (receipt.tax_rate || 19) / 100)) * ((receipt.tax_rate || 19) / 100)
        : 0;

    return (
        <div onClick={onEdit}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card hover:border-border cursor-pointer transition-all group min-h-[64px]">

            {/* Bild-Vorschau */}
            <div className="w-10 h-10 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 overflow-hidden border border-border/40">
                {receipt.file_url
                    ? <img src={receipt.file_url} alt="" className="w-full h-full object-cover" />
                    : <Receipt className="w-4 h-4 text-muted-foreground" />
                }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                    {receipt.supplier_name || 'Unbekannt'}
                </p>
                <p className="text-xs text-muted-foreground">
                    {receipt.receipt_date ? format(new Date(receipt.receipt_date), 'dd.MM.yyyy') : '—'}
                    {receipt.category && ` · ${receipt.category}`}
                </p>
            </div>

            {/* Betrag */}
            <div className="text-right shrink-0">
                <p className="text-sm font-bold text-foreground">{fmt(receipt.amount_gross)} €</p>
                <p className="text-[10px] text-muted-foreground">
                    MwSt. {fmt(taxAmt)} €
                </p>
            </div>

            {/* Löschen */}
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center">
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
export default function AccountingReceipts() {
    const permissions  = usePermissions();
    const queryClient  = useQueryClient();
    const fileRef      = useRef();
    const cameraRef    = useRef();

    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [search,        setSearch]        = useState('');
    const [uploadOpen,    setUploadOpen]    = useState(false);
    const [editOpen,      setEditOpen]      = useState(false);
    const [deleteTarget,  setDeleteTarget]  = useState(null);
    const [selected,      setSelected]      = useState(null);
    const [editData,      setEditData]      = useState({});
    const [uploading,     setUploading]     = useState(false);
    const [aiProcessing,  setAiProcessing]  = useState(false);
    const [previewUrl,    setPreviewUrl]    = useState(null);

    // ── Query ─────────────────────────────────────────────────────────────────
    const { data: receipts = [] } = useQuery({
        queryKey: ['accounting-receipts'],
        queryFn:  () => base44.entities.AccountingReceipt.list('-receipt_date', 500),
        staleTime: STALE.MEDIUM,
    });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: d => base44.entities.AccountingReceipt.create(d),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-receipts'] });
            setUploadOpen(false);
            setEditData({});
            setPreviewUrl(null);
            toast.success('Beleg gespeichert');
        },
        onError: () => toast.error('Fehler beim Speichern'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.AccountingReceipt.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-receipts'] });
            setEditOpen(false);
            toast.success('Beleg aktualisiert');
        },
        onError: () => toast.error('Fehler beim Aktualisieren'),
    });

    const deleteMutation = useMutation({
        mutationFn: id => base44.entities.AccountingReceipt.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-receipts'] });
            setDeleteTarget(null);
            setEditOpen(false);
            toast.success('Beleg gelöscht');
        },
        onError: () => toast.error('Fehler beim Löschen'),
    });

    // ── Filter ────────────────────────────────────────────────────────────────
    const filtered = useMemo(() => receipts.filter(r => {
        if (!r.receipt_date?.startsWith(selectedMonth)) return false;
        if (search) {
            const q = search.toLowerCase();
            if (!r.supplier_name?.toLowerCase().includes(q) &&
                !r.category?.toLowerCase().includes(q)) return false;
        }
        return true;
    }), [receipts, selectedMonth, search]);

    const totalGross = filtered.reduce((s, r) => s + (r.amount_gross || 0), 0);
    const totalTax   = filtered.reduce((s, r) => {
        const rate = (r.tax_rate || 19) / 100;
        return s + ((r.amount_gross || 0) / (1 + rate) * rate);
    }, 0);

    // ── Datei-Upload + KI ─────────────────────────────────────────────────────
    const handleFileUpload = async file => {
        if (!file) return;
        setUploading(true);
        setUploadOpen(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setPreviewUrl(file_url);
            setUploading(false);
            setAiProcessing(true);

            // KI-Analyse
            const prompt = `Du bist ein Buchhalter. Analysiere diesen Beleg und extrahiere:
- supplier_name: Firmenname des Ausstellers
- receipt_date: Datum im Format YYYY-MM-DD
- amount_gross: Bruttobetrag als Zahl
- tax_rate: Steuersatz (0, 7 oder 19)
- category: Eine aus: ${CATEGORIES.join(', ')}
Antworte NUR mit validem JSON.`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                image_urls: [file_url],
                response_json_schema: {
                    type: 'object',
                    properties: {
                        supplier_name: { type: 'string' },
                        receipt_date:  { type: 'string' },
                        amount_gross:  { type: 'number' },
                        tax_rate:      { type: 'number' },
                        category:      { type: 'string' },
                    }
                }
            });

            setEditData({
                ...result,
                file_url,
                status: 'freigegeben',
                datev_account: CATEGORY_ACCOUNT[result.category] || '4990',
            });
        } catch {
            toast.error('KI-Analyse fehlgeschlagen — bitte manuell ausfüllen');
            setEditData({ file_url: previewUrl, status: 'freigegeben' });
        } finally {
            setUploading(false);
            setAiProcessing(false);
        }
    };

    const openEdit = receipt => {
        setSelected(receipt);
        setEditData({ ...receipt });
        setEditOpen(true);
    };

    const handleSaveNew = () => {
        if (!editData.supplier_name || !editData.receipt_date || !editData.amount_gross) {
            toast.error('Lieferant, Datum und Betrag sind Pflichtfelder');
            return;
        }
        createMutation.mutate({
            ...editData,
            datev_account: CATEGORY_ACCOUNT[editData.category] || '4990',
            status: 'freigegeben',
        });
    };

    const handleSaveEdit = () => {
        if (!selected) return;
        updateMutation.mutate({
            id: selected.id,
            data: {
                ...editData,
                datev_account: CATEGORY_ACCOUNT[editData.category] || '4990',
            }
        });
    };

    if (!permissions.canViewAccounting) {
        return <PermissionDenied message="Kein Zugriff auf das Belegarchiv." />;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-background pb-24 md:pb-8">
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Belege</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Scan → KI → DATEV-Export</p>
                    </div>
                    {/* Upload-Buttons */}
                    <div className="flex gap-2">
                        <label className="cursor-pointer">
                            <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-all">
                                <Camera className="w-4 h-4" />
                                <span className="hidden sm:inline">Foto</span>
                            </div>
                            <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                                onChange={e => handleFileUpload(e.target.files?.[0])}
                                className="hidden" />
                        </label>
                        <label className="cursor-pointer">
                            <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-accent transition-all">
                                <Upload className="w-4 h-4" />
                                <span className="hidden sm:inline">Datei</span>
                            </div>
                            <input ref={fileRef} type="file" accept="image/*,application/pdf"
                                onChange={e => handleFileUpload(e.target.files?.[0])}
                                className="hidden" />
                        </label>
                        <Button variant="outline" size="sm" className="h-9"
                            onClick={() => { setEditData({ receipt_date: format(new Date(), 'yyyy-MM-dd'), tax_rate: 19, status: 'freigegeben' }); setPreviewUrl(null); setUploadOpen(true); }}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* ── Monatsnavigation ────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <MonthNav value={selectedMonth} onChange={setSelectedMonth} />
                    <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{fmt(totalGross)} €</p>
                        <p className="text-[10px] text-muted-foreground">MwSt. {fmt(totalTax)} €</p>
                    </div>
                </div>

                {/* ── Suche ───────────────────────────────────────────────── */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Lieferant oder Kategorie…" value={search}
                        onChange={e => setSearch(e.target.value)} className="pl-9 h-10" />
                    {search && (
                        <button onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* ── Beleg-Liste ─────────────────────────────────────────── */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-semibold text-foreground">Keine Belege</p>
                        <p className="text-sm mt-1">Foto aufnehmen oder Datei hochladen</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(r => (
                            <ReceiptCard
                                key={r.id}
                                receipt={r}
                                onEdit={() => openEdit(r)}
                                onDelete={() => setDeleteTarget(r.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Upload / Neu Dialog ─────────────────────────────────────── */}
            <Dialog open={uploadOpen} onOpenChange={o => { if (!o) { setUploadOpen(false); setPreviewUrl(null); setEditData({}); } }}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Neuer Beleg</DialogTitle>
                    </DialogHeader>

                    {/* Lade-Zustand */}
                    {(uploading || aiProcessing) ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-foreground">
                                    {uploading ? 'Wird hochgeladen…' : 'KI liest Beleg aus…'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {aiProcessing ? 'Lieferant, Betrag & MwSt werden erkannt' : ''}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-1">
                            {/* Bild-Vorschau */}
                            {previewUrl && (
                                <div className="relative">
                                    <img src={previewUrl} alt="Beleg"
                                        className="w-full h-40 object-contain rounded-xl border border-border/50 bg-secondary/20" />
                                    <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                                        className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded-lg text-xs text-blue-400 flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}

                            {/* KI-Hinweis */}
                            {editData.supplier_name && (
                                <div className="flex items-center gap-2 text-xs bg-green-500/8 border border-green-500/20 rounded-xl px-3 py-2 text-green-400">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    KI hat Daten erkannt — bitte kurz prüfen
                                </div>
                            )}

                            <ReceiptForm data={editData} onChange={setEditData} />
                        </div>
                    )}

                    {!uploading && !aiProcessing && (
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => { setUploadOpen(false); setPreviewUrl(null); setEditData({}); }}>
                                Abbrechen
                            </Button>
                            <Button onClick={handleSaveNew}
                                disabled={createMutation.isPending}
                                className="bg-amber-600 hover:bg-amber-700 text-white flex-1">
                                {createMutation.isPending ? 'Speichert…' : 'Beleg speichern'}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Edit Dialog ─────────────────────────────────────────────── */}
            <Dialog open={editOpen} onOpenChange={o => !o && setEditOpen(false)}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Beleg bearbeiten</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        {/* Bild */}
                        {selected?.file_url && (
                            <div className="relative">
                                <img src={selected.file_url} alt="Beleg"
                                    className="w-full h-40 object-contain rounded-xl border border-border/50 bg-secondary/20" />
                                <a href={selected.file_url} target="_blank" rel="noopener noreferrer"
                                    className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded-lg text-xs text-blue-400 flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" />Öffnen
                                </a>
                            </div>
                        )}

                        <ReceiptForm data={editData} onChange={setEditData} />
                    </div>

                    <DialogFooter className="gap-2 flex-row">
                        <Button variant="outline" size="sm"
                            onClick={() => setDeleteTarget(selected?.id)}
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 h-9">
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />Löschen
                        </Button>
                        <Button onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                            className="bg-amber-600 hover:bg-amber-700 text-white flex-1 h-9">
                            {updateMutation.isPending ? 'Speichert…' : 'Speichern'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirm ──────────────────────────────────────────── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Beleg löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Dieser Beleg wird dauerhaft entfernt.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(deleteTarget)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
