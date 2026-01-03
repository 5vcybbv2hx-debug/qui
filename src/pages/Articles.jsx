import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Package, Camera, AlertTriangle, TrendingDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import ArticleModal from '@/components/articles/ArticleModal';
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import LowStockAlert from '@/components/articles/LowStockAlert';
import QuickStockUpdate from '@/components/articles/QuickStockUpdate';

const categoryColors = {
    'Spirituosen': 'bg-purple-100 text-purple-700',
    'Bier': 'bg-amber-100 text-amber-700',
    'Wein': 'bg-red-100 text-red-700',
    'Softdrinks': 'bg-blue-100 text-blue-700',
    'Saft': 'bg-orange-100 text-orange-700',
    'Energy': 'bg-yellow-100 text-yellow-700',
    'Wasser': 'bg-cyan-100 text-cyan-700',
    'Snacks': 'bg-green-100 text-green-700',
    'Sonstiges': 'bg-slate-100 text-slate-700'
};

export default function Articles() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [modalOpen, setModalOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [quickUpdateOpen, setQuickUpdateOpen] = useState(false);
    const [quickUpdateArticle, setQuickUpdateArticle] = useState(null);

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name')
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Article.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['articles']);
            setModalOpen(false);
            setSelectedArticle(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['articles']);
            setModalOpen(false);
            setSelectedArticle(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Article.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['articles']);
        }
    });

    const handleSave = (data, id) => {
        if (id) {
            updateMutation.mutate({ id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Artikel wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleScan = (barcode) => {
        const existing = articles.find(a => a.barcode === barcode);
        if (existing) {
            setSelectedArticle(existing);
            setModalOpen(true);
        } else {
            setSelectedArticle({ barcode });
            setModalOpen(true);
        }
    };

    const handleQuickUpdate = (article, quantity) => {
        const newStock = (article.current_stock || 0) + quantity;
        updateMutation.mutate({ 
            id: article.id, 
            data: { ...article, current_stock: newStock }
        });
    };

    const lowStockArticles = articles.filter(a => 
        a.min_stock && a.current_stock !== undefined && a.current_stock < a.min_stock
    );

    const filteredArticles = articles
        .filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                a.barcode?.includes(searchTerm);
            const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
            const matchesLowStock = !showLowStockOnly || (a.min_stock && a.current_stock !== undefined && a.current_stock < a.min_stock);
            return matchesSearch && matchesCategory && matchesLowStock;
        });

    if (!permissions.canEditShopping) {
        return <PermissionDenied />;
    }

    const categories = ['all', ...new Set(articles.map(a => a.category).filter(Boolean))];

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="flex flex-col gap-3 mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Artikeldatenbank</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {lowStockArticles.length > 0 && (
                                <span className="text-red-400 font-medium">
                                    ⚠️ {lowStockArticles.length} Artikel unter Mindestbestand
                                </span>
                            )}
                            {lowStockArticles.length === 0 && 'Verwalte alle Artikel im Sortiment'}
                        </p>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                        {lowStockArticles.length > 0 && <LowStockAlert articles={lowStockArticles} />}
                        <Button 
                            onClick={() => setScannerOpen(true)}
                            variant="outline"
                            className="border-slate-600 hover:bg-slate-700 text-slate-300"
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            Scannen
                        </Button>
                        <Button 
                            onClick={() => {
                                setSelectedArticle(null);
                                setModalOpen(true);
                            }}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Neuer Artikel
                        </Button>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="mb-6 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Suche nach Name oder Barcode..."
                            className="pl-10 bg-slate-800 border-slate-700 text-white"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <Button
                            variant={showLowStockOnly ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                            className={showLowStockOnly ? "bg-red-600 hover:bg-red-700" : "border-slate-600 hover:bg-slate-700 text-slate-300"}
                        >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Niedriger Bestand
                        </Button>
                        {categories.map(cat => (
                            <Button
                                key={cat}
                                variant={filterCategory === cat ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilterCategory(cat)}
                                className={filterCategory === cat ? "bg-amber-600 hover:bg-amber-700" : "border-slate-600 hover:bg-slate-700 text-slate-300"}
                            >
                                {cat === 'all' ? 'Alle' : cat}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Articles Grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredArticles.map(article => {
                        const isLowStock = article.min_stock && article.current_stock !== undefined && article.current_stock < article.min_stock;
                        const stockPercentage = article.min_stock ? (article.current_stock / article.min_stock) * 100 : 100;
                        
                        return (
                            <Card key={article.id} className={`p-4 ${isLowStock ? 'bg-red-950 border-red-800' : 'bg-slate-800 border-slate-700'}`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-white text-sm">{article.name}</h3>
                                            {isLowStock && (
                                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono">{article.barcode}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setQuickUpdateArticle(article);
                                                setQuickUpdateOpen(true);
                                            }}
                                            className="h-8 w-8 text-slate-400 hover:text-white"
                                        >
                                            <Package className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setSelectedArticle(article);
                                                setModalOpen(true);
                                            }}
                                            className="h-8 w-8 text-slate-400 hover:text-white"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(article.id)}
                                            className="h-8 w-8 text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Stock Level Bar */}
                                {article.min_stock && article.current_stock !== undefined && (
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className={isLowStock ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                                                Bestand: {article.current_stock}
                                            </span>
                                            <span className="text-slate-500">
                                                Min: {article.min_stock}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all ${
                                                    stockPercentage < 50 ? 'bg-red-500' :
                                                    stockPercentage < 100 ? 'bg-yellow-500' :
                                                    'bg-green-500'
                                                }`}
                                                style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {article.category && (
                                        <Badge className={categoryColors[article.category]}>
                                            {article.category}
                                        </Badge>
                                    )}
                                    
                                    <div className="text-xs text-slate-400 space-y-1">
                                        {article.supplier && (
                                            <p>📦 {article.supplier}</p>
                                        )}
                                        {article.unit && (
                                            <p>📏 {article.unit}</p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {filteredArticles.length === 0 && (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        <p className="text-slate-400">Keine Artikel gefunden</p>
                    </div>
                )}

                {/* Modals */}
                <ArticleModal
                    open={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedArticle(null);
                    }}
                    article={selectedArticle}
                    onSave={handleSave}
                />

                <QuickStockUpdate
                    open={quickUpdateOpen}
                    onClose={() => {
                        setQuickUpdateOpen(false);
                        setQuickUpdateArticle(null);
                    }}
                    article={quickUpdateArticle}
                    onUpdate={handleQuickUpdate}
                />

                <BarcodeScanner
                    open={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={handleScan}
                />
            </div>
        </div>
    );
}