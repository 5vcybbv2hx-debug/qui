import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calculator } from "lucide-react";
import { haptics } from "@/components/utils/haptics";

export default function MenuItemModal({ item, open, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: "",
        category: "Cocktails",
        subcategory: "",
        description: "",
        price: "",
        size: "",
        purchase_price: "",
        use_recipe_calculation: false,
        linked_recipe_id: "",
        is_available: true,
        is_seasonal: false,
        is_special: false,
        order_position: "",
        allergens: "",
        alcohol_content: "",
        image_url: "",
        linked_article_id: "",
        linked_article_name: ""
    });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles-for-linking'],
        queryFn: () => base44.entities.Article.list('-name', 500),
        initialData: []
    });

    const { data: recipes = [] } = useQuery({
        queryKey: ['recipes-for-linking'],
        queryFn: () => base44.entities.Recipe.list('-name', 500),
        initialData: []
    });

    useEffect(() => {
        if (item) {
            setFormData(item);
        }
    }, [item]);

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (item) {
                return base44.entities.MenuItem.update(item.id, data);
            }
            return base44.entities.MenuItem.create(data);
        },
        onSuccess: () => {
            haptics.light();
            queryClient.invalidateQueries(['menu-items']);
            onClose();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.MenuItem.delete(item.id),
        onSuccess: () => {
            haptics.light();
            queryClient.invalidateQueries(['menu-items']);
            onClose();
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let calculatedPurchasePrice = formData.purchase_price ? parseFloat(formData.purchase_price) : undefined;

        // EK aus Rezept berechnen wenn aktiviert
        if (formData.use_recipe_calculation && formData.linked_recipe_id) {
            const recipe = recipes.find(r => r.id === formData.linked_recipe_id);
            if (recipe?.ingredients) {
                let totalCost = 0;
                recipe.ingredients.forEach(ingredient => {
                    const article = articles.find(a => a.id === ingredient.article_id);
                    if (article?.price_per_liter && ingredient.amount) {
                        // Fallback für alte Rezepte ohne unit: nehme ml an
                        const unit = ingredient.unit || 'ml';
                        let amountInLiters = 0;
                        switch (unit.toLowerCase()) {
                            case 'ml':
                                amountInLiters = ingredient.amount / 1000;
                                break;
                            case 'cl':
                                amountInLiters = ingredient.amount / 100;
                                break;
                            case 'l':
                                amountInLiters = ingredient.amount;
                                break;
                            case 'g':
                                amountInLiters = ingredient.amount / 1000;
                                break;
                            case 'kg':
                                amountInLiters = ingredient.amount;
                                break;
                            case 'stk':
                            case 'stück':
                                totalCost += article.purchase_price ? article.purchase_price * ingredient.amount : 0;
                                return;
                        }
                        if (amountInLiters > 0) {
                            totalCost += amountInLiters * article.price_per_liter;
                        }
                    }
                });
                calculatedPurchasePrice = totalCost;
            }
        }
        // EK aus Artikel berechnen wenn verknüpft
        else if (formData.linked_article_id && !formData.use_recipe_calculation) {
            const linkedArticle = articles.find(a => a.id === formData.linked_article_id);
            if (linkedArticle?.purchase_price) {
                const parseServingSize = (sizeString) => {
                    if (!sizeString) return 0;
                    const size = sizeString.toLowerCase().replace(',', '.');
                    if (size.includes('l')) return parseFloat(size.replace('l', '').trim()) || 0;
                    if (size.includes('cl')) return (parseFloat(size.replace('cl', '').trim()) || 0) / 100;
                    if (size.includes('ml')) return (parseFloat(size.replace('ml', '').trim()) || 0) / 1000;
                    return 0;
                };
                
                const articleSize = linkedArticle.unit_size || 1;
                const servingSize = parseServingSize(formData.size);
                
                if (servingSize > 0) {
                    calculatedPurchasePrice = (linkedArticle.purchase_price / articleSize) * servingSize;
                } else {
                    calculatedPurchasePrice = linkedArticle.purchase_price;
                }
            }
        }

        const submitData = {
            ...formData,
            price: parseFloat(formData.price),
            purchase_price: calculatedPurchasePrice,
            alcohol_content: formData.alcohol_content ? parseFloat(formData.alcohol_content) : undefined,
            order_position: formData.order_position ? parseInt(formData.order_position) : undefined
        };
        saveMutation.mutate(submitData);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{item ? 'Getränk bearbeiten' : 'Neues Getränk'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Name *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="z.B. Mojito"
                                required
                            />
                        </div>

                        <div>
                            <Label>Kategorie *</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData({ ...formData, category: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Bier">Bier</SelectItem>
                                    <SelectItem value="Wein">Wein</SelectItem>
                                    <SelectItem value="Sekt & Champagner">Sekt & Champagner</SelectItem>
                                    <SelectItem value="Spirituosen">Spirituosen</SelectItem>
                                    <SelectItem value="Longdrinks">Longdrinks</SelectItem>
                                    <SelectItem value="Cocktails">Cocktails</SelectItem>
                                    <SelectItem value="Shots">Shots</SelectItem>
                                    <SelectItem value="Softdrinks">Softdrinks</SelectItem>
                                    <SelectItem value="Heißgetränke">Heißgetränke</SelectItem>
                                    <SelectItem value="Moonshiner-Cocktails">Moonshiner-Cocktails</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Unterkategorie</Label>
                            <Input
                                value={formData.subcategory}
                                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                placeholder="z.B. Rum, IPA"
                            />
                        </div>

                        <div>
                            <Label>Verkaufspreis (€) *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                placeholder="7.50"
                                required
                            />
                        </div>

                        <div>
                            <Label>Größe</Label>
                            <Input
                                value={formData.size}
                                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                placeholder="z.B. 0,3l, 4cl"
                            />
                        </div>

                        {/* Margin Calculation Section */}
                        <div className="col-span-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Calculator className="w-5 h-5 text-amber-700" />
                                <Label className="text-amber-900 font-semibold">Margenberechnung</Label>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-4">
                                <Switch
                                    checked={formData.use_recipe_calculation}
                                    onCheckedChange={(checked) => setFormData({ 
                                        ...formData, 
                                        use_recipe_calculation: checked,
                                        purchase_price: checked ? "" : formData.purchase_price 
                                    })}
                                />
                                <Label className="text-sm">EK automatisch aus Rezept berechnen</Label>
                            </div>

                            {formData.use_recipe_calculation ? (
                                <div>
                                    <Label className="text-amber-900">Rezept verknüpfen</Label>
                                    <Select
                                        value={formData.linked_recipe_id || ""}
                                        onValueChange={(value) => setFormData({ ...formData, linked_recipe_id: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Rezept auswählen..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            <SelectItem value={null}>Kein Rezept</SelectItem>
                                            {recipes.map(recipe => (
                                                <SelectItem key={recipe.id} value={recipe.id}>
                                                    {recipe.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-amber-700 mt-2">
                                        ℹ️ EK wird automatisch aus Artikelpreisen berechnet
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <Label className="text-amber-900">Einkaufspreis (€)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.purchase_price}
                                        onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                                        placeholder="2.50"
                                    />
                                    <p className="text-xs text-amber-700 mt-2">
                                        ℹ️ Manueller Einkaufspreis für einfache Getränke
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label>Alkoholgehalt (%)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.alcohol_content}
                                onChange={(e) => setFormData({ ...formData, alcohol_content: e.target.value })}
                                placeholder="z.B. 5.2"
                            />
                        </div>

                        <div>
                            <Label>Reihenfolge</Label>
                            <Input
                                type="number"
                                value={formData.order_position}
                                onChange={(e) => setFormData({ ...formData, order_position: e.target.value })}
                                placeholder="1, 2, 3..."
                            />
                        </div>

                        <div className="col-span-2">
                            <Label>Beschreibung</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Zutaten und Beschreibung"
                            />
                        </div>

                        <div className="col-span-2">
                            <Label>Allergene</Label>
                            <Input
                                value={formData.allergens}
                                onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                                placeholder="z.B. Laktose, Nüsse"
                            />
                        </div>

                        <div className="col-span-2">
                            <Label>Bild-URL</Label>
                            <Input
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <Label className="text-blue-900">🔗 Artikel verknüpfen (optional)</Label>
                            <p className="text-xs text-blue-700 mb-2 mt-1">Verknüpfung mit Lagerbestand + automatische EK-Übernahme</p>
                            <Select
                                value={formData.linked_article_id || ""}
                                onValueChange={(value) => {
                                    const article = articles.find(a => a.id === value);
                                    setFormData({ 
                                        ...formData, 
                                        linked_article_id: value,
                                        linked_article_name: article?.name || ""
                                    });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Artikel auswählen..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    <SelectItem value={null}>Keine Verknüpfung</SelectItem>
                                    {articles.map(article => (
                                        <SelectItem key={article.id} value={article.id}>
                                            {article.name} {article.barcode ? `(${article.barcode})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {formData.linked_article_name && (
                                <p className="text-xs text-green-700 mt-2">
                                    ✓ Verknüpft mit: {formData.linked_article_name}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.is_available}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                            />
                            <Label>Verfügbar</Label>
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.is_seasonal}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_seasonal: checked })}
                            />
                            <Label>Saisonales Angebot</Label>
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.is_special}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_special: checked })}
                            />
                            <Label>Special/Tagesangebot</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        {item && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => deleteMutation.mutate()}
                            >
                                Löschen
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button type="submit">
                            Speichern
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}