import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import SmartCombobox from '@/components/ui/SmartCombobox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { STALE } from '@/lib/queryUtils';;
import { Camera, X, Image as ImageIcon, Crop, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import ImageEditor from '@/components/articles/ImageEditor';
import SupplierDetailsEditor from '@/components/articles/SupplierDetailsEditor';
import { haptics } from "@/components/utils/haptics";
import { toast } from 'sonner';
import PriceHistoryPanel from '@/components/articles/PriceHistoryPanel';
import { recordPriceChange } from '@/lib/priceHistoryUtils';
import { History } from 'lucide-react';

export default function ArticleEditPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const currentUser = useRef(null);
    useEffect(() => { base44.auth.me().then(u => { currentUser.current = u; }).catch(() => {}); }, []);
    const articleData = location.state?.article;

    const { data: categories = [] } = useQuery({
        queryKey: ['article-categories'],
        queryFn: () => base44.entities.ArticleCategory.list('order')
    });

    const { data: allArticles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('order'),
        staleTime: STALE.MEDIUM
    });

    const { data: allSuppliers = [] } = useQuery({
        queryKey: ['suppliers-list'],
        queryFn: () => base44.entities.Supplier.filter({ is_active: true }, 'order')
    });

    const supplierNames = useMemo(() => allSuppliers.filter(s => (s.type || 'Lieferant') === 'Lieferant').map(s => s.name), [allSuppliers]);
    const manufacturerSuggestions = useMemo(() =>
        [...new Set(allArticles.map(a => a.manufacturer).filter(Boolean))].sort()
    , [allArticles]);

    const [scannerOpen, setScannerOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imageEditorOpen, setImageEditorOpen] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState('');

    const [formData, setFormData] = useState({
        barcode: '',
        name: '',
        manufacturer: '',
        category: '',
        suppliers: [],
        supplier_details: [],
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
                manufacturer: articleData.manufacturer || '',
                category: articleData.category || '',
                suppliers: articleData.suppliers || [],
                supplier_details: articleData.supplier_details || [],
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const syncedSupplierNames = formData.supplier_details.map(s => s.supplier_name).filter(Boolean);
        const primary = formData.supplier_details.find(s => s.is_primary) || formData.supplier_details[0];
        const primaryPrice = primary?.purchase_price ? parseFloat(primary.purchase_price) : undefined;
        const finalPrice = primaryPrice ?? (formData.purchase_price ? parseFloat(formData.purchase_price) : undefined);

        const dataToSave = {
            ...formData,
            suppliers: syncedSupplierNames.length > 0 ? syncedSupplierNames : formData.suppliers,
            quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
            content_amount: formData.content_amount ? parseFloat(formData.content_amount) : undefined,
            purchase_price: finalPrice,
            current_stock: formData.current_stock ? parseFloat(formData.current_stock) : 0,
            min_stock: formData.min_stock ? parseFloat(formData.min_stock) : undefined
        };

        if (articleData?.id) {
            await recordPriceChange({
                articleId: articleData.id,
                articleName: formData.name,
                oldPrice: articleData.purchase_price,
                newPrice: finalPrice,
                user: currentUser.current,
                supplierName: primary?.supplier_name
            });
            updateMutation.mutate({ id: articleData.id, data: dataToSave });
        } else {
            createMutation.mutate(dataToSave);
        }
    };

    const handleScan = (barcode) => {
        setFormData({ ...formData, barcode });
        setScannerOpen(false);
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
        <div className="min-h-screen bg-background pb-6">
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">
                        {articleData?.id ? 'Artikel bearbeiten' : 'Neuer Artikel'}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-card rounded-xl p-5 space-y-4 border border-border">
                        {/* Barcode */}
                        <div className="space-y-2">
                            <Label>Barcode/EAN</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                    placeholder="z.B. 4029764001807"
                                    className="flex-1"
                                />
                                <Button type="button" variant="outline" onClick={() => setScannerOpen(true)}>
                                    <Camera className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="outline" onClick={() => {
                                    setFormData({ ...formData, barcode: `CUSTOM-${Date.now().toString().slice(-8)}` });
                                }} className="text-xs px-3">
                                    Code
                                </Button>
                            </div>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label>Artikelname *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="z.B. Jägermeister 0,7L"
                                required
                            />
                        </div>

                        {/* Hersteller */}
                        <div className="space-y-2">
                            <Label>Hersteller / Marke</Label>
                            <SmartCombobox
                                value={formData.manufacturer}
                                onChange={(val) => setFormData({ ...formData, manufacturer: val })}
                                options={manufacturerSuggestions}
                                placeholder="z.B. Mast-Jägermeister SE"
                                allowCreate={true}
                            />
                        </div>

                        {/* Kategorie */}
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
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                                {cat.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Lieferanten (echte Verknüpfung) */}
                        <div className="space-y-2">
                            <Label className="font-semibold">Lieferanten & Preise</Label>
                            <SupplierDetailsEditor
                                value={formData.supplier_details}
                                onChange={(details) => setFormData({ ...formData, supplier_details: details })}
                                availableSuppliers={supplierNames}
                            />
                        </div>

                        {/* Menge & Einheit */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Menge</Label>
                                <Input type="number" step="0.01" value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    placeholder="z.B. 24" />
                            </div>
                            <div className="space-y-2">
                                <Label>Einheit</Label>
                                <Input value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    placeholder="z.B. Flaschen" />
                            </div>
                        </div>

                        {/* Inhalt */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Inhaltsmenge</Label>
                                <Input type="number" step="0.01" value={formData.content_amount}
                                    onChange={(e) => setFormData({ ...formData, content_amount: e.target.value })}
                                    placeholder="z.B. 700" />
                            </div>
                            <div className="space-y-2">
                                <Label>Einheit</Label>
                                <Select value={formData.content_unit} onValueChange={(v) => setFormData({ ...formData, content_unit: v })}>
                                    <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ml">ml</SelectItem>
                                        <SelectItem value="l">l</SelectItem>
                                        <SelectItem value="g">g</SelectItem>
                                        <SelectItem value="kg">kg</SelectItem>
                                        <SelectItem value="Stück">Stück</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Bestand */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Aktueller Bestand</Label>
                                <Input type="number" value={formData.current_stock}
                                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                                    placeholder="z.B. 10" />
                            </div>
                            <div className="space-y-2">
                                <Label>Mindestbestand</Label>
                                <Input type="number" value={formData.min_stock}
                                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                                    placeholder="z.B. 5" />
                            </div>
                        </div>

                        {/* Bild */}
                        <div className="space-y-2">
                            <Label>Artikelbild</Label>
                            {formData.image_url ? (
                                <div className="relative">
                                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted">
                                        <img src={formData.image_url} alt="Vorschau" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <Button type="button" variant="secondary" size="icon"
                                            onClick={() => { setTempImageUrl(formData.image_url); setImageEditorOpen(true); }}>
                                            <Crop className="w-4 h-4" />
                                        </Button>
                                        <Button type="button" variant="destructive" size="icon"
                                            onClick={() => setFormData({ ...formData, image_url: '' })}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-border rounded-lg aspect-square flex flex-col items-center justify-center bg-muted/20">
                                    <input type="file" accept="image/*" onChange={handleImageUpload}
                                        className="hidden" id="image-upload-edit" disabled={uploading} />
                                    <label htmlFor="image-upload-edit" className="cursor-pointer flex flex-col items-center gap-2">
                                        <ImageIcon className="w-10 h-10 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            {uploading ? 'Lädt hoch...' : 'Bild hochladen'}
                                        </p>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Allergene */}
                        <div className="space-y-2">
                            <Label>Allergene</Label>
                            <Textarea
                                value={formData.allergens}
                                onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                                placeholder="z.B. Gluten, Sulfite, Milch"
                                rows={2}
                            />
                        </div>

                        {/* Notizen */}
                        <div className="space-y-2">
                            <Label>Notizen</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Zusätzliche Informationen..."
                                rows={2}
                            />
                        </div>
                    </div>

                    {articleData?.id && (
                        <div className="bg-card rounded-xl p-5 border border-border">
                            <div className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                                <History className="w-5 h-5" />
                                Preishistorie
                            </div>
                            <PriceHistoryPanel articleId={articleData.id} currentPrice={articleData.purchase_price} />
                        </div>
                    )}

                    <div className="flex gap-3 pt-2 sticky bottom-0 bg-background py-4">
                        <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
                            Abbrechen
                        </Button>
                        <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700"
                            disabled={createMutation.isPending || updateMutation.isPending}>
                            <Save className="w-4 h-4 mr-2" />
                            Speichern
                        </Button>
                    </div>
                </form>

                <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />

                <ImageEditor
                    open={imageEditorOpen}
                    onClose={() => { setImageEditorOpen(false); if (tempImageUrl) { URL.revokeObjectURL(tempImageUrl); setTempImageUrl(''); } }}
                    imageUrl={tempImageUrl}
                    onSave={handleImageSave}
                />
            </div>
        </div>
    );
}