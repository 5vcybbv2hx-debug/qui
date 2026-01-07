import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Wine, Trash2, Edit, Settings, ShoppingCart, Lightbulb, CheckSquare } from 'lucide-react';
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
import IngredientSelector from '@/components/recipes/IngredientSelector';

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
    const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
    const [selectedRecipes, setSelectedRecipes] = useState(new Set());
    const [similarRecipesModal, setSimilarRecipesModal] = useState(false);
    const [currentRecipeForSimilar, setCurrentRecipeForSimilar] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Cocktail',
        ingredients: [],
        preparation: '',
        glass_type: '',
        garnish: '',
        notes: ''
    });

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
                ingredients: recipe.ingredients || [],
                preparation: recipe.preparation || '',
                glass_type: recipe.glass_type || '',
                garnish: recipe.garnish || '',
                notes: recipe.notes || ''
            });
        } else {
            setSelectedRecipe(null);
            setFormData({
                name: '',
                category: categoryFilter !== 'alle' ? categoryFilter : 'Cocktail',
                ingredients: [],
                preparation: '',
                glass_type: '',
                garnish: '',
                notes: ''
            });
        }
        setModalOpen(true);
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
        const ingredientNames = Array.isArray(recipe.ingredients) 
            ? recipe.ingredients.map(i => i.article_name).join(' ')
            : '';
        const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ingredientNames.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'alle' || recipe.category === categoryFilter;
        return matchesSearch && matchesCategory;
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
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Rezepte</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {recipes.length} Rezept{recipes.length !== 1 ? 'e' : ''}
                        </p>
                    </div>
                    {permissions.isManager && (
                        <div className="flex gap-2">
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
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Rezepte durchsuchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full sm:w-auto">
                        <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full">
                            <TabsTrigger value="alle">Alle</TabsTrigger>
                            <TabsTrigger value="Cocktail">Cocktails</TabsTrigger>
                            <TabsTrigger value="Shot">Shots</TabsTrigger>
                            <TabsTrigger value="Longdrink">Longdrinks</TabsTrigger>
                            <TabsTrigger value="Mocktail">Mocktails</TabsTrigger>
                            <TabsTrigger value="Moonshiner-Cocktails">Moonshiner</TabsTrigger>
                            <TabsTrigger value="Sonstiges">Sonstiges</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Recipes Grid */}
                {filteredRecipes.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRecipes.map(recipe => (
                            <Card key={recipe.id} className="p-5 bg-slate-800 border-slate-700 shadow-sm hover:shadow-md transition-shadow">
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
                                            <p className="font-medium text-slate-300 mb-1">Zutaten:</p>
                                            <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                                                {recipe.ingredients.map((ing, idx) => (
                                                    <p key={idx}>
                                                        {ing.amount > 0 && `${ing.amount}ml `}
                                                        {ing.article_name}
                                                    </p>
                                                ))}
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

                            <IngredientSelector
                                ingredients={formData.ingredients}
                                onChange={(newIngredients) => setFormData({ ...formData, ingredients: newIngredients })}
                                articles={articles}
                            />

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

                            <div className="flex gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900">
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