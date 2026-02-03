import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ShoppingCart, Scan, TrendingDown, ClipboardCheck } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';

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
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">Lagerverwaltung</h1>
                    <p className="text-slate-400 text-sm mt-1">Artikel, Einkauf, Auffüllen und Inventur</p>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5 bg-slate-800 border-slate-700">
                        <TabsTrigger value="articles" className="data-[state=active]:bg-amber-600">
                            <Package className="w-4 h-4 mr-2" />
                            Artikel
                        </TabsTrigger>
                        <TabsTrigger value="shopping" className="data-[state=active]:bg-amber-600">
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Einkauf
                        </TabsTrigger>
                        <TabsTrigger value="restock" className="data-[state=active]:bg-amber-600">
                            <Scan className="w-4 h-4 mr-2" />
                            Auffüllen
                        </TabsTrigger>
                        <TabsTrigger value="wastage" className="data-[state=active]:bg-amber-600">
                            <TrendingDown className="w-4 h-4 mr-2" />
                            Schwund
                        </TabsTrigger>
                        <TabsTrigger value="inventory" className="data-[state=active]:bg-amber-600">
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Inventur
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="articles" className="space-y-0">
                        <ArticlesPage />
                    </TabsContent>

                    <TabsContent value="shopping" className="space-y-0">
                        <ShoppingPage />
                    </TabsContent>

                    <TabsContent value="restock" className="space-y-0">
                        <RestockPage />
                    </TabsContent>

                    <TabsContent value="wastage" className="space-y-0">
                        <WastagePage />
                    </TabsContent>

                    <TabsContent value="inventory" className="space-y-0">
                        <InventoryPage />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}