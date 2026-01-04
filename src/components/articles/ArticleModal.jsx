import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BarcodeScanner from '@/components/restock/BarcodeScanner';

export default function ArticleModal({ open, onClose, article, onSave }) {
    const [scannerOpen, setScannerOpen] = useState(false);
    const [formData, setFormData] = useState({
        barcode: '',
        name: '',
        category: '',
        supplier: '',
        unit: '',
        current_stock: '',
        min_stock: '',
        notes: ''
    });

    useEffect(() => {
        if (article) {
            setFormData({
                barcode: article.barcode || '',
                name: article.name || '',
                category: article.category || '',
                supplier: article.supplier || '',
                unit: article.unit || '',
                current_stock: article.current_stock || '',
                min_stock: article.min_stock || '',
                notes: article.notes || ''
            });
        } else {
            setFormData({
                barcode: '',
                name: '',
                category: '',
                supplier: '',
                unit: '',
                current_stock: '',
                min_stock: '',
                notes: ''
            });
        }
    }, [article, open]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const dataToSave = {
            ...formData,
            current_stock: formData.current_stock ? parseFloat(formData.current_stock) : 0,
            min_stock: formData.min_stock ? parseFloat(formData.min_stock) : undefined
        };
        
        onSave(dataToSave, article?.id);
    };

    const handleScan = (barcode) => {
        setFormData({ ...formData, barcode });
        setScannerOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{article?.id ? 'Artikel bearbeiten' : 'Neuer Artikel'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Barcode/EAN *</Label>
                        <div className="flex gap-2">
                            <Input
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                placeholder="z.B. 4029764001807"
                                required
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setScannerOpen(true)}
                            >
                                <Camera className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Artikelname *</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="z.B. Jägermeister 0,7L"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Kategorie</Label>
                            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Spirituosen">Spirituosen</SelectItem>
                                    <SelectItem value="Bier">Bier</SelectItem>
                                    <SelectItem value="Wein">Wein</SelectItem>
                                    <SelectItem value="Softdrinks">Softdrinks</SelectItem>
                                    <SelectItem value="Saft">Saft</SelectItem>
                                    <SelectItem value="Energy">Energy</SelectItem>
                                    <SelectItem value="Wasser">Wasser</SelectItem>
                                    <SelectItem value="Snacks">Snacks</SelectItem>
                                    <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Lieferant</Label>
                            <Select value={formData.supplier} onValueChange={(v) => setFormData({ ...formData, supplier: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="C+C">C+C</SelectItem>
                                    <SelectItem value="Metro">Metro</SelectItem>
                                    <SelectItem value="Wein-Bauer">Wein-Bauer</SelectItem>
                                    <SelectItem value="Mebold">Mebold</SelectItem>
                                    <SelectItem value="Sonstiger">Sonstiger</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Einheit</Label>
                        <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Flasche">Flasche</SelectItem>
                                <SelectItem value="Kiste">Kiste</SelectItem>
                                <SelectItem value="Fass">Fass</SelectItem>
                                <SelectItem value="Liter">Liter</SelectItem>
                                <SelectItem value="Karton">Karton</SelectItem>
                                <SelectItem value="Packung">Packung</SelectItem>
                                <SelectItem value="Stück">Stück</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Aktueller Bestand</Label>
                            <Input
                                type="number"
                                value={formData.current_stock}
                                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                                placeholder="z.B. 10"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Mindestbestand</Label>
                            <Input
                                type="number"
                                value={formData.min_stock}
                                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                                placeholder="z.B. 5"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notizen</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Zusätzliche Informationen..."
                            rows={2}
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Abbrechen
                        </Button>
                        <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                            Speichern
                        </Button>
                    </div>
                </form>

                <BarcodeScanner
                    open={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={handleScan}
                />
            </DialogContent>
        </Dialog>
    );
}