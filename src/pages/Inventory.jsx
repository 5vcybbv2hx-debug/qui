import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { STALE } from '@/lib/queryUtils';;
import { ClipboardCheck, Camera, Save, RotateCcw, Search, AlertTriangle, Cloud, CloudOff, Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from '@/components/auth/usePermissions';
import { toast } from 'sonner';
import PermissionDenied from '@/components/auth/PermissionDenied';
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import PDFExportButton from '@/components/export/PDFExportButton';
import { cn } from "@/lib/utils";
import VirtualizedList from '@/components/ui/virtualized-list';

export default function Inventory() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [scannerOpen, setScannerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [counts, setCounts] = useState({});
    const [activeArticle, setActiveArticle] = useState(null);
    const [scanMode, setScanMode] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Load offline counts from localStorage
    useEffect(() => {
        const savedCounts = localStorage.getItem('inventory_offline_counts');
        if (savedCounts) {
            setCounts(JSON.parse(savedCounts));
        }
    }, []);

    // Save counts to localStorage for offline support
    useEffect(() => {
        localStorage.setItem('inventory_offline_counts', JSON.stringify(counts));
    }, [counts]);

    // Online/offline detection
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name')
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['article-categories'],
        queryFn: () => base44.entities.ArticleCategory.list('order')
    });

    const saveMutation = useMutation({
        mutationFn: async ({ counts, articles, user }) => {
            const countsData = Object.entries(counts).map(([id, counted]) => {
                const article = articles.find(a => a.id === id);
                const systemStock = article?.current_stock || 0;
                return {
                    article_id: id,
                    article_name: article?.name,
                    system_stock: systemStock,
                    counted_stock: counted,
                    difference: counted - systemStock
                };
            });

            const totalDiff = countsData.reduce((sum, c) => sum + Math.abs(c.difference), 0);

            return base44.entities.InventorySession.create({
                date: new Date().toISOString(),
                counted_by: user.full_name,
                counts: countsData,
                total_items: countsData.length,
                total_difference: totalDiff
            });
        },
        onSuccess: () => {
            // Optimistic update - clear immediately
            const previousCounts = counts;
            setCounts({});
            setActiveArticle(null);
            localStorage.removeItem('inventory_offline_counts');
            
            queryClient.setQueryData(['inventory-sessions'], (old) => {
                return old ? [...old, { counts: previousCounts }] : [{ counts: previousCounts }];
            });
            
            toast.success('Inventur gespeichert');
        },
        onError: (error) => {
            toast.error('Fehler beim Speichern: ' + error.message);
        }
    });

    const { data: currentUser } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me(),
        staleTime: STALE.SLOW,
    });

    const handleCountChange = (articleId, value) => {
        const numValue = parseInt(value) || 0;
        // Optimistic update
        setCounts(prev => {
            const newCounts = { ...prev, [articleId]: numValue };
            return newCounts;
        });
        setActiveArticle(articleId);
    };

    const handleScan = (barcode) => {
        const article = articles.find(a => a.barcode === barcode);
        if (article) {
            const currentCount = counts[article.id] || 0;
            setCounts(prev => ({ ...prev, [article.id]: currentCount + 1 }));
            setActiveArticle(article.id);
            setLastScanned({ 
                name: article.name, 
                count: currentCount + 1,
                timestamp: Date.now()
            });
            
            // Scroll to article
            setTimeout(() => {
                document.getElementById(`article-${article.id}`)?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 100);

            // Clear notification after 2 seconds
            setTimeout(() => {
                setLastScanned(null);
            }, 2000);
        } else {
            alert('Artikel nicht gefunden: ' + barcode);
        }
    };

    const handleSave = () => {
        if (Object.keys(counts).length === 0) {
            alert('Keine Zählungen vorhanden');
            return;
        }

        if (confirm(`Inventur mit ${Object.keys(counts).length} Artikeln speichern?`)) {
            saveMutation.mutate({ counts, articles, user: currentUser });
        }
    };

    const handleReset = () => {
        if (confirm('Alle Zählungen zurücksetzen?')) {
            setCounts({});
            setActiveArticle(null);
        }
    };

    const filteredArticles = articles.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            a.barcode?.includes(searchTerm);
        const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const countedArticles = filteredArticles.filter(a => counts[a.id] !== undefined);
    const uncountedArticles = filteredArticles.filter(a => counts[a.id] === undefined);
    const totalDiff = filteredArticles.reduce((sum, a) => {
        if (counts[a.id] === undefined) return sum;
        return sum + Math.abs((counts[a.id] || 0) - (a.current_stock || 0));
    }, 0);

    if (!permissions.canEditShopping) {
        return <PermissionDenied />;
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="flex flex-col gap-3 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Inventur</h1>
                            <p className="text-slate-400 text-sm mt-1">
                                {countedArticles.length} von {filteredArticles.length} gezählt
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isOnline ? (
                                <Cloud className="w-5 h-5 text-green-500" />
                            ) : (
                                <CloudOff className="w-5 h-5 text-amber-500" />
                            )}
                            <span className="text-xs text-slate-400">
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                        <Button 
                            onClick={() => {
                                setScanMode(!scanMode);
                                if (!scanMode) setScannerOpen(true);
                            }}
                            className={scanMode ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            {scanMode ? 'Scannen aktiv' : 'Scanner starten'}
                        </Button>
                        <PDFExportButton
                            data={filteredArticles.filter(a => counts[a.id] !== undefined).map(a => ({
                                ...a,
                                counted_stock: counts[a.id],
                                difference: counts[a.id] - (a.current_stock || 0),
                                total_value: (counts[a.id] || 0) * (a.purchase_price || 0)
                            }))}
                            filename={`inventur_${new Date().toISOString().split('T')[0]}`}
                            title="Inventur-Bericht"
                            columns={[
                                { label: 'Artikel', field: 'name' },
                                { label: 'Barcode', field: 'barcode' },
                                { label: 'Kategorie', field: 'category' },
                                { label: 'Lieferant', render: (a) => a.suppliers?.join(', ') || '-' },
                                { label: 'Soll-Bestand', field: 'current_stock' },
                                { label: 'Ist-Bestand', field: 'counted_stock' },
                                { label: 'Differenz', render: (a) => {
                                    const diff = a.difference;
                                    return diff > 0 ? `+${diff}` : `${diff}`;
                                }},
                                { label: 'EK-Preis (€)', render: (a) => a.purchase_price?.toFixed(2) || '-' },
                                { label: 'Gesamtwert (€)', render: (a) => a.total_value?.toFixed(2) || '-' }
                            ]}
                            variant="outline"
                            className="border-purple-600 text-white bg-purple-600 hover:bg-purple-700"
                            disabled={Object.keys(counts).length === 0}
                        />
                        <Button 
                            onClick={handleSave}
                            disabled={Object.keys(counts).length === 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Speichern ({Object.keys(counts).length})
                        </Button>
                        <Button 
                            onClick={handleReset}
                            variant="outline"
                            className="border-red-600 text-white bg-red-600 hover:bg-red-700"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Zurücksetzen
                        </Button>
                    </div>
                </div>

                {/* Last Scanned Notification */}
                {lastScanned && (
                    <div className="mb-4 p-4 bg-green-600 rounded-lg border-2 border-green-400 animate-pulse">
                        <div className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-white" />
                            <div>
                                <p className="font-semibold text-white">{lastScanned.name}</p>
                                <p className="text-sm text-green-100">Menge: {lastScanned.count}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <p className="text-sm text-slate-400 mb-1">Gezählt</p>
                        <p className="text-2xl font-bold text-white">{countedArticles.length}</p>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <p className="text-sm text-slate-400 mb-1">Offen</p>
                        <p className="text-2xl font-bold text-amber-500">{uncountedArticles.length}</p>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <p className="text-sm text-slate-400 mb-1">Differenzen</p>
                        <p className="text-2xl font-bold text-red-500">{totalDiff}</p>
                    </Card>
                </div>

                {/* Search & Filter */}
                <Card className="p-4 bg-slate-800 border-slate-700 mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Artikel suchen..."
                                className="pl-10 bg-slate-900 border-slate-700 text-white"
                            />
                        </div>
                        <Select
                            value={filterCategory}
                            onValueChange={setFilterCategory}
                        >
                            <SelectTrigger className="w-full sm:w-[200px] bg-slate-900 border-slate-700 text-white">
                                <SelectValue placeholder="Kategorie wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Kategorien</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </Card>

                {/* Articles */}
                {filteredArticles.length > 0 ? (
                    <VirtualizedList
                        items={filteredArticles}
                        height={Math.min(filteredArticles.length * 110, 800)}
                        itemHeight={110}
                        renderItem={(article) => {
                            const counted = counts[article.id];
                            const systemStock = article.current_stock || 0;
                            const diff = counted !== undefined ? counted - systemStock : 0;
                            const hasDiff = counted !== undefined && diff !== 0;
                            
                            return (
                                <Card 
                                    id={`article-${article.id}`}
                                    className={cn(
                                        "p-4 bg-slate-800 border-slate-700 transition-all mx-0 my-1",
                                        activeArticle === article.id && "ring-2 ring-blue-500",
                                        counted !== undefined && "bg-slate-800/50"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold text-white">{article.name}</h3>
                                                {hasDiff && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        {diff > 0 ? '+' : ''}{diff}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-400">
                                                {article.barcode && (
                                                    <span className="font-mono">{article.barcode}</span>
                                                )}
                                                {article.category && (
                                                    <Badge 
                                                        variant="outline"
                                                        style={{ 
                                                            borderColor: categories.find(c => c.name === article.category)?.color,
                                                            color: categories.find(c => c.name === article.category)?.color 
                                                        }}
                                                    >
                                                        {article.category}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-sm text-slate-400 mb-1">Soll</p>
                                                <p className="text-lg font-semibold text-slate-300">{systemStock}</p>
                                            </div>

                                            <div className="flex flex-col items-center gap-1">
                                                <p className="text-sm text-slate-400">Ist</p>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCountChange(article.id, Math.max(0, (counted || 0) - 1))}
                                                        className="w-8 h-8 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors active:bg-slate-500"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <Input
                                                        type="number"
                                                        value={counted !== undefined ? counted : ''}
                                                        onChange={(e) => handleCountChange(article.id, e.target.value)}
                                                        placeholder="—"
                                                        className="w-16 text-center bg-slate-900 border-slate-700 text-white text-lg font-semibold px-1"
                                                        min="0"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCountChange(article.id, (counted || 0) + 1)}
                                                        className="w-8 h-8 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors active:bg-slate-500"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {counted !== undefined && (
                                                <div className={cn(
                                                    "text-center min-w-[50px]",
                                                    diff > 0 && "text-green-400",
                                                    diff < 0 && "text-red-400",
                                                    diff === 0 && "text-slate-400"
                                                )}>
                                                    <p className="text-sm mb-1">Diff</p>
                                                    <p className="text-lg font-bold">
                                                        {diff > 0 ? '+' : ''}{diff}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        }}
                    />
                ) : null}

                {filteredArticles.length === 0 && (
                    <div className="text-center py-12">
                        <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        <p className="text-slate-400">Keine Artikel gefunden</p>
                    </div>
                )}

                <BarcodeScanner
                    open={scannerOpen}
                    onClose={() => {
                        setScannerOpen(false);
                        setScanMode(false);
                    }}
                    onScan={(barcode) => {
                        handleScan(barcode);
                        if (scanMode) {
                            // Keep scanner open in scan mode
                            setTimeout(() => {
                                setScannerOpen(true);
                            }, 100);
                        }
                    }}
                />
            </div>
        </div>
    );
}