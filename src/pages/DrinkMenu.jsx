import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Wine, Search, Eye, EyeOff, Link2, TrendingUp, Calculator } from "lucide-react";
import MenuItemModal from "../components/menu/MenuItemModal";
import MarginCalculator from "../components/menu/MarginCalculator";
import { usePermissions } from "../components/auth/usePermissions";
import PermissionDenied from "../components/auth/PermissionDenied";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRCodeGenerator from "@/components/qr/QRCodeGenerator";
import DailySpecialGenerator from "../components/menu/DailySpecialGenerator";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DrinkMenuPage() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
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
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                            <Wine className="h-8 w-8 text-primary" />
                            Getränkekarte
                        </h1>
                        <p className="text-muted-foreground mt-1">Verwaltung der Getränke und Preise</p>
                    </div>
                    <div className="flex gap-2">
                        {permissions.canEditEmployees && (
                            <>
                                <Button 
                                    onClick={() => {
                                        const url = `${window.location.origin}${createPageUrl('PublicMenu')}`;
                                        navigator.clipboard.writeText(url);
                                        alert('Link zur öffentlichen Getränkekarte wurde kopiert!\n\nLink: ' + url);
                                    }}
                                    variant="outline"
                                    className="border-primary text-primary hover:bg-primary/10"
                                >
                                    <Link2 className="h-4 w-4 mr-2" />
                                    Gäste-Link
                                </Button>
                                <Button 
                                    onClick={() => { setSelectedItem(null); setShowModal(true); }}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Neues Getränk
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <Card className="bg-card border-border">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Getränk suchen..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
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
                                            ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                                            : "border-border text-muted-foreground hover:bg-accent"}
                                    >
                                        {cat === "all" ? "Alle" : cat}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {permissions.isAdmin && (
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
                                                         className={`bg-card border-border ${!item.is_available ? 'opacity-60' : ''}`}
                                                     >
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-semibold text-lg text-foreground">{item.name}</h3>
                                                             {!item.is_available && (
                                                                 <Badge className="bg-muted text-muted-foreground border-border">Nicht verfügbar</Badge>
                                                            )}
                                                            {item.is_seasonal && (
                                                                <Badge className="bg-green-900/50 text-green-300 border-green-800">Saisonal</Badge>
                                                            )}
                                                            {item.is_special && (
                                                                <Badge className="bg-amber-900/50 text-amber-300 border-amber-800">Special</Badge>
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
                                                                 <Badge variant="outline" className="border-border text-muted-foreground">{item.size}</Badge>
                                                             )}
                                                             {item.subcategory && (
                                                                 <Badge variant="outline" className="border-border text-muted-foreground">{item.subcategory}</Badge>
                                                             )}
                                                             {item.alcohol_content && (
                                                                 <Badge variant="outline" className="border-border text-muted-foreground">{item.alcohol_content}% Vol.</Badge>
                                                            )}
                                                            {item.linked_article_name && (
                                                                <Badge className="bg-accent/50 text-accent-foreground border-accent">
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
                                                                <div className="mt-2 text-xs text-muted-foreground">
                                                                   <span className="font-semibold">Allergene:</span> {allergens}
                                                               </div>
                                                            ) : null;
                                                            })()}

                                                        {/* Margin Indicator & Price Calculator - Admin Only */}
                                                        {permissions.isAdmin && (
                                                            <div className="flex gap-2 mt-2">
                                                                {(item.purchase_price || item.use_recipe_calculation || item.linked_article_id) && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                                                        className="text-xs h-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                                                                    >
                                                                        <TrendingUp className="h-3 w-3 mr-1" />
                                                                        Marge anzeigen
                                                                    </Button>
                                                                )}
                                                                {item.recipe_id && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => navigate(createPageUrl('PriceCalculator') + '?recipe=' + item.recipe_id)}
                                                                        className="text-xs h-7 text-primary hover:text-primary/90 hover:bg-primary/10"
                                                                    >
                                                                        <Calculator className="h-3 w-3 mr-1" />
                                                                        Preis kalkulieren
                                                                    </Button>
                                                                )}
                                                            </div>
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
                                                                className="border-accent text-accent-foreground hover:bg-accent/10"
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

                                                {/* Expanded Margin Details - Admin Only */}
                                                {permissions.isAdmin && expandedItem === item.id && (
                                                    <div className="mt-4 pt-4 border-t border-border">
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
                    <Card className="bg-card border-border">
                        <CardContent className="p-8 text-center text-muted-foreground">
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