import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShoppingCart, Trash2, Check, Clock, Package, Camera } from 'lucide-react';
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

const categoryColors = {
    'C+C': 'bg-blue-100 text-blue-700 border-blue-200',
    'Metro': 'bg-orange-100 text-orange-700 border-orange-200',
    'Wein-Bauer': 'bg-purple-100 text-purple-700 border-purple-200'
};

const statusConfig = {
    'offen': { label: 'Offen', icon: Clock, color: 'text-slate-500' },
    'bestellt': { label: 'Bestellt', icon: Package, color: 'text-blue-600' },
    'erhalten': { label: 'Erhalten', icon: Check, color: 'text-green-600' }
};

export default function Shopping() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState('alle');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [eanInput, setEanInput] = useState('');
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
        mutationFn: (data) => base44.entities.ShoppingList.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['shopping-list']);
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ShoppingList.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['shopping-list']);
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ShoppingList.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['shopping-list']);
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
                category: activeTab !== 'alle' ? activeTab : 'C+C',
                quantity: '',
                unit: '',
                status: 'offen',
                notes: ''
            });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedItem(null);
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

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name')
    });

    const handleEanSubmit = async (e) => {
        e.preventDefault();
        if (!eanInput.trim()) return;

        const barcode = eanInput.trim();
        const article = articles.find(a => a.barcode === barcode);

        if (!article) {
            alert('Artikel mit diesem EAN-Code nicht gefunden');
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
                category: article.suppliers?.[0] || 'C+C',
                quantity: parseFloat(article.quantity || 1),
                unit: article.unit || '',
                status: 'offen',
                notes: `EAN: ${barcode}`
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
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-5xl mx-auto px-4 py-8">
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
                                placeholder="EAN-Code eingeben oder scannen..."
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Hinzufügen
                            </Button>
                        </form>
                    )}
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                        <TabsTrigger value="alle">Alle</TabsTrigger>
                        <TabsTrigger value="C+C">C+C</TabsTrigger>
                        <TabsTrigger value="Metro">Metro</TabsTrigger>
                        <TabsTrigger value="Wein-Bauer">Wein-Bauer</TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="space-y-6">
                        {/* Open Items */}
                        {openItems.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                                    Offen ({openItems.length})
                                </h3>
                                <div className="grid gap-3">
                                    {openItems.map(item => (
                                        <Card key={item.id} className="p-4 bg-white border-0 shadow-sm">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h4 className="font-semibold text-slate-800">
                                                            {item.item_name}
                                                        </h4>
                                                        <Badge className={cn("text-xs", categoryColors[item.category])}>
                                                            {item.category}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-slate-600 mb-3">
                                                        <span className="font-semibold">{item.quantity}</span>
                                                        {item.unit && <span> {item.unit}</span>}
                                                    </div>
                                                    {item.notes && (
                                                        <p className="text-sm text-slate-500 italic">{item.notes}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleStatusChange(item, 'bestellt')}
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <Package className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openModal(item)}
                                                    >
                                                        Bearbeiten
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                                    Bestellt ({orderedItems.length})
                                </h3>
                                <div className="grid gap-3">
                                    {orderedItems.map(item => (
                                        <Card key={item.id} className="p-4 bg-blue-50 border-blue-100">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Package className="w-4 h-4 text-blue-600" />
                                                        <h4 className="font-semibold text-slate-800">
                                                            {item.item_name}
                                                        </h4>
                                                        <Badge className={cn("text-xs", categoryColors[item.category])}>
                                                            {item.category}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-slate-600">
                                                        <span className="font-semibold">{item.quantity}</span>
                                                        {item.unit && <span> {item.unit}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleStatusChange(item, 'erhalten')}
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                                    Erhalten ({receivedItems.length})
                                </h3>
                                <div className="grid gap-3">
                                    {receivedItems.map(item => (
                                        <Card key={item.id} className="p-4 bg-green-50 border-green-100 opacity-75">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Check className="w-4 h-4 text-green-600" />
                                                        <h4 className="font-medium text-slate-700 line-through">
                                                            {item.item_name}
                                                        </h4>
                                                        <Badge className={cn("text-xs", categoryColors[item.category])}>
                                                            {item.category}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-slate-600">
                                                        <span className="font-semibold">{item.quantity}</span>
                                                        {item.unit && <span> {item.unit}</span>}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
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
                            <Card className="p-12 bg-white border-0 shadow-sm">
                                <div className="text-center text-slate-400">
                                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium">Keine Artikel</p>
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
                                <Input
                                    value={formData.item_name}
                                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                    placeholder="z.B. Cola 1L"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Lieferant *</Label>
                                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="C+C">C+C</SelectItem>
                                        <SelectItem value="Metro">Metro</SelectItem>
                                        <SelectItem value="Wein-Bauer">Wein-Bauer</SelectItem>
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
            </div>
        </div>
    );
}