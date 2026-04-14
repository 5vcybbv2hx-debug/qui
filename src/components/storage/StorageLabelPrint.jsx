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

// ─── Canvas rendering at high DPI ─────────────────────────────────────────────
// We render at 300 DPI equivalent for crisp print output.
const MM_TO_PX_300DPI = 300 / 25.4; // ≈ 11.81 px per mm

async function renderLabelToCanvas(location, qrDataUrl, configKey = 'standard') {
    const cfg = LABEL_CONFIGS[configKey];
    const W = Math.round(cfg.wMM * MM_TO_PX_300DPI);
    const H = Math.round(cfg.hMM * MM_TO_PX_300DPI);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const pad = Math.round(4 * MM_TO_PX_300DPI);  // 4mm padding
    const gap = Math.round(2.5 * MM_TO_PX_300DPI);

    // ── Background: white ────────────────────────────────────────────────────
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // ── QR Code (left column) ────────────────────────────────────────────────
    const qrSize = H - pad * 2;
    const qrImg = new Image();
    await new Promise(res => { qrImg.onload = res; qrImg.src = qrDataUrl; });
    ctx.drawImage(qrImg, pad, pad, qrSize, qrSize);

    // ── Divider line ─────────────────────────────────────────────────────────
    const divX = pad + qrSize + Math.round(2 * MM_TO_PX_300DPI);
    ctx.fillStyle = '#000000';
    ctx.fillRect(divX, pad, 2, H - pad * 2);

    // ── Text column ──────────────────────────────────────────────────────────
    const textX = divX + Math.round(3 * MM_TO_PX_300DPI);
    const textW = W - textX - pad;
    let curY = pad;

    const articles = location.article_names || [];
    const displayName = location.position || location.name || '';
    const path = [location.area, location.furniture, location.container, displayName]
        .filter(Boolean)
        .join(' › ');

    // Helper: fill wrapped text, returns ending Y
    function fillWrapped(text, fontSize, weight, color, x, y, maxW) {
        ctx.font = `${weight} ${fontSize}px Arial, Helvetica, sans-serif`;
        ctx.fillStyle = color;
        const lineH = fontSize * 1.3;
        const words = String(text).split(' ');
        let line = '';
        let ly = y;
        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (ctx.measureText(test).width > maxW && line) {
                ctx.fillText(line, x, ly, maxW);
                ly += lineH;
                line = word;
            } else {
                line = test;
            }
        }
        if (line) { ctx.fillText(line, x, ly, maxW); ly += lineH; }
        return ly;
    }

    // 1. SHORT CODE — biggest, most prominent
    const codeSize = Math.round(cfg.hMM >= 60 ? 13 * MM_TO_PX_300DPI / 10 : 10 * MM_TO_PX_300DPI / 10);
    if (location.short_code) {
        ctx.font = `900 ${codeSize}px 'Courier New', Courier, monospace`;
        ctx.fillStyle = '#000000';
        ctx.fillText(location.short_code, textX, curY + codeSize, textW);
        curY += codeSize + gap;
    }

    // 2. FACHNAME — large, bold
    const nameSize = Math.round(cfg.hMM >= 60 ? 10 * MM_TO_PX_300DPI / 10 : 7.5 * MM_TO_PX_300DPI / 10);
    curY = fillWrapped(displayName || path, nameSize, '800', '#000000', textX, curY + nameSize, textW);
    curY += gap * 0.5;

    // 3. PATH — small, grey
    if (path && path !== displayName) {
        const pathSize = Math.round(5 * MM_TO_PX_300DPI / 10);
        ctx.font = `500 ${pathSize}px Arial, sans-serif`;
        ctx.fillStyle = '#555555';
        const pathText = path.length > 60 ? path.slice(0, 57) + '…' : path;
        ctx.fillText(pathText, textX, curY + pathSize, textW);
        curY += pathSize + gap;
    }

    // 4. ARTICLES ─────────────────────────────────────────────────────────────
    const artSize = Math.round(5 * MM_TO_PX_300DPI / 10);
    if (articles.length > 0) {
        // separator
        ctx.fillStyle = '#bbbbbb';
        ctx.fillRect(textX, curY, textW, 1);
        curY += gap * 0.8;

        ctx.font = `700 ${artSize * 0.85}px Arial, sans-serif`;
        ctx.fillStyle = '#888888';
        ctx.fillText('INHALT', textX, curY + artSize * 0.85, textW);
        curY += artSize + gap * 0.4;

        const MAX_ART = 5;
        const shown = articles.slice(0, MAX_ART);
        const extra = articles.length - MAX_ART;
        const artText = shown.join('  ·  ') + (extra > 0 ? `  +${extra} weitere` : '');

        ctx.font = `600 ${artSize}px Arial, sans-serif`;
        ctx.fillStyle = '#111111';
        curY = fillWrapped(artText, artSize, '600', '#111111', textX, curY + artSize, textW);
    } else {
        ctx.fillStyle = '#bbbbbb';
        ctx.fillRect(textX, curY, textW, 1);
        curY += gap * 0.8;
        ctx.font = `400 ${artSize}px Arial, sans-serif`;
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('Noch keine Artikel zugeordnet', textX, curY + artSize, textW);
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
            const canvas = await renderLabelToCanvas(location, qrDataUrl, configKey);
            const cfg = LABEL_CONFIGS[configKey];
            const imgData = canvas.toDataURL('image/png', 1.0);
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