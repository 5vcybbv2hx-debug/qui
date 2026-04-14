import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, QrCode, Share2, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

// ─── Brother QL-800 Label Dimensions ──────────────────────────────────────────
// 62mm width, dynamic height. We offer two heights:
const LABEL_CONFIGS = {
    standard: { wMM: 62, hMM: 29, label: '62×29mm (Standard)' },
    tall:     { wMM: 62, hMM: 62, label: '62×62mm (Quadrat)' },
};

// ─── Canvas rendering ─────────────────────────────────────────────────────────
// Strategy: render at a fixed "virtual" resolution where 1 unit = 1/3 mm at 300 DPI.
// This means font sizes in "virtual px" map directly to pt on paper:
//   1 pt = 1/72 inch = 25.4/72 mm ≈ 0.353 mm
//   At our scale (1 unit = 0.1mm), font 10pt = 10 * 0.353/0.1 = 35.3 units
// We choose: 1 canvas px = 0.1 mm  →  canvas is wMM*10 × hMM*10 px
// Then jsPDF renders it at exactly wMM × hMM mm → perfect 1:1

const UNITS_PER_MM = 10; // 1 canvas unit = 0.1 mm → 10 units/mm

// Convert pt to canvas units: 1 pt = 0.3528 mm → × UNITS_PER_MM
const pt = (points) => Math.round(points * 0.3528 * UNITS_PER_MM);
const mm = (millimeters) => Math.round(millimeters * UNITS_PER_MM);

async function renderLabelToCanvas(location, qrDataUrl, configKey = 'standard') {
    const cfg = LABEL_CONFIGS[configKey];
    const W = mm(cfg.wMM);
    const H = mm(cfg.hMM);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const PAD = mm(2.5);  // 2.5mm padding
    const GAP = mm(1);

    const articles = location.article_names || [];
    const displayName = location.position || location.name || '';
    const pathParts = [location.area, location.furniture, location.container, displayName].filter(Boolean);
    const path = pathParts.join(' › ');

    // ── QR Code (left, square, min 20mm) ─────────────────────────────────────
    const qrMM = Math.max(20, cfg.hMM - 5); // at least 20mm, fill height
    const qrSize = mm(Math.min(qrMM, cfg.hMM - 5));
    const qrX = PAD;
    const qrY = Math.round((H - qrSize) / 2); // vertically centered
    const qrImg = new Image();
    await new Promise(res => { qrImg.onload = res; qrImg.src = qrDataUrl; });
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // ── Divider ───────────────────────────────────────────────────────────────
    const divX = qrX + qrSize + mm(2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(divX, PAD, mm(0.3), H - PAD * 2);

    // ── Text column ───────────────────────────────────────────────────────────
    const textX = divX + mm(2);
    const textW = W - textX - PAD;
    let curY = PAD;

    // Helper: draw word-wrapped text, returns new curY
    function fillWrapped(text, fontStr, color, startY) {
        ctx.font = fontStr;
        ctx.fillStyle = color;
        const metrics = ctx.measureText('M');
        const lineH = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) * 1.4;
        const words = String(text).split(' ');
        let line = '';
        let ly = startY;
        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (ctx.measureText(test).width > textW && line) {
                ctx.fillText(line, textX, ly, textW);
                ly += lineH;
                line = word;
            } else {
                line = test;
            }
        }
        if (line) { ctx.fillText(line, textX, ly, textW); ly += lineH; }
        return ly;
    }

    // 1. SHORT CODE — 16pt, monospace, heaviest weight
    const codeFont = `900 ${pt(16)}px 'Courier New', Courier, monospace`;
    ctx.font = codeFont;
    const codeAsc = pt(16);
    if (location.short_code) {
        curY += codeAsc;
        ctx.fillStyle = '#000000';
        ctx.fillText(location.short_code, textX, curY, textW);
        curY += GAP * 2;
    }

    // 2. FACHNAME — 12pt bold
    const nameFont = `800 ${pt(12)}px Arial, Helvetica, sans-serif`;
    curY = fillWrapped(displayName || path, nameFont, '#000000', curY + pt(12));
    curY += GAP;

    // 3. PATH — 7pt, grey (only if different from displayName)
    if (path && path !== displayName && pathParts.length > 1) {
        const pathFont = `500 ${pt(7)}px Arial, sans-serif`;
        const pathText = path.length > 55 ? path.slice(0, 52) + '…' : path;
        ctx.font = pathFont;
        ctx.fillStyle = '#555555';
        curY += pt(7);
        ctx.fillText(pathText, textX, curY, textW);
        curY += GAP * 1.5;
    }

    // 4. ARTICLES — 8pt
    const artFont = `600 ${pt(8)}px Arial, sans-serif`;
    const artLabelFont = `700 ${pt(6)}px Arial, sans-serif`;
    if (articles.length > 0) {
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(textX, curY, textW, mm(0.3));
        curY += mm(1.5);

        ctx.font = artLabelFont;
        ctx.fillStyle = '#888888';
        curY += pt(6);
        ctx.fillText('INHALT', textX, curY, textW);
        curY += GAP;

        const MAX_ART = 5;
        const shown = articles.slice(0, MAX_ART);
        const extra = articles.length - MAX_ART;
        const artText = shown.join(' · ') + (extra > 0 ? `  +${extra} weitere` : '');
        curY = fillWrapped(artText, artFont, '#111111', curY + pt(8));
    } else {
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(textX, curY, textW, mm(0.3));
        curY += mm(1.5) + pt(7);
        ctx.font = `400 ${pt(7)}px Arial, sans-serif`;
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('Keine Artikel zugeordnet', textX, curY, textW);
    }

    return canvas;
}

// ─── Label Preview (DOM-based, matches PDF proportionally) ────────────────────
function LabelPreview({ location, qrDataUrl, configKey }) {
    const cfg = LABEL_CONFIGS[configKey];
    const PREVIEW_W = 248; // px in UI
    const scale = PREVIEW_W / cfg.wMM;
    const previewH = Math.round(cfg.hMM * scale);

    const articles = location.article_names || [];
    const displayName = location.position || location.name || '';
    const path = [location.area, location.furniture, location.container, displayName]
        .filter(Boolean).join(' › ');

    const qrSide = previewH - 16;

    return (
        <div
            style={{
                width: PREVIEW_W,
                height: previewH,
                background: '#fff',
                border: '2px solid #000',
                display: 'flex',
                alignItems: 'stretch',
                fontFamily: 'Arial, sans-serif',
                overflow: 'hidden',
                borderRadius: 4,
            }}
        >
            {/* QR */}
            <div style={{ padding: 8, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {qrDataUrl
                    ? <img src={qrDataUrl} alt="QR" style={{ width: qrSide, height: qrSide }} />
                    : <div style={{ width: qrSide, height: qrSide, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>QR</div>
                }
            </div>
            {/* Divider */}
            <div style={{ width: 2, background: '#000', margin: '8px 0', flexShrink: 0 }} />
            {/* Text */}
            <div style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, overflow: 'hidden', minWidth: 0 }}>
                {/* Short code */}
                {location.short_code && (
                    <div style={{ fontSize: cfg.hMM >= 60 ? 15 : 13, fontWeight: 900, fontFamily: 'Courier New, monospace', color: '#000', lineHeight: 1, letterSpacing: '0.02em' }}>
                        {location.short_code}
                    </div>
                )}
                {/* Name */}
                <div style={{ fontSize: cfg.hMM >= 60 ? 11 : 9, fontWeight: 800, color: '#000', lineHeight: 1.2, wordBreak: 'break-word' }}>
                    {displayName || path}
                </div>
                {/* Path */}
                {path && path !== displayName && (
                    <div style={{ fontSize: 7, color: '#666', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {path}
                    </div>
                )}
                {/* Articles */}
                <div style={{ borderTop: '1px solid #ddd', marginTop: 2, paddingTop: 2 }}>
                    {articles.length > 0 ? (
                        <>
                            <div style={{ fontSize: 6, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 1 }}>Inhalt</div>
                            <div style={{ fontSize: 7, fontWeight: 600, color: '#222', lineHeight: 1.3 }}>
                                {articles.slice(0, 5).join(' · ')}
                                {articles.length > 5 && ` +${articles.length - 5} weitere`}
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 7, color: '#bbb' }}>Noch keine Artikel zugeordnet</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StorageLabelPrint({ open, onClose, location }) {
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [configKey, setConfigKey] = useState('standard');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!location?.id || !open) return;
        const url = `${window.location.origin}/StorageLocationScan/${location.id}`;
        // High-res QR code for clean printing
        QRCode.toDataURL(url, {
            width: 600,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' },
        }).then(setQrDataUrl).catch(console.error);
    }, [location?.id, open]);

    const handleDownloadPDF = async () => {
        if (!qrDataUrl || loading) return;
        setLoading(true);
        try {
            const cfg = LABEL_CONFIGS[configKey];
            const canvas = await renderLabelToCanvas(location, qrDataUrl, configKey);
            const imgData = canvas.toDataURL('image/png', 1.0);
            // canvas is wMM*10 × hMM*10 px → maps 1:1 to wMM×hMM mm
            const doc = new jsPDF({ unit: 'mm', format: [cfg.wMM, cfg.hMM], orientation: 'landscape' });
            doc.addImage(imgData, 'PNG', 0, 0, cfg.wMM, cfg.hMM, undefined, 'NONE');
            const code = location.short_code || location.id.slice(0, 8);
            doc.save(`etikett_${code}.pdf`);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        if (!qrDataUrl || loading) return;
        setLoading(true);
        try {
            const canvas = await renderLabelToCanvas(location, qrDataUrl, configKey);
            const cfg = LABEL_CONFIGS[configKey];
            const imgData = canvas.toDataURL('image/png', 1.0);
            // 1mm = 3.7795px at 96dpi screen; but we want actual size
            const mmToPt = 2.8346;
            const wPt = cfg.wMM * mmToPt;
            const hPt = cfg.hMM * mmToPt;
            const win = window.open('', '_blank', 'width=400,height=300');
            win.document.write(`<!DOCTYPE html><html><head><title>Etikett</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size: ${cfg.wMM}mm ${cfg.hMM}mm; margin: 0; }
  html, body { width: ${cfg.wMM}mm; height: ${cfg.hMM}mm; overflow: hidden; }
  img { width: ${cfg.wMM}mm; height: ${cfg.hMM}mm; display: block; }
</style></head>
<body><img src="${imgData}" /></body></html>`);
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); win.close(); }, 400);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!qrDataUrl || !navigator.share) return;
        setLoading(true);
        try {
            const canvas = await renderLabelToCanvas(location, qrDataUrl, configKey);
            canvas.toBlob(async blob => {
                const code = location.short_code || 'etikett';
                const file = new File([blob], `etikett_${code}.png`, { type: 'image/png' });
                await navigator.share({ files: [file], title: `Etikett ${code}` });
                setLoading(false);
            }, 'image/png', 1.0);
        } catch {
            setLoading(false);
        }
    };

    if (!location) return null;

    const canShare = !!navigator.share;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <QrCode className="w-5 h-5 text-amber-500" />
                        Etikett drucken
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Format selector */}
                    <div className="flex gap-2">
                        {Object.entries(LABEL_CONFIGS).map(([key, cfg]) => (
                            <button
                                key={key}
                                onClick={() => setConfigKey(key)}
                                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                                    configKey === key
                                        ? 'bg-amber-500 text-slate-900 border-amber-500'
                                        : 'border-border text-muted-foreground hover:bg-accent'
                                }`}
                            >
                                {cfg.label}
                            </button>
                        ))}
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-100 rounded-xl p-4 flex justify-center items-center">
                        <LabelPreview
                            location={location}
                            qrDataUrl={qrDataUrl}
                            configKey={configKey}
                        />
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        Optimiert für Brother QL-800 · QR-Code führt direkt zum Lagerort
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={handleDownloadPDF}
                            disabled={!qrDataUrl || loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Als PDF herunterladen
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                                disabled={loading}
                            >
                                Abbrechen
                            </Button>
                            {canShare && (
                                <Button
                                    variant="outline"
                                    onClick={handleShare}
                                    disabled={!qrDataUrl || loading}
                                    className="gap-2"
                                >
                                    <Share2 className="w-4 h-4" />
                                </Button>
                            )}
                            <Button
                                onClick={handlePrint}
                                disabled={!qrDataUrl || loading}
                                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                Drucken
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Batch export helper (prepared for future multi-label use) ────────────────
export async function exportBatchPDF(locations, configKey = 'standard') {
    const cfg = LABEL_CONFIGS[configKey];
    const doc = new jsPDF({ unit: 'mm', format: [cfg.wMM, cfg.hMM], orientation: 'landscape' });

    for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        const url = `${window.location.origin}/StorageLocationScan/${loc.id}`;
        const qrDataUrl = await QRCode.toDataURL(url, { width: 600, margin: 2, errorCorrectionLevel: 'M' });
        const canvas = await renderLabelToCanvas(loc, qrDataUrl, configKey);
        const imgData = canvas.toDataURL('image/png', 1.0);
        if (i > 0) doc.addPage([cfg.wMM, cfg.hMM], 'landscape');
        doc.addImage(imgData, 'PNG', 0, 0, cfg.wMM, cfg.hMM, undefined, 'NONE');
    }

    doc.save('etiketten_batch.pdf');
}