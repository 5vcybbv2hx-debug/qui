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

    const handleDownloadPDF = async () => {
        if (!qrDataUrl) return;
        const displayName = location.name || [location.area, location.furniture, location.position].filter(Boolean).join(' › ');
        const articles = location.article_names || [];

        // mm -> px at 300 DPI
        const MM_TO_PX = 300 / 25.4;
        const sizes = { small: [62, 29], normal: [90, 40], large: [100, 60] };
        const [wMM, hMM] = sizes[printSize] || sizes.normal;
        const cW = Math.round(wMM * MM_TO_PX);
        const cH = Math.round(hMM * MM_TO_PX);

        const canvas = document.createElement('canvas');
        canvas.width = cW;
        canvas.height = cH;
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cW, cH);

        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        const r = 12;
        ctx.beginPath();
        ctx.moveTo(r, 0); ctx.lineTo(cW - r, 0);
        ctx.quadraticCurveTo(cW, 0, cW, r);
        ctx.lineTo(cW, cH - r); ctx.quadraticCurveTo(cW, cH, cW - r, cH);
        ctx.lineTo(r, cH); ctx.quadraticCurveTo(0, cH, 0, cH - r);
        ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.stroke();

        // QR Code image
        const pad = Math.round(12 * MM_TO_PX / 10);
        const qrPx = cH - pad * 2;
        const qrImg = new Image();
        await new Promise(res => { qrImg.onload = res; qrImg.src = qrDataUrl; });
        ctx.drawImage(qrImg, pad, pad, qrPx, qrPx);

        // Text area
        const textX = pad + qrPx + pad;
        const textW = cW - textX - pad;
        let curY = pad;

        // Type · Area label
        const labelFontSize = Math.round(18 * MM_TO_PX / 10);
        ctx.font = `bold ${labelFontSize}px Arial`;
        ctx.fillStyle = '#555555';
        const typeLabel = [(location.location_type || 'Lagerort'), location.area].filter(Boolean).join(' · ').toUpperCase();
        ctx.fillText(typeLabel, textX, curY + labelFontSize, textW);
        curY += labelFontSize + Math.round(4 * MM_TO_PX / 10);

        // Display name (big, bold)
        const nameFontSize = Math.round((printSize === 'small' ? 26 : 32) * MM_TO_PX / 10);
        ctx.font = `900 ${nameFontSize}px Arial`;
        ctx.fillStyle = '#000000';
        // Word wrap
        const words = displayName.split(/\s+/);
        let line = '';
        const lineH = nameFontSize * 1.2;
        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (ctx.measureText(test).width > textW && line) {
                ctx.fillText(line, textX, curY + nameFontSize, textW);
                curY += lineH;
                line = word;
            } else { line = test; }
        }
        if (line) { ctx.fillText(line, textX, curY + nameFontSize, textW); curY += lineH; }
        curY += Math.round(3 * MM_TO_PX / 10);

        // Short code
        if (location.short_code) {
            const codeFontSize = Math.round((printSize === 'small' ? 22 : 26) * MM_TO_PX / 10);
            ctx.font = `bold ${codeFontSize}px 'Courier New', monospace`;
            ctx.fillStyle = '#111111';
            ctx.fillText(location.short_code, textX, curY + codeFontSize, textW);
            curY += codeFontSize + Math.round(4 * MM_TO_PX / 10);
        }

        // Articles
        if (articles.length > 0 && curY + 20 < cH) {
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(textX, curY); ctx.lineTo(textX + textW, curY);
            ctx.stroke();
            curY += Math.round(4 * MM_TO_PX / 10);

            const artLabelSize = Math.round(15 * MM_TO_PX / 10);
            ctx.font = `bold ${artLabelSize}px Arial`;
            ctx.fillStyle = '#888888';
            ctx.fillText('ARTIKEL', textX, curY + artLabelSize, textW);
            curY += artLabelSize + Math.round(2 * MM_TO_PX / 10);

            const artFontSize = Math.round((printSize === 'small' ? 18 : 20) * MM_TO_PX / 10);
            ctx.font = `600 ${artFontSize}px Arial`;
            ctx.fillStyle = '#222222';
            const artText = articles.slice(0, 4).join(' · ') + (articles.length > 4 ? ` +${articles.length - 4}` : '');
            // Simple wrap
            const aWords = artText.split(/\s+/);
            let aLine = '';
            for (const w of aWords) {
                const t = aLine ? aLine + ' ' + w : w;
                if (ctx.measureText(t).width > textW && aLine) {
                    if (curY + artFontSize < cH - pad) { ctx.fillText(aLine, textX, curY + artFontSize, textW); curY += artFontSize * 1.2; }
                    aLine = w;
                } else { aLine = t; }
            }
            if (aLine && curY + artFontSize < cH - pad) ctx.fillText(aLine, textX, curY + artFontSize, textW);
        }

        // Export as PDF with canvas image
        const imgData = canvas.toDataURL('image/png', 1.0);
        const doc = new jsPDF({ unit: 'mm', format: [wMM, hMM], orientation: 'landscape' });
        doc.addImage(imgData, 'PNG', 0, 0, wMM, hMM, undefined, 'FAST');
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