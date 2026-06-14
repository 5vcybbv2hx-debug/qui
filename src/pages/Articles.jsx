/**
 * Articles — Artikelverwaltung + integrierter Inventur-Modus
 * - Keine eigene Inventory.jsx mehr nötig
 * - Artikel deaktivieren statt löschen
 * - Edit via ArticleModal (kein Seitenwechsel)
 * - Kategorie-Chips horizontal scrollbar
 * - Inventur-Modus per Chip oben
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE } from '@/lib/queryUtils';
import {
    Plus, Search, Camera, Package, AlertTriangle,
    ClipboardCheck, Save, RotateCcw, MoreVertical,
    EyeOff, Eye, ChevronDown, Minus, Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import ArticleModal from '@/components/articles/ArticleModal';
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import CategoryManager from '@/components/articles/CategoryManager';
import PDFExportButton from '@/components/export/PDFExportButton';
import BulkImporter from '@/components/articles/BulkImporter';
import LabelPrinter from '@/components/articles/LabelPrinter';
import LazyImage from '@/components/ui/lazy-image';
import { queueMutation, syncMutations } from '@/components/utils/offlineSync';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ── Modus ─────────────────────────────────────────────────────────────────────
const MODES = [
    { key: 'artikel',  label: '📦 Artikel'  },
    { key: 'inventur', label: '📋 Inventur' },
];

// ── Artikel-Zeile (Artikel-Modus) ─────────────────────────────────────────────
function ArticleRow({ article, isLowStock, onEdit, onToggleActive, isManager }) {
    const stock    = article.current_stock ?? 0;
    const minStock = article.min_stock ?? 0;

    return (
        <div
            onClick={() => onEdit(article)}
            className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer active:scale-[0.99]',
                article.is_active === false
                    ? 'opacity-40 bg-secondary/20 border-border/30'
                    : isLowStock
                    ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40'
                    : 'bg-card border-border/50 hover:border-border hover:bg-accent/20'
            )}>
            {/* Bild */}
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary/50 shrink-0">
                {article.image_url ? (
                    <LazyImage src={article.image_url} alt={article.name}
                        className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{article.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {/* Bestand */}
                    <span className={cn(
                        'text-xs font-medium',
                        isLowStock ? 'text-orange-400' : 'text-muted-foreground'
                    )}>
                        {stock}{minStock > 0 ? ` / ${minStock}` : ''}
                        {article.content_unit ? ` ${article.content_unit}` : ''}
                        {isLowStock && ' ⚠️'}
                    </span>
                    {/* Lieferant */}
                    {article.supplier_details?.[0]?.supplier_name && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                            {article.supplier_details[0].supplier_name}
                        </span>
                    )}
                    {/* Lagerort */}
                    {article.storage_location && (
                        <span className="text-[10px] text-muted-foreground/60">
                            📍 {article.storage_location}
                        </span>
                    )}
                </div>
            </div>

            {/* Aktivieren/Deaktivieren — nur für Manager, stoppt Bubbling */}
            {isManager && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"
                            onClick={e => e.stopPropagation()}
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleActive(article); }}
                            className={article.is_active === false
                                ? 'text-green-400 focus:text-green-400'
                                : 'text-muted-foreground'}>
                            {article.is_active === false ? (
                                <><Eye className="w-4 h-4 mr-2" />Reaktivieren</>
                            ) : (
                                <><EyeOff className="w-4 h-4 mr-2" />Deaktivieren</>
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

// ── Inventur-Zeile ────────────────────────────────────────────────────────────
function InventoryRow({ article, count, onChange }) {
    const stock   = article.current_stock ?? 0;
    const counted = count ?? null;
    const diff    = counted !== null ? counted - stock : null;

    return (
        <div className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
            counted !== null
                ? 'bg-card border-amber-500/30'
                : 'bg-card border-border/40'
        )}>
            {/* Bild */}
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-secondary/50 shrink-0">
                {article.image_url ? (
                    <LazyImage src={article.image_url} alt={article.name}
                        className="w-full h-full object-cover" />
                ) : (
                    <Package className="w-4 h-4 text-muted-foreground/40 m-auto" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{article.name}</p>
                <p className="text-xs text-muted-foreground">
                    System: {stock}
                    {counted !== null && diff !== 0 && (
                        <span className={diff > 0 ? 'text-green-400' : 'text-red-400'}>
                            {' '}({diff > 0 ? '+' : ''}{diff})
                        </span>
                    )}
                    {counted !== null && diff === 0 && (
                        <span className="text-green-400"> ✓</span>
                    )}
                </p>
            </div>

            {/* Zähler */}
            <div className="flex items-center gap-1.5 shrink-0">
                <button
                    onClick={() => onChange(article.id, Math.max(0, (count ?? stock) - 1))}
                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-95">
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                    type="number"
                    value={counted ?? ''}
                    onChange={e => onChange(article.id, e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    placeholder={String(stock)}
                    className="w-14 h-8 text-center text-sm font-semibold rounded-lg border border-border bg-background text-foreground focus:border-amber-500 focus:outline-none"
                />
                <button
                    onClick={() => onChange(article.id, (count ?? stock) + 1)}
                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-95">
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function Articles() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();

    useEffect(() => {
        const handleOnline = () => syncMutations(base44).catch(console.error);
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    // ── State ─────────────────────────────────────────────────────────────────
    const [mode,            setMode]           = useState('artikel');
    const [searchTerm,      setSearchTerm]     = useState('');
    const [filterCategory,  setFilterCategory] = useState('all');
    const [showInactive,    setShowInactive]   = useState(false);
    const [modalOpen,       setModalOpen]      = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [scannerOpen,     setScannerOpen]    = useState(false);
    const [deactivateConfirm, setDeactivateConfirm] = useState(null);

    // Inventur-State
    const [counts,    setCounts]   = useState({});
    const [saveInvConfirm, setSaveInvConfirm] = useState(false);

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('order'),
        staleTime: STALE.MEDIUM,
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['article-categories'],
        queryFn: () => base44.entities.ArticleCategory.list('order'),
        staleTime: STALE.SLOW,
    });

    const { data: currentUser } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me(),
        staleTime: STALE.SLOW,
    });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: async (data) => {
            if (!data.barcode) data.barcode = `GEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            if (!navigator.onLine) {
                await queueMutation({ entityName: 'Article', type: 'create', data });
                return { ...data, id: `offline-${Date.now()}`, _offline: true };
            }
            return base44.entities.Article.create(data);
        },
        onSuccess: (newArticle) => {
            queryClient.setQueryData(['articles'], old => old ? [...old, newArticle] : [newArticle]);
            if (!newArticle._offline) queryClient.invalidateQueries({ queryKey: ['articles'] });
            setModalOpen(false);
            setSelectedArticle(null);
            toast.success('Artikel erstellt');
        },
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
            queryClient.setQueryData(['articles'], old => old?.map(a => a.id === id ? { ...a, ...data } : a));
            return { previous };
        },
        onError: (_, __, context) => queryClient.setQueryData(['articles'], context.previous),
        onSuccess: (result) => {
            if (!result?.queued) queryClient.invalidateQueries({ queryKey: ['articles'] });
            setModalOpen(false);
            setSelectedArticle(null);
        },
    });

    const saveInventoryMutation = useMutation({
        mutationFn: async ({ counts, articles, user }) => {
            const countsData = Object.entries(counts)
                .filter(([, v]) => v !== undefined)
                .map(([id, counted]) => {
                    const a = articles.find(x => x.id === id);
                    const sys = a?.current_stock || 0;
                    return {
                        article_id:    id,
                        article_name:  a?.name,
                        system_stock:  sys,
                        counted_stock: counted,
                        difference:    counted - sys,
                    };
                });
            const totalDiff = countsData.reduce((s, c) => s + Math.abs(c.difference), 0);
            return base44.entities.InventorySession.create({
                date:             new Date().toISOString(),
                counted_by:       user?.full_name || user?.email || 'Unbekannt',
                counts:           countsData,
                total_items:      countsData.length,
                total_difference: totalDiff,
            });
        },
        onSuccess: () => {
            setCounts({});
            toast.success('Inventur gespeichert');
            setMode('artikel');
        },
        onError: err => toast.error('Fehler: ' + err.message),
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleAdd = () => { setSelectedArticle(null); setModalOpen(true); };
    const handleEdit = (article) => { setSelectedArticle(article); setModalOpen(true); };

    const handleSave = (data, id) => {
        if (id) updateMutation.mutate({ id, data });
        else    createMutation.mutate({ ...data, is_active: true });
    };

    const handleToggleActive = (article) => {
        if (article.is_active !== false) {
            // Deaktivieren → Bestätigung
            setDeactivateConfirm(article);
        } else {
            // Reaktivieren → sofort
            updateMutation.mutate({ id: article.id, data: { is_active: true } });
            toast.success(`${article.name} reaktiviert`);
        }
    };

    const handleDeactivateConfirmed = () => {
        if (!deactivateConfirm) return;
        updateMutation.mutate({ id: deactivateConfirm.id, data: { is_active: false } });
        toast.success(`${deactivateConfirm.name} deaktiviert`);
        setDeactivateConfirm(null);
    };

    const handleScannerResult = (barcode) => {
        const article = articles.find(a => a.barcode === barcode);
        if (article) {
            handleEdit(article);
        } else {
            setSelectedArticle({ barcode });
            setModalOpen(true);
        }
        setScannerOpen(false);
    };

    const handleCountChange = (id, val) => {
        setCounts(prev => {
            if (val === undefined) {
                const next = { ...prev };
                delete next[id];
                return next;
            }
            return { ...prev, [id]: parseFloat(val) || 0 };
        });
    };

    const countedCount = Object.keys(counts).length;

    // ── Derived ───────────────────────────────────────────────────────────────
    const activeArticles = useMemo(() =>
        articles.filter(a => showInactive || a.is_active !== false),
        [articles, showInactive]
    );

    const lowStockIds = useMemo(() =>
        new Set(articles.filter(a => a.min_stock > 0 && (a.current_stock ?? 0) < a.min_stock).map(a => a.id)),
        [articles]
    );

    const filteredArticles = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return activeArticles.filter(a => {
            const matchSearch = !q ||
                a.name?.toLowerCase().includes(q) ||
                a.barcode?.includes(q);
            const matchCat = filterCategory === 'all' || a.category === filterCategory;
            return matchSearch && matchCat;
        });
    }, [activeArticles, searchTerm, filterCategory]);

    const groupedArticles = useMemo(() => {
        const catNames = categories.map(c => c.name);
        const groups = categories
            .filter(cat => filterCategory === 'all' || cat.name === filterCategory)
            .map(cat => ({
                cat,
                items: filteredArticles.filter(a => a.category === cat.name),
            }))
            .filter(g => g.items.length > 0);

        const uncategorized = filteredArticles.filter(a => !a.category || !catNames.includes(a.category));
        if (uncategorized.length > 0 && filterCategory === 'all') {
            groups.push({ cat: { id: '__other', name: 'Sonstiges' }, items: uncategorized });
        }
        return groups;
    }, [filteredArticles, categories, filterCategory]);

    const lowStockArticles = useMemo(() =>
        articles.filter(a => a.is_active !== false && lowStockIds.has(a.id)),
        [articles, lowStockIds]
    );

    if (!permissions.canEditShopping) return <PermissionDenied />;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-background pb-24 md:pb-8">
            <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">

                {/* ── Header ────────────────────────────────────────────── */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Package className="w-5 h-5 text-amber-500" />
                            Artikel
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {articles.filter(a => a.is_active !== false).length} aktiv
                            {lowStockArticles.length > 0 && (
                                <span className="text-orange-400"> · {lowStockArticles.length} Nachbestellen</span>
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {permissions.isManager && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 px-2.5">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => setScannerOpen(true)}>
                                        <Camera className="w-4 h-4 mr-2 text-muted-foreground" />
                                        Barcode scannen
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <span><BulkImporter /></span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <span><LabelPrinter articles={filteredArticles} /></span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <span>
                                            <PDFExportButton
                                                data={filteredArticles}
                                                filename="artikel"
                                                title="Artikeldatenbank"
                                                columns={[
                                                    { label: 'Name', field: 'name' },
                                                    { label: 'Barcode', field: 'barcode' },
                                                    { label: 'Kategorie', field: 'category' },
                                                    { label: 'Bestand', render: a => `${a.current_stock || 0}/${a.min_stock || '-'}` },
                                                    { label: 'Preis', render: a => a.purchase_price?.toFixed(2) || '-' },
                                                ]}
                                                variant="ghost"
                                                className="w-full justify-start px-2 h-8 text-sm font-normal"
                                            />
                                        </span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setShowInactive(s => !s)}>
                                        {showInactive
                                            ? <><EyeOff className="w-4 h-4 mr-2" />Inaktive ausblenden</>
                                            : <><Eye className="w-4 h-4 mr-2" />Inaktive anzeigen</>
                                        }
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <CategoryManager />
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button size="sm"
                            onClick={handleAdd}
                            className="h-9 bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                            <Plus className="w-4 h-4" />
                            Neu
                        </Button>
                    </div>
                </div>

                {/* ── Modus-Chips ───────────────────────────────────────── */}
                <div className="flex gap-1.5">
                    {MODES.map(m => (
                        <button key={m.key} onClick={() => setMode(m.key)}
                            className={cn(
                                'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all',
                                mode === m.key
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'border-border text-muted-foreground hover:text-foreground bg-card'
                            )}>
                            {m.label}
                        </button>
                    ))}
                    {/* Inventur: Fortschritt + Speichern */}
                    {mode === 'inventur' && countedCount > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-xs text-muted-foreground">
                                {countedCount} / {filteredArticles.length} gezählt
                            </span>
                            <Button size="sm" variant="outline"
                                onClick={() => { setCounts({}); }}
                                className="h-7 px-2 text-xs text-muted-foreground">
                                <RotateCcw className="w-3 h-3" />
                            </Button>
                            <Button size="sm"
                                onClick={() => setSaveInvConfirm(true)}
                                className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white">
                                <Save className="w-3 h-3 mr-1" />
                                Speichern
                            </Button>
                        </div>
                    )}
                </div>

                {/* ── Suche ─────────────────────────────────────────────── */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Name oder Barcode suchen…"
                        className="pl-9 h-10"
                    />
                </div>

                {/* ── Kategorie-Chips ────────────────────────────────────── */}
                <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
                    {[{ id: 'all', name: 'Alle' }, ...categories].map(cat => (
                        <button key={cat.id} onClick={() => setFilterCategory(cat.id === 'all' ? 'all' : cat.name)}
                            className={cn(
                                'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all',
                                filterCategory === (cat.id === 'all' ? 'all' : cat.name)
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'border-border text-muted-foreground hover:text-foreground bg-card'
                            )}>
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* ── Low-Stock Banner ──────────────────────────────────── */}
                {lowStockArticles.length > 0 && mode === 'artikel' && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-500/25 bg-orange-500/8">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <p className="text-xs text-orange-400 font-medium">
                            {lowStockArticles.length} Artikel unter Mindestbestand:
                            {' '}{lowStockArticles.slice(0, 3).map(a => a.name).join(', ')}
                            {lowStockArticles.length > 3 && ` +${lowStockArticles.length - 3} weitere`}
                        </p>
                    </div>
                )}

                {/* ── Inventur: Fortschrittsbalken ──────────────────────── */}
                {mode === 'inventur' && filteredArticles.length > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Fortschritt</span>
                            <span>{Math.round((countedCount / filteredArticles.length) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                style={{ width: `${(countedCount / filteredArticles.length) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* ── Artikel-Liste / Inventur-Liste ────────────────────── */}
                {groupedArticles.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-semibold text-foreground">Keine Artikel</p>
                        <p className="text-sm mt-1">Füge deinen ersten Artikel hinzu</p>
                    </div>
                ) : groupedArticles.map(({ cat, items }) => (
                    <div key={cat.id} className="space-y-2">
                        {/* Kategorie-Header */}
                        <div className="flex items-center gap-2 px-0.5">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {cat.name}
                            </p>
                            <span className="text-[10px] text-muted-foreground/50">({items.length})</span>
                            <div className="flex-1 h-px bg-border/50" />
                        </div>

                        {/* Artikel */}
                        {items.map(article => (
                            mode === 'inventur' ? (
                                <InventoryRow
                                    key={article.id}
                                    article={article}
                                    count={counts[article.id]}
                                    onChange={handleCountChange}
                                />
                            ) : (
                                <ArticleRow
                                    key={article.id}
                                    article={article}
                                    isLowStock={lowStockIds.has(article.id)}
                                    onEdit={handleEdit}
                                    onToggleActive={handleToggleActive}
                                    isManager={permissions.isManager}
                                />
                            )
                        ))}
                    </div>
                ))}
            </div>

            {/* ── Modals & Dialoge ──────────────────────────────────────── */}
            <ArticleModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedArticle(null); }}
                article={selectedArticle}
                onSave={handleSave}
            />

            <BarcodeScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleScannerResult}
            />

            {/* Deaktivieren-Bestätigung */}
            <AlertDialog open={!!deactivateConfirm} onOpenChange={o => !o && setDeactivateConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Artikel deaktivieren?</AlertDialogTitle>
                        <AlertDialogDescription>
                            „{deactivateConfirm?.name}" wird ausgeblendet und erscheint nicht mehr in Listen.
                            Du kannst den Artikel jederzeit wieder reaktivieren.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeactivateConfirmed}
                            className="bg-secondary text-foreground hover:bg-secondary/80">
                            Deaktivieren
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Inventur speichern */}
            <AlertDialog open={saveInvConfirm} onOpenChange={setSaveInvConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Inventur speichern?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {countedCount} Artikel werden als InventurSession gespeichert.
                            Die Zähldaten werden danach zurückgesetzt.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setSaveInvConfirm(false);
                                saveInventoryMutation.mutate({ counts, articles, user: currentUser });
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white">
                            Speichern
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}