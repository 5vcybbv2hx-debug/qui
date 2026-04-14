/**
 * StorageLabelPrint — Brother QL-800 optimized label generator
 *
 * PDF strategy: pure jsPDF vector text + QR as high-res PNG image.
 * No canvas screenshot. Text is vector → infinitely sharp at any zoom.
 * Label size: 62mm wide, dynamic height (29mm or 62mm).
 */

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, QrCode, Share2, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

// ─── Label format configs (mm) ────────────────────────────────────────────────
const LABEL_CONFIGS = {
    standard: { wMM: 62, hMM: 29, label: '62×29mm' },
    tall:     { wMM: 62, hMM: 62, label: '62×62mm' },
};

// ─── Build label data from location object ────────────────────────────────────
function getLabelData(location) {
    const articles = location.article_names || [];
    const displayName = location.position || location.name || '';
    const pathParts = [location.area, location.furniture, location.container, displayName].filter(Boolean);
    // deduplicate: remove last part if it equals displayName to avoid duplication
    const pathWithoutName = pathParts.slice(0, -1);
    const pathStr = pathWithoutName.join(' › ');
    return { articles, displayName, pathStr, short_code: location.short_code || '' };
}

// ─── Render QR to high-res PNG dataURL ────────────────────────────────────────
async function getQrDataUrl(locationId) {
    const url = `${window.location.origin}/StorageLocationScan/${locationId}`;
    return QRCode.toDataURL(url, {
        width: 800,        // large source for clarity
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' },
    });
}

// ─── Core PDF builder (pure jsPDF vector text) ────────────────────────────────
function buildLabelPDF(location, qrDataUrl, configKey) {
    const cfg = LABEL_CONFIGS[configKey];
    const { wMM, hMM } = cfg;
    const { articles, displayName, pathStr, short_code } = getLabelData(location);

    const doc = new jsPDF({
        unit: 'mm',
        format: [wMM, hMM],
        orientation: 'landscape',
        compress: false,
    });

    // ── Layout constants (all in mm) ──────────────────────────────────────────
    const PAD = 2.5;            // outer padding
    const QR_MM = hMM - PAD * 2; // QR fills full height minus padding
    const DIV_X = PAD + QR_MM + 1.5; // divider x position
    const TEXT_X = DIV_X + 2;  // text column start
    const TEXT_W = wMM - TEXT_X - PAD; // text column width

    // ── White background ──────────────────────────────────────────────────────
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, wMM, hMM, 'F');

    // ── QR Code ───────────────────────────────────────────────────────────────
    doc.addImage(qrDataUrl, 'PNG', PAD, PAD, QR_MM, QR_MM, undefined, 'NONE');

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(DIV_X, PAD, DIV_X, hMM - PAD);

    // ── Text rendering helpers ────────────────────────────────────────────────
    // jsPDF splitTextToSize wraps text to fit within maxWidth
    let curY = PAD;

    const textLine = (text, y) => {
        doc.text(text, TEXT_X, y, { maxWidth: TEXT_W });
    };

    const wrappedHeight = (text, size) => {
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(text, TEXT_W);
        // line height ≈ font size * 1.2 in pt, convert to mm: pt * 0.3528
        return lines.length * size * 0.3528 * 1.2;
    };

    const drawWrapped = (text, y) => {
        const lines = doc.splitTextToSize(text, TEXT_W);
        doc.text(lines, TEXT_X, y);
        const lineH = doc.getFontSize() * 0.3528 * 1.2;
        return y + lines.length * lineH;
    };

    // ── 1. SHORT CODE — 16pt, bold, monospace ─────────────────────────────────
    if (short_code) {
        doc.setFont('courier', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        const codeH = 16 * 0.3528;
        curY += codeH;
        textLine(short_code, curY);
        curY += 1.5;
    }

    // ── 2. FACHNAME — 12pt, bold ──────────────────────────────────────────────
    if (displayName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        curY += 12 * 0.3528 * 0.3; // small top margin
        curY = drawWrapped(displayName, curY);
        curY += 0.8;
    }

    // ── 3. LAGERPFAD — 7pt, grey ──────────────────────────────────────────────
    if (pathStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(90, 90, 90);
        const shortened = pathStr.length > 55 ? pathStr.slice(0, 52) + '…' : pathStr;
        curY = drawWrapped(shortened, curY);
        curY += 1;
    }

    // ── 4. ARTIKEL ────────────────────────────────────────────────────────────
    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(TEXT_X, curY, TEXT_X + TEXT_W, curY);
    curY += 1.2;

    if (articles.length > 0) {
        // "INHALT" label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        textLine('INHALT', curY);
        curY += 6 * 0.3528 * 1.3;

        const MAX_ART = 5;
        const shown = articles.slice(0, MAX_ART);
        const extra = articles.length - MAX_ART;
        const artText = shown.join(' · ') + (extra > 0 ? `  +${extra} weitere` : '');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(20, 20, 20);
        drawWrapped(artText, curY);
    } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(180, 180, 180);
        textLine('Keine Artikel zugeordnet', curY);
    }

    return doc;
}

// ─── Label Preview (DOM-based, proportional to real label) ───────────────────
function LabelPreview({ location, qrDataUrl, configKey }) {
    const cfg = LABEL_CONFIGS[configKey];
    // Scale to fit nicely in dialog: 62mm → 248px
    const SCALE = 4; // 1mm = 4px in preview
    const W = cfg.wMM * SCALE;
    const H = cfg.hMM * SCALE;

    const { articles, displayName, pathStr, short_code } = getLabelData(location);
    const QR_PX = (cfg.hMM - 5) * SCALE;

    return (
        <div style={{
            width: W, height: H, background: '#fff', border: '1.5px solid #333',
            display: 'flex', fontFamily: 'Arial, Helvetica, sans-serif',
            flexShrink: 0, overflow: 'hidden', borderRadius: 3,
        }}>
            {/* QR */}
            <div style={{ padding: 10, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {qrDataUrl
                    ? <img src={qrDataUrl} alt="QR" style={{ width: QR_PX, height: QR_PX }} />
                    : <div style={{ width: QR_PX, height: QR_PX, background: '#eee', borderRadius: 2 }} />
                }
            </div>
            {/* Divider */}
            <div style={{ width: 1.5, background: '#000', margin: '10px 0', flexShrink: 0 }} />
            {/* Text */}
            <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden', minWidth: 0, justifyContent: 'center' }}>
                {short_code && (
                    <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'Courier New, monospace', color: '#000', lineHeight: 1, letterSpacing: '0.03em' }}>
                        {short_code}
                    </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 800, color: '#000', lineHeight: 1.2, wordBreak: 'break-word' }}>
                    {displayName}
                </div>
                {pathStr && (
                    <div style={{ fontSize: 7, color: '#666', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pathStr}
                    </div>
                )}
                <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 3, marginTop: 1 }}>
                    {articles.length > 0 ? (
                        <>
                            <div style={{ fontSize: 6, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', marginBottom: 2 }}>Inhalt</div>
                            <div style={{ fontSize: 7.5, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>
                                {articles.slice(0, 5).join(' · ')}
                                {articles.length > 5 && ` +${articles.length - 5} weitere`}
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 7, color: '#ccc' }}>Keine Artikel zugeordnet</div>
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
        setQrDataUrl('');
        getQrDataUrl(location.id).then(setQrDataUrl).catch(console.error);
    }, [location?.id, open]);

    const handleDownloadPDF = async () => {
        if (!qrDataUrl || loading) return;
        setLoading(true);
        try {
            const doc = buildLabelPDF(location, qrDataUrl, configKey);
            const code = location.short_code || location.id?.slice(0, 8) || 'label';
            doc.save(`etikett_${code}.pdf`);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        if (!qrDataUrl || loading) return;
        setLoading(true);
        try {
            const cfg = LABEL_CONFIGS[configKey];
            const doc = buildLabelPDF(location, qrDataUrl, configKey);
            // Open PDF blob in new window and trigger browser print
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (win) {
                win.onload = () => { win.print(); };
            }
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!qrDataUrl || !navigator.share || loading) return;
        setLoading(true);
        try {
            const doc = buildLabelPDF(location, qrDataUrl, configKey);
            const blob = doc.output('blob');
            const code = location.short_code || 'etikett';
            const file = new File([blob], `etikett_${code}.pdf`, { type: 'application/pdf' });
            await navigator.share({ files: [file], title: `Etikett ${code}` });
        } catch {
            // share cancelled or not supported
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
                    <div className="bg-gray-100 rounded-xl p-4 flex justify-center items-center overflow-auto">
                        {qrDataUrl ? (
                            <LabelPreview location={location} qrDataUrl={qrDataUrl} configKey={configKey} />
                        ) : (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> QR wird generiert…
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        Brother QL-800 · Vektor-PDF · QR → direkt zum Lagerort
                    </p>

                    {/* Actions */}
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
                            <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
                                Abbrechen
                            </Button>
                            {navigator.share && (
                                <Button variant="outline" onClick={handleShare} disabled={!qrDataUrl || loading} className="gap-1 px-3">
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

// ─── Batch PDF export (for future multi-label use) ────────────────────────────
export async function exportBatchPDF(locations, configKey = 'standard') {
    const cfg = LABEL_CONFIGS[configKey];
    let doc = null;

    for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        const qrDataUrl = await getQrDataUrl(loc.id);
        if (i === 0) {
            doc = buildLabelPDF(loc, qrDataUrl, configKey);
        } else {
            doc.addPage([cfg.wMM, cfg.hMM], 'landscape');
            // re-render onto new page — rebuild content
            const tempDoc = buildLabelPDF(loc, qrDataUrl, configKey);
            // copy page content by rebuilding inline
            // (jsPDF doesn't support page copying; simplest: save each separately)
            // For now, add as separate page using internal page state trick
            const pageData = tempDoc.internal.pages[1];
            if (pageData) doc.internal.pages.push(pageData);
        }
    }

    if (doc) doc.save('etiketten_batch.pdf');
}