import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Wine, Trash2, Edit } from 'lucide-react';
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

const categoryColors = {
    'Cocktail': 'bg-pink-100 text-pink-700',
    'Shot': 'bg-orange-100 text-orange-700',
    'Longdrink': 'bg-blue-100 text-blue-700',
    'Mocktail': 'bg-green-100 text-green-700',
    'Sonstiges': 'bg-slate-100 text-slate-700'
};

export default function Recipes() {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('alle');
    const [formData, setFormData] = useState({
        name: '',
        category: 'Cocktail',
        ingredients: '',
        preparation: '',
        glass_type: '',
        garnish: '',
        notes: ''
    });

    const { data: recipes = [] } = useQuery({
        queryKey: ['recipes'],
        queryFn: () => base44.entities.Recipe.list('name')
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

    const openModal = (recipe = null) => {
        if (recipe) {
            setSelectedRecipe(recipe);
            setFormData({
                name: recipe.name,
                category: recipe.category,
                ingredients: recipe.ingredients || '',
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
                ingredients: '',
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
        const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recipe.ingredients?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'alle' || recipe.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Rezepte</h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {recipes.length} Rezept{recipes.length !== 1 ? 'e' : ''}
                        </p>
                    </div>
                    <Button 
                        onClick={() => openModal()}
                        className="bg-slate-800 hover:bg-slate-900"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Rezept hinzufügen
                    </Button>
                </div>

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
                        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
                            <TabsTrigger value="alle">Alle</TabsTrigger>
                            <TabsTrigger value="Cocktail">Cocktails</TabsTrigger>
                            <TabsTrigger value="Shot">Shots</TabsTrigger>
                            <TabsTrigger value="Longdrink">Longdrinks</TabsTrigger>
                            <TabsTrigger value="Mocktail">Mocktails</TabsTrigger>
                            <TabsTrigger value="Sonstiges">Sonstiges</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Recipes Grid */}
                {filteredRecipes.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRecipes.map(recipe => (
                            <Card key={recipe.id} className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-800 mb-2">{recipe.name}</h3>
                                        <Badge className={cn("text-xs", categoryColors[recipe.category])}>
                                            {recipe.category}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openModal(recipe)}
                                            className="h-8 w-8"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(recipe.id)}
                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm">
                                    {recipe.ingredients && (
                                        <div>
                                            <p className="font-medium text-slate-700 mb-1">Zutaten:</p>
                                            <p className="text-slate-600 whitespace-pre-line text-xs leading-relaxed">
                                                {recipe.ingredients}
                                            </p>
                                        </div>
                                    )}

                                    {recipe.preparation && (
                                        <div>
                                            <p className="font-medium text-slate-700 mb-1">Zubereitung:</p>
                                            <p className="text-slate-600 text-xs leading-relaxed">
                                                {recipe.preparation}
                                            </p>
                                        </div>
                                    )}

                                    {(recipe.glass_type || recipe.garnish) && (
                                        <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                                            {recipe.glass_type && <p>Glas: {recipe.glass_type}</p>}
                                            {recipe.garnish && <p>Garnitur: {recipe.garnish}</p>}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="p-12 bg-white border-0 shadow-sm">
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
                                        <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Zutaten * (eine pro Zeile)</Label>
                                <Textarea
                                    value={formData.ingredients}
                                    onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                                    placeholder="4 cl Rum&#10;3 cl Limettensaft&#10;2 cl Zuckersirup&#10;Minze&#10;Soda"
                                    rows={6}
                                    required
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
            </div>
        </div>
    );
}