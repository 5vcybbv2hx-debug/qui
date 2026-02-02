import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Camera, Save, RotateCcw, Search, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import { cn } from "@/lib/utils";

export default function Inventory() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [scannerOpen, setScannerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [counts, setCounts] = useState({});
    const [activeArticle, setActiveArticle] = useState(null);

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
            setCounts({});
            setActiveArticle(null);
            alert('Inventur gespeichert (Bestände nicht geändert)');
        }
    });

    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: () => base44.auth.me()
    });

    const handleCountChange = (articleId, value) => {
        const numValue = parseInt(value) || 0;
        setCounts(prev => ({ ...prev, [articleId]: numValue }));
        setActiveArticle(articleId);
    };

    const handleScan = (barcode) => {
        const article = articles.find(a => a.barcode === barcode);
        if (article) {
            const currentCount = counts[article.id] || 0;
            setCounts(prev => ({ ...prev, [article.id]: currentCount + 1 }));
            setActiveArticle(article.id);
            
            // Scroll to article
            setTimeout(() => {
                document.getElementById(`article-${article.id}`)?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 100);
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
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Inventur</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {countedArticles.length} von {filteredArticles.length} gezählt
                        </p>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                        <Button 
                            onClick={() => setScannerOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            Scanner
                        </Button>
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
                            className="border-red-600 text-red-600 hover:bg-red-900/20"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Zurücksetzen
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">Gezählt</p>
                        <p className="text-2xl font-bold text-white">{countedArticles.length}</p>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">Offen</p>
                        <p className="text-2xl font-bold text-amber-500">{uncountedArticles.length}</p>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">Differenzen</p>
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
                    </div>
                </Card>

                {/* Articles */}
                <div className="space-y-2">
                    {filteredArticles.map(article => {
                        const counted = counts[article.id];
                        const systemStock = article.current_stock || 0;
                        const diff = counted !== undefined ? counted - systemStock : 0;
                        const hasDiff = counted !== undefined && diff !== 0;
                        
                        return (
                            <Card 
                                key={article.id}
                                id={`article-${article.id}`}
                                className={cn(
                                    "p-4 bg-slate-800 border-slate-700 transition-all",
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
                                        <div className="flex items-center gap-3 text-xs text-slate-400">
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
                                            <p className="text-xs text-slate-400 mb-1">Soll</p>
                                            <p className="text-lg font-semibold text-slate-300">{systemStock}</p>
                                        </div>

                                        <Input
                                            type="number"
                                            value={counted !== undefined ? counted : ''}
                                            onChange={(e) => handleCountChange(article.id, e.target.value)}
                                            placeholder="Ist"
                                            className="w-20 text-center bg-slate-900 border-slate-700 text-white text-lg font-semibold"
                                            min="0"
                                        />

                                        {counted !== undefined && (
                                            <div className={cn(
                                                "text-center min-w-[50px]",
                                                diff > 0 && "text-green-400",
                                                diff < 0 && "text-red-400",
                                                diff === 0 && "text-slate-400"
                                            )}>
                                                <p className="text-xs mb-1">Diff</p>
                                                <p className="text-lg font-bold">
                                                    {diff > 0 ? '+' : ''}{diff}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {filteredArticles.length === 0 && (
                    <div className="text-center py-12">
                        <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        <p className="text-slate-400">Keine Artikel gefunden</p>
                    </div>
                )}

                <BarcodeScanner
                    open={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={handleScan}
                />
            </div>
        </div>
    );
}