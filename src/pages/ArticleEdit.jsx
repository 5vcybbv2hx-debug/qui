import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, X, Upload, Image as ImageIcon, Crop, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import ImageEditor from '@/components/articles/ImageEditor';
import { haptics } from "@/components/utils/haptics";
import { toast } from 'sonner';

export default function ArticleEditPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const articleData = location.state?.article;

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
        image_url: '',
        allergens: '',
        notes: ''
    });

    useEffect(() => {
        if (articleData) {
            setFormData({
                barcode: articleData.barcode || '',
                name: articleData.name || '',
                category: articleData.category || '',
                suppliers: articleData.suppliers || [],
                unit: articleData.unit || '',
                quantity: articleData.quantity || '',
                content_amount: articleData.content_amount || '',
                content_unit: articleData.content_unit || '',
                purchase_price: articleData.purchase_price || '',
                current_stock: articleData.current_stock || '',
                min_stock: articleData.min_stock || '',
                image_url: articleData.image_url || '',
                allergens: articleData.allergens || '',
                notes: articleData.notes || ''
            });
        }
    }, [articleData]);

    const createMutation = useMutation({
        mutationFn: (data) => {
            if (!data.barcode) {
                data.barcode = `GEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            return base44.entities.Article.create(data);
        },
        onSuccess: () => {
            haptics.light();
            queryClient.invalidateQueries(['articles']);
            navigate(-1);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
        onSuccess: () => {
            haptics.light();
            queryClient.invalidateQueries(['articles']);
            navigate(-1);
        }
    });

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
        
        if (articleData?.id) {
            updateMutation.mutate({ id: articleData.id, data: dataToSave });
        } else {
            createMutation.mutate(dataToSave);
        }
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
        <div className="min-h-screen bg-slate-950 pb-6">
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">
                        {articleData?.id ? 'Artikel bearbeiten' : 'Neuer Artikel'}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-slate-900 rounded-xl p-5 space-y-4 border border-slate-800">
                        <div className="space-y-2">
                            <Label className="text-white">Barcode/EAN *</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                    placeholder="z.B. 4029764001807"
                                    required
                                    className="flex-1 bg-slate-800 border-slate-700 text-white"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setScannerOpen(true)}
                                    title="Barcode scannen"
                                    className="border-slate-700"
                                >
                                    <Camera className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const customCode = `CUSTOM-${Date.now().toString().slice(-8)}`;
                                        setFormData({ ...formData, barcode: customCode });
                                    }}
                                    title="Eigenen Code generieren"
                                    className="text-xs px-3 border-slate-700"
                                >
                                    Code
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-white">Artikelname *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="z.B. Jägermeister 0,7L"
                                required
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-white">Kategorie</Label>
                            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
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
                            <Label className="text-white">Lieferanten</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={newSupplier}
                                    onChange={(e) => setNewSupplier(e.target.value)}
                                    placeholder="Lieferant hinzufügen..."
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSupplier())}
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                                <Button type="button" onClick={addSupplier} variant="outline" className="border-slate-700">+</Button>
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
                                <Label className="text-white">Menge</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    placeholder="z.B. 24"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white">Einheit</Label>
                                <Input
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    placeholder="z.B. Flaschen"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-white">Inhaltsmenge</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.content_amount}
                                    onChange={(e) => setFormData({ ...formData, content_amount: e.target.value })}
                                    placeholder="z.B. 700"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white">Einheit</Label>
                                <Select value={formData.content_unit} onValueChange={(v) => setFormData({ ...formData, content_unit: v })}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
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
                            <Label className="text-white">Netto-Einkaufspreis (€)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.purchase_price}
                                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                                placeholder="z.B. 12.50"
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-white">Aktueller Bestand</Label>
                                <Input
                                    type="number"
                                    value={formData.current_stock}
                                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                                    placeholder="z.B. 10"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white">Mindestbestand</Label>
                                <Input
                                    type="number"
                                    value={formData.min_stock}
                                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                                    placeholder="z.B. 5"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-white">Artikelbild</Label>
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
                                <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center bg-slate-800">
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
                                        <p className="text-sm text-slate-400">
                                            {uploading ? 'Lädt hoch...' : 'Bild hochladen'}
                                        </p>
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-white">Allergene</Label>
                            <div className="space-y-2">
                                <Textarea
                                    value={formData.allergens}
                                    onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                                    placeholder="z.B. Gluten, Sulfite, Milch"
                                    rows={2}
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={detectAllergens}
                                    disabled={detectingAllergens}
                                    className="w-full border-slate-700"
                                >
                                    {detectingAllergens ? 'Erkenne Allergene...' : '🤖 Allergene automatisch erkennen'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-white">Notizen</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Zusätzliche Informationen..."
                                rows={2}
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2 sticky bottom-0 bg-slate-950 py-4">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => navigate(-1)} 
                            className="flex-1 border-slate-700"
                        >
                            Abbrechen
                        </Button>
                        <Button 
                            type="submit" 
                            className="flex-1 bg-amber-600 hover:bg-amber-700"
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            <Save className="w-4 h-4 mr-2" />
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
            </div>
        </div>
    );
}