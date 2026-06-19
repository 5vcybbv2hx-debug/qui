import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    Building2, QrCode, Upload, X, ChevronDown, ChevronUp,
    AlertCircle, CheckCircle2, Clock, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import DigitalBusinessCard from '@/components/company/DigitalBusinessCard';
import OpeningHoursEditor from '@/components/company/OpeningHoursEditor';

const EMPTY = {
    company_name: '', street: '', postal_code: '', city: '',
    country: 'Deutschland', phone: '', email: '', website: '',
    tax_id: '', vat_id: '', bank_name: '', iban: '', bic: '',
    opening_hours: '', description: '', logo_url: ''
};

export default function CompanySettingsPage() {
    const [formData, setFormData]       = useState(EMPTY);
    const [isDirty, setIsDirty]         = useState(false);
    const [uploading, setUploading]     = useState(false);
    const [financeOpen, setFinanceOpen] = useState(false);
    const [dragOver, setDragOver]       = useState(false);
    const initialized                   = useRef(false);
    const fileInputRef                  = useRef(null);
    const queryClient                   = useQueryClient();

    const { data: companyInfo, isLoading } = useQuery({
        queryKey: ['company-info'],
        queryFn: async () => {
            const infos = await base44.entities.CompanyInfo.list('-last_updated', 1);
            return infos[0] || null;
        }
    });

    useEffect(() => {
        if (companyInfo && !initialized.current) {
            initialized.current = true;
            setFormData({ ...EMPTY, ...companyInfo });
        }
    }, [companyInfo]);

    const set = (key, val) => {
        setFormData(prev => ({ ...prev, [key]: val }));
        setIsDirty(true);
    };

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (companyInfo?.id) {
                return await base44.entities.CompanyInfo.update(companyInfo.id, data);
            }
            return await base44.entities.CompanyInfo.create(data);
        },
        onSuccess: (saved) => {
            queryClient.setQueryData(['company-info'], saved);
            setIsDirty(false);
            toast.success('Firmendaten gespeichert');
        },
        onError: (err) => toast.error('Fehler beim Speichern: ' + err.message),
    });

    const handleSave = () => {
        if (!formData.company_name.trim()) {
            toast.error('Bitte Firmennamen eingeben');
            return;
        }
        saveMutation.mutate(formData);
    };

    const uploadLogo = async (file) => {
        if (!file?.type.startsWith('image/')) {
            toast.error('Bitte nur Bilddateien hochladen');
            return;
        }
        setUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            set('logo_url', file_url);
            toast.success('Logo hochgeladen');
        } catch (err) {
            toast.error('Fehler beim Hochladen: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadLogo(file);
    };

    const lastSaved = companyInfo?.updated_date
        ? format(new Date(companyInfo.updated_date), "dd. MMM yyyy, HH:mm 'Uhr'", { locale: de })
        : null;

    if (isLoading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-muted-foreground">Lädt…</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background">

            {/* ── Sticky Header ─────────────────────────────────────────── */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base font-semibold text-foreground leading-tight truncate">
                                Firmenstammdaten
                            </h1>
                            {lastSaved && !isDirty && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    Gespeichert: {lastSaved}
                                </p>
                            )}
                            {isDirty && (
                                <p className="text-xs text-amber-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Ungespeicherte Änderungen
                                </p>
                            )}
                        </div>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saveMutation.isPending || !isDirty}
                        size="sm"
                        className="shrink-0 min-h-[44px] px-5"
                    >
                        {saveMutation.isPending ? 'Speichert…' : 'Speichern'}
                    </Button>
                </div>
            </div>

            {/* ── Content ────────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <Tabs defaultValue="data" className="space-y-6">
                    <TabsList className="w-full sm:w-auto">
                        <TabsTrigger value="data" className="flex-1 sm:flex-none gap-2">
                            <Building2 className="w-4 h-4" />
                            Stammdaten
                        </TabsTrigger>
                        <TabsTrigger value="card" className="flex-1 sm:flex-none gap-2">
                            <QrCode className="w-4 h-4" />
                            Visitenkarte
                        </TabsTrigger>
                    </TabsList>

                    {/* ── TAB: Stammdaten ──────────────────────────────── */}
                    <TabsContent value="data">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* ── Linke Spalte ─────────────────────────── */}
                            <div className="lg:col-span-2 space-y-5">

                                {/* Grunddaten */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-semibold text-foreground">Grunddaten</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label>Firmenname <span className="text-destructive">*</span></Label>
                                            <Input
                                                value={formData.company_name}
                                                onChange={e => set('company_name', e.target.value)}
                                                placeholder="z.B. Bar & Lounge GmbH"
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label>Beschreibung</Label>
                                            <Textarea
                                                value={formData.description}
                                                onChange={e => set('description', e.target.value)}
                                                placeholder="Kurze Beschreibung eures Betriebs…"
                                                rows={3}
                                                className="mt-1 resize-none"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Adresse */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-semibold text-foreground">Adresse</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label>Straße & Hausnummer</Label>
                                            <Input
                                                value={formData.street}
                                                onChange={e => set('street', e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label>PLZ</Label>
                                                <Input
                                                    value={formData.postal_code}
                                                    onChange={e => set('postal_code', e.target.value)}
                                                    className="mt-1"
                                                    maxLength={5}
                                                />
                                            </div>
                                            <div>
                                                <Label>Stadt</Label>
                                                <Input
                                                    value={formData.city}
                                                    onChange={e => set('city', e.target.value)}
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Land</Label>
                                            <Input
                                                value={formData.country}
                                                onChange={e => set('country', e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Kontakt */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-semibold text-foreground">Kontakt</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <Label>Telefon</Label>
                                                <Input
                                                    value={formData.phone}
                                                    onChange={e => set('phone', e.target.value)}
                                                    type="tel"
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label>E-Mail</Label>
                                                <Input
                                                    value={formData.email}
                                                    onChange={e => set('email', e.target.value)}
                                                    type="email"
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Webseite</Label>
                                            <Input
                                                value={formData.website}
                                                onChange={e => set('website', e.target.value)}
                                                placeholder="https://..."
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label className="mb-2 block">Öffnungszeiten</Label>
                                            <OpeningHoursEditor
                                                value={formData.opening_hours}
                                                onChange={val => set('opening_hours', val)}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Finanzdaten — Akkordeon ───────────────── */}
                                <Card>
                                    <button
                                        type="button"
                                        onClick={() => setFinanceOpen(o => !o)}
                                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors rounded-xl"
                                    >
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm font-semibold text-foreground">Finanzdaten</span>
                                            {(formData.iban || formData.tax_id) && (
                                                <Badge variant="secondary" className="text-xs">Ausgefüllt</Badge>
                                            )}
                                        </div>
                                        {financeOpen
                                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        }
                                    </button>
                                    {financeOpen && (
                                        <CardContent className="pt-0 space-y-4 border-t border-border">
                                            <div className="grid grid-cols-2 gap-4 pt-4">
                                                <div>
                                                    <Label>Steuernummer</Label>
                                                    <Input
                                                        value={formData.tax_id}
                                                        onChange={e => set('tax_id', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>USt-IdNr.</Label>
                                                    <Input
                                                        value={formData.vat_id}
                                                        onChange={e => set('vat_id', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Bank</Label>
                                                <Input
                                                    value={formData.bank_name}
                                                    onChange={e => set('bank_name', e.target.value)}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>IBAN</Label>
                                                    <Input
                                                        value={formData.iban}
                                                        onChange={e => set('iban', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>BIC</Label>
                                                    <Input
                                                        value={formData.bic}
                                                        onChange={e => set('bic', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            </div>

                            {/* ── Rechte Spalte: Logo ───────────────────── */}
                            <div className="space-y-5">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-semibold text-foreground">Logo</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">

                                        {/* Logo Preview */}
                                        {formData.logo_url ? (
                                            <div className="relative group">
                                                <div className="aspect-square bg-muted rounded-xl p-4 flex items-center justify-center border border-border">
                                                    <img
                                                        src={formData.logo_url}
                                                        alt="Logo"
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => set('logo_url', '')}
                                                    className="absolute top-2 right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Logo entfernen"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            /* Drag & Drop Zone */
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                                onDragLeave={() => setDragOver(false)}
                                                onDrop={handleDrop}
                                                className={`
                                                    aspect-square rounded-xl border-2 border-dashed cursor-pointer
                                                    flex flex-col items-center justify-center gap-3 transition-colors
                                                    ${dragOver
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                                    }
                                                `}
                                            >
                                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                                    <Upload className={`w-5 h-5 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                                                </div>
                                                <div className="text-center px-4">
                                                    <p className="text-sm font-medium text-foreground">
                                                        {dragOver ? 'Loslassen zum Hochladen' : 'Logo hochladen'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Drag & Drop oder klicken
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        PNG, JPG, SVG
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => {
                                                const f = e.target.files?.[0];
                                                if (f) uploadLogo(f);
                                                e.target.value = '';
                                            }}
                                        />

                                        {uploading && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                Wird hochgeladen…
                                            </div>
                                        )}

                                        {formData.logo_url && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                            >
                                                <Upload className="w-3.5 h-3.5 mr-2" />
                                                Logo ersetzen
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Letzte Speicherung Info */}
                                {lastSaved && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                                        <Clock className="w-3.5 h-3.5 shrink-0" />
                                        <span>Zuletzt gespeichert: {lastSaved}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── TAB: Visitenkarte ─────────────────────────────── */}
                    <TabsContent value="card">
                        {isDirty && (
                            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Du hast ungespeicherte Änderungen — speichere zuerst, damit die Visitenkarte aktuell ist.</span>
                                <Button size="sm" variant="outline" onClick={handleSave} className="ml-auto shrink-0 border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                                    Jetzt speichern
                                </Button>
                            </div>
                        )}
                        <DigitalBusinessCard companyInfo={formData} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
