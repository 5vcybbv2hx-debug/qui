import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, QrCode, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

function LabelCard({ location, qrDataUrl, size = 'normal' }) {
    const displayName = location.name || [location.area, location.furniture, location.position].filter(Boolean).join(' › ');
    const isSmall = size === 'small';
    const articles = location.article_names || [];

    return (
        <div
            className="label-card bg-white border-2 border-gray-800 rounded-lg flex items-center gap-3"
            style={{ padding: isSmall ? '8px 10px' : '12px 14px', maxWidth: isSmall ? '240px' : '320px' }}
        >
            {qrDataUrl && (
                <img
                    src={qrDataUrl}
                    alt="QR"
                    style={{ width: isSmall ? 60 : 84, height: isSmall ? 60 : 84, flexShrink: 0 }}
                />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: isSmall ? 9 : 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                    {location.location_type || 'Lagerort'} · {location.area}
                </div>
                <div style={{ fontSize: isSmall ? 14 : 17, fontWeight: 800, color: '#000', lineHeight: 1.2, wordBreak: 'break-word' }}>
                    {displayName}
                </div>
                {location.short_code && (
                    <div style={{ fontSize: isSmall ? 11 : 13, color: '#222', fontFamily: 'monospace', fontWeight: 700, marginTop: 3, letterSpacing: '0.05em' }}>
                        {location.short_code}
                    </div>
                )}
                {articles.length > 0 && (
                    <div style={{ marginTop: 4, borderTop: '1px solid #ccc', paddingTop: 3 }}>
                        <div style={{ fontSize: isSmall ? 8 : 9, color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: 1 }}>Artikel</div>
                        <div style={{ fontSize: isSmall ? 9 : 11, color: '#333', fontWeight: 600, lineHeight: 1.3 }}>
                            {articles.slice(0, 4).join(' · ')}
                            {articles.length > 4 && ` +${articles.length - 4}`}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function StorageLabelPrint({ open, onClose, location }) {
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [printSize, setPrintSize] = useState('normal');

    useEffect(() => {
        if (!location?.id || !open) return;
        const url = `${window.location.origin}/StorageLocationScan/${location.id}`;
        QRCode.toDataURL(url, { width: 200, margin: 1, color: { dark: '#000', light: '#fff' } })
            .then(setQrDataUrl)
            .catch(console.error);
    }, [location?.id, open]);

    const handlePrint = () => {
        const printContent = document.getElementById('storage-label-print-area');
        if (!printContent) return;
        const printWindow = window.open('', '_blank', 'width=600,height=400');
        printWindow.document.write(`
            <!DOCTYPE html><html><head><title>Lagerort-Etikett</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; background: white; padding: 20px; }
                .label-card { display: inline-flex; align-items: center; gap: 12px; border: 2px solid #000; border-radius: 8px;
                    padding: ${printSize === 'small' ? '8px 10px' : '12px 14px'};
                    max-width: ${printSize === 'small' ? '220px' : '300px'}; }
                @media print { body { padding: 10mm; } }
            </style></head>
            <body>${printContent.innerHTML}</body></html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    };

    const handleDownloadPDF = () => {
        if (!qrDataUrl) return;
        const displayName = location.name || [location.area, location.furniture, location.position].filter(Boolean).join(' › ');
        const sizes = { small: [62, 29], normal: [90, 40], large: [100, 60] };
        const [w, h] = sizes[printSize] || sizes.normal;

        const doc = new jsPDF({ unit: 'mm', format: [w, h], orientation: 'landscape' });
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, w, h, 'F');
        doc.setDrawColor(0);
        doc.setLineWidth(0.4);
        doc.roundedRect(1, 1, w - 2, h - 2, 2, 2);

        const qrSize = h - 8;
        const qrX = 4;
        const qrY = 4;
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        const textX = qrX + qrSize + 4;
        const textW = w - textX - 3;

        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text([(location.location_type || 'Lagerort'), location.area].filter(Boolean).join(' · ').toUpperCase(), textX, qrY + 4, { maxWidth: textW });

        doc.setFontSize(printSize === 'small' ? 10 : 13);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        const nameLines = doc.splitTextToSize(displayName, textW);
        doc.text(nameLines, textX, qrY + 10);

        const afterName = qrY + 10 + nameLines.length * (printSize === 'small' ? 4 : 5);

        if (location.short_code) {
            doc.setFontSize(printSize === 'small' ? 8 : 10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(30, 30, 30);
            doc.text(location.short_code, textX, afterName + 2);
        }

        const articles = location.article_names || [];
        if (articles.length > 0) {
            const artY = afterName + (location.short_code ? 7 : 3);
            if (artY < h - 3) {
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.2);
                doc.line(textX, artY - 1, textX + textW, artY - 1);
                doc.setFontSize(6);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(100, 100, 100);
                doc.text('ARTIKEL', textX, artY + 2);
                doc.setFontSize(printSize === 'small' ? 7 : 8);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(50, 50, 50);
                const artText = articles.slice(0, 4).join(' · ') + (articles.length > 4 ? ` +${articles.length - 4}` : '');
                doc.text(doc.splitTextToSize(artText, textW), textX, artY + 6);
            }
        }

        doc.save(`lagerort-${displayName.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.pdf`);
    };

    if (!location) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-amber-500" />
                        Etikett drucken
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        {['small', 'normal', 'large'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setPrintSize(s)}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${printSize === s ? 'bg-amber-500 text-slate-900 border-amber-500' : 'border-border text-muted-foreground hover:bg-accent'}`}
                            >
                                {s === 'small' ? 'Klein' : s === 'normal' ? 'Normal' : 'Groß'}
                            </button>
                        ))}
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6 flex justify-center">
                        <div id="storage-label-print-area">
                            <LabelCard location={location} qrDataUrl={qrDataUrl} size={printSize} />
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        QR-Code führt direkt zur Lagerort-Ansicht
                    </p>

                    <div className="flex flex-col gap-2">
                        <Button onClick={handleDownloadPDF} disabled={!qrDataUrl} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Download className="w-4 h-4" />
                            Als PDF herunterladen
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose} className="flex-1">Abbrechen</Button>
                            <Button onClick={handlePrint} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white gap-2">
                                <Printer className="w-4 h-4" />
                                Drucken
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}