import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, PlusCircle, QrCode, X } from 'lucide-react';
import BarcodeScanner from '@/components/restock/BarcodeScanner';

/**
 * KanbanScanModal – scan QR/barcode → auto-add to shopping list.
 * Prevents duplicates by incrementing quantity if item already open.
 */
export default function KanbanScanModal({ open, onClose, suppliers = [] }) {
    const queryClient = useQueryClient();
    const [scannerOpen, setScannerOpen] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: 'added'|'updated'|'notfound', name, qty }
    const [sessionLog, setSessionLog] = useState([]);

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name'),
        enabled: open
    });

    const { data: shoppingItems = [] } = useQuery({
        queryKey: ['shopping-list'],
        queryFn: () => base44.entities.ShoppingList.list('-created_date'),
        enabled: open
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ShoppingList.create(data),
        onSuccess: () => queryClient.invalidateQueries(['shopping-list'])
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ShoppingList.update(id, data),
        onSuccess: () => queryClient.invalidateQueries(['shopping-list'])
    });

    const showFeedback = (fb) => {
        setFeedback(fb);
        setSessionLog(prev => [fb, ...prev].slice(0, 10));
        setTimeout(() => setFeedback(null), 3000);
    };

    const handleScan = useCallback(async (barcode) => {
        setScannerOpen(false);

        const article = articles.find(a =>
            a.barcode === barcode ||
            a.name.toLowerCase() === barcode.toLowerCase()
        );

        if (!article) {
            showFeedback({ type: 'notfound', name: barcode, qty: null });
            return;
        }

        // Re-fetch latest shopping list to avoid stale data
        const latest = queryClient.getQueryData(['shopping-list']) || shoppingItems;
        const existing = latest.find(i => i.item_name === article.name && i.status === 'offen');

        if (existing) {
            const newQty = parseFloat(existing.quantity || 1) + 1;
            await updateMutation.mutateAsync({ id: existing.id, data: { ...existing, quantity: newQty } });
            showFeedback({ type: 'updated', name: article.name, qty: newQty });
        } else {
            await createMutation.mutateAsync({
                item_name: article.name,
                category: article.suppliers?.[0] || suppliers[0]?.name || '',
                quantity: 1,
                unit: article.content_unit || '',
                status: 'offen',
                notes: `Kanban: ${article.barcode || barcode}`
            });
            showFeedback({ type: 'added', name: article.name, qty: 1 });
        }
    }, [articles, shoppingItems, queryClient, createMutation, updateMutation, suppliers]);

    const handleClose = () => {
        setScannerOpen(false);
        setFeedback(null);
        setSessionLog([]);
        onClose();
    };

    return (
        <>
            <Dialog open={open && !scannerOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-amber-500" />
                            Kanban-Scan
                        </DialogTitle>
                    </DialogHeader>

                    {/* Feedback banner */}
                    {feedback && (
                        <div className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${
                            feedback.type === 'added'    ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                            feedback.type === 'updated'  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                                                           'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}>
                            {feedback.type === 'added'   && <PlusCircle className="w-5 h-5 shrink-0" />}
                            {feedback.type === 'updated' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                            {feedback.type === 'notfound'&& <AlertCircle className="w-5 h-5 shrink-0" />}
                            <span>
                                {feedback.type === 'added'    && `Hinzugefügt: ${feedback.name}`}
                                {feedback.type === 'updated'  && `Aktualisiert: ${feedback.name} → ${feedback.qty}×`}
                                {feedback.type === 'notfound' && `Nicht gefunden: ${feedback.name}`}
                            </span>
                        </div>
                    )}

                    <Button
                        onClick={() => setScannerOpen(true)}
                        className="w-full h-16 text-base bg-amber-600 hover:bg-amber-700 gap-3"
                    >
                        <QrCode className="w-6 h-6" />
                        Barcode / QR-Code scannen
                    </Button>

                    {/* Session log */}
                    {sessionLog.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Diese Sitzung</p>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {sessionLog.map((log, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md bg-secondary/50">
                                        {log.type === 'added'    && <PlusCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                                        {log.type === 'updated'  && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                        {log.type === 'notfound' && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                        <span className="flex-1 truncate">{log.name}</span>
                                        {log.qty != null && <Badge variant="outline" className="text-xs shrink-0">{log.qty}×</Badge>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button variant="outline" onClick={handleClose} className="w-full">
                        Schließen
                    </Button>
                </DialogContent>
            </Dialog>

            <BarcodeScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleScan}
                mode="kanban"
            />
        </>
    );
}