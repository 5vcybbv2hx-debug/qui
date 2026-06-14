/**
 * DATEV-Export — Monatsexport für den Steuerberater
 *
 * Erzeugt zwei Dateien:
 *  1. EXTF_Buchungsstapel_YYYY-MM.csv  — DATEV-konformes Buchungsstapel-Format
 *  2. Belege_YYYY-MM.zip               — alle Belegbilder des Monats (via JSZip)
 *
 * Der Steuerberater importiert beides direkt in DATEV Unternehmen Online.
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/queryUtils';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Download, FileText, Archive, CheckCircle2, Receipt,
    ChevronLeft, ChevronRight, Info, Package
} from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => (n ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function MonthNav({ value, onChange }) {
    const date = new Date(value + '-01');
    const isCurrentMonth = value === format(new Date(), 'yyyy-MM');
    return (
        <div className="flex items-center gap-2">
            <button onClick={() => onChange(format(subMonths(date, 1), 'yyyy-MM'))}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-base font-bold text-foreground min-w-[130px] text-center">
                {format(date, 'MMMM yyyy', { locale: de })}
            </span>
            <button onClick={() => onChange(format(addMonths(date, 1), 'yyyy-MM'))}
                disabled={isCurrentMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}

// ── DATEV EXTF Buchungsstapel ─────────────────────────────────────────────────
function buildDATEVCsv(receipts, month, beraterNr, mandantenNr) {
    const now  = new Date();
    const ts   = format(now, 'yyyyMMddHHmmssSSS');
    const [y, m] = month.split('-');
    const wjBeginn = `${y}0101`;     // Wirtschaftsjahresbeginn 1.1.
    const sachkonto = '1200';         // Gegenkonto: Bank (SKR03) — Steuerberater passt ggf. an

    // DATEV EXTF Header (Zeile 1) — exaktes Format laut DATEV-Spec
    const header = [
        '"EXTF"',        // Kennzeichen
        '700',           // Versionsnummer
        '21',            // Datenkategorie: 21 = Buchungsstapel
        '"Buchungsstapel"',
        '13',            // Formatversion
        ts,              // Erstellt am
        '',              // Importiert
        '"RE"',          // Herkunft
        '',              // Exportiert von
        '',              // Importiert von
        beraterNr || '0',
        mandantenNr || '0',
        wjBeginn,        // WJ-Beginn
        '4',             // Sachkontenlänge
        `${y}${m}01`,   // Datum von
        `${y}${m}${new Date(Number(y), Number(m), 0).getDate()}`, // Datum bis
        '"BarShift Pro"', // Bezeichnung
        '',              // Diktatkürzel
        '1',             // Buchungstyp: 1=Fibu-Buchung
        '0',             // Rechnungslegungszweck
        '0',             // Festschreibung
        'EUR',           // WKZ
        '',              // Derivatskennzeichen
        '',              // SKR
        '',              // Branchenlösung
        '',              // Anwendungsinformation
        '',              // Länge Buchungstext
        '',              // ÖPNV
    ].join(';');

    // Spalten-Header (Zeile 2)
    const cols = [
        'Umsatz (ohne Soll/Haben-Kz)',
        'Soll/Haben-Kennzeichen',
        'WKZ Umsatz',
        'Kurs',
        'Basis-Umsatz',
        'WKZ Basis-Umsatz',
        'Konto',
        'Gegenkonto (ohne BU-Schlüssel)',
        'BU-Schlüssel',
        'Belegdatum',
        'Belegfeld 1',
        'Belegfeld 2',
        'Skonto',
        'Buchungstext',
        'Postensperre',
        'Diverse Adressnummer',
        'Geschäftspartnerbank',
        'Sachverhalt',
        'Zinssperre',
        'Beleglink',
        'Beleginfo - Art 1',
        'Beleginfo - Inhalt 1',
        'Beleginfo - Art 2',
        'Beleginfo - Inhalt 2',
        'Beleginfo - Art 3',
        'Beleginfo - Inhalt 3',
        'Beleginfo - Art 4',
        'Beleginfo - Inhalt 4',
        'Beleginfo - Art 5',
        'Beleginfo - Inhalt 5',
        'Beleginfo - Art 6',
        'Beleginfo - Inhalt 6',
        'Beleginfo - Art 7',
        'Beleginfo - Inhalt 7',
        'Beleginfo - Art 8',
        'Beleginfo - Inhalt 8',
        'KOST1 - Kostenstelle',
        'KOST2 - Kostenstelle',
        'Kost-Menge',
        'EU-Land u. UStID',
        'EU-Steuersatz',
        'Abw. Versteuerungsart',
        'Sachverhalt L+L',
        'Funktionsergänzung L+L',
        'BU 49 Hauptfunktionstyp',
        'BU 49 Hauptfunktionsnummer',
        'BU 49 Funktionsergänzung',
        'Zusatzinformation - Art 1',
        'Zusatzinformation - Inhalt 1',
        'Zusatzinformation - Art 2',
        'Zusatzinformation - Inhalt 2',
        'Stück',
        'Gewicht',
        'Zahlweise',
        'Forderungsart',
        'Veranlagungsjahr',
        'Zugeordnete Fälligkeit',
        'Skontotyp',
        'Auftragsnummer',
        'Buchungstyp',
        'USt-Schlüssel (Anzahlungen)',
        'EU-Mitgliedstaat (Anzahlungen)',
        'Sachverhalt§13b UStG (Anzahlungen)',
        'Erlöskonto (Anzahlungen)',
        'Herkunft-Kz',
        'Buchungs GUID',
        'KOST-Datum',
        'SEPA-Mandatsreferenz',
        'Skontosperre',
        'Gesellschaftername',
        'Beteiligtennummer',
        'Identifikationsnummer',
        'Zeichnernummer',
        'Postensperre bis',
        'Bezeichnung SoBil-Sachverhalt',
        'Kennzeichen SoBil-Buchung',
        'Festschreibung',
        'Leistungsdatum',
        'Datum Zuord. Steuerperiode',
        'Fälligkeit',
        'Generalumkehr (GU)',
        'Steuersatz',
        'Land',
        'Abrechnungsreferenz',
        'BVV-Position',
        'EU-Steuersatz Land',
        'EU-Steuersatz',
    ].join(';');

    // BU-Schlüssel aus Steuersatz
    const buKey = rate => {
        if (rate === 19) return '9';
        if (rate === 7)  return '8';
        return '';  // 0% — kein BU-Schlüssel
    };

    // Datenzeilen
    const rows = receipts.map(r => {
        const betrag    = (r.amount_gross || 0).toFixed(2).replace('.', ',');
        const datum     = r.receipt_date ? format(new Date(r.receipt_date), 'ddMM') : '';
        const konto     = r.datev_account || '4990';
        const bu        = buKey(r.tax_rate ?? 19);
        const belegfeld = r.receipt_number || r.id?.slice(0, 12) || '';
        const text      = [r.supplier_name, r.category].filter(Boolean).join(' / ');
        const beleglink = r.file_url ? r.id : '';

        // 86 Felder — nicht benötigte bleiben leer
        const fields = Array(86).fill('');
        fields[0]  = betrag;           // Umsatz
        fields[1]  = 'S';              // Soll (Ausgabe)
        fields[2]  = 'EUR';            // WKZ
        fields[3]  = '';               // Kurs
        fields[4]  = '';               // Basis-Umsatz
        fields[5]  = '';               // WKZ Basis
        fields[6]  = konto;            // Konto (Aufwandskonto)
        fields[7]  = sachkonto;        // Gegenkonto (Bank/Kasse)
        fields[8]  = bu;               // BU-Schlüssel
        fields[9]  = datum;            // Belegdatum (TTMM)
        fields[10] = belegfeld;        // Belegfeld 1 (Rechnungsnr.)
        fields[11] = '';               // Belegfeld 2
        fields[12] = '';               // Skonto
        fields[13] = `"${text}"`;      // Buchungstext
        fields[19] = beleglink;        // Beleglink

        return fields.join(';');
    });

    return [header, cols, ...rows].join('\r\n');
}

function downloadFile(content, filename, mime) {
    const bom  = mime.includes('csv') ? '\uFEFF' : '';
    const blob = new Blob([bom + content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
export default function AccountingExport() {
    const permissions = usePermissions();
    const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 0), 'yyyy-MM'));
    const [exporting,     setExporting]     = useState(false);
    const [done,          setDone]          = useState(false);

    // DATEV-Nummern (optional — nur für korrekte Header)
    const [beraterNr,    setBeraterNr]    = useState('');
    const [mandantenNr,  setMandantenNr]  = useState('');

    const { data: receipts = [] } = useQuery({
        queryKey: ['accounting-receipts'],
        queryFn:  () => base44.entities.AccountingReceipt.list('-receipt_date', 500),
        staleTime: STALE.MEDIUM,
    });

    const monthReceipts = useMemo(() =>
        receipts.filter(r => r.receipt_date?.startsWith(selectedMonth)),
        [receipts, selectedMonth]
    );

    const totalGross = monthReceipts.reduce((s, r) => s + (r.amount_gross || 0), 0);
    const totalTax   = monthReceipts.reduce((s, r) => {
        const rate = (r.tax_rate || 19) / 100;
        return s + ((r.amount_gross || 0) / (1 + rate) * rate);
    }, 0);
    const withImage  = monthReceipts.filter(r => r.file_url).length;

    const handleExport = async () => {
        if (monthReceipts.length === 0) {
            toast.error('Keine Belege in diesem Monat');
            return;
        }
        setExporting(true);
        setDone(false);
        try {
            // 1. DATEV CSV
            const csv      = buildDATEVCsv(monthReceipts, selectedMonth, beraterNr, mandantenNr);
            const csvName  = `EXTF_Buchungsstapel_${selectedMonth}.csv`;
            downloadFile(csv, csvName, 'text/csv;charset=utf-8;');

            // 2. ZIP mit Belegen (wenn vorhanden)
            if (withImage > 0) {
                // JSZip dynamisch laden
                const JSZip = (await import('jszip')).default;
                const zip   = new JSZip();
                const folder = zip.folder(`Belege_${selectedMonth}`);

                await Promise.all(
                    monthReceipts
                        .filter(r => r.file_url)
                        .map(async (r, i) => {
                            try {
                                const resp = await fetch(r.file_url);
                                const blob = await resp.blob();
                                const ext  = r.file_url.split('.').pop().split('?')[0] || 'jpg';
                                const name = `${String(i + 1).padStart(3, '0')}_${(r.supplier_name || 'Beleg').replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
                                folder.file(name, blob);
                            } catch {
                                // Bild nicht erreichbar — überspringen
                            }
                        })
                );

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const zipUrl  = URL.createObjectURL(zipBlob);
                const a       = document.createElement('a');
                a.href = zipUrl;
                a.download = `Belege_${selectedMonth}.zip`;
                a.click();
                URL.revokeObjectURL(zipUrl);
            }

            setDone(true);
            toast.success(`Export fertig — ${monthReceipts.length} Buchungssätze + ${withImage} Belege`);
        } catch (e) {
            toast.error('Export fehlgeschlagen: ' + e.message);
        } finally {
            setExporting(false);
        }
    };

    if (!permissions.canViewAccounting) {
        return <PermissionDenied message="Kein Zugriff auf den Export." />;
    }

    const [y, m] = selectedMonth.split('-');
    const monthLabel = format(new Date(Number(y), Number(m) - 1, 1), 'MMMM yyyy', { locale: de });

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-8">
            <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

                {/* Header */}
                <div>
                    <h1 className="text-xl font-bold text-foreground">DATEV-Export</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Buchungsstapel + Belege für den Steuerberater
                    </p>
                </div>

                {/* Monatsauswahl */}
                <Card className="p-4 bg-card border-border space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Monat wählen</p>
                    <MonthNav value={selectedMonth} onChange={v => { setSelectedMonth(v); setDone(false); }} />

                    {/* Monats-Übersicht */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="bg-secondary/40 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-foreground">{monthReceipts.length}</p>
                            <p className="text-[10px] text-muted-foreground">Belege</p>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-foreground">{fmt(totalGross)} €</p>
                            <p className="text-[10px] text-muted-foreground">Gesamt brutto</p>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-foreground">{fmt(totalTax)} €</p>
                            <p className="text-[10px] text-muted-foreground">MwSt. gesamt</p>
                        </div>
                    </div>
                </Card>

                {/* DATEV-Nummern (optional) */}
                <Card className="p-4 bg-card border-border space-y-3">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex-1">
                            DATEV-Nummern
                        </p>
                        <Badge variant="outline" className="text-[10px]">optional</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Vom Steuerberater mitgeteilt. Ohne Angabe wird 0 verwendet — der Steuerberater kann das beim Import korrigieren.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Beraternummer</label>
                            <input value={beraterNr} onChange={e => setBeraterNr(e.target.value)}
                                placeholder="z.B. 12345"
                                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Mandantennummer</label>
                            <input value={mandantenNr} onChange={e => setMandantenNr(e.target.value)}
                                placeholder="z.B. 1001"
                                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                        </div>
                    </div>
                </Card>

                {/* Was wird exportiert */}
                <Card className="p-4 bg-card border-border space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                        Export-Inhalt
                    </p>
                    <div className="flex items-center gap-3 py-2 border-b border-border/40">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">EXTF_Buchungsstapel_{selectedMonth}.csv</p>
                            <p className="text-xs text-muted-foreground">DATEV-konformes Buchungsstapel-Format · {monthReceipts.length} Buchungssätze</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 py-2">
                        <Archive className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">Belege_{selectedMonth}.zip</p>
                            <p className="text-xs text-muted-foreground">
                                {withImage} Belegbilder verknüpft
                                {monthReceipts.length - withImage > 0 && ` · ${monthReceipts.length - withImage} ohne Bild`}
                            </p>
                        </div>
                        {withImage > 0
                            ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                            : <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
                        }
                    </div>
                </Card>

                {/* Hinweis */}
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-secondary/30 rounded-xl p-3.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
                    <p className="leading-relaxed">
                        Die CSV-Datei kann direkt in <strong className="text-foreground">DATEV Unternehmen Online</strong> importiert werden.
                        Die ZIP-Datei enthält alle Belegbilder — dein Steuerberater lädt beide über <strong className="text-foreground">DATEV Belegtransfer</strong> hoch.
                        Gegenkonto ist standardmäßig <strong className="text-foreground">1200 (Bank)</strong> — bei Barzahlungen bitte mit dem Steuerberater abstimmen.
                    </p>
                </div>

                {/* Export-Button */}
                {done ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <div className="w-14 h-14 rounded-2xl bg-green-500/15 flex items-center justify-center">
                            <CheckCircle2 className="w-7 h-7 text-green-400" />
                        </div>
                        <p className="font-bold text-foreground">Export fertig!</p>
                        <p className="text-xs text-muted-foreground text-center">
                            CSV + ZIP wurden heruntergeladen.<br />
                            Weiterleiten an den Steuerberater.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setDone(false)}>
                            Neuer Export
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={handleExport}
                        disabled={exporting || monthReceipts.length === 0}
                        className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold text-base gap-2">
                        {exporting ? (
                            <>
                                <Package className="w-5 h-5 animate-pulse" />
                                Wird exportiert…
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                {monthLabel} exportieren
                            </>
                        )}
                    </Button>
                )}

                {monthReceipts.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground">
                        Keine Belege im gewählten Monat
                    </p>
                )}
            </div>
        </div>
    );
}
