import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Wine, Trash2, Edit, Settings, ShoppingCart, Lightbulb, CheckSquare, X, Sparkles, ChefHat } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import SavedFilters from '@/components/filters/SavedFilters';
import IngredientSelector from '@/components/recipes/IngredientSelector';
import PDFExportButton from '@/components/export/PDFExportButton';
import QRCodeGenerator from '@/components/qr/QRCodeGenerator';

const categoryColors = {
    'Cocktail': 'bg-pink-100 text-pink-700',
    'Shot': 'bg-orange-100 text-orange-700',
    'Longdrink': 'bg-blue-100 text-blue-700',
    'Mocktail': 'bg-green-100 text-green-700',
    'Moonshiner-Cocktails': 'bg-amber-100 text-amber-700',
    'Sonstiges': 'bg-slate-100 text-slate-700'
};

export default function Recipes() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('alle');
    const [ingredientFilter, setIngredientFilter] = useState('');
    const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
    const [selectedRecipes, setSelectedRecipes] = useState(new Set());
    const [similarRecipesModal, setSimilarRecipesModal] = useState(false);
    const [currentRecipeForSimilar, setCurrentRecipeForSimilar] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Cocktail',
        servings: 1,
        ingredients: [],
        preparation: '',
        glass_type: '',
        garnish: '',
        notes: '',
        image_url: ''
    });
    const [uploadingImage, setUploadingImage] = useState(false);
    const [viewServings, setViewServings] = useState({});
    const [suggestingIngredients, setSuggestingIngredients] = useState(false);
    const [generatingFromInventory, setGeneratingFromInventory] = useState(false);
    const [qrCodeOpen, setQrCodeOpen] = useState(false);
    const [qrCodeRecipe, setQrCodeRecipe] = useState(null);

    const { data: recipes = [] } = useQuery({
        queryKey: ['recipes'],
        queryFn: () => base44.entities.Recipe.list('name')
    });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name')
    });

    const { data: shoppingList = [] } = useQuery({
        queryKey: ['shopping-list'],
        queryFn: () => base44.entities.ShoppingList.list()
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Recipe.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['recipes']);
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Recipe.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['recipes']);
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Recipe.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['recipes']);
        }
    });

    const createShoppingItemMutation = useMutation({
        mutationFn: (data) => base44.entities.ShoppingList.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['shopping-list']);
        }
    });

    const openModal = (recipe = null) => {
        if (recipe) {
            setSelectedRecipe(recipe);
            setFormData({
                name: recipe.name,
                category: recipe.category,
                servings: recipe.servings || 1,
                ingredients: recipe.ingredients || [],
                preparation: recipe.preparation || '',
                glass_type: recipe.glass_type || '',
                garnish: recipe.garnish || '',
                notes: recipe.notes || '',
                image_url: recipe.image_url || ''
            });
        } else {
            setSelectedRecipe(null);
            setFormData({
                name: '',
                category: categoryFilter !== 'alle' ? categoryFilter : 'Cocktail',
                servings: 1,
                ingredients: [],
                preparation: '',
                glass_type: '',
                garnish: '',
                notes: '',
                image_url: ''
            });
        }
        setModalOpen(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setFormData({ ...formData, image_url: file_url });
        } catch (error) {
            alert('Fehler beim Hochladen des Bildes');
        } finally {
            setUploadingImage(false);
        }
    };

    const suggestIngredients = async () => {
        if (!formData.name) {
            alert('Bitte gib zuerst einen Rezeptnamen ein');
            return;
        }

        setSuggestingIngredients(true);
        try {
            const availableArticles = articles.map(a => ({
                id: a.id,
                name: a.name,
                category: a.category
            }));

            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Du bist ein professioneller Barkeeper. Erstelle eine Zutatenliste für: "${formData.name}".

Verfügbare Artikel in der Datenbank:
${JSON.stringify(availableArticles, null, 2)}

WICHTIG: Nutze NUR Artikel aus der obigen Liste! Gib die article_id, article_name, amount (als Zahl) und unit (ml, cl, l, g, kg, oder Stück) zurück.

Beispiel-Format:
[
  {"article_id": "123", "article_name": "Rum", "amount": 40, "unit": "ml"},
  {"article_id": "456", "article_name": "Limettensaft", "amount": 20, "unit": "ml"}
]`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        ingredients: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    article_id: { type: "string" },
                                    article_name: { type: "string" },
                                    amount: { type: "number" },
                                    unit: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            if (result.ingredients && Array.isArray(result.ingredients)) {
                setFormData({ ...formData, ingredients: result.ingredients });
            }
        } catch (error) {
            alert('Fehler bei der KI-Vorschlagsfunktion');
        } finally {
            setSuggestingIngredients(false);
        }
    };

    const generateRecipeFromInventory = async () => {
        setGeneratingFromInventory(true);
        try {
            const availableArticles = articles
                .filter(a => a.current_stock > 0)
                .map(a => ({
                    id: a.id,
                    name: a.name,
                    category: a.category,
                    stock: a.current_stock
                }));

            if (availableArticles.length === 0) {
                alert('Keine Artikel mit Bestand im Inventar gefunden');
                return;
            }

            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Du bist ein kreativer Barkeeper. Erstelle ein interessantes Cocktail-Rezept basierend auf folgenden verfügbaren Artikeln:

${JSON.stringify(availableArticles, null, 2)}

Erstelle ein vollständiges Rezept mit:
- name: kreativer Rezeptname
- category: wähle aus (Cocktail, Longdrink, Shot, Mocktail)
- ingredients: Array mit article_id, article_name, amount (Zahl), unit (ml/cl/l/g/kg/Stück)
- preparation: detaillierte Zubereitungsanleitung
- glass_type: passende Glasart
- garnish: Garnitur

Nutze NUR verfügbare Artikel aus der obigen Liste!`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        category: { type: "string" },
                        ingredients: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    article_id: { type: "string" },
                                    article_name: { type: "string" },
                                    amount: { type: "number" },
                                    unit: { type: "string" }
                                }
                            }
                        },
                        preparation: { type: "string" },
                        glass_type: { type: "string" },
                        garnish: { type: "string" }
                    }
                }
            });

            if (result.name) {
                setFormData({
                    name: result.name,
                    category: result.category || 'Cocktail',
                    servings: 1,
                    ingredients: result.ingredients || [],
                    preparation: result.preparation || '',
                    glass_type: result.glass_type || '',
                    garnish: result.garnish || '',
                    notes: 'Automatisch generiert aus verfügbaren Artikeln',
                    image_url: ''
                });
                setModalOpen(true);
            }
        } catch (error) {
            alert('Fehler bei der Rezeptgenerierung');
        } finally {
            setGeneratingFromInventory(false);
        }
    };

    const getScaledIngredients = (ingredients, baseServings, targetServings) => {
        if (!ingredients || !baseServings || !targetServings) return ingredients;
        const factor = targetServings / baseServings;
        return ingredients.map(ing => ({
            ...ing,
            amount: ing.amount ? Math.round(ing.amount * factor * 10) / 10 : 0
        }));
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedRecipe(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedRecipe) {
            updateMutation.mutate({ id: selectedRecipe.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Rezept wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredRecipes = recipes.filter(recipe => {
        const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'alle' || recipe.category === categoryFilter;
        const matchesIngredient = !ingredientFilter || 
            recipe.ingredients?.some(ing => 
                ing.article_name?.toLowerCase().includes(ingredientFilter.toLowerCase())
            );
        return matchesSearch && matchesCategory && matchesIngredient;
    });

    const toggleRecipeSelection = (recipeId) => {
        setSelectedRecipes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(recipeId)) {
                newSet.delete(recipeId);
            } else {
                newSet.add(recipeId);
            }
            return newSet;
        });
    };

    const generateShoppingList = async () => {
        if (selectedRecipes.size === 0) return;

        const selectedRecipeObjects = recipes.filter(r => selectedRecipes.has(r.id));
        const ingredientsMap = new Map();

        // Sammle alle Zutaten
        selectedRecipeObjects.forEach(recipe => {
            const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
            ingredients.forEach(ing => {
                const key = ing.article_name;
                if (ingredientsMap.has(key)) {
                    ingredientsMap.set(key, {
                        ...ingredientsMap.get(key),
                        amount: ingredientsMap.get(key).amount + ing.amount
                    });
                } else {
                    ingredientsMap.set(key, {
                        article_id: ing.article_id,
                        article_name: ing.article_name,
                        amount: ing.amount
                    });
                }
            });
        });

        // Füge zur Einkaufsliste hinzu
        for (const [_, ingredient] of ingredientsMap) {
            await createShoppingItemMutation.mutateAsync({
                item_name: ingredient.article_name,
                category: 'C+C',
                quantity: Math.ceil(ingredient.amount / 100), // Umrechnung in größere Einheiten
                unit: 'Stück',
                status: 'offen',
                notes: `${ingredient.amount}ml gesamt · Für Rezepte: ${selectedRecipeObjects.map(r => r.name).join(', ')}`
            });
        }

        alert(`${ingredientsMap.size} Artikel zur Einkaufsliste hinzugefügt!`);
        setSelectedRecipes(new Set());
    };

    const findSimilarRecipes = (recipe) => {
        if (!recipe) return [];

        const currentIngredients = Array.isArray(recipe.ingredients) 
            ? recipe.ingredients.map(i => i.article_id)
            : [];
        
        return recipes
            .filter(r => r.id !== recipe.id)
            .map(r => {
                let score = 0;
                
                // Punkte für gleiche Kategorie
                if (r.category === recipe.category) score += 3;
                
                // Punkte für gemeinsame Artikel
                const otherIngredients = Array.isArray(r.ingredients) 
                    ? r.ingredients.map(i => i.article_id)
                    : [];
                currentIngredients.forEach(ingId => {
                    if (otherIngredients.includes(ingId)) {
                        score += 2;
                    }
                });
                
                return { recipe: r, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(item => item.recipe);
    };

    const showSimilarRecipes = (recipe) => {
        setCurrentRecipeForSimilar(recipe);
        setSimilarRecipesModal(true);
    };

    return (
        <div className="min-h-screen bg-slate-900 pb-24 md:pb-0">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-5 sm:mb-8">
                    <div>
                        <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">Rezepte</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {recipes.length} Rezept{recipes.length !== 1 ? 'e' : ''}
                        </p>
                    </div>
                    {permissions.isManager && (
                         <div className="flex gap-1 sm:gap-2 flex-wrap">
                            <PDFExportButton
                                data={filteredRecipes}
                                filename="rezepte"
                                title="Rezepte"
                                columns={[
                                    { label: 'Name', field: 'name' },
                                    { label: 'Kategorie', field: 'category' },
                                    { label: 'Zutaten', render: (r) => r.ingredients?.length || 0 },
                                    { label: 'Glas', field: 'glass_type' }
                                ]}
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50"
                            />
                            <Button 
                                onClick={generateRecipeFromInventory}
                                disabled={generatingFromInventory}
                                variant="outline"
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                                <ChefHat className="w-4 h-4 mr-2" />
                                {generatingFromInventory ? 'Generiere...' : 'KI-Rezept'}
                            </Button>
                            <Button 
                                onClick={() => setCategoriesModalOpen(true)}
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Kategorien
                            </Button>
                            <Button 
                                onClick={() => openModal()}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Rezept
                            </Button>
                        </div>
                    )}
                </div>

                {/* Shopping List Generator */}
                {selectedRecipes.size > 0 && (
                    <Card className="p-4 bg-amber-900/20 border-amber-600/30 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckSquare className="w-5 h-5 text-amber-400" />
                                <div>
                                    <p className="font-semibold text-white">
                                        {selectedRecipes.size} Rezept{selectedRecipes.size !== 1 ? 'e' : ''} ausgewählt
                                    </p>
                                    <p className="text-xs text-amber-300">
                                        Generiere eine Einkaufsliste mit allen benötigten Zutaten
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedRecipes(new Set())}
                                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                                >
                                    Abbrechen
                                </Button>
                                <Button
                                    onClick={generateShoppingList}
                                    className="bg-amber-600 hover:bg-amber-700"
                                >
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                    Einkaufsliste erstellen
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Search and Filter */}
                <Card className="p-4 bg-slate-800 border-slate-700 mb-6">
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Rezept suchen..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-slate-900 border-slate-700"
                                />
                            </div>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white text-sm"
                            >
                                <option value="alle">Alle Kategorien</option>
                                <option value="Cocktail">Cocktail</option>
                                <option value="Shot">Shot</option>
                                <option value="Longdrink">Longdrink</option>
                                <option value="Mocktail">Mocktail</option>
                                <option value="Moonshiner-Cocktails">Moonshiner-Cocktails</option>
                                <option value="Sonstiges">Sonstiges</option>
                            </select>
                            <div className="relative flex-1 sm:max-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Nach Zutat..."
                                    value={ingredientFilter}
                                    onChange={(e) => setIngredientFilter(e.target.value)}
                                    className="pl-10 bg-slate-900 border-slate-700"
                                />
                            </div>
                        </div>
                        <SavedFilters
                            storageKey="recipes_saved_filters"
                            currentFilters={{ searchQuery, categoryFilter, ingredientFilter }}
                            onApplyFilter={(filters) => {
                                setSearchQuery(filters.searchQuery || '');
                                setCategoryFilter(filters.categoryFilter || 'alle');
                                setIngredientFilter(filters.ingredientFilter || '');
                            }}
                        />
                    </div>
                </Card>

                {/* Recipes Grid */}
                {filteredRecipes.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRecipes.map(recipe => (
                            <Card key={recipe.id} className="overflow-hidden bg-slate-800 border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                {recipe.image_url && (
                                    <div className="w-full h-40 overflow-hidden bg-slate-900">
                                        <img 
                                            src={recipe.image_url} 
                                            alt={recipe.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2 flex-1">
                                            <button
                                                onClick={() => toggleRecipeSelection(recipe.id)}
                                                className={cn(
                                                    "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                                    selectedRecipes.has(recipe.id)
                                                        ? "bg-amber-600 border-amber-600"
                                                        : "border-slate-600 hover:border-amber-500"
                                                )}
                                            >
                                                {selectedRecipes.has(recipe.id) && (
                                                    <CheckSquare className="w-3 h-3 text-white" />
                                                )}
                                            </button>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-white mb-2">{recipe.name}</h3>
                                                <Badge className={cn("text-xs", categoryColors[recipe.category])}>
                                                    {recipe.category}
                                                </Badge>
                                            </div>
                                        </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => showSimilarRecipes(recipe)}
                                            className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                            title="Ähnliche Rezepte"
                                        >
                                            <Lightbulb className="w-4 h-4" />
                                        </Button>
                                        {permissions.isManager && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setQrCodeRecipe(recipe);
                                                        setQrCodeOpen(true);
                                                    }}
                                                    className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                                    title="QR-Code"
                                                >
                                                    <Wine className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openModal(recipe)}
                                                    className="h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(recipe.id)}
                                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm">
                                   {recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && (
                                       <div>
                                           <div className="flex items-center justify-between mb-2">
                                               <p className="font-medium text-slate-300">Zutaten:</p>
                                               <div className="flex items-center gap-2">
                                                   <Button
                                                       variant="ghost"
                                                       size="icon"
                                                       onClick={() => setViewServings(prev => ({
                                                           ...prev,
                                                           [recipe.id]: Math.max(1, (prev[recipe.id] || recipe.servings || 1) - 1)
                                                       }))}
                                                       className="h-6 w-6 text-slate-400 hover:text-white"
                                                   >
                                                       -
                                                   </Button>
                                                   <span className="text-xs text-slate-400">
                                                       {viewServings[recipe.id] || recipe.servings || 1}x
                                                   </span>
                                                   <Button
                                                       variant="ghost"
                                                       size="icon"
                                                       onClick={() => setViewServings(prev => ({
                                                           ...prev,
                                                           [recipe.id]: (prev[recipe.id] || recipe.servings || 1) + 1
                                                       }))}
                                                       className="h-6 w-6 text-slate-400 hover:text-white"
                                                   >
                                                       +
                                                   </Button>
                                               </div>
                                           </div>
                                           <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                                               {getScaledIngredients(
                                                   recipe.ingredients, 
                                                   recipe.servings || 1, 
                                                   viewServings[recipe.id] || recipe.servings || 1
                                               ).map((ing, idx) => {
                                                   const article = articles.find(a => a.id === ing.article_id);
                                                   let cost = 0;

                                                   // Kostenberechnung basierend auf Einheit (Fallback zu ml für alte Rezepte)
                                                   if (article?.price_per_liter && ing.amount) {
                                                       const unit = ing.unit || 'ml';
                                                       let amountInLiters = 0;
                                                       switch (unit.toLowerCase()) {
                                                           case 'ml':
                                                               amountInLiters = ing.amount / 1000;
                                                               break;
                                                           case 'cl':
                                                               amountInLiters = ing.amount / 100;
                                                               break;
                                                           case 'l':
                                                               amountInLiters = ing.amount;
                                                               break;
                                                           case 'g':
                                                               amountInLiters = ing.amount / 1000;
                                                               break;
                                                           case 'kg':
                                                               amountInLiters = ing.amount;
                                                               break;
                                                           case 'stk':
                                                           case 'stück':
                                                               cost = article.purchase_price ? article.purchase_price * ing.amount : 0;
                                                               break;
                                                       }
                                                       if (amountInLiters > 0) {
                                                           cost = amountInLiters * article.price_per_liter;
                                                       }
                                                   }

                                                   return (
                                                       <p key={idx} className="flex justify-between items-center">
                                                           <span>
                                                               {ing.amount > 0 && `${ing.amount}${ing.unit || 'ml'} `}
                                                               {ing.article_name}
                                                           </span>
                                                           {permissions.isManager && cost > 0 && (
                                                               <span className="text-green-400 font-medium ml-2">
                                                                   {cost.toFixed(2)} €
                                                               </span>
                                                           )}
                                                       </p>
                                                   );
                                               })}
                                           </div>
                                       </div>
                                   )}

                                   {permissions.isManager && recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && (
                                       <div className="pt-2 border-t border-slate-700">
                                           <p className="font-medium text-green-400 mb-1">Gesamtkosten (EK):</p>
                                           <div className="text-green-300 text-xs">
                                               {(() => {
                                                   const scaledIngredients = getScaledIngredients(
                                                       recipe.ingredients, 
                                                       recipe.servings || 1, 
                                                       viewServings[recipe.id] || recipe.servings || 1
                                                   );
                                                   let totalCost = 0;
                                                   scaledIngredients.forEach(ing => {
                                                       const article = articles.find(a => a.id === ing.article_id);
                                                       if (article?.price_per_liter && ing.amount) {
                                                           const unit = ing.unit || 'ml';
                                                           let amountInLiters = 0;
                                                           switch (unit.toLowerCase()) {
                                                               case 'ml':
                                                                   amountInLiters = ing.amount / 1000;
                                                                   break;
                                                               case 'cl':
                                                                   amountInLiters = ing.amount / 100;
                                                                   break;
                                                               case 'l':
                                                                   amountInLiters = ing.amount;
                                                                   break;
                                                               case 'g':
                                                                   amountInLiters = ing.amount / 1000;
                                                                   break;
                                                               case 'kg':
                                                                   amountInLiters = ing.amount;
                                                                   break;
                                                               case 'stk':
                                                               case 'stück':
                                                                   totalCost += article.purchase_price ? article.purchase_price * ing.amount : 0;
                                                                   return;
                                                           }
                                                           if (amountInLiters > 0) {
                                                               totalCost += amountInLiters * article.price_per_liter;
                                                           }
                                                       }
                                                   });
                                                   return totalCost > 0 ? `${totalCost.toFixed(2)} €` : 'Keine Preise hinterlegt';
                                               })()}
                                           </div>
                                       </div>
                                   )}

                                    {recipe.preparation && (
                                        <div>
                                            <p className="font-medium text-slate-300 mb-1">Zubereitung:</p>
                                            <p className="text-slate-400 text-xs leading-relaxed">
                                                {recipe.preparation}
                                            </p>
                                        </div>
                                    )}

                                    {(recipe.glass_type || recipe.garnish) && (
                                        <div className="pt-2 border-t border-slate-700 text-xs text-slate-400">
                                            {recipe.glass_type && <p>Glas: {recipe.glass_type}</p>}
                                            {recipe.garnish && <p>Garnitur: {recipe.garnish}</p>}
                                        </div>
                                    )}
                                    </div>
                                    </div>
                                    </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="p-12 bg-slate-800 border-slate-700 shadow-sm">
                        <div className="text-center text-slate-400">
                            <Wine className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Keine Rezepte gefunden</p>
                            <p className="text-sm mt-1">
                                {searchQuery ? 'Versuche einen anderen Suchbegriff' : 'Füge dein erstes Rezept hinzu'}
                            </p>
                        </div>
                    </Card>
                )}

                {/* Modal */}
                <Dialog open={modalOpen} onOpenChange={closeModal}>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedRecipe ? 'Rezept bearbeiten' : 'Neues Rezept'}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="z.B. Mojito"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Kategorie</Label>
                                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Cocktail">Cocktail</SelectItem>
                                            <SelectItem value="Shot">Shot</SelectItem>
                                            <SelectItem value="Longdrink">Longdrink</SelectItem>
                                            <SelectItem value="Mocktail">Mocktail</SelectItem>
                                            <SelectItem value="Moonshiner-Cocktails">Moonshiner-Cocktails</SelectItem>
                                            <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Portionen</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.servings}
                                        onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Zutaten</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={suggestIngredients}
                                        disabled={suggestingIngredients || !formData.name}
                                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                    >
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        {suggestingIngredients ? 'Vorschläge...' : 'KI-Vorschläge'}
                                    </Button>
                                </div>
                                <IngredientSelector
                                    ingredients={formData.ingredients}
                                    onChange={(newIngredients) => setFormData({ ...formData, ingredients: newIngredients })}
                                    articles={articles}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Zubereitung</Label>
                                <Textarea
                                    value={formData.preparation}
                                    onChange={(e) => setFormData({ ...formData, preparation: e.target.value })}
                                    placeholder="Minze mit Zucker muddeln..."
                                    rows={4}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Glasart</Label>
                                    <Input
                                        value={formData.glass_type}
                                        onChange={(e) => setFormData({ ...formData, glass_type: e.target.value })}
                                        placeholder="z.B. Highball"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Garnitur</Label>
                                    <Input
                                        value={formData.garnish}
                                        onChange={(e) => setFormData({ ...formData, garnish: e.target.value })}
                                        placeholder="z.B. Minzzweig"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notizen</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Zusätzliche Hinweise..."
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Bild</Label>
                                <div className="space-y-2">
                                    {formData.image_url && (
                                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-300">
                                            <img src={formData.image_url} alt="Rezeptbild" className="w-full h-full object-cover" />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setFormData({ ...formData, image_url: '' })}
                                                className="absolute top-2 right-2"
                                            >
                                                Entfernen
                                            </Button>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                       <label className="flex-1">
                                           <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-slate-300 bg-white text-sm cursor-pointer hover:bg-slate-50 ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                                               📁 Datei wählen
                                           </div>
                                           <Input
                                               type="file"
                                               accept="image/*"
                                               onChange={handleImageUpload}
                                               disabled={uploadingImage}
                                               className="hidden"
                                           />
                                       </label>
                                       <label className="flex-1">
                                           <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-amber-400 bg-amber-50 text-amber-700 text-sm cursor-pointer hover:bg-amber-100 ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                                               📷 Foto aufnehmen
                                           </div>
                                           <Input
                                               type="file"
                                               accept="image/*"
                                               capture="environment"
                                               onChange={handleImageUpload}
                                               disabled={uploadingImage}
                                               className="hidden"
                                           />
                                       </label>
                                    </div>
                                    {uploadingImage && <p className="text-xs text-slate-500">Wird hochgeladen...</p>}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                                    {selectedRecipe ? 'Speichern' : 'Hinzufügen'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Categories Modal */}
                <Dialog open={categoriesModalOpen} onOpenChange={setCategoriesModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Kategorien verwalten</DialogTitle>
                        </DialogHeader>
                        
                        <div className="mt-4">
                            <p className="text-sm text-slate-600 mb-4">
                                Um Kategorien hinzuzufügen oder zu ändern, bearbeite die Recipe-Entity in der Datenbank.
                            </p>
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Aktuelle Kategorien:</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(categoryColors).map(category => (
                                        <Badge key={category} className={cn("text-xs", categoryColors[category])}>
                                            {category}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Button 
                            variant="outline" 
                            onClick={() => setCategoriesModalOpen(false)}
                            className="w-full mt-4"
                        >
                            Schließen
                        </Button>
                    </DialogContent>
                </Dialog>

                {/* QR Code Modal */}
                <Dialog open={qrCodeOpen} onOpenChange={setQrCodeOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                QR-Code: {qrCodeRecipe?.name}
                            </DialogTitle>
                        </DialogHeader>
                        {qrCodeRecipe && (
                            <QRCodeGenerator 
                                itemId={qrCodeRecipe.id} 
                                itemName={qrCodeRecipe.name}
                                type="recipe"
                            />
                        )}
                    </DialogContent>
                </Dialog>

                {/* Similar Recipes Modal */}
                <Dialog open={similarRecipesModal} onOpenChange={setSimilarRecipesModal}>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-500" />
                                Ähnliche Rezepte zu "{currentRecipeForSimilar?.name}"
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div className="mt-4">
                            {(() => {
                                const similar = findSimilarRecipes(currentRecipeForSimilar);
                                return similar.length > 0 ? (
                                    <div className="space-y-3">
                                        {similar.map(recipe => (
                                            <Card key={recipe.id} className="p-4 bg-slate-800 border-slate-700 hover:border-amber-600/50 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    setSimilarRecipesModal(false);
                                                    openModal(recipe);
                                                }}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-white mb-1">{recipe.name}</h3>
                                                        <Badge className={cn("text-xs mb-2", categoryColors[recipe.category])}>
                                                            {recipe.category}
                                                        </Badge>
                                                        {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && (
                                                            <p className="text-xs text-slate-400 line-clamp-2">
                                                                {recipe.ingredients.slice(0, 3).map(i => i.article_name).join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Keine ähnlichen Rezepte gefunden</p>
                                    </div>
                                );
                            })()}
                        </div>

                        <Button 
                            variant="outline" 
                            onClick={() => setSimilarRecipesModal(false)}
                            className="w-full mt-4"
                        >
                            Schließen
                        </Button>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}