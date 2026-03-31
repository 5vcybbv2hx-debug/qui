import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queueMutation, syncMutations } from '@/components/utils/offlineSync';
import { Plus, ShoppingCart, Trash2, Check, Clock, Package, Camera, Search } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import BarcodeScanner from '../components/restock/BarcodeScanner';
import KanbanScanModal from '../components/shopping/KanbanScanModal';

const getSupplierColor = (index) => {
    const colors = [
        'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'bg-orange-500/20 text-orange-400 border-orange-500/30',
        'bg-purple-500/20 text-purple-400 border-purple-500/30',
        'bg-red-500/20 text-red-400 border-red-500/30',
        'bg-green-500/20 text-green-400 border-green-500/30',
        'bg-pink-500/20 text-pink-400 border-pink-500/30'
    ];
    return colors[index % colors.length];
};

const statusConfig = {
    'offen': { label: 'Offen', icon: Clock, color: 'text-slate-500' },
    'bestellt': { label: 'Bestellt', icon: Package, color: 'text-blue-600' },
    'erhalten': { label: 'Erhalten', icon: Check, color: 'text-green-600' }
};

export default function Shopping() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();

    useEffect(() => {
        const handleOnline = () => syncMutations(base44).catch(console.error);
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState('alle');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [kanbanOpen, setKanbanOpen] = useState(false);
    const [eanInput, setEanInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        item_name: '',
        category: 'C+C',
        quantity: '',
        unit: '',
        status: 'offen',
        notes: ''
    });

    const { data: items = [] } = useQuery({
        queryKey: ['shopping-list'],
        queryFn: () => base44.entities.ShoppingList.list('-created_date')
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            if (!navigator.onLine) {
                await queueMutation({ entityName: 'ShoppingList', type: 'create', data });
                return { queued: true };
            }
            return base44.entities.ShoppingList.create(data);
        },
        onSuccess: (result) => {
            if (!result?.queued) queryClient.invalidateQueries(['shopping-list']);
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            if (!navigator.onLine) {
                await queueMutation({ entityName: 'ShoppingList', type: 'update', id, data });
                queryClient.setQueryData(['shopping-list'], (old) => 
                    old?.map(item => item.id === id ? { ...item, ...data } : item) || old
                );
                return { queued: true };
            }
            return base44.entities.ShoppingList.update(id, data);
        },
        onSuccess: (result) => {
            if (!result?.queued) queryClient.invalidateQueries(['shopping-list']);
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            if (!navigator.onLine) {
                await queueMutation({ entityName: 'ShoppingList', type: 'delete', id });
                queryClient.setQueryData(['shopping-list'], (old) => old?.filter(item => item.id !== id) || old);
                return { queued: true };
            }
            return base44.entities.ShoppingList.delete(id);
        },
        onSuccess: (result) => {
            if (!result?.queued) queryClient.invalidateQueries(['shopping-list']);
        }
    });

    const openModal = (item = null) => {
        if (item) {
            setSelectedItem(item);
            setFormData({
                item_name: item.item_name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit || '',
                status: item.status,
                notes: item.notes || ''
            });
        } else {
            setSelectedItem(null);
            setFormData({
                item_name: '',
                category: activeTab !== 'alle' ? activeTab : (suppliers[0]?.name || ''),
                quantity: '',
                unit: '',
                status: 'offen',
                notes: ''
            });
        }
        setSearchQuery('');
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedItem(null);
        setSearchQuery('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = {
            ...formData,
            quantity: parseFloat(formData.quantity)
        };
        
        if (selectedItem) {
            updateMutation.mutate({ id: selectedItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleStatusChange = (item, newStatus) => {
        updateMutation.mutate({
            id: item.id,
            data: { ...item, status: newStatus }
        });
    };

    const handleDelete = (id) => {
        if (confirm('Artikel wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleDeleteReceived = async () => {
        if (confirm(`${receivedItems.length} erledigte Artikel wirklich löschen?`)) {
            for (const item of receivedItems) {
                await deleteMutation.mutateAsync(item.id);
            }
        }
    };

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name')
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => base44.entities.Supplier.filter({ is_active: true }, 'order')
    });

    const activeSuppliers = suppliers.filter(s => s.is_active);

    const handleEanSubmit = async (e) => {
        e.preventDefault();
        if (!eanInput.trim()) return;

        const input = eanInput.trim();
        const article = articles.find(a => 
            a.barcode === input || 
            a.name.toLowerCase() === input.toLowerCase() ||
            a.name.toLowerCase().includes(input.toLowerCase())
        );

        if (!article) {
            alert('Artikel nicht gefunden');
            setEanInput('');
            return;
        }

        // Check if item already exists in shopping list
        const existingItem = items.find(
            item => item.item_name === article.name && item.status === 'offen'
        );

        if (existingItem) {
            // Increase quantity
            const newQuantity = parseFloat(existingItem.quantity || 0) + parseFloat(article.quantity || 1);
            await updateMutation.mutateAsync({
                id: existingItem.id,
                data: { ...existingItem, quantity: newQuantity }
            });
        } else {
            // Add new item
            await createMutation.mutateAsync({
                item_name: article.name,
                category: article.suppliers?.[0] || suppliers[0]?.name || '',
                quantity: parseFloat(article.quantity || 1),
                unit: article.unit || '',
                status: 'offen',
                notes: `EAN: ${article.barcode || input}`
            });
        }

        setEanInput('');
    };

    const handleBarcodeScan = (barcode) => {
        setScannerOpen(false);
        setEanInput(barcode);
    };

    const filteredItems = activeTab === 'alle' 
        ? items 
        : items.filter(item => item.category === activeTab);

    const openItems = filteredItems.filter(item => item.status === 'offen');
    const orderedItems = filteredItems.filter(item => item.status === 'bestellt');
    const receivedItems = filteredItems.filter(item => item.status === 'erhalten');

    if (!permissions.canViewShopping) {
        return <PermissionDenied message="Du hast keine Berechtigung, die Einkaufsliste zu sehen." />;
    }

    return (
        <div>
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Einkaufsliste</h1>
                            <p className="text-slate-400 text-sm mt-1">
                                {openItems.length} offene Artikel
                            </p>
                        </div>
                        {permissions.canEditShopping && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setKanbanOpen(true)}
                                    variant="outline"
                                    className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                                >
                                    <Camera className="w-4 h-4 mr-2" />
                                    Kanban
                                </Button>
                                <Button 
                                    onClick={() => setScannerOpen(true)}
                                    variant="outline"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                                >
                                    <Camera className="w-4 h-4 mr-2" />
                                    Scannen
                                </Button>
                                <Button 
                                    onClick={() => openModal()}
                                    className="bg-amber-600 hover:bg-amber-700"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Manuell
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* EAN Input */}
                    {permissions.canEditShopping && (
                        <form onSubmit={handleEanSubmit} className="flex gap-2">
                            <Input
                                value={eanInput}
                                onChange={(e) => setEanInput(e.target.value)}
                                placeholder="EAN-Code oder Artikelname eingeben..."
                                className="bg-slate-800 border-slate-700 text-white"
                                list="quick-articles-list"
                            />
                            <datalist id="quick-articles-list">
                                {articles.slice(0, 50).map(article => (
                                    <option key={article.id} value={article.name} />
                                ))}
                            </datalist>
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Hinzufügen
                            </Button>
                        </form>
                    )}
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                    <TabsList className={`grid w-full mb-6 bg-slate-900/50 border border-slate-800/50`} style={{ gridTemplateColumns: `repeat(${activeSuppliers.length + 1}, minmax(0, 1fr))` }}>
                        <TabsTrigger value="alle" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-slate-900">Alle</TabsTrigger>
                        {activeSuppliers.map(supplier => (
                            <TabsTrigger key={supplier.id} value={supplier.name} className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-slate-900">
                                {supplier.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value={activeTab} className="space-y-6">
                        {/* Open Items */}
                        {openItems.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                    Offen ({openItems.length})
                                </h3>
                                <div className="grid gap-3">
                                    {openItems.map(item => (
                                        <Card key={item.id} className="p-4 bg-slate-900/50 border-slate-800/50 backdrop-blur-xl hover:border-amber-500/30 transition-all">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-start gap-3 mb-2">
                                                        {(() => {
                                                            const article = articles.find(a => a.name === item.item_name);
                                                            return article?.image_url ? (
                                                                <img 
                                                                    src={article.image_url} 
                                                                    alt={item.item_name}
                                                                    className="w-16 h-16 object-cover rounded"
                                                                />
                                                            ) : null;
                                                        })()}
                                                        <div className="flex-1">
                                                           <h4 className="font-semibold text-white">
                                                               {item.item_name}
                                                           </h4>
                                                           <Badge className={cn("text-xs mt-1 border", getSupplierColor(suppliers.findIndex(s => s.name === item.category)))}>
                                                               {item.category}
                                                           </Badge>
                                                        </div>
                                                        </div>
                                                        <div className="text-sm text-slate-300 mb-3">
                                                        <span className="font-semibold">{item.quantity}</span>
                                                        {item.unit && <span> {item.unit}</span>}
                                                        </div>
                                                        {item.notes && (
                                                        <p className="text-sm text-slate-400 italic">{item.notes}</p>
                                                        )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleStatusChange(item, 'bestellt')}
                                                        className="text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-0"
                                                    >
                                                        <Package className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openModal(item)}
                                                        className="border-slate-700/50 text-slate-300 hover:bg-slate-800/50"
                                                    >
                                                        Bearbeiten
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ordered Items */}
                        {orderedItems.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                    Bestellt ({orderedItems.length})
                                </h3>
                                <div className="grid gap-3">
                                    {orderedItems.map(item => (
                                        <Card key={item.id} className="p-4 bg-blue-500/10 border-blue-500/30 backdrop-blur-xl">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Package className="w-4 h-4 text-blue-400" />
                                                        <h4 className="font-semibold text-white">
                                                            {item.item_name}
                                                        </h4>
                                                        <Badge className={cn("text-xs border", getSupplierColor(suppliers.findIndex(s => s.name === item.category)))}>
                                                            {item.category}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-slate-300">
                                                        <span className="font-semibold">{item.quantity}</span>
                                                        {item.unit && <span> {item.unit}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleStatusChange(item, 'erhalten')}
                                                        className="text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Received Items */}
                        {receivedItems.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                        Erhalten ({receivedItems.length})
                                    </h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDeleteReceived}
                                        className="text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-0"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Alle löschen
                                    </Button>
                                </div>
                                <div className="grid gap-3">
                                    {receivedItems.map(item => (
                                        <Card key={item.id} className="p-4 bg-green-500/10 border-green-500/30 opacity-75 backdrop-blur-xl">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Check className="w-4 h-4 text-green-400" />
                                                        <h4 className="font-medium text-slate-400 line-through">
                                                            {item.item_name}
                                                        </h4>
                                                        <Badge className={cn("text-xs border", getSupplierColor(suppliers.findIndex(s => s.name === item.category)))}>
                                                            {item.category}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-slate-400">
                                                        <span className="font-semibold">{item.quantity}</span>
                                                        {item.unit && <span> {item.unit}</span>}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {filteredItems.length === 0 && (
                            <Card className="p-12 bg-slate-900/50 border-slate-800/50 backdrop-blur-xl">
                                <div className="text-center text-slate-400">
                                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium text-white">Keine Artikel</p>
                                    <p className="text-sm mt-1">Füge Artikel zur Einkaufsliste hinzu</p>
                                </div>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Modal */}
                <Dialog open={modalOpen} onOpenChange={closeModal}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedItem ? 'Artikel bearbeiten' : 'Neuer Artikel'}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Artikelname *</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setFormData({ ...formData, item_name: e.target.value });
                                        }}
                                        placeholder="Artikel suchen..."
                                        className="pl-10"
                                        list="articles-list"
                                        autoComplete="off"
                                    />
                                </div>
                                {searchQuery && (
                                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md bg-white">
                                        {articles
                                            .filter(a => 
                                                a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                a.barcode?.includes(searchQuery)
                                            )
                                            .slice(0, 10)
                                            .map(article => (
                                                <button
                                                    key={article.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({
                                                            ...formData,
                                                            item_name: article.name,
                                                            category: article.suppliers?.[0] || formData.category,
                                                            quantity: article.quantity || formData.quantity,
                                                            unit: article.unit || formData.unit
                                                        });
                                                        setSearchQuery('');
                                                    }}
                                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {article.image_url && (
                                                            <img 
                                                                src={article.image_url} 
                                                                alt={article.name}
                                                                className="w-10 h-10 object-cover rounded"
                                                            />
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm text-slate-800">
                                                                {article.name}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {article.barcode}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        }
                                        {articles.filter(a => 
                                            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            a.barcode?.includes(searchQuery)
                                        ).length === 0 && (
                                            <div className="px-3 py-4 text-sm text-slate-500 text-center">
                                                Kein Artikel gefunden
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Lieferant *</Label>
                                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeSuppliers.map(supplier => (
                                            <SelectItem key={supplier.id} value={supplier.name}>
                                                {supplier.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Menge *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        placeholder="24"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Einheit</Label>
                                    <Input
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        placeholder="Stück, L, kg..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="offen">Offen</SelectItem>
                                        <SelectItem value="bestellt">Bestellt</SelectItem>
                                        <SelectItem value="erhalten">Erhalten</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Notizen</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Zusätzliche Informationen..."
                                    rows={2}
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900">
                                    {selectedItem ? 'Speichern' : 'Hinzufügen'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Barcode Scanner */}
                <BarcodeScanner
                    open={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={handleBarcodeScan}
                />

                {/* Kanban QR Scanner */}
                <KanbanScanModal
                    open={kanbanOpen}
                    onClose={() => setKanbanOpen(false)}
                    suppliers={activeSuppliers}
                />
            </div>
        </div>
    );
}