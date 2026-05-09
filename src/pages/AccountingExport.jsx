import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, FileText, Table, Archive, CheckCircle2, Loader2, BookOpen, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const fmt = (n) => n?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

function downloadCSV(rows, filename) {
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

export default function AccountingExport() {
    const permissions = usePermissions();
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [exportProgress, setExportProgress] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [done, setDone] = useState(false);

    const { data: cashbookEntries = [] } = useQuery({ queryKey: ['cashbook-entries'], queryFn: () => base44.entities.CashbookEntry.list('-date') });
    const { data: receipts = [] } = useQuery({ queryKey: ['accounting-receipts'], queryFn: () => base44.entities.AccountingReceipt.list('-receipt_date') });
    const { data: creditorInvoices = [] } = useQuery({ queryKey: ['creditor-invoices'], queryFn: () => base44.entities.CreditorInvoice.list('-invoice_date') });
    const { data: debitorInvoices = [] } = useQuery({ queryKey: ['debitor-invoices'], queryFn: () => base44.entities.DebitorInvoice.list('-invoice_date') });
    const { data: dailyRevenues = [] } = useQuery({ queryKey: ['daily-revenues'], queryFn: () => base44.entities.DailyRevenue.list('-date') });

    const filtered = {
        cashbook: cashbookEntries.filter(e => e.date?.startsWith(selectedMonth)),
        receipts: receipts.filter(r => r.receipt_date?.startsWith(selectedMonth)),
        creditors: creditorInvoices.filter(i => i.invoice_date?.startsWith(selectedMonth)),
        debitors: debitorInvoices.filter(i => i.invoice_date?.startsWith(selectedMonth)),
        revenues: dailyRevenues.filter(r => r.date?.startsWith(selectedMonth)),
    };

    const exportCashbook = () => {
        const rows = [
            ['Datum', 'Uhrzeit', 'Buchungsart', 'Beschreibung', 'Kategorie', 'Brutto (€)', 'Netto (€)', 'USt (%)', 'USt (€)', 'Zahlungsart', 'Status'],
            ...filtered.cashbook.map(e => [
                e.date, e.time || '', e.entry_type, e.description || '', e.category || '',
                (e.amount || 0).toFixed(2), (e.amount_net || 0).toFixed(2),
                e.tax_rate || '', (e.tax_amount || 0).toFixed(2), e.payment_method || '', e.status || ''
            ])
        ];
        downloadCSV(rows, `Kassenbuch_${selectedMonth}.csv`);
    };

    const exportCreditors = () => {
        const rows = [
            ['Datum', 'Fälligkeit', 'Lieferant', 'Rechnungsnr.', 'Brutto (€)', 'Netto (€)', 'USt (%)', 'USt (€)', 'Kategorie', 'Status'],
            ...filtered.creditors.map(i => [
                i.invoice_date, i.due_date || '', i.supplier_name, i.invoice_number || '',
                (i.amount_gross || 0).toFixed(2), (i.amount_net || 0).toFixed(2),
                i.tax_rate || '', (i.tax_amount || 0).toFixed(2), i.category || '', i.payment_status || ''
            ])
        ];
        downloadCSV(rows, `Kreditoren_${selectedMonth}.csv`);
    };

    const exportDebitors = () => {
        const rows = [
            ['Datum', 'Fälligkeit', 'Kunde', 'Rechnungsnr.', 'Brutto (€)', 'Netto (€)', 'USt (%)', 'Beschreibung', 'Status'],
            ...filtered.debitors.map(i => [
                i.invoice_date, i.due_date || '', i.customer_name, i.invoice_number || '',
                (i.amount_gross || 0).toFixed(2), (i.amount_net || 0).toFixed(2),
                i.tax_rate || '', i.description || '', i.payment_status || ''
            ])
        ];
        downloadCSV(rows, `Debitoren_${selectedMonth}.csv`);
    };

    const exportDatev = () => {
        // DATEV Buchungsstapel-Format (vereinfacht)
        const rows = [
            ['"EXTF"', '700', '21', '"Buchungsstapel"', '7', '', '', '1', '', '"RE"', '""', '""', '', '', '"EUR"', ''],
            ['Umsatz', 'Soll/Haben-Kennzeichen', 'WKZ Umsatz', 'Kurs', 'Basis-Umsatz', 'WKZ Basis-Umsatz', 'Konto', 'Gegenkonto', 'BU-Schlüssel', 'Belegdatum', 'Belegfeld1', 'Belegfeld2', 'Skonto', 'Buchungstext'],
            ...filtered.creditors.map(i => [
                (i.amount_net || 0).toFixed(2).replace('.', ','),
                'S', 'EUR', '', '', '', '4000', '1600', '',
                (i.invoice_date || '').replace(/-/g, '').slice(4),
                i.invoice_number || '', '', '', i.supplier_name || ''
            ]),
            ...filtered.debitors.map(i => [
                (i.amount_net || 0).toFixed(2).replace('.', ','),
                'H', 'EUR', '', '', '', '8000', '1200', '',
                (i.invoice_date || '').replace(/-/g, '').slice(4),
                i.invoice_number || '', '', '', i.customer_name || ''
            ])
        ];
        downloadCSV(rows, `DATEV_Buchungsstapel_${selectedMonth}.csv`);
    };

    const exportRevenues = () => {
        const rows = [
            ['Datum', 'Umsatz Gesamt (€)', 'Davon Bar (€)', 'Davon EC (€)', 'USt (€)', 'Notizen'],
            ...filtered.revenues.map(r => [
                r.date, (r.revenue || 0).toFixed(2), (r.revenue_cash || 0).toFixed(2),
                (r.revenue_ec || 0).toFixed(2), (r.vat || 0).toFixed(2), r.notes || ''
            ])
        ];
        downloadCSV(rows, `Tagesumsaetze_${selectedMonth}.csv`);
    };

    const runFullExport = async () => {
        setIsExporting(true);
        setDone(false);
        for (let i = 0; i <= 100; i += 20) {
            setExportProgress(i);
            await new Promise(r => setTimeout(r, 300));
        }
        exportCashbook();
        await new Promise(r => setTimeout(r, 200));
        exportCreditors();
        await new Promise(r => setTimeout(r, 200));
        exportDebitors();
        await new Promise(r => setTimeout(r, 200));
        exportDatev();
        await new Promise(r => setTimeout(r, 200));
        exportRevenues();
        setIsExporting(false);
        setDone(true);
        setTimeout(() => setDone(false), 4000);
    };

    if (!permissions.canExportAccounting) return <PermissionDenied message="Kein Zugriff auf das Exportcenter." />;

    const label = format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: de });

    const exportItems = [
        { label: 'Kassenbuch CSV', icon: BookOpen, color: 'text-amber-400 bg-amber-500/10', action: exportCashbook, count: filtered.cashbook.length },
        { label: 'Kreditoren CSV', icon: TrendingDown, color: 'text-red-400 bg-red-500/10', action: exportCreditors, count: filtered.creditors.length },
        { label: 'Debitoren CSV', icon: TrendingUp, color: 'text-green-400 bg-green-500/10', action: exportDebitors, count: filtered.debitors.length },
        { label: 'DATEV Buchungsstapel', icon: FileText, color: 'text-purple-400 bg-purple-500/10', action: exportDatev, count: filtered.creditors.length + filtered.debitors.length },
        { label: 'Tagesumsätze CSV', icon: Calendar, color: 'text-blue-400 bg-blue-500/10', action: exportRevenues, count: filtered.revenues.length },
    ];

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-6">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-purple-400" />
                        <h1 className="text-lg font-bold text-foreground">Exportcenter</h1>
                    </div>
                    <Input
                        type="month" value={selectedMonth}
                        onChange={e => { setSelectedMonth(e.target.value); setDone(false); }}
                        className="h-8 text-xs w-36"
                    />
                </div>
            </div>

            <div className="px-4 md:px-6 space-y-5 max-w-2xl mx-auto pt-4">
                {/* Monatsübersicht */}
                <Card className="p-4 bg-card border-border">
                    <h2 className="font-semibold text-foreground text-sm mb-3">Daten für {label}</h2>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                            ['Kassenbucheinträge', filtered.cashbook.length],
                            ['Belege', filtered.receipts.length],
                            ['Kreditoren', filtered.creditors.length],
                            ['Debitoren', filtered.debitors.length],
                            ['Tagesumsätze', filtered.revenues.length],
                            ['Gesamtumsatz', `${fmt(filtered.revenues.reduce((s, r) => s + (r.revenue || 0), 0))} €`],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between py-1.5 border-b border-border last:border-0">
                                <span className="text-muted-foreground">{k}</span>
                                <span className="font-semibold text-foreground">{v}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Komplett-Export */}
                <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Archive className="w-5 h-5 text-purple-400" />
                                <h3 className="font-semibold text-foreground">Komplett-Export</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">Alle Dateien für {label} auf einmal herunterladen</p>
                        </div>
                        {done && <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-xs gap-1 shrink-0"><CheckCircle2 className="w-3 h-3" />Fertig</Badge>}
                    </div>
                    {isExporting && (
                        <div className="mt-3 space-y-1.5">
                            <Progress value={exportProgress} className="h-1.5" />
                            <p className="text-xs text-muted-foreground">Exportiere... {exportProgress}%</p>
                        </div>
                    )}
                    <Button onClick={runFullExport} disabled={isExporting} className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white gap-2">
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {isExporting ? 'Exportiere...' : 'Alle Dateien herunterladen'}
                    </Button>
                </Card>

                {/* Einzelexporte */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Einzelexporte</h2>
                    <div className="space-y-2">
                        {exportItems.map(item => (
                            <Card key={item.label} className="p-4 bg-card border-border">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', item.color.split(' ')[1])}>
                                            <item.icon className={cn('w-5 h-5', item.color.split(' ')[0])} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                                            <p className="text-xs text-muted-foreground">{item.count} Einträge</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={item.action} disabled={item.count === 0} className="h-8 gap-1.5 text-xs">
                                        <Download className="w-3.5 h-3.5" /> CSV
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}