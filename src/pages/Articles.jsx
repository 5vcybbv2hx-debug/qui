import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Camera, CheckSquare, Package, GripVertical } from 'lucide-react';
import { ErrorFallback, useErrorHandler } from '@/components/error/ErrorHandler';
import { useIsMobile } from '@/components/utils/useIsMobile';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import ArticleCard from '@/components/articles/ArticleCard';
import { useAlertDialog } from '@/components/ui/use-alert-dialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { queueMutation, syncMutations } from '@/components/utils/offlineSync';

export default function Articles() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const isMobile = useIsMobile();
    const { confirm, Dialog: alertDialog } = useAlertDialog();
    const categoryRefs = useRef({});

    useEffect(() => {
        const handleOnline = () => syncMutations(base44).catch(console.error);
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    const [modalOpen, setModalOpen] = useState(false);
    const [bulkEditOpen, setBulkEditOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [selectedArticleIds, setSelectedArticleIds] = useState(new Set());
    const [selectedArticlesData, setSelectedArticlesData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterSupplier, setFilterSupplier] = useState('all');
    const [filterStock, setFilterStock] = useState('all');
    const [filterManufacturer, setFilterManufacturer] = useState('all');

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('order'),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['article-categories'],
        queryFn: () => base44.entities.ArticleCategory.list('order'),
        staleTime: 30 * 60 * 1000,
        gcTime: 60 * 60 * 1000
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            if (!data.barcode) {
                data.barcode = `GEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            if (!navigator.onLine) {
                await queueMutation({ entityName: 'Article', type: 'create', data });
                return { ...data, id: `offline-${Date.now()}`, _offline: true };
            }
            return base44.entities.Article.create(data);
        },
        onSuccess: (newArticle) => {
            queryClient.setQueryData(['articles'], (old) => old ? [...old, newArticle] : [newArticle]);
            if (!newArticle._offline) queryClient.invalidateQueries(['articles']);
            setModalOpen(false);
            setSelectedArticle(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            if (!navigator.onLine) {
                await queueMutation({ entityName: 'Article', type: 'update', id, data });
                return { queued: true };
            }
            return base44.entities.Article.update(id, data);
        },
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries(['articles']);
            const previous = queryClient.getQueryData(['articles']);
            queryClient.setQueryData(['articles'], (old) => old.map(a => a.id === id ? { ...a, ...data } : a));
            return { previous };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['articles'], context.previous);
        },
        onSuccess: (result) => {
            if (!result?.queued) queryClient.invalidateQueries(['articles']);
            setModalOpen(false);
            setSelectedArticle(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            if (!navigator.onLine) {
                await queueMutation({ entityName: 'Article', type: 'delete', id });
                return { queued: true };
            }
            return base44.entities.Article.delete(id);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries(['articles']);
            const previous = queryClient.getQueryData(['articles']);
            queryClient.setQueryData(['articles'], (old) => old.filter(a => a.id !== id));
            return { previous };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['articles'], context.previous);
        },
        onSuccess: (result) => {
            if (!result?.queued) queryClient.invalidateQueries(['articles']);
        }
    });

    const handleSave = useCallback((data, id) => {
        if (id) updateMutation.mutate({ id, data });
        else createMutation.mutate(data);
    }, [updateMutation, createMutation]);

    const handleDelete = useCallback((id) => {
        confirm('Artikel löschen', 'Möchtest du diesen Artikel wirklich löschen?',
            () => deleteMutation.mutate(id), undefined, 'destructive');
    }, [confirm, deleteMutation]);

    const handleScan = useCallback((barcode) => {
        const existing = articles.find(a => a.barcode === barcode);
        if (isMobile) {
            navigate(createPageUrl('ArticleEdit'), { state: { article: existing || { barcode } } });
        } else {
            setSelectedArticle(existing || { barcode });
            setModalOpen(true);
        }
    }, [articles, isMobile, navigate]);

    const handleEdit = useCallback((article) => {
        if (isMobile) navigate(createPageUrl('ArticleEdit'), { state: { article } });
        else { setSelectedArticle(article); setModalOpen(true); }
    }, [isMobile, navigate]);

    const handleAdd = useCallback(() => {
        if (isMobile) navigate(createPageUrl('ArticleEdit'));
        else { setSelectedArticle(null); setModalOpen(true); }
    }, [isMobile, navigate]);

    const toggleSelectArticle = useCallback((article) => {
        setSelectedArticleIds(prev => {
            const next = new Set(prev);
            if (next.has(article.id)) next.delete(article.id);
            else next.add(article.id);
            return next;
        });
        setSelectedArticlesData(prev =>
            prev.find(a => a.id === article.id)
                ? prev.filter(a => a.id !== article.id)
                : [...prev, article]
        );
    }, []);

    const allSuppliers = useMemo(() =>
        [...new Set(articles.flatMap(a => a.suppliers || []))].sort(), [articles]);

    const allManufacturers = useMemo(() =>
        [...new Set(articles.map(a => a.manufacturer).filter(Boolean))].sort(), [articles]);

    const baseFilteredArticles = useMemo(() =>
        articles.filter(a => {
            const q = searchTerm.toLowerCase();
            const matchesSearch = a.name.toLowerCase().includes(q) || a.barcode?.includes(searchTerm) || (a.manufacturer || '').toLowerCase().includes(q);
            const matchesSupplier = filterSupplier === 'all' || a.suppliers?.includes(filterSupplier);
            const matchesManufacturer = filterManufacturer === 'all' || a.manufacturer === filterManufacturer;
            const matchesStock = filterStock === 'all' ||
                (filterStock === 'niedrig' && a.current_stock <= (a.min_stock || 0)) ||
                (filterStock === 'leer' && a.current_stock === 0);
            return matchesSearch && matchesSupplier && matchesManufacturer && matchesStock;
        }),
        [articles, searchTerm, filterSupplier, filterManufacturer, filterStock]
    );

    // Grouped by category (respects category order)
    const groupedArticles = useMemo(() => {
        const catNames = categories.map(c => c.name);
        const uncategorized = baseFilteredArticles.filter(a => !a.category || !catNames.includes(a.category));
        const groups = categories
            .filter(cat => filterCategory === 'all' || cat.name === filterCategory)
            .map(cat => ({
                category: cat,
                articles: baseFilteredArticles.filter(a => a.category === cat.name)
            }))
            .filter(g => g.articles.length > 0);

        if (uncategorized.length > 0 && (filterCategory === 'all')) {
            groups.push({ category: { id: '__uncategorized', name: 'Sonstiges' }, articles: uncategorized });
        }
        return groups;
    }, [baseFilteredArticles, categories, filterCategory]);

    const handleDragEnd = useCallback(async (result) => {
        const { source, destination, type } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        if (type === 'CATEGORY') {
            // Reorder categories
            const reordered = Array.from(categories);
            const [moved] = reordered.splice(source.index, 1);
            reordered.splice(destination.index, 0, moved);

            // Optimistic update
            queryClient.setQueryData(['article-categories'], reordered);

            // Persist
            await Promise.all(reordered.map((cat, idx) =>
                base44.entities.ArticleCategory.update(cat.id, { order: idx })
            ));
            queryClient.invalidateQueries(['article-categories']);

        } else if (type === 'ARTICLE') {
            const categoryName = source.droppableId;
            const destCategoryName = destination.droppableId;
            const currentArticles = Array.from(articles);

            const categoryArticles = currentArticles
                .filter(a => a.category === categoryName)
                .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

            const [movedArticle] = categoryArticles.splice(source.index, 1);

            if (categoryName === destCategoryName) {
                // Same category reorder
                categoryArticles.splice(destination.index, 0, movedArticle);
                const updated = currentArticles.map(a => {
                    const idx = categoryArticles.findIndex(ca => ca.id === a.id);
                    if (idx !== -1) return { ...a, order: idx };
                    return a;
                });
                queryClient.setQueryData(['articles'], updated);
                await Promise.all(categoryArticles.map((a, idx) =>
                    base44.entities.Article.update(a.id, { order: idx })
                ));
            } else {
                // Move to different category
                const destArticles = currentArticles
                    .filter(a => a.category === destCategoryName)
                    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

                destArticles.splice(destination.index, 0, { ...movedArticle, category: destCategoryName });

                const updated = currentArticles.map(a => {
                    if (a.id === movedArticle.id) return { ...a, category: destCategoryName, order: destination.index };
                    const destIdx = destArticles.findIndex(da => da.id === a.id);
                    if (destIdx !== -1) return { ...a, order: destIdx };
                    const srcIdx = categoryArticles.findIndex(sa => sa.id === a.id);
                    if (srcIdx !== -1) return { ...a, order: srcIdx };
                    return a;
                });
                queryClient.setQueryData(['articles'], updated);

                await base44.entities.Article.update(movedArticle.id, { category: destCategoryName, order: destination.index });
                await Promise.all(destArticles.filter(a => a.id !== movedArticle.id).map((a, idx) =>
                    base44.entities.Article.update(a.id, { order: idx >= destination.index ? idx + 1 : idx })
                ));
            }
            queryClient.invalidateQueries(['articles']);
        }
    }, [articles, categories, queryClient]);

    const scrollToCategory = (catName) => {
        setFilterCategory('all');
        setTimeout(() => {
            categoryRefs.current[catName]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    };

    const articleCountByCategory = useMemo(() => {
        const counts = {};
        baseFilteredArticles.forEach(a => {
            counts[a.category || 'Sonstiges'] = (counts[a.category || 'Sonstiges'] || 0) + 1;
        });
        return counts;
    }, [baseFilteredArticles]);

    if (!permissions.canEditShopping) return <PermissionDenied />;

    return (
        <div>
            <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8 pb-24 md:pb-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Artikel</h1>
                        <p className="text-muted-foreground text-sm mt-1">Verwalte alle Artikel für die Auffüllliste</p>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                        <BulkImporter />
                        <LabelPrinter articles={baseFilteredArticles} />
                        {permissions.isManager && (
                            <PDFExportButton
                                data={baseFilteredArticles}
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
                        )}
                        <LowStockAlert />
                        <CategoryManager />
                        {selectedArticlesData.length > 0 && (
                            <Button onClick={() => setBulkEditOpen(true)} variant="outline"
                                className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                                <CheckSquare className="w-4 h-4 mr-2" />
                                Auswahl ({selectedArticlesData.length})
                            </Button>
                        )}
                        <Button onClick={() => setScannerOpen(true)} variant="outline">
                            <Camera className="w-4 h-4 mr-2" />
                            Scannen
                        </Button>
                        <Button onClick={handleAdd} className="bg-amber-600 hover:bg-amber-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Neuer Artikel
                        </Button>
                    </div>
                </div>

                {/* Search & Filter */}
                <Card className="p-4 bg-card border-border mb-6">
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Nach Name oder Barcode suchen..."
                                className="pl-10 h-10"
                            />
                        </div>

                        {/* Kategorie-Chips */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                            <button
                                onClick={() => setFilterCategory('all')}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap border ${
                                    filterCategory === 'all'
                                        ? 'bg-amber-500 text-slate-900 border-amber-500'
                                        : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                                }`}
                            >
                                Alle <span className="opacity-60">({baseFilteredArticles.length})</span>
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        if (filterCategory === cat.name) scrollToCategory(cat.name);
                                        else setFilterCategory(cat.name);
                                    }}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap border ${
                                        filterCategory === cat.name
                                            ? 'bg-amber-500 text-slate-900 border-amber-500'
                                            : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                                    }`}
                                >
                                    {cat.name}
                                    {articleCountByCategory[cat.name] ? (
                                        <span className="ml-1 opacity-60">({articleCountByCategory[cat.name]})</span>
                                    ) : null}
                                </button>
                            ))}
                        </div>

                        {/* Lieferant, Hersteller & Bestand */}
                        <div className="flex gap-2 flex-wrap">
                            <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)}
                                className="flex-1 min-w-[120px] h-9 px-3 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                                <option value="all">Alle Lieferanten</option>
                                {allSuppliers.map(sup => <option key={sup} value={sup}>{sup}</option>)}
                            </select>
                            {allManufacturers.length > 0 && (
                                <select value={filterManufacturer} onChange={(e) => setFilterManufacturer(e.target.value)}
                                    className="flex-1 min-w-[120px] h-9 px-3 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                                    <option value="all">Alle Hersteller</option>
                                    {allManufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            )}
                            <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)}
                                className="flex-1 min-w-[100px] h-9 px-3 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                                <option value="all">Alle Bestände</option>
                                <option value="niedrig">Niedrig</option>
                                <option value="leer">Leer</option>
                            </select>
                        </div>

                        <SavedFilters
                            storageKey="articles_saved_filters"
                            currentFilters={{ searchTerm, filterCategory, filterSupplier, filterManufacturer, filterStock }}
                            onApplyFilter={(filters) => {
                                setSearchTerm(filters.searchTerm || '');
                                setFilterCategory(filters.filterCategory || 'all');
                                setFilterSupplier(filters.filterSupplier || 'all');
                                setFilterManufacturer(filters.filterManufacturer || 'all');
                                setFilterStock(filters.filterStock || 'all');
                            }}
                        />
                    </div>
                </Card>

                {/* Grouped Articles with Drag & Drop */}
                <DragDropContext onDragEnd={handleDragEnd}>
                    {/* Category reorder only when showing all & not filtering */}
                    <Droppable droppableId="categories" type="CATEGORY">
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-8">
                                {groupedArticles.map((group, groupIdx) => (
                                    <Draggable
                                        key={group.category.id}
                                        draggableId={`cat-${group.category.id}`}
                                        index={groupIdx}
                                        isDragDisabled={filterCategory !== 'all' || group.category.id === '__uncategorized'}
                                    >
                                        {(catProvided, catSnapshot) => (
                                            <div
                                                ref={catProvided.innerRef}
                                                {...catProvided.draggableProps}
                                                className={`${catSnapshot.isDragging ? 'opacity-80' : ''}`}
                                            >
                                                {/* Category Header */}
                                                <div
                                                    ref={el => categoryRefs.current[group.category.name] = el}
                                                    className="flex items-center gap-2 mb-3"
                                                >
                                                    {filterCategory === 'all' && group.category.id !== '__uncategorized' && (
                                                        <div {...catProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                                        {group.category.name}
                                                    </h2>
                                                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                                        {group.articles.length}
                                                    </span>
                                                    <div className="flex-1 h-px bg-border" />
                                                </div>

                                                {/* Articles in category */}
                                                <Droppable droppableId={group.category.name} type="ARTICLE" direction="horizontal">
                                                    {(artProvided, artSnapshot) => (
                                                        <div
                                                            ref={artProvided.innerRef}
                                                            {...artProvided.droppableProps}
                                                            className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 min-h-[80px] rounded-lg transition-colors ${
                                                                artSnapshot.isDraggingOver ? 'bg-secondary/50 ring-1 ring-amber-500/30' : ''
                                                            }`}
                                                        >
                                                            {group.articles.map((article, artIdx) => {
                                                                const isSelected = selectedArticleIds.has(article.id);
                                                                const isLowStock = article.min_stock && article.current_stock < article.min_stock;
                                                                return (
                                                                    <Draggable key={article.id} draggableId={article.id} index={artIdx}>
                                                                        {(aDraggable, aSnapshot) => (
                                                                            <div
                                                                                ref={aDraggable.innerRef}
                                                                                {...aDraggable.draggableProps}
                                                                                className={aSnapshot.isDragging ? 'opacity-80 z-50' : ''}
                                                                            >
                                                                                <ArticleCard
                                                                                   article={article}
                                                                                   isSelected={isSelected}
                                                                                   isLowStock={isLowStock}
                                                                                   categories={categories}
                                                                                   onToggleSelect={toggleSelectArticle}
                                                                                   onEdit={handleEdit}
                                                                                   onDelete={handleDelete}
                                                                                   dragHandleProps={aDraggable.dragHandleProps}
                                                                                   isManager={permissions.isManager}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                );
                                                            })}
                                                            {artProvided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                {groupedArticles.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="font-medium">Keine Artikel gefunden</p>
                        <p className="text-sm mt-1">Passe deine Suchkriterien an oder erstelle einen neuen Artikel.</p>
                    </div>
                )}

                {!isMobile && (
                    <ArticleModal
                        open={modalOpen}
                        onClose={() => { setModalOpen(false); setSelectedArticle(null); }}
                        article={selectedArticle}
                        onSave={handleSave}
                    />
                )}

                <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
                <BulkEditModal open={bulkEditOpen} onClose={() => setBulkEditOpen(false)}
                    selectedArticles={selectedArticlesData} onClearSelection={() => { setSelectedArticleIds(new Set()); setSelectedArticlesData([]); }} />
                {alertDialog}
            </div>
        </div>
    );
}