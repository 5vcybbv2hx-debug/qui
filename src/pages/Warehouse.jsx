import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ShoppingCart, Scan, TrendingDown, ClipboardCheck } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { useErrorHandler } from '@/components/error/ErrorHandler';
import { useQueryClient } from '@tanstack/react-query';

// Import existing page components
import ArticlesPage from './Articles';
import ShoppingPage from './Shopping';
import RestockPage from './Restock';
import WastagePage from './Wastage';
import InventoryPage from './Inventory';

export default function WarehousePage() {
    const permissions = usePermissions();
    const [activeTab, setActiveTab] = useState('articles');

    if (!permissions.canViewShopping) {
        return <PermissionDenied message="Du hast keine Berechtigung für die Lagerverwaltung." />;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bestand</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">Artikel, Einkauf, Auffüllen und Inventur</p>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                    <TabsList className="grid w-full grid-cols-5 bg-card border border-border h-auto p-1">
                        {permissions.isManager && (
                            <TabsTrigger value="articles" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                                <Package className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Artikel</span>
                                <span className="sm:hidden">Artikel</span>
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="shopping" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                            <ShoppingCart className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Einkauf</span>
                            <span className="sm:hidden">Kauf</span>
                        </TabsTrigger>
                        <TabsTrigger value="restock" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                            <Scan className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Auffüllen</span>
                        </TabsTrigger>
                        {permissions.canViewWastage && (
                            <TabsTrigger value="wastage" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                                <TrendingDown className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span>Schwund</span>
                            </TabsTrigger>
                        )}
                        {permissions.canViewInventory && (
                            <TabsTrigger value="inventory" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                                <ClipboardCheck className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span>Inventur</span>
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {permissions.isManager && activeTab === 'articles' && (
                        <TabsContent value="articles" className="space-y-0">
                            <ArticlesPage />
                        </TabsContent>
                    )}

                    {activeTab === 'shopping' && (
                        <TabsContent value="shopping" className="space-y-0">
                            <ShoppingPage />
                        </TabsContent>
                    )}

                    {activeTab === 'restock' && (
                        <TabsContent value="restock" className="space-y-0">
                            <RestockPage />
                        </TabsContent>
                    )}

                    {permissions.canViewWastage && activeTab === 'wastage' && (
                        <TabsContent value="wastage" className="space-y-0">
                            <WastagePage />
                        </TabsContent>
                    )}

                    {permissions.canViewInventory && activeTab === 'inventory' && (
                        <TabsContent value="inventory" className="space-y-0">
                            <InventoryPage />
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}