import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Wine, Search, Eye, EyeOff, Link2, TrendingUp, Calculator, ExternalLink, Copy, QrCode, Info, Share2, AlertTriangle, MoreVertical, Printer } from "lucide-react";
import { ALLERGENS, ADDITIVES } from '../components/menu/AllergenSelector';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import MenuItemModal from "../components/menu/MenuItemModal";
import MarginCalculator from "../components/menu/MarginCalculator";
import { usePermissions } from "../components/auth/usePermissions";
import PermissionDenied from "../components/auth/PermissionDenied";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRCodeGenerator from "@/components/qr/QRCodeGenerator";
import WeeklySpecialGenerator from "../components/menu/WeeklySpecialGenerator";
import { getGuestMenuLink, copyToClipboard, shareLink } from '@/lib/guestLinks';
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

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
    const [editMode, setEditMode] = useState(false);
    const [showAdminSection, setShowAdminSection] = useState(false);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['menu-items'],
        queryFn: () => base44.entities.MenuItem.list('-category', 1000),
        staleTime: 5 * 60 * 1000,
    });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name', 200),
        staleTime: 10 * 60 * 1000,
    });

    const toggleAvailabilityMutation = useMutation({
        mutationFn: ({ id, is_available }) => 
            base44.entities.MenuItem.update(id, { is_available }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menu-items'] });
        }
    });

    if (permissions.isLoading) return <div className="flex justify-center p-8">Lädt...</div>;
    if (!permissions.isManager && !permissions.isAdmin) return <PermissionDenied />;

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

    const getArticleStockStatus = (articleId) => {
        const article = articles.find(a => a.id === articleId);
        return article && article.current_quantity !== undefined && article.min_quantity !== undefined
            ? article.current_quantity < article.min_quantity
            : false;
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 print:p-0">
            <div className="max-w-7xl mx-auto space-y-6 print:space-y-0">
                {/* Header Row */}
                <div className="flex justify-between items-start gap-4 print:hidden">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                            <Wine className="h-8 w-8 text-primary" />
                            Getränkekarte
                        </h1>
                        <p className="text-muted-foreground mt-1">Verwaltung der Getränke und Preise</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                        {(permissions.isAdmin || permissions.isManager) && (
                            <>
                                <Button 
                                    variant="outline"
                                    onClick={handlePrint}
                                    className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                    title="Drucken"
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Drucken</span>
                                </Button>
                                <Button 
                                    variant={editMode ? "default" : "outline"}
                                    onClick={() => setEditMode(!editMode)}
                                    className={editMode ? "bg-amber-500 hover:bg-amber-600 text-background" : ""}
                                    title="Schnell-Bearbeitungsmodus"
                                >
                                    {editMode ? "Bearbeiten beenden" : "Quick Edit"}
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                                            <Link2 className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Gäste-Link</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                        <DropdownMenuItem onClick={() => window.open(getGuestMenuLink(), '_blank')}>
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Im Browser öffnen
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={async () => {
                                            await copyToClipboard(getGuestMenuLink());
                                            setGuestLinkCopied(true);
                                            setTimeout(() => setGuestLinkCopied(false), 2000);
                                        }}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            {guestLinkCopied ? 'Kopiert!' : 'Link kopieren'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => shareLink(getGuestMenuLink(), 'Getränkekarte')}>
                                            <Share2 className="h-4 w-4 mr-2" />
                                            Teilen
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button 
                                    onClick={() => { setSelectedItem(null); setShowModal(true); }}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Neues Getränk</span>
                                    <span className="sm:hidden">+</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Gäste-Link Details (ausklappbar) */}
                <details className="print:hidden">
                    <summary className="cursor-pointer p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 text-amber-500 font-semibold">
                            <Link2 className="h-5 w-5" />
                            Öffentlicher Gästelink
                        </div>
                    </summary>
                    <Card className="bg-card border-border border-amber-500/30 bg-amber-500/5 mt-2">
                        <CardContent className="p-4 space-y-3">
                            <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm break-all text-muted-foreground">
                                {getGuestMenuLink()}
                            </div>
                            <div className="flex gap-2 flex-col sm:flex-row">
                                <Button 
                                    variant="outline" 
                                    className="flex-1 min-h-[44px]" 
                                    onClick={async () => {
                                        await copyToClipboard(getGuestMenuLink());
                                        setGuestLinkCopied(true);
                                        setTimeout(() => setGuestLinkCopied(false), 2000);
                                    }}
                                >
                                    {guestLinkCopied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                                    {guestLinkCopied ? 'Kopiert!' : 'Link kopieren'}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="flex-1 min-h-[44px]" 
                                    onClick={() => window.open(getGuestMenuLink(), '_blank')}
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Öffnen
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="flex-1 min-h-[44px]" 
                                    onClick={() => shareLink(getGuestMenuLink(), 'Getränkekarte')}
                                >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Teilen
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground italic">Kopiere diesen Link oder teile ihn mit Gästen.</p>
                        </CardContent>
                    </Card>
                </details>

                {/* Kategorie-Chips und Suche */}
                <div className="space-y-3 print:hidden">
                    {/* Kategorie-Navigation */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {categories.map(cat => (
                            <Button
                                key={cat}
                                variant={selectedCategory === cat ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(cat)}
                                className={selectedCategory === cat 
                                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shrink-0" 
                                    : "border-border text-muted-foreground hover:bg-muted shrink-0"}
                            >
                                {cat === "all" ? "Alle" : cat}
                            </Button>
                        ))}
                    </div>

                    {/* Suchfeld */}
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Getränk suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                {/* Admin-Section Toggle */}
                {(permissions.isAdmin || permissions.isManager) && (
                    <details className="print:hidden">
                        <summary className="cursor-pointer p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors font-semibold flex items-center gap-2">
                            <span>⚙️ Kalkulation & Specials</span>
                        </summary>
                        <div className="mt-2 space-y-4">
                            {permissions.isAdmin && (
                                <WeeklySpecialGenerator menuItems={items} />
                            )}
                            {/* MarginCalculator könnte hier auch zusätzlich eingebunden werden, wenn nötig */}
                        </div>
                    </details>
                )}

                {/* Leerstand-Warnung */}
                {filteredItems.length === 0 && (
                    <div className="text-center py-16">
                        <Wine className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium text-foreground mb-2">Noch keine Getränke angelegt</p>
                        <p className="text-sm text-muted-foreground mb-4">Füge dein erstes Getränk hinzu, um zu beginnen.</p>
                        {(permissions.isAdmin || permissions.isManager) && (
                            <Button 
                                onClick={() => { setSelectedItem(null); setShowModal(true); }}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Neues Getränk
                            </Button>
                        )}
                    </div>
                )}

                {/* Getränke-Grid */}
                {filteredItems.length > 0 && (
                    <div className="space-y-8 print:space-y-4">
                        {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
                            <div key={category}>
                                <h2 className="text-lg font-semibold text-foreground mb-4 print:mb-2">{category}</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 print:grid-cols-3 print:gap-2">
                                    {categoryItems
                                        .sort((a, b) => (a.order_position || 999) - (b.order_position || 999))
                                        .map(item => (
                                            <div 
                                                key={item.id}
                                                className={cn(
                                                    "rounded-lg border border-border bg-card p-3 cursor-pointer transition-all hover:shadow-md print:page-break-inside-avoid",
                                                    !item.is_available ? 'opacity-50' : 'hover:border-primary'
                                                )}
                                                onClick={() => {
                                                    if (!editMode && (permissions.isAdmin || permissions.isManager)) {
                                                        setSelectedItem(item);
                                                        setShowModal(true);
                                                    }
                                                }}
                                            >
                                                {/* Top: Name + Badges */}
                                                <div className="mb-2">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h3 className="font-bold text-sm text-foreground leading-tight flex-1">
                                                            {item.name}
                                                        </h3>
                                                        {(permissions.isAdmin || permissions.isManager) && editMode && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                        <MoreVertical className="h-3 w-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedItem(item);
                                                                        setShowModal(true);
                                                                    }}>
                                                                        Bearbeiten
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleAvailabilityMutation.mutate({
                                                                            id: item.id,
                                                                            is_available: !item.is_available
                                                                        });
                                                                    }}>
                                                                        {item.is_available ? 'Nicht verfügbar' : 'Verfügbar'}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setQrCodeItem(item);
                                                                        setQrCodeOpen(true);
                                                                    }}>
                                                                        QR-Code
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {!item.is_available && (
                                                            <Badge variant="muted" className="text-[10px]">Nicht verfügbar</Badge>
                                                        )}
                                                        {item.is_seasonal && (
                                                            <Badge variant="success" className="text-[10px]">Saisonal</Badge>
                                                        )}
                                                        {item.is_special && (
                                                            <Badge variant="warning" className="text-[10px]">Special</Badge>
                                                        )}
                                                        {(permissions.isAdmin || permissions.isManager) && getArticleStockStatus(item.linked_article_id) && (
                                                            <Badge variant="destructive" className="text-[10px]" title="Bestand niedrig">
                                                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                                                Bestand
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Mitte: Beschreibung */}
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{item.description}</p>
                                                )}

                                                {/* Unten: Preis + Größe */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={cn(
                                                        "text-sm font-bold text-primary",
                                                        !item.is_available && "line-through text-muted-foreground"
                                                    )}>
                                                        {item.price.toFixed(2)} €
                                                    </span>
                                                    {item.size && (
                                                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{item.size}</Badge>
                                                    )}
                                                </div>

                                                {/* Quick-Toggle im Edit-Mode */}
                                                {editMode && (permissions.isAdmin || permissions.isManager) && (
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleAvailabilityMutation.mutate({
                                                                id: item.id,
                                                                is_available: !item.is_available
                                                            });
                                                        }}
                                                        className={cn(
                                                            "w-full mt-2 text-xs h-7",
                                                            item.is_available 
                                                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                                                : "bg-red-600 hover:bg-red-700 text-white"
                                                        )}
                                                    >
                                                        {item.is_available ? '✓ Verfügbar' : '✗ Nicht verfügbar'}
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
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
                                            <p className="text-xs font-semibold text-red-500 mb-1.5">Allergene</p>
                                            <div className="space-y-0.5">
                                                {usedAllergens.map((a, i) => (
                                                    <p key={a} className="text-xs text-muted-foreground">
                                                        <span className="text-red-500 font-mono mr-1">{String.fromCharCode(65 + i)}</span> = {a}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {usedAdditives.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-blue-500 mb-1.5">Zusatzstoffe</p>
                                            <div className="space-y-0.5">
                                                {usedAdditives.map((d, i) => (
                                                    <p key={d} className="text-xs text-muted-foreground">
                                                        <span className="text-blue-500 font-mono mr-1">{i + 1}</span> = {d}
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

            {/* Print Styles */}
            <style>{`
                @media print {
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .print\\:page-break-inside-avoid { page-break-inside: avoid; }
                    .print\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                    .print\\:gap-2 { gap: 0.5rem; }
                    .print\\:space-y-4 > * + * { margin-top: 1rem; }
                    .print\\:mb-2 { margin-bottom: 0.5rem; }
                    .print\\:p-0 { padding: 0; }
                    .print\\:space-y-0 > * + * { margin-top: 0; }
                }
            `}</style>
        </div>
    );
}