/**
 * StorageLabelPrint — Brother QL-800 label PDF generator
 *
 * Technical approach:
 * - jsPDF with unit='mm', NO orientation param (avoid jsPDF landscape rotation bug)
 * - Format: [width, height] where width=62mm (the long side for QL-800 continuous tape)
 * - All text rendered as real PDF vector text via doc.text()
 * - QR Code: rendered to offscreen canvas at 600×600px → PNG → embedded ONCE, no compression
 * - No html2canvas, no screenshot, no DOM capture
 * - Result: vector text + high-res QR → sharp at any zoom level
 */

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, QrCode, Share2, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

// ─── Brother QL-800 label dimensions (mm) ────────────────────────────────────
// QL-800 uses 62mm wide continuous tape. Height is the "length" of the label.
// jsPDF: format=[width, height], no orientation → avoids rotation issues.
const LABEL_CONFIGS = {
    standard: { wMM: 62, hMM: 29, label: '62×29mm' },
    tall:     { wMM: 62, hMM: 62, label: '62×62mm' },
};

// ─── Extract structured data from location ───────────────────────────────────
function getLabelData(location) {
    const articles = location.article_names || [];
    const displayName = location.position || location.name || '';
    const pathParts = [location.area, location.furniture, location.container].filter(Boolean);
    const pathStr = pathParts.join(' › ');
    return {
        articles,
        displayName,
        pathStr,
        short_code: location.short_code || '',
    };
}

// ─── Generate QR as high-res PNG via canvas ───────────────────────────────────
// We render at 600×600 native pixels. jsPDF then places it at exact mm size.
// The QR module size at 600px / ~25 modules = 24px/module → very crisp.
async function generateQrPng(locationId) {
    const url = `${window.location.origin}/StorageLocationScan/${locationId}`;
    // Use canvas API for maximum quality — returns a data URL
    const canvas = await QRCode.toCanvas(document.createElement('canvas'), url, {
        width: 600,
        margin: 2,
        errorCorrectionLevel: 'H', // highest error correction for reliable scanning after print
        color: { dark: '#000000', light: '#ffffff' },
    });
    return canvas.toDataURL('image/png'); // lossless PNG
}

// ─── Core PDF builder — pure vector text (sharpest possible) ─────────────────
function buildLabelPDF(location, qrPng, configKey) {
    const cfg = LABEL_CONFIGS[configKey];
    const W = cfg.wMM;
    const H = cfg.hMM;

    const { articles, displayName, pathStr, short_code } = getLabelData(location);

    const doc = new jsPDF({
        unit: 'mm',
        format: [Math.min(W, H), Math.max(W, H)],
        orientation: W >= H ? 'landscape' : 'portrait',
        compress: false,
    });

    const PAD = 2.0;
    const QR_SIZE = 22;
    const QR_X = PAD;
    const QR_Y = (H - QR_SIZE) / 2;
    const DIV_X = PAD + QR_SIZE + 1.5;
    const TEXT_X = DIV_X + 2.0;
    const TEXT_W = W - TEXT_X - PAD;

    // pt → mm
    const ptMm = (pt) => pt * 0.3528;
    const lhMm = (pt) => ptMm(pt) * 1.35;

    // ── Background ────────────────────────────────────────────────────────────
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');

    // ── QR Code ───────────────────────────────────────────────────────────────
    doc.addImage(qrPng, 'PNG', QR_X, QR_Y, QR_SIZE, QR_SIZE, undefined, 'NONE');

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    doc.line(DIV_X, PAD, DIV_X, H - PAD);

    // ── Vector text layout ────────────────────────────────────────────────────
    let y = PAD + ptMm(13); // start at top + first baseline

    const drawLine = (text, pt, fontName, fontStyle, r, g, b) => {
        doc.setFont(fontName, fontStyle);
        doc.setFontSize(pt);
        doc.setTextColor(r, g, b);
        const lines = doc.splitTextToSize(String(text), TEXT_W);
        doc.text(lines, TEXT_X, y);
        return lines.length * lhMm(pt);
    };

    // 1. SHORT CODE — Courier Bold, large
    if (short_code) {
        y += drawLine(short_code, 14, 'courier', 'bold', 0, 0, 0);
        y += 1.5;
    }

    // 2. FACHNAME — Helvetica Bold
    if (displayName) {
        y += drawLine(displayName, 11, 'helvetica', 'bold', 0, 0, 0);
        y += 1.0;
    }

    // 3. LAGERPFAD — Helvetica Bold, dark grey
    if (pathStr) {
        const s = pathStr.length > 55 ? pathStr.slice(0, 52) + '…' : pathStr;
        y += drawLine(s, 8.5, 'helvetica', 'bold', 30, 30, 30);
        y += 1.5;
    }

    // ── Separator ─────────────────────────────────────────────────────────────
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.15);
    doc.line(TEXT_X, y, TEXT_X + TEXT_W, y);
    y += 1.8;

    // 4. INHALT label + articles
    if (articles.length > 0) {
        y += drawLine('INHALT', 7, 'helvetica', 'bold', 80, 80, 80);
        y += 0.5;
        const MAX = 4;
        const shown = articles.slice(0, MAX);
        const extra = articles.length - MAX;
        const artText = shown.join(' · ') + (extra > 0 ? ` +${extra}` : '');
        drawLine(artText, 9, 'helvetica', 'bold', 0, 0, 0);
    } else {
        drawLine('Keine Artikel zugeordnet', 7, 'helvetica', 'normal', 170, 170, 170);
    }

    return doc;
}

// ─── Label Preview (HTML, same fixed proportions as PDF) ─────────────────────
function LabelPreview({ location, qrDataUrl, configKey }) {
    const cfg = LABEL_CONFIGS[configKey];
    const SCALE = 4; // 1mm = 4px in preview
    const W = cfg.wMM * SCALE;   // 248px
    const H = cfg.hMM * SCALE;
    const QR_PX = 22 * SCALE;    // FIXED 22mm = 88px — mirrors PDF exactly
    const { articles, displayName, pathStr, short_code } = getLabelData(location);

    return (
        <div style={{
            width: W, height: H, background: '#fff',
            border: '2px solid #222', display: 'flex',
            fontFamily: 'Arial, Helvetica, sans-serif',
            flexShrink: 0, overflow: 'hidden', borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
            <div style={{ padding: 8, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {qrDataUrl
                    ? <img src={qrDataUrl} alt="QR" style={{ width: QR_PX, height: QR_PX, display: 'block', imageRendering: 'pixelated' }} />
                    : <div style={{ width: QR_PX, height: QR_PX, background: '#f0f0f0' }} />
                }
            </div>
            <div style={{ width: 1.5, background: '#000', margin: '8px 0', flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden', minWidth: 0, justifyContent: 'center' }}>
                {short_code && (
                    <div style={{ fontSize: 13, fontWeight: 900, fontFamily: '"Courier New", Courier, monospace', color: '#000', lineHeight: 1.1, letterSpacing: '0.02em' }}>
                        {short_code}
                    </div>
                )}
                {displayName && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#0a0a0a', lineHeight: 1.2, wordBreak: 'break-word' }}>
                        {displayName}
                    </div>
                )}
                {pathStr && (
                    <div style={{ fontSize: 7, color: '#666', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pathStr}
                    </div>
                )}
                <div style={{ borderTop: '1px solid #ddd', paddingTop: 2, marginTop: 1 }}>
                    {articles.length > 0 ? (
                        <>
                            <div style={{ fontSize: 5.5, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', marginBottom: 1 }}>Inhalt</div>
                            <div style={{ fontSize: 7, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>
                                {articles.slice(0, 5).join(' · ')}{articles.length > 5 ? ` +${articles.length - 5}` : ''}
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 7, color: '#ccc' }}>Keine Artikel</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StorageLabelPrint({ open, onClose, location }) {
    const [qrPng, setQrPng] = useState('');
    const [configKey, setConfigKey] = useState('standard');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!location?.id || !open) return;
        setQrPng('');
        generateQrPng(location.id).then(setQrPng).catch(console.error);
    }, [location?.id, open]);

    const handleDownloadPDF = async () => {
        if (!qrPng || loading) return;
        setLoading(true);
        try {
            const doc = buildLabelPDF(location, qrPng, configKey);
            const code = location.short_code || location.id?.slice(0, 8) || 'etikett';
            doc.save(`etikett_${code}.pdf`);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        if (!qrPng || loading) return;
        setLoading(true);
        try {
            const doc = buildLabelPDF(location, qrPng, configKey);
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (win) {
                // Give browser time to load the PDF before printing
                setTimeout(() => {
                    try { win.print(); } catch { /* some browsers block this */ }
                }, 1000);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!qrPng || !navigator.share || loading) return;
        setLoading(true);
        try {
            const doc = buildLabelPDF(location, qrPng, configKey);
            const blob = doc.output('blob');
            const code = location.short_code || 'etikett';
            const file = new File([blob], `etikett_${code}.pdf`, { type: 'application/pdf' });
            await navigator.share({ files: [file], title: `Etikett ${code}` });
        } catch {
            // cancelled or unsupported
        } finally {
            setLoading(false);
        }
    };

    if (!location) return null;

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
                    <div className="bg-gray-100 rounded-xl p-4 flex justify-center items-center min-h-[80px] overflow-auto">
                        {qrPng ? (
                            <LabelPreview location={location} qrDataUrl={qrPng} configKey={configKey} />
                        ) : (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> QR wird generiert…
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        Brother QL-800 · Vektor-PDF · QR-Code 600px verlustfrei
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={handleDownloadPDF}
                            disabled={!qrPng || loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Als PDF herunterladen
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
                                Abbrechen
                            </Button>
                            {navigator.share && (
                                <Button variant="outline" onClick={handleShare} disabled={!qrPng || loading} className="px-3">
                                    <Share2 className="w-4 h-4" />
                                </Button>
                            )}
                            <Button
                                onClick={handlePrint}
                                disabled={!qrPng || loading}
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

// ─── Batch export ─────────────────────────────────────────────────────────────
export async function exportBatchPDF(locations, configKey = 'standard') {
    if (!locations?.length) return;
    const cfg = LABEL_CONFIGS[configKey];

    // Build all docs first, then merge pages
    const docs = await Promise.all(locations.map(async (loc) => {
        const qrPng = await generateQrPng(loc.id);
        return buildLabelPDF(loc, qrPng, configKey);
    }));

    // Use first doc and append pages from rest
    const master = docs[0];
    for (let i = 1; i < docs.length; i++) {
        master.addPage([cfg.wMM, cfg.hMM]);
        // Copy page stream from subsequent doc
        const srcPages = docs[i].internal.pages;
        const srcPage = srcPages[srcPages.length - 1];
        master.internal.pages[master.internal.pages.length - 1] = srcPage;
    }

    master.save('etiketten_batch.pdf');
}