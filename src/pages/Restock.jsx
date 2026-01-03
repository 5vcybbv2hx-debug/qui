import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Scan, Package, Trash2, User, Camera, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BarcodeScanner from '../components/restock/BarcodeScanner';

export default function Restock() {
    const queryClient = useQueryClient();
    const barcodeInputRef = useRef(null);
    const [barcode, setBarcode] = useState('');
    const [quantityModalOpen, setQuantityModalOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [articleName, setArticleName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [user, setUser] = useState(null);
    const [scanMode, setScanMode] = useState(false);

    useEffect(() => {
        base44.auth.me().then(setUser).catch(() => {});
    }, []);

    const { data: restockItems = [] } = useQuery({
        queryKey: ['restock-items'],
        queryFn: () => base44.entities.RestockItem.list('-created_date', 50)
    });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list()
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            // Check if item with same barcode exists today
            const today = format(new Date(), 'yyyy-MM-dd');
            const existingItem = restockItems.find(
                item => item.barcode === data.barcode && item.date === today
            );

            if (existingItem) {
                // Update existing item with combined quantity
                await base44.entities.RestockItem.update(existingItem.id, {
                    ...existingItem,
                    quantity: existingItem.quantity + data.quantity
                });
            } else {
                // Create new restock entry
                await base44.entities.RestockItem.create(data);
            }
            
            // Update article stock if exists
            const article = articles.find(a => a.barcode === data.barcode);
            if (article) {
                const newStock = (article.current_stock || 0) + data.quantity;
                await base44.entities.Article.update(article.id, {
                    ...article,
                    current_stock: newStock
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['restock-items']);
            queryClient.invalidateQueries(['articles']);
            setQuantityModalOpen(false);
            setScannedBarcode('');
            setArticleName('');
            setQuantity('');
            setBarcode('');
            
            // Im Scanmodus: Scanner wieder öffnen
            if (scanMode) {
                setTimeout(() => setScannerOpen(true), 300);
            } else if (barcodeInputRef.current) {
                barcodeInputRef.current.focus();
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.RestockItem.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['restock-items']);
        }
    });

    const handleBarcodeSubmit = (e) => {
        e.preventDefault();
        if (!barcode.trim()) return;

        // Check if article exists in database
        const article = articles.find(a => a.barcode === barcode);
        if (article) {
            setArticleName(article.name);
        }

        setScannedBarcode(barcode);
        setQuantityModalOpen(true);
    };

    const handleCameraScan = (decodedText) => {
        setScannerOpen(false);
        setBarcode(decodedText);
        
        // Check if article exists in database
        const article = articles.find(a => a.barcode === decodedText);
        if (article) {
            setArticleName(article.name);
        }
        
        setScannedBarcode(decodedText);
        setQuantityModalOpen(true);
    };

    const handleQuantitySubmit = (e) => {
        e.preventDefault();
        if (!quantity || quantity <= 0) return;

        const now = new Date();
        createMutation.mutate({
            barcode: scannedBarcode,
            article_name: articleName || scannedBarcode,
            quantity: parseFloat(quantity),
            restocked_by: user?.full_name || user?.email || 'Unbekannt',
            date: format(now, 'yyyy-MM-dd'),
            time: format(now, 'HH:mm')
        });
    };

    const handleDelete = (id) => {
        if (confirm('Eintrag wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const todayItems = restockItems.filter(item => 
        item.date === format(new Date(), 'yyyy-MM-dd')
    );

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Auffülliste</h1>
                        <p className="text-slate-400 text-sm mt-1">Theke aus dem Lager auffüllen</p>
                    </div>
                    <Button
                        variant={scanMode ? "default" : "outline"}
                        onClick={() => {
                            const newMode = !scanMode;
                            setScanMode(newMode);
                            if (newMode) {
                                setScannerOpen(true);
                            }
                        }}
                        className={scanMode ? "bg-green-600 hover:bg-green-700" : "border-slate-600 hover:bg-slate-700 text-slate-300"}
                    >
                        <Zap className="w-4 h-4 mr-2" />
                        {scanMode ? 'Scanmodus AN' : 'Scanmodus AUS'}
                    </Button>
                </div>

                {/* Scanner */}
                <Card className="p-6 bg-slate-800 border-slate-700 shadow-sm mb-6">
                    <form onSubmit={handleBarcodeSubmit} className="space-y-4">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                                    <Scan className="w-6 h-6 text-slate-300" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">Barcode scannen</h3>
                                    <p className="text-sm text-slate-400">Kamera oder manuelle Eingabe</p>
                                </div>
                            </div>
                            {scanMode && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-green-900/50 rounded-full">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-xs text-green-400 font-medium">Aktiv</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Barcode</Label>
                            <Input
                                ref={barcodeInputRef}
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                placeholder="Artikel scannen oder eingeben..."
                                className="text-lg bg-slate-900 border-slate-600 text-white"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                type="button"
                                variant="outline"
                                onClick={() => setScannerOpen(true)}
                                className="w-full border-slate-600 hover:bg-slate-700"
                            >
                                <Camera className="w-4 h-4 mr-2" />
                                Kamera
                            </Button>
                            <Button 
                                type="submit" 
                                className="w-full bg-amber-600 hover:bg-amber-700"
                                disabled={!barcode.trim()}
                            >
                                <Package className="w-4 h-4 mr-2" />
                                Erfassen
                            </Button>
                        </div>
                    </form>
                </Card>

                {/* Today's Items */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        Heute aufgefüllt ({todayItems.length})
                    </h2>
                    {todayItems.length > 0 ? (
                        <div className="grid gap-3">
                            {todayItems.map(item => (
                                <Card key={item.id} className="p-4 bg-slate-800 border-slate-700 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Package className="w-4 h-4 text-slate-500" />
                                                <h3 className="font-medium text-white">
                                                    {item.article_name}
                                                </h3>
                                            </div>
                                            <div className="text-sm text-slate-400 space-y-1">
                                                <p>Barcode: {item.barcode}</p>
                                                <p>Menge: <span className="font-semibold text-slate-300">{item.quantity}</span></p>
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <User className="w-3 h-3" />
                                                    {item.restocked_by} • {item.time} Uhr
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(item.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-8 bg-slate-800 border-slate-700 shadow-sm">
                            <div className="text-center text-slate-500">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Noch keine Artikel heute aufgefüllt</p>
                            </div>
                        </Card>
                    )}
                </div>

                {/* History */}
                {restockItems.length > todayItems.length && (
                    <div>
                        <h2 className="text-lg font-semibold text-white mb-4">
                            Verlauf
                        </h2>
                        <div className="grid gap-3">
                            {restockItems.filter(item => item.date !== format(new Date(), 'yyyy-MM-dd')).map(item => (
                                <Card key={item.id} className="p-4 bg-slate-800/50 border-slate-700 opacity-75">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-slate-300 mb-1">
                                                {item.article_name}
                                            </h3>
                                            <div className="text-sm text-slate-400 space-y-0.5">
                                                <p>Menge: {item.quantity} • {item.barcode}</p>
                                                <p className="text-xs text-slate-500">
                                                    {format(new Date(item.date), "dd.MM.yyyy", { locale: de })} • {item.time} Uhr • {item.restocked_by}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-500 hover:text-red-500 hover:bg-red-900/20"
                                            onClick={() => handleDelete(item.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quantity Modal */}
                <Dialog open={quantityModalOpen} onOpenChange={setQuantityModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Menge eingeben</DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleQuantitySubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Barcode</Label>
                                <Input
                                    value={scannedBarcode}
                                    disabled
                                    className="bg-slate-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Artikelname (optional)</Label>
                                <Input
                                    value={articleName}
                                    onChange={(e) => setArticleName(e.target.value)}
                                    placeholder="z.B. Bier 0,5L"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Menge *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="z.B. 24"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => {
                                        setQuantityModalOpen(false);
                                        setScannedBarcode('');
                                        setArticleName('');
                                        setQuantity('');
                                        if (barcodeInputRef.current) {
                                            barcodeInputRef.current.focus();
                                        }
                                    }}
                                    className="flex-1"
                                >
                                    Abbrechen
                                </Button>
                                <Button 
                                    type="submit" 
                                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                                >
                                    Speichern
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Barcode Scanner */}
                <BarcodeScanner
                    open={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={handleCameraScan}
                />
            </div>
        </div>
    );
}