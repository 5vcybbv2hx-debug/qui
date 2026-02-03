import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Wine, Search, Eye, EyeOff } from "lucide-react";
import MenuItemModal from "../components/menu/MenuItemModal";
import { usePermissions } from "../components/auth/usePermissions";
import PermissionDenied from "../components/auth/PermissionDenied";

export default function DrinkMenuPage() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [selectedItem, setSelectedItem] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['menu-items'],
        queryFn: () => base44.entities.MenuItem.list('-category', 1000)
    });

    const toggleAvailabilityMutation = useMutation({
        mutationFn: ({ id, is_available }) => 
            base44.entities.MenuItem.update(id, { is_available }),
        onSuccess: () => {
            queryClient.invalidateQueries(['menu-items']);
        }
    });

    if (permissions.loading) return <div className="flex justify-center p-8">Lädt...</div>;
    if (!permissions.canViewEmployees) return <PermissionDenied />;

    const categories = ["all", ...new Set(items.map(item => item.category))];
    
    const filteredItems = items
        .filter(item => 
            (selectedCategory === "all" || item.category === selectedCategory) &&
            (searchTerm === "" || 
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );

    const groupedByCategory = filteredItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    return (
        <div className="p-4 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Wine className="h-8 w-8" />
                        Getränkekarte
                    </h1>
                    <p className="text-muted-foreground mt-1">Verwaltung der Getränke und Preise</p>
                </div>
                {permissions.canEditEmployees && (
                    <Button onClick={() => { setSelectedItem(null); setShowModal(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Neues Getränk
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Getränk suchen..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {categories.map(cat => (
                                <Button
                                    key={cat}
                                    variant={selectedCategory === cat ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat === "all" ? "Alle" : cat}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
                    <div key={category}>
                        <h2 className="text-2xl font-bold mb-4">{category}</h2>
                        <div className="grid gap-4">
                            {categoryItems
                                .sort((a, b) => (a.order_position || 999) - (b.order_position || 999))
                                .map(item => (
                                    <Card key={item.id} className={!item.is_available ? 'opacity-60' : ''}>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-lg">{item.name}</h3>
                                                        {!item.is_available && (
                                                            <Badge variant="secondary">Nicht verfügbar</Badge>
                                                        )}
                                                        {item.is_seasonal && (
                                                            <Badge className="bg-green-100 text-green-800">Saisonal</Badge>
                                                        )}
                                                        {item.is_special && (
                                                            <Badge className="bg-yellow-100 text-yellow-800">Special</Badge>
                                                        )}
                                                    </div>
                                                    {item.description && (
                                                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                                    )}
                                                    <div className="flex gap-2 mt-2 flex-wrap items-center">
                                                        <span className="text-xl font-bold text-primary">
                                                            {item.price.toFixed(2)} €
                                                        </span>
                                                        {item.size && (
                                                            <Badge variant="outline">{item.size}</Badge>
                                                        )}
                                                        {item.subcategory && (
                                                            <Badge variant="outline">{item.subcategory}</Badge>
                                                        )}
                                                        {item.alcohol_content && (
                                                            <Badge variant="outline">{item.alcohol_content}% Vol.</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                {permissions.canEditEmployees && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => toggleAvailabilityMutation.mutate({
                                                                id: item.id,
                                                                is_available: !item.is_available
                                                            })}
                                                        >
                                                            {item.is_available ? (
                                                                <EyeOff className="h-4 w-4" />
                                                            ) : (
                                                                <Eye className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => { setSelectedItem(item); setShowModal(true); }}
                                                        >
                                                            Bearbeiten
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    </div>
                ))}
            </div>

            {filteredItems.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        Keine Getränke gefunden
                    </CardContent>
                </Card>
            )}

            {showModal && (
                <MenuItemModal
                    item={selectedItem}
                    open={showModal}
                    onClose={() => { setShowModal(false); setSelectedItem(null); }}
                />
            )}
        </div>
    );
}