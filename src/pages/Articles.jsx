import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Package, Camera, CheckSquare } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import SavedFilters from '@/components/filters/SavedFilters';
import ArticleModal from '@/components/articles/ArticleModal';
import CategoryManager from '@/components/articles/CategoryManager';
import BulkEditModal from '@/components/articles/BulkEditModal';
import LowStockAlert from '@/components/articles/LowStockAlert';
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import PDFExportButton from '@/components/export/PDFExportButton';
import LabelPrinter from '@/components/articles/LabelPrinter';
import BulkImporter from '@/components/articles/BulkImporter';


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
    const [bulkEditOpen, setBulkEditOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [selectedArticles, setSelectedArticles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterSupplier, setFilterSupplier] = useState('all');
    const [filterStock, setFilterStock] = useState('all');

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name')
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['article-categories'],
        queryFn: () => base44.entities.ArticleCategory.list('order')
    });

    const createMutation = useMutation({
        mutationFn: (data) => {
            // Generate barcode if missing
            if (!data.barcode) {
                data.barcode = `GEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            return base44.entities.Article.create(data);
        },
        onSuccess: (newArticle) => {
            // Optimistic update
            queryClient.setQueryData(['articles'], (old) => {
                return old ? [...old, newArticle] : [newArticle];
            });
            queryClient.invalidateQueries(['articles']);
            setModalOpen(false);
            setSelectedArticle(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
        onMutate: async ({ id, data }) => {
            // Optimistic update
            await queryClient.cancelQueries(['articles']);
            const previous = queryClient.getQueryData(['articles']);
            queryClient.setQueryData(['articles'], (old) => {
                return old.map(article => article.id === id ? { ...article, ...data } : article);
            });
            return { previous };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['articles'], context.previous);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['articles']);
            setModalOpen(false);
            setSelectedArticle(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Article.delete(id),
        onMutate: async (id) => {
            // Optimistic update
            await queryClient.cancelQueries(['articles']);
            const previous = queryClient.getQueryData(['articles']);
            queryClient.setQueryData(['articles'], (old) => {
                return old.filter(article => article.id !== id);
            });
            return { previous };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['articles'], context.previous);
        },
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

    const toggleSelectArticle = (article) => {
        setSelectedArticles(prev => 
            prev.find(a => a.id === article.id)
                ? prev.filter(a => a.id !== article.id)
                : [...prev, article]
        );
    };

    const clearSelection = () => {
        setSelectedArticles([]);
    };

    const allSuppliers = [...new Set(articles.flatMap(a => a.suppliers || []))].sort();

    const filteredArticles = articles
        .filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                a.barcode?.includes(searchTerm);
            const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
            const matchesSupplier = filterSupplier === 'all' || a.suppliers?.includes(filterSupplier);
            const matchesStock = filterStock === 'all' ||
                (filterStock === 'niedrig' && a.current_stock <= (a.min_stock || 0)) ||
                (filterStock === 'leer' && a.current_stock === 0);
            return matchesSearch && matchesCategory && matchesSupplier && matchesStock;
        });

    if (!permissions.canEditShopping) {
        return <PermissionDenied />;
    }

    const filterCategories = ['all', ...categories.map(c => c.name)];

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="flex flex-col gap-3 mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Artikeldatenbank</h1>
                        <p className="text-slate-400 text-sm mt-1">Verwalte alle Artikel für die Auffüllliste</p>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                        <BulkImporter />
                        <LabelPrinter articles={filteredArticles} />
                        <PDFExportButton
                            data={filteredArticles}
                            filename="artikel"
                            title="Artikeldatenbank"
                            columns={[
                                { label: 'Name', field: 'name' },
                                { label: 'Barcode', field: 'barcode' },
                                { label: 'Kategorie', field: 'category' },
                                { label: 'Bestand', render: (a) => `${a.current_stock || 0}/${a.min_stock || '-'}` },
                                { label: 'Preis (€)', render: (a) => a.purchase_price?.toFixed(2) || '-' }
                            ]}
                            variant="outline"
                            className="border-green-600 text-white bg-green-600 hover:bg-green-700"
                        />
                        <LowStockAlert />
                        <CategoryManager />
                        {selectedArticles.length > 0 && (
                            <Button 
                                onClick={() => setBulkEditOpen(true)}
                                variant="outline"
                                className="border-amber-600 text-white bg-amber-600 hover:bg-amber-700"
                            >
                                <CheckSquare className="w-4 h-4 mr-2" />
                                Bearbeiten ({selectedArticles.length})
                            </Button>
                        )}
                        <Button 
                            onClick={() => setScannerOpen(true)}
                            variant="outline"
                            className="border-slate-600 text-white bg-slate-600 hover:bg-slate-700"
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
                <Card className="p-4 bg-slate-800 border-slate-700 mb-6">
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Nach Name oder Barcode..."
                                    className="pl-10 bg-slate-900 border-slate-700 text-white"
                                />
                            </div>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white text-sm"
                            >
                                <option value="all">Alle Kategorien</option>
                                {categories.map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                            <select
                                value={filterSupplier}
                                onChange={(e) => setFilterSupplier(e.target.value)}
                                className="px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white text-sm"
                            >
                                <option value="all">Alle Lieferanten</option>
                                {allSuppliers.map(sup => (
                                    <option key={sup} value={sup}>{sup}</option>
                                ))}
                            </select>
                            <select
                                value={filterStock}
                                onChange={(e) => setFilterStock(e.target.value)}
                                className="px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white text-sm"
                            >
                                <option value="all">Alle Bestände</option>
                                <option value="niedrig">Niedrig</option>
                                <option value="leer">Leer</option>
                            </select>
                        </div>
                        <SavedFilters
                            storageKey="articles_saved_filters"
                            currentFilters={{ searchTerm, filterCategory, filterSupplier, filterStock }}
                            onApplyFilter={(filters) => {
                                setSearchTerm(filters.searchTerm || '');
                                setFilterCategory(filters.filterCategory || 'all');
                                setFilterSupplier(filters.filterSupplier || 'all');
                                setFilterStock(filters.filterStock || 'all');
                            }}
                        />
                    </div>
                </Card>

                {/* Articles Grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredArticles.map(article => {
                        const isSelected = selectedArticles.find(a => a.id === article.id);
                        const isLowStock = article.min_stock && article.current_stock < article.min_stock;
                        
                        let touchStartX = 0;
                        let touchEndX = 0;
                        
                        const handleTouchStart = (e) => {
                            touchStartX = e.touches[0].clientX;
                        };
                        
                        const handleTouchEnd = (e) => {
                            touchEndX = e.changedTouches[0].clientX;
                            if (touchStartX - touchEndX > 100) {
                                // Swipe left to delete
                                handleDelete(article.id);
                            }
                        };
                        
                        return (
                            <Card 
                                key={article.id} 
                                className={`p-4 bg-slate-800 border-slate-700 ${isSelected ? 'ring-2 ring-amber-500' : ''} ${isLowStock ? 'border-red-500' : ''}`}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-2 flex-1">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelectArticle(article)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1">
                                            {article.image_url && (
                                                <img 
                                                    src={article.image_url} 
                                                    alt={article.name}
                                                    className="w-full h-24 object-cover rounded-lg mb-2"
                                                />
                                            )}
                                            <h3 className="font-semibold text-white text-sm mb-1">{article.name}</h3>
                                            <p className="text-xs text-slate-400 font-mono">{article.barcode}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
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

                                <div className="space-y-2">
                                    {article.category && (
                                        <Badge style={{ 
                                            backgroundColor: categories.find(c => c.name === article.category)?.color + '20',
                                            color: categories.find(c => c.name === article.category)?.color || '#64748b'
                                        }}>
                                            {article.category}
                                        </Badge>
                                    )}
                                    
                                    <div className="text-xs text-slate-400 space-y-1">
                                        {article.suppliers?.length > 0 && (
                                            <p>📦 {article.suppliers.join(', ')}</p>
                                        )}
                                        {article.quantity && article.unit && (
                                            <p>📦 {article.quantity} {article.unit}</p>
                                        )}
                                        {article.purchase_price && (
                                            <p className="font-semibold text-green-400">💰 {article.purchase_price.toFixed(2)} €</p>
                                        )}
                                        {article.min_stock && (
                                            <p className={isLowStock ? 'text-red-400 font-semibold' : ''}>
                                                📊 Bestand: {article.current_stock || 0} / {article.min_stock}
                                            </p>
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

                <BarcodeScanner
                    open={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={handleScan}
                />

                <BulkEditModal
                    open={bulkEditOpen}
                    onClose={() => setBulkEditOpen(false)}
                    selectedArticles={selectedArticles}
                    onClearSelection={clearSelection}
                />
            </div>
        </div>
    );
}