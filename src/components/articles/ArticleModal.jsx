import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Camera, X, Upload, Image as ImageIcon, Crop, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import ImageEditor from '@/components/articles/ImageEditor';
import AllergenEditor from '@/components/articles/AllergenEditor';
import { haptics } from "@/components/utils/haptics";
import { toast } from 'sonner';

export default function ArticleModal({ open, onClose, article, onSave }) {
    const { data: categories = [] } = useQuery({
        queryKey: ['article-categories'],
        queryFn: () => base44.entities.ArticleCategory.list('order')
    });

    const [scannerOpen, setScannerOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState('');
    const [uploading, setUploading] = useState(false);
    const [imageEditorOpen, setImageEditorOpen] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState('');
    const [detectingAllergens, setDetectingAllergens] = useState(false);
    const [formData, setFormData] = useState({
        barcode: '',
        name: '',
        category: '',
        suppliers: [],
        unit: '',
        quantity: '',
        content_amount: '',
        content_unit: '',
        purchase_price: '',
        current_stock: '',
        min_stock: '',
        shelf_id: '',
        storage_location: '',
        image_url: '',
        allergens: '',
        notes: ''
    });

    useEffect(() => {
        if (article) {
            setFormData({
                barcode: article.barcode || '',
                name: article.name || '',
                category: article.category || '',
                suppliers: article.suppliers || [],
                unit: article.unit || '',
                quantity: article.quantity || '',
                content_amount: article.content_amount || '',
                content_unit: article.content_unit || '',
                purchase_price: article.purchase_price || '',
                current_stock: article.current_stock || '',
                min_stock: article.min_stock || '',
                shelf_id: article.shelf_id || '',
                storage_location: article.storage_location || '',
                image_url: article.image_url || '',
                allergens: article.allergens || '',
                notes: article.notes || ''
            });
        } else {
            setFormData({
                barcode: '',
                name: '',
                category: '',
                suppliers: [],
                unit: '',
                quantity: '',
                content_amount: '',
                content_unit: '',
                purchase_price: '',
                current_stock: '',
                min_stock: '',
                shelf_id: '',
                storage_location: '',
                image_url: '',
                allergens: '',
                notes: ''
            });
        }
        setNewSupplier('');
    }, [article, open]);

    const detectAllergens = async () => {
        if (!formData.name) {
            toast.error('Bitte Artikelname eingeben');
            return;
        }
        
        setDetectingAllergens(true);
        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Analysiere den folgenden Artikel und liste NUR die enthaltenen Allergene auf: "${formData.name}". 
                
Gib nur die Allergene als kommaseparierte Liste zurück (z.B. "Gluten, Milch, Sulfite"). 
Wenn keine Allergene vorhanden sind, antworte mit "Keine".
Berücksichtige typische Allergene: Gluten, Krebstiere, Eier, Fisch, Erdnüsse, Soja, Milch, Schalenfrüchte, Sellerie, Senf, Sesam, Sulfite, Lupinen, Weichtiere.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        allergens: { type: "string" }
                    }
                }
            });
            
            const detected = result.allergens === "Keine" ? "" : result.allergens;
            setFormData({ ...formData, allergens: detected });
            toast.success('Allergene erkannt');
        } catch (error) {
            toast.error('Fehler bei der Allergenerkennung');
        } finally {
            setDetectingAllergens(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const dataToSave = {
            ...formData,
            quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
            content_amount: formData.content_amount ? parseFloat(formData.content_amount) : undefined,
            purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
            current_stock: formData.current_stock ? parseFloat(formData.current_stock) : 0,
            min_stock: formData.min_stock ? parseFloat(formData.min_stock) : undefined
        };
        
        haptics.light();
        onSave(dataToSave, article?.id);
    };

    const handleScan = (barcode) => {
        setFormData({ ...formData, barcode });
        setScannerOpen(false);
    };

    const addSupplier = () => {
        if (newSupplier.trim() && !formData.suppliers.includes(newSupplier.trim())) {
            setFormData({
                ...formData,
                suppliers: [...formData.suppliers, newSupplier.trim()]
            });
            setNewSupplier('');
        }
    };

    const removeSupplier = (supplier) => {
        setFormData({
            ...formData,
            suppliers: formData.suppliers.filter(s => s !== supplier)
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create temporary URL for editor
        const tempUrl = URL.createObjectURL(file);
        setTempImageUrl(tempUrl);
        setImageEditorOpen(true);
    };

    const handleImageSave = async (editedFile) => {
        setUploading(true);
        setImageEditorOpen(false);
        
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file: editedFile });
            setFormData({ ...formData, image_url: file_url });
            URL.revokeObjectURL(tempImageUrl);
            setTempImageUrl('');
            toast.success('Bild hochgeladen');
        } catch (error) {
            toast.error('Fehler beim Hochladen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                                title="Barcode scannen"
                            >
                                <Camera className="w-4 h-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    const customCode = `CUSTOM-${Date.now().toString().slice(-8)}`;
                                    setFormData({ ...formData, barcode: customCode });
                                    toast.success('Code generiert: ' + customCode);
                                }}
                                title="Eigenen Code generieren"
                            >
                                <Sparkles className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Tipp: Scanne einen Barcode oder generiere einen eigenen Code für Artikel ohne EAN
                        </p>
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

                    <div className="space-y-2">
                        <Label>Kategorie</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Kategorie wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            {cat.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Lieferanten</Label>
                        <div className="flex gap-2">
                            <Input
                                value={newSupplier}
                                onChange={(e) => setNewSupplier(e.target.value)}
                                placeholder="Lieferant hinzufügen..."
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSupplier())}
                            />
                            <Button type="button" onClick={addSupplier} variant="outline">+</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.suppliers.map(supplier => (
                                <Badge key={supplier} variant="secondary" className="flex items-center gap-1">
                                    {supplier}
                                    <button
                                        type="button"
                                        onClick={() => removeSupplier(supplier)}
                                        className="ml-1 hover:text-red-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Menge</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                placeholder="z.B. 24"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Einheit</Label>
                            <Input
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                placeholder="z.B. Flaschen"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Inhaltsmenge</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.content_amount}
                                onChange={(e) => setFormData({ ...formData, content_amount: e.target.value })}
                                placeholder="z.B. 700"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Einheit</Label>
                            <Select value={formData.content_unit} onValueChange={(v) => setFormData({ ...formData, content_unit: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ml">ml (Milliliter)</SelectItem>
                                    <SelectItem value="l">l (Liter)</SelectItem>
                                    <SelectItem value="g">g (Gramm)</SelectItem>
                                    <SelectItem value="kg">kg (Kilogramm)</SelectItem>
                                    <SelectItem value="Stück">Stück</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Netto-Einkaufspreis (€)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.purchase_price}
                            onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                            placeholder="z.B. 12.50"
                        />
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
                        <Label>Artikelbild</Label>
                        {formData.image_url ? (
                            <div className="relative">
                                <img 
                                    src={formData.image_url} 
                                    alt="Vorschau"
                                    className="w-full h-32 object-cover rounded-lg"
                                />
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        onClick={() => {
                                            setTempImageUrl(formData.image_url);
                                            setImageEditorOpen(true);
                                        }}
                                    >
                                        <Crop className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => setFormData({ ...formData, image_url: '' })}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="image-upload"
                                    disabled={uploading}
                                />
                                <label htmlFor="image-upload" className="cursor-pointer">
                                    <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                                    <p className="text-sm text-slate-600">
                                        {uploading ? 'Lädt hoch...' : 'Bild hochladen'}
                                    </p>
                                </label>
                            </div>
                        )}
                    </div>

                    <AllergenEditor
                        value={formData.allergens}
                        onChange={(val) => setFormData({ ...formData, allergens: val })}
                        articleName={formData.name}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Regal-ID</Label>
                            <Input
                                value={formData.shelf_id}
                                onChange={(e) => setFormData({ ...formData, shelf_id: e.target.value.toUpperCase() })}
                                placeholder="z.B. A1, B2, C3"
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Lagerort</Label>
                            <Input
                                value={formData.storage_location}
                                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                                placeholder="z.B. Keller, Kühlraum"
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

                <ImageEditor
                    open={imageEditorOpen}
                    onClose={() => {
                        setImageEditorOpen(false);
                        if (tempImageUrl) {
                            URL.revokeObjectURL(tempImageUrl);
                            setTempImageUrl('');
                        }
                    }}
                    imageUrl={tempImageUrl}
                    onSave={handleImageSave}
                />
            </DialogContent>
        </Dialog>
    );
}