import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Scan, Camera, Check, Trash2, CheckCheck, Plus, Pencil } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import BarcodeScanner from '../components/restock/BarcodeScanner';

export default function Restock() {
    const queryClient = useQueryClient();
    const barcodeInputRef = useRef(null);
    const [barcode, setBarcode] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [editQuantity, setEditQuantity] = useState('');

    const { data: restockItems = [] } = useQuery({
        queryKey: ['restock-items'],
        queryFn: () => base44.entities.RestockItem.list('-created_date', 100)
    });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list()
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.RestockItem.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['restock-items']);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.RestockItem.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['restock-items']);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.RestockItem.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['restock-items']);
        }
    });

    const handleScan = async (scannedBarcode) => {
        const article = articles.find(a => a.barcode === scannedBarcode);
        if (!article) {
            alert('Artikel nicht in der Datenbank gefunden');
            return;
        }

        const today = format(new Date(), 'yyyy-MM-dd');
        const existingItem = restockItems.find(
            item => item.barcode === scannedBarcode && item.date === today && !item.is_completed
        );

        if (existingItem) {
            // Erhöhe die Menge
            updateMutation.mutate({
                id: existingItem.id,
                data: {
                    ...existingItem,
                    quantity: existingItem.quantity + 1
                }
            });
        } else {
            // Erstelle neuen Eintrag
            const user = await base44.auth.me();
            createMutation.mutate({
                barcode: scannedBarcode,
                article_name: article.name,
                article_image_url: article.image_url || null,
                quantity: 1,
                restocked_by: user?.full_name || user?.email || 'Unbekannt',
                date: today,
                time: format(new Date(), 'HH:mm'),
                is_completed: false
            });
        }

        setBarcode('');
        if (barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    };

    const handleBarcodeSubmit = async (e) => {
        e.preventDefault();
        
        // Check if article is selected from dropdown
        if (selectedArticle) {
            const article = articles.find(a => a.id === selectedArticle);
            if (article) {
                await handleScan(article.barcode);
                setSelectedArticle('');
            }
            return;
        }
        
        // Otherwise use barcode input
        if (!barcode.trim()) return;
        handleScan(barcode);
    };

    const handleCameraScan = (decodedText) => {
        setScannerOpen(false);
        handleScan(decodedText);
    };

    const toggleComplete = (item) => {
        updateMutation.mutate({
            id: item.id,
            data: { ...item, is_completed: !item.is_completed }
        });
    };

    const handleDelete = (id) => {
        if (confirm('Eintrag löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleDeleteCompleted = async () => {
        const completedItems = todayItems.filter(item => item.is_completed);
        if (completedItems.length === 0) {
            alert('Keine erledigten Aufgaben zum Löschen');
            return;
        }
        
        if (confirm(`${completedItems.length} erledigte Aufgaben löschen?`)) {
            for (const item of completedItems) {
                await deleteMutation.mutateAsync(item.id);
            }
        }
    };

    const handleQuantityEdit = (item) => {
        setEditingItem(item);
        setEditQuantity(String(item.quantity));
    };

    const saveQuantityEdit = () => {
        if (!editingItem) return;
        const newQuantity = parseInt(editQuantity);
        if (isNaN(newQuantity) || newQuantity < 1) {
            alert('Bitte gültige Menge eingeben');
            return;
        }

        updateMutation.mutate({
            id: editingItem.id,
            data: {
                ...editingItem,
                quantity: newQuantity
            }
        });

        setEditingItem(null);
        setEditQuantity('');
    };

    const todayItems = restockItems
        .filter(item => item.date === format(new Date(), 'yyyy-MM-dd'))
        .sort((a, b) => {
            // Erst nach erledigt/nicht erledigt
            if (a.is_completed !== b.is_completed) {
                return a.is_completed ? 1 : -1;
            }
            // Dann nach Kategorie
            const articleA = articles.find(art => art.barcode === a.barcode);
            const articleB = articles.find(art => art.barcode === b.barcode);
            const categoryA = articleA?.category || 'Sonstiges';
            const categoryB = articleB?.category || 'Sonstiges';
            if (categoryA !== categoryB) {
                return categoryA.localeCompare(categoryB);
            }
            // Dann nach Name
            return a.article_name.localeCompare(b.article_name);
        });

    return (
        <div>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Auffülliste</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {todayItems.filter(i => !i.is_completed).length} offen · {todayItems.filter(i => i.is_completed).length} erledigt
                    </p>
                </div>

                {/* Scanner */}
                <Card className="p-6 bg-slate-800 border-slate-700 shadow-sm mb-6">
                    <form onSubmit={handleBarcodeSubmit} className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                                <Scan className="w-6 h-6 text-slate-300" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Artikel scannen</h3>
                                <p className="text-sm text-slate-400">Per Kamera oder Eingabe</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Artikel scannen</Label>
                            <div className="relative">
                                <Input
                                    ref={barcodeInputRef}
                                    type="text"
                                    value={barcode}
                                    onChange={(e) => {
                                        setBarcode(e.target.value);
                                        setSelectedArticle('');
                                    }}
                                    placeholder="Barcode eingeben oder Artikel suchen..."
                                    className="text-lg bg-slate-900 border-slate-600 text-white"
                                    autoFocus
                                />
                                {barcode && (
                                    <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-10">
                                        {(() => {
                                            const matches = articles.filter(a => 
                                                a.barcode === barcode ||
                                                a.name.toLowerCase().includes(barcode.toLowerCase()) ||
                                                a.barcode.includes(barcode)
                                            );
                                            
                                            if (matches.length === 0) {
                                                return (
                                                    <div className="px-4 py-3 text-center text-slate-400 text-sm">
                                                        Kein Artikel gefunden
                                                    </div>
                                                );
                                            }
                                            
                                            return matches.slice(0, 8).map(article => (
                                                <button
                                                    key={article.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedArticle(article.id);
                                                        setBarcode('');
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left hover:bg-slate-700 border-b border-slate-700 last:border-0 transition-colors"
                                                >
                                                    <div className="font-medium text-white">{article.name}</div>
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        {article.category} • {article.barcode}
                                                    </div>
                                                </button>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                type="button"
                                variant="outline"
                                onClick={() => setScannerOpen(true)}
                                className="border-slate-600 bg-slate-600 hover:bg-slate-700 text-white"
                            >
                                <Camera className="w-4 h-4 mr-2" />
                                Kamera
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-amber-600 hover:bg-amber-700"
                                disabled={!barcode.trim() && !selectedArticle}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Hinzufügen
                            </Button>
                        </div>
                    </form>
                </Card>

                {/* To-Do Liste */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">
                            Heutige Auffüllliste
                        </h2>
                        {todayItems.filter(i => i.is_completed).length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDeleteCompleted}
                                className="border-slate-600 bg-slate-600 hover:bg-slate-700 text-white"
                            >
                                <CheckCheck className="w-4 h-4 mr-2" />
                                Erledigte löschen
                            </Button>
                        )}
                    </div>
                    {todayItems.length > 0 ? (
                        <div className="space-y-4">
                            {(() => {
                                // Gruppiere Items nach Kategorie
                                const groupedItems = todayItems.reduce((groups, item) => {
                                    const article = articles.find(art => art.barcode === item.barcode);
                                    const category = article?.category || 'Sonstiges';
                                    if (!groups[category]) groups[category] = [];
                                    groups[category].push(item);
                                    return groups;
                                }, {});

                                return Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-px bg-slate-700 flex-1" />
                                            <h3 className="text-sm font-semibold text-amber-400 px-2">
                                                {category}
                                            </h3>
                                            <div className="h-px bg-slate-700 flex-1" />
                                        </div>
                                        <div className="space-y-2">
                                            {items.map(item => (
                                                <Card 
                                                    key={item.id} 
                                                    className={cn(
                                                        "p-4 bg-slate-800 border-slate-700 shadow-sm transition-all",
                                                        item.is_completed && "opacity-50 bg-slate-800/50"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => toggleComplete(item)}
                                                            className={cn(
                                                                "w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                                                                item.is_completed 
                                                                    ? "bg-green-600 border-green-600" 
                                                                    : "border-slate-600 hover:border-green-500"
                                                            )}
                                                        >
                                                            {item.is_completed && <Check className="w-4 h-4 text-white" />}
                                                        </button>

                                                        {item.article_image_url && (
                                                            <img 
                                                                src={item.article_image_url} 
                                                                alt={item.article_name}
                                                                className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                                                            />
                                                        )}

                                                        <div className="flex-1 min-w-0">
                                                            <h3 className={cn(
                                                                "font-medium truncate",
                                                                item.is_completed ? "text-slate-500 line-through" : "text-white"
                                                            )}>
                                                                {item.article_name}
                                                            </h3>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                                <button
                                                                    onClick={() => handleQuantityEdit(item)}
                                                                    className="font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                                                                >
                                                                    {item.quantity}x
                                                                    <Pencil className="w-3 h-3" />
                                                                </button>
                                                                <span>•</span>
                                                                <span>{item.barcode}</span>
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
                                ));
                            })()}
                        </div>
                    ) : (
                        <Card className="p-8 bg-slate-800 border-slate-700 shadow-sm">
                            <div className="text-center text-slate-500">
                                <Scan className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Noch keine Artikel gescannt</p>
                                <p className="text-xs mt-1">Scanne Artikel, um sie zur Liste hinzuzufügen</p>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Barcode Scanner */}
                <BarcodeScanner
                    open={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={handleCameraScan}
                />

                {/* Edit Quantity Dialog */}
                <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Menge ändern</DialogTitle>
                        </DialogHeader>
                        {editingItem && (
                            <div className="space-y-4 mt-4">
                                <div className="p-3 bg-slate-800 rounded-lg">
                                    <p className="font-medium text-white">{editingItem.article_name}</p>
                                    <p className="text-xs text-slate-400 mt-1">Barcode: {editingItem.barcode}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Neue Menge</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(e.target.value)}
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && saveQuantityEdit()}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setEditingItem(null)}
                                        className="flex-1"
                                    >
                                        Abbrechen
                                    </Button>
                                    <Button
                                        onClick={saveQuantityEdit}
                                        className="flex-1 bg-amber-600 hover:bg-amber-700"
                                    >
                                        Speichern
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}