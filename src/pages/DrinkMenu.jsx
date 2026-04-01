import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Wine, Search, Eye, EyeOff, Link2, TrendingUp, Calculator, ExternalLink, Copy, QrCode, Info } from "lucide-react";
import { ALLERGENS, ADDITIVES } from '../components/menu/AllergenSelector';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
    const [guestLinkCopied, setGuestLinkCopied] = useState(false);
    const [guestLinkOpen, setGuestLinkOpen] = useState(false);

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
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                                            <Link2 className="h-4 w-4 mr-2" />
                                            Gäste-Link
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                        <DropdownMenuItem onClick={() => {
                                             const appId = window.location.hostname.split('--')[1]?.split('.')[0] || window.location.hostname.split('.')[0];
                                             const url = `https://api.base44.app/api/apps/${appId}/functions/publicDrinkMenu`;
                                             window.open(url, '_blank');
                                         }}>
                                             <ExternalLink className="h-4 w-4 mr-2" />
                                             Im Browser öffnen
                                         </DropdownMenuItem>
                                         <DropdownMenuItem onClick={() => {
                                             const appId = window.location.hostname.split('--')[1]?.split('.')[0] || window.location.hostname.split('.')[0];
                                             const url = `https://api.base44.app/api/apps/${appId}/functions/publicDrinkMenu`;
                                             navigator.clipboard.writeText(url);
                                             setGuestLinkCopied(true);
                                             setTimeout(() => setGuestLinkCopied(false), 2000);
                                         }}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            {guestLinkCopied ? 'Kopiert!' : 'Link kopieren'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate(createPageUrl('QRCodes'))}>
                                            <QrCode className="h-4 w-4 mr-2" />
                                            QR-Code generieren
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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

                                                            {/* Allergene & Zusatzstoffe */}
                                                            {((item.allergens_list?.length > 0) || (item.additives?.length > 0)) && (
                                                                <div className="mt-2 flex flex-wrap gap-1">
                                                                    {(item.allergens_list || []).map(a => (
                                                                        <span key={a} className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 border border-red-500/20 text-red-300">{a}</span>
                                                                    ))}
                                                                    {(item.additives || []).map(d => (
                                                                        <span key={d} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-300">{d}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {/* Legacy allergens text */}
                                                            {item.allergens && !(item.allergens_list?.length > 0) && (
                                                                <div className="mt-1 text-xs text-muted-foreground"><span className="font-semibold">Allergene:</span> {item.allergens}</div>
                                                            )}

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

                {/* Legende */}
                {(() => {
                    const usedAllergens = [...new Set(filteredItems.flatMap(i => i.allergens_list || []))];
                    const usedAdditives = [...new Set(filteredItems.flatMap(i => i.additives || []))];
                    if (usedAllergens.length === 0 && usedAdditives.length === 0) return null;
                    return (
                        <Card className="bg-card border-border mt-6">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-semibold text-foreground">Legende</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {usedAllergens.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-red-300 mb-1.5">Allergene</p>
                                            <div className="space-y-0.5">
                                                {usedAllergens.map((a, i) => (
                                                    <p key={a} className="text-xs text-muted-foreground">
                                                        <span className="text-red-300 font-mono mr-1">{String.fromCharCode(65 + i)}</span> = {a}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {usedAdditives.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-blue-300 mb-1.5">Zusatzstoffe</p>
                                            <div className="space-y-0.5">
                                                {usedAdditives.map((d, i) => (
                                                    <p key={d} className="text-xs text-muted-foreground">
                                                        <span className="text-blue-300 font-mono mr-1">{i + 1}</span> = {d}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-3 italic">Alle Angaben ohne Gewähr. Bei Allergien bitte Personal ansprechen.</p>
                            </CardContent>
                        </Card>
                    );
                })()}
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