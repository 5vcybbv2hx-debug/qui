import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Wine, Search, Eye, EyeOff, Link2, TrendingUp } from "lucide-react";
import MenuItemModal from "../components/menu/MenuItemModal";
import MarginCalculator from "../components/menu/MarginCalculator";
import { usePermissions } from "../components/auth/usePermissions";
import PermissionDenied from "../components/auth/PermissionDenied";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRCodeGenerator from "@/components/qr/QRCodeGenerator";
import DailySpecialGenerator from "../components/menu/DailySpecialGenerator";

export default function DrinkMenuPage() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [selectedItem, setSelectedItem] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [expandedItem, setExpandedItem] = useState(null);
    const [qrCodeOpen, setQrCodeOpen] = useState(false);
    const [qrCodeItem, setQrCodeItem] = useState(null);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['menu-items'],
        queryFn: () => base44.entities.MenuItem.list('-category', 1000)
    });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list()
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
        <div className="min-h-screen bg-slate-900 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <Wine className="h-8 w-8 text-amber-400" />
                            Getränkekarte
                        </h1>
                        <p className="text-slate-400 mt-1">Verwaltung der Getränke und Preise</p>
                    </div>
                    {permissions.canEditEmployees && (
                        <Button 
                            onClick={() => { setSelectedItem(null); setShowModal(true); }}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Neues Getränk
                        </Button>
                    )}
                </div>

                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Getränk suchen..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {categories.map(cat => (
                                    <Button
                                        key={cat}
                                        variant={selectedCategory === cat ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedCategory(cat)}
                                        className={selectedCategory === cat 
                                            ? "bg-amber-600 hover:bg-amber-700 text-white" 
                                            : "border-slate-600 text-slate-300 hover:bg-slate-700"}
                                    >
                                        {cat === "all" ? "Alle" : cat}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {permissions.canEditEmployees && (
                    <DailySpecialGenerator menuItems={items} />
                )}

                <div className="space-y-6">
                    {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
                        <div key={category}>
                            <h2 className="text-2xl font-bold text-white mb-4">{category}</h2>
                            <div className="grid gap-4">
                                {categoryItems
                                    .sort((a, b) => (a.order_position || 999) - (b.order_position || 999))
                                    .map(item => (
                                        <Card 
                                            key={item.id} 
                                            className={`bg-slate-800 border-slate-700 ${!item.is_available ? 'opacity-60' : ''}`}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-semibold text-lg text-white">{item.name}</h3>
                                                            {!item.is_available && (
                                                                <Badge className="bg-slate-700 text-slate-300 border-slate-600">Nicht verfügbar</Badge>
                                                            )}
                                                            {item.is_seasonal && (
                                                                <Badge className="bg-green-900/50 text-green-300 border-green-800">Saisonal</Badge>
                                                            )}
                                                            {item.is_special && (
                                                                <Badge className="bg-amber-900/50 text-amber-300 border-amber-800">Special</Badge>
                                                            )}
                                                        </div>
                                                        {item.description && (
                                                            <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                                                        )}
                                                        <div className="flex gap-2 mt-2 flex-wrap items-center">
                                                            <span className="text-xl font-bold text-amber-400">
                                                                {item.price.toFixed(2)} €
                                                            </span>
                                                            {item.size && (
                                                                <Badge variant="outline" className="border-slate-600 text-slate-300">{item.size}</Badge>
                                                            )}
                                                            {item.subcategory && (
                                                                <Badge variant="outline" className="border-slate-600 text-slate-300">{item.subcategory}</Badge>
                                                            )}
                                                            {item.alcohol_content && (
                                                                <Badge variant="outline" className="border-slate-600 text-slate-300">{item.alcohol_content}% Vol.</Badge>
                                                            )}
                                                            {item.linked_article_name && (
                                                               <Badge className="bg-blue-900/50 text-blue-300 border-blue-800">
                                                                   <Link2 className="h-3 w-3 mr-1" />
                                                                   {item.linked_article_name}
                                                               </Badge>
                                                            )}
                                                            </div>

                                                            {/* Allergene anzeigen */}
                                                            {(() => {
                                                            const allergens = item.allergens || 
                                                               (item.linked_article_id && articles.find(a => a.id === item.linked_article_id)?.allergens);
                                                            return allergens ? (
                                                               <div className="mt-2 text-xs text-slate-400">
                                                                   <span className="font-semibold">Allergene:</span> {allergens}
                                                               </div>
                                                            ) : null;
                                                            })()}

                                                        {/* Margin Indicator */}
                                                        {(item.purchase_price || item.use_recipe_calculation || item.linked_article_id) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                                                className="mt-2 text-xs h-7 text-slate-300 hover:text-white hover:bg-slate-700"
                                                            >
                                                                <TrendingUp className="h-3 w-3 mr-1" />
                                                                Marge anzeigen
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {permissions.canEditEmployees && (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setQrCodeItem(item);
                                                                    setQrCodeOpen(true);
                                                                }}
                                                                className="border-blue-600 text-blue-300 hover:bg-blue-900/20"
                                                                title="QR-Code"
                                                            >
                                                                QR
                                                            </Button>
                                                             <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => toggleAvailabilityMutation.mutate({
                                                                    id: item.id,
                                                                    is_available: !item.is_available
                                                                })}
                                                                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
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
                                                                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                                                            >
                                                                Bearbeiten
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Expanded Margin Details */}
                                                {expandedItem === item.id && (
                                                    <div className="mt-4 pt-4 border-t border-slate-700">
                                                        <MarginCalculator menuItem={item} />
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                            </div>
                        </div>
                    ))}
            </div>

                {filteredItems.length === 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-8 text-center text-slate-400">
                            Keine Getränke gefunden
                        </CardContent>
                    </Card>
                )}
            </div>

            {showModal && (
                <MenuItemModal
                    item={selectedItem}
                    open={showModal}
                    onClose={() => { setShowModal(false); setSelectedItem(null); }}
                />
            )}

            {/* QR Code Modal */}
            <Dialog open={qrCodeOpen} onOpenChange={setQrCodeOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            QR-Code: {qrCodeItem?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {qrCodeItem && (
                        <QRCodeGenerator 
                            itemId={qrCodeItem.id} 
                            itemName={qrCodeItem.name}
                            type="menuitem"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}