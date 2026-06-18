import { toast } from 'sonner';
import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { STALE } from '@/lib/queryUtils';;
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Trash2, Camera, Plus, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BarcodeScanner from '@/components/restock/BarcodeScanner';
import PDFExportButton from '@/components/export/PDFExportButton';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import WastageTemplates from '@/components/wastage/WastageTemplates';

const wastageTypes = [
    { value: 'Bruch', label: 'Bruch (heruntergefallen)', icon: '💥', color: 'bg-red-100 text-red-700' },
    { value: 'Nachtwächter', label: 'Nachtwächter', icon: '🍺', color: 'bg-amber-100 text-amber-700' },
    { value: 'Verderb', label: 'Verderb', icon: '🦠', color: 'bg-purple-100 text-purple-700' },
    { value: 'Sonstiges', label: 'Sonstiges', icon: '📋', color: 'bg-slate-100 text-slate-700' }
];

export default function Wastage() {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const barcodeInputRef = useRef(null);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [quantity, setQuantity] = useState('1');
    const [wastageType, setWastageType] = useState('Bruch');
    const [notes, setNotes] = useState('');
    const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

    const { data: wastageItems = [] } = useQuery({
        queryKey: ['wastage-items'],
        queryFn: () => base44.entities.Wastage.list('-created_date', 200)
    });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list()
    });

    const { data: currentUser } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me(),
        staleTime: STALE.SLOW,
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Wastage.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wastage-items'] });
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Wastage.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wastage-items'] });
        }
    });

    const resetForm = () => {
        setSearchQuery('');
        setShowSuggestions(false);
        setSelectedArticle(null);
        setQuantity('1');
        setWastageType('Bruch');
        setNotes('');
        setEntryDate(format(new Date(), 'yyyy-MM-dd'));
        if (barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    };

    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setSelectedArticle(null);
        setShowSuggestions(value.trim().length > 0);
    };

    const handleSelectArticle = (article) => {
        setSelectedArticle(article);
        setSearchQuery(article.name);
        setShowSuggestions(false);
    };

    const handleScan = (scannedBarcode) => {
        const article = articles.find(a => a.barcode === scannedBarcode);
        if (article) {
            handleSelectArticle(article);
            setScannerOpen(false);
        } else {
            toast.error('Artikel nicht in der Datenbank gefunden');
        }
    };

    const articleSuggestions = articles.filter(a =>
        a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.barcode?.includes(searchQuery)
    ).slice(0, 8);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedArticle) {
            toast.warning('Bitte wähle einen Artikel aus');
            return;
        }

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            toast.warning('Bitte gültige Menge eingeben');
            return;
        }

        await createMutation.mutateAsync({
            barcode: selectedArticle.barcode,
            article_name: selectedArticle.name,
            article_image_url: selectedArticle.image_url || null,
            quantity: qty,
            unit: wastageType === 'Nachtwächter' ? 'Liter' : 'Stück',
            type: wastageType,
            date: entryDate,
            time: format(new Date(), 'HH:mm'),
            noted_by: currentUser?.full_name || currentUser?.email || 'Unbekannt',
            notes: notes || null
        });
    };

    const handleDelete = (id) => {
        if (confirm('Eintrag löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredItems = wastageItems.filter(item => {
        if (!filterMonth) return true;
        return item.date.startsWith(filterMonth);
    });

    const groupedItems = filteredItems.reduce((groups, item) => {
        const date = item.date;
        if (!groups[date]) groups[date] = [];
        groups[date].push(item);
        return groups;
    }, {});

    const stats = {
        total: filteredItems.length,
        byType: wastageTypes.map(type => ({
            ...type,
            count: filteredItems.filter(i => i.type === type.value).length,
            items: filteredItems.filter(i => i.type === type.value)
        }))
    };

    if (!permissions.canEditShopping) {
        return <PermissionDenied />;
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Schwund & Verluste</h1>
                            <p className="text-slate-400 text-sm mt-1">Dokumentation von Bruch, Nachtwächter und Verlusten</p>
                        </div>
                        <PDFExportButton
                            data={filteredItems}
                            filename={`schwund-${filterMonth}`}
                            title="Schwund & Verluste"
                            columns={[
                                { label: 'Datum', field: 'date' },
                                { label: 'Artikel', field: 'article_name' },
                                { label: 'Menge', field: 'quantity' },
                                { label: 'Art', field: 'type' },
                                { label: 'Von', field: 'noted_by' },
                                { label: 'Notizen', field: 'notes' }
                            ]}
                            variant="outline"
                            className="border-green-600 text-white bg-green-600 hover:bg-green-700"
                        />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {stats.byType.map(stat => (
                            <Card key={stat.value} className="p-4 bg-slate-800 border-slate-700">
                                <div className="text-center">
                                    <div className="text-2xl mb-1">{stat.icon}</div>
                                    <div className="text-2xl font-bold text-white">{stat.count}</div>
                                    <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Vorlagen */}
                <WastageTemplates
                    articles={articles}
                    currentUser={currentUser}
                    onApply={() => {}}
                />

                {/* Eingabe-Formular */}
                <Card className="p-6 bg-slate-800 border-slate-700 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Neuen Schwund eintragen</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Artikel suchen oder Barcode scannen</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            ref={barcodeInputRef}
                                            value={searchQuery}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                            onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                            placeholder="Artikelname oder Barcode..."
                                            className="bg-slate-900 border-slate-600 text-white"
                                            autoFocus
                                        />
                                        {showSuggestions && articleSuggestions.length > 0 && (
                                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                                                {articleSuggestions.map(article => (
                                                    <button
                                                        key={article.id}
                                                        type="button"
                                                        onMouseDown={() => handleSelectArticle(article)}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700 text-left transition-colors"
                                                    >
                                                        {article.image_url && (
                                                            <img src={article.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm text-white truncate">{article.name}</p>
                                                            {article.barcode && <p className="text-xs text-slate-400">{article.barcode}</p>}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setScannerOpen(true)}
                                        className="border-slate-600 text-white bg-slate-600 hover:bg-slate-700"
                                    >
                                        <Camera className="w-4 h-4" />
                                    </Button>
                                </div>
                                {selectedArticle && (
                                    <div className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg">
                                        {selectedArticle.image_url && (
                                            <img 
                                                src={selectedArticle.image_url} 
                                                alt={selectedArticle.name}
                                                className="w-12 h-12 rounded object-cover"
                                            />
                                        )}
                                        <div>
                                            <p className="font-medium text-white">{selectedArticle.name}</p>
                                            <p className="text-xs text-slate-400">{selectedArticle.barcode}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Art des Schwunds</Label>
                                <Select value={wastageType} onValueChange={setWastageType}>
                                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {wastageTypes.map(type => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.icon} {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">
                                    Menge {wastageType === 'Nachtwächter' ? '(in Litern)' : '(Stück)'}
                                </Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="bg-slate-900 border-slate-600 text-white"
                                    placeholder={wastageType === 'Nachtwächter' ? 'z.B. 2.5' : 'z.B. 1'}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Datum</Label>
                                <Input
                                    type="date"
                                    value={entryDate}
                                    onChange={(e) => setEntryDate(e.target.value)}
                                    className="bg-slate-900 border-slate-600 text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Notizen (optional)</Label>
                            <Input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="z.B. beim Aufräumen runtergefallen"
                                className="bg-slate-900 border-slate-600 text-white"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                className="border-slate-600 text-white bg-slate-600 hover:bg-slate-700"
                            >
                                Zurücksetzen
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-amber-600 hover:bg-amber-700"
                                disabled={!selectedArticle}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Eintragen
                            </Button>
                        </div>
                    </form>
                </Card>

                {/* Filter */}
                <div className="mb-4">
                    <Label className="text-slate-300 mb-2 block">Monat filtern</Label>
                    <Input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="max-w-xs bg-slate-800 border-slate-600 text-white"
                    />
                </div>

                {/* Liste */}
                {Object.keys(groupedItems).length > 0 ? (
                    <div className="space-y-6">
                        {Object.entries(groupedItems)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([date, items]) => (
                                <div key={date}>
                                    <h3 className="text-sm font-semibold text-amber-400 mb-3">
                                        {format(new Date(date), 'dd.MM.yyyy')}
                                    </h3>
                                    <div className="space-y-2">
                                        {items.map(item => {
                                            const typeConfig = wastageTypes.find(t => t.value === item.type);
                                            return (
                                                <Card key={item.id} className="p-4 bg-slate-800 border-slate-700">
                                                    <div className="flex items-center gap-3">
                                                        {item.article_image_url && (
                                                            <img 
                                                                src={item.article_image_url} 
                                                                alt={item.article_name}
                                                                className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                                                            />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-medium text-white truncate">
                                                                    {item.article_name}
                                                                </h4>
                                                                <Badge className={typeConfig?.color || 'bg-slate-100 text-slate-700'}>
                                                                    {typeConfig?.icon} {item.type}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                                <span className="font-semibold text-amber-400">
                                                                    {item.quantity} {item.unit || 'Stück'}
                                                                </span>
                                                                <span>•</span>
                                                                <span>{item.time} Uhr</span>
                                                                <span>•</span>
                                                                <span>{item.noted_by}</span>
                                                                {item.notes && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="italic">{item.notes}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(item.id)}
                                                            className="text-slate-500 hover:text-red-500 hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : (
                    <Card className="p-12 bg-slate-800 border-slate-700">
                        <div className="text-center text-slate-400">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-lg font-medium">Keine Einträge</p>
                            <p className="text-sm mt-1">Für diesen Monat wurden noch keine Verluste dokumentiert</p>
                        </div>
                    </Card>
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