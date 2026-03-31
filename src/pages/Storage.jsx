import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, MapPin, Package, Search, ChevronRight, Wrench } from 'lucide-react';

const CATEGORIES = ['Werkzeug', 'Reinigung', 'Geräte', 'Büro', 'Sonstiges'];
const CONDITIONS = [
    { value: 'gut', label: 'Gut', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    { value: 'ok', label: 'OK', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    { value: 'defekt', label: 'Defekt', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const EMPTY_ITEM = { name: '', category: 'Werkzeug', quantity: 1, condition: 'gut', description: '', location_id: '', location_label: '', image_url: '', is_active: true };
const EMPTY_LOC = { area: '', furniture: '', position: '', notes: '' };

export default function Storage() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [selectedLocationId, setSelectedLocationId] = useState(null);

    // Item modal
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemForm, setItemForm] = useState(EMPTY_ITEM);

    // Location modal
    const [locModalOpen, setLocModalOpen] = useState(false);
    const [editingLoc, setEditingLoc] = useState(null);
    const [locForm, setLocForm] = useState(EMPTY_LOC);

    const { data: locations = [] } = useQuery({
        queryKey: ['storage-locations'],
        queryFn: () => base44.entities.StorageLocation.list('-created_date', 200),
    });

    const { data: items = [] } = useQuery({
        queryKey: ['storage-items'],
        queryFn: () => base44.entities.StorageItem.filter({ is_active: true }, '-created_date', 500),
    });

    const savItemMutation = useMutation({
        mutationFn: (data) => editingItem?.id
            ? base44.entities.StorageItem.update(editingItem.id, data)
            : base44.entities.StorageItem.create(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['storage-items'] }); setItemModalOpen(false); },
    });

    const deleteItemMutation = useMutation({
        mutationFn: (id) => base44.entities.StorageItem.update(id, { is_active: false }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['storage-items'] }),
    });

    const saveLocMutation = useMutation({
        mutationFn: (data) => editingLoc?.id
            ? base44.entities.StorageLocation.update(editingLoc.id, data)
            : base44.entities.StorageLocation.create(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['storage-locations'] }); setLocModalOpen(false); },
    });

    const deleteLocMutation = useMutation({
        mutationFn: (id) => base44.entities.StorageLocation.delete(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
            if (selectedLocationId === id) setSelectedLocationId(null);
        },
    });

    // Group locations by area
    const locationTree = useMemo(() => {
        const tree = {};
        locations.forEach(loc => {
            if (!tree[loc.area]) tree[loc.area] = {};
            if (!tree[loc.area][loc.furniture]) tree[loc.area][loc.furniture] = [];
            tree[loc.area][loc.furniture].push(loc);
        });
        return tree;
    }, [locations]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (selectedLocationId && item.location_id !== selectedLocationId) return false;
            if (filterCategory !== 'all' && item.category !== filterCategory) return false;
            if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });
    }, [items, selectedLocationId, filterCategory, searchTerm]);

    const itemCountByLocation = useMemo(() => {
        const counts = {};
        items.forEach(item => { if (item.location_id) counts[item.location_id] = (counts[item.location_id] || 0) + 1; });
        return counts;
    }, [items]);

    const openAddItem = () => {
        setEditingItem(null);
        const loc = locations.find(l => l.id === selectedLocationId);
        setItemForm({
            ...EMPTY_ITEM,
            location_id: selectedLocationId || '',
            location_label: loc ? `${loc.area} › ${loc.furniture} › ${loc.position}` : '',
        });
        setItemModalOpen(true);
    };

    const openEditItem = (item) => {
        setEditingItem(item);
        setItemForm({ ...EMPTY_ITEM, ...item });
        setItemModalOpen(true);
    };

    const openAddLoc = () => { setEditingLoc(null); setLocForm(EMPTY_LOC); setLocModalOpen(true); };
    const openEditLoc = (loc) => { setEditingLoc(loc); setLocForm({ ...loc }); setLocModalOpen(true); };

    const handleItemFormLocChange = (locId) => {
        const loc = locations.find(l => l.id === locId);
        setItemForm(f => ({
            ...f,
            location_id: locId,
            location_label: loc ? `${loc.area} › ${loc.furniture} › ${loc.position}` : '',
        }));
    };

    const handleSaveItem = () => {
        if (!itemForm.name.trim()) return;
        savItemMutation.mutate(itemForm);
    };

    const handleSaveLoc = () => {
        if (!locForm.area.trim() || !locForm.furniture.trim() || !locForm.position.trim()) return;
        saveLocMutation.mutate(locForm);
    };

    if (permissions.isLoading) return null;
    if (!permissions.canViewWarehouse && !permissions.isManager) return <PermissionDenied />;

    const selectedLocation = locations.find(l => l.id === selectedLocationId);

    return (
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8 pb-24 md:pb-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Lagerplatzverwaltung</h1>
                    <p className="text-muted-foreground text-sm mt-1">Werkzeug, Reinigung & Geräte nach Ort verwalten</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={openAddLoc}>
                        <MapPin className="w-4 h-4 mr-2" />
                        Ort anlegen
                    </Button>
                    <Button onClick={openAddItem} className="bg-amber-600 hover:bg-amber-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Artikel
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
                {/* Location Tree */}
                <Card className="p-3 h-fit">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-3">Lagerorte</p>
                    <button
                        onClick={() => setSelectedLocationId(null)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
                            !selectedLocationId ? 'bg-amber-500 text-slate-900' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Alle Orte <span className="opacity-60">({items.length})</span>
                    </button>

                    {Object.entries(locationTree).map(([area, furnitures]) => (
                        <div key={area} className="mb-3">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">{area}</p>
                            {Object.entries(furnitures).map(([furniture, positions]) => (
                                <div key={furniture} className="ml-2">
                                    <p className="text-xs text-muted-foreground px-2 py-0.5 flex items-center gap-1">
                                        <ChevronRight className="w-3 h-3" />{furniture}
                                    </p>
                                    {positions.map(loc => (
                                        <div key={loc.id} className="flex items-center gap-1 ml-3">
                                            <button
                                                onClick={() => setSelectedLocationId(loc.id === selectedLocationId ? null : loc.id)}
                                                className={`flex-1 text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                                                    selectedLocationId === loc.id
                                                        ? 'bg-amber-500/20 text-amber-500 font-semibold'
                                                        : 'hover:bg-accent text-foreground'
                                                }`}
                                            >
                                                {loc.position}
                                                {itemCountByLocation[loc.id] > 0 && (
                                                    <span className="ml-1 opacity-60">({itemCountByLocation[loc.id]})</span>
                                                )}
                                            </button>
                                            {permissions.isManager && (
                                                <button onClick={() => openEditLoc(loc)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}

                    {locations.length === 0 && (
                        <p className="text-xs text-muted-foreground px-2 py-4 text-center">Noch keine Lagerorte.<br />Klicke „Ort anlegen".</p>
                    )}
                </Card>

                {/* Items Panel */}
                <div className="space-y-4">
                    {/* Filters */}
                    <Card className="p-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Artikel suchen..."
                                    className="pl-10 h-9"
                                />
                            </div>
                            <select
                                value={filterCategory}
                                onChange={e => setFilterCategory(e.target.value)}
                                className="h-9 px-3 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                                <option value="all">Alle Kategorien</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </Card>

                    {/* Location breadcrumb */}
                    {selectedLocation && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 text-amber-500" />
                            <span className="text-amber-500 font-medium">{selectedLocation.area}</span>
                            <ChevronRight className="w-3 h-3" />
                            <span>{selectedLocation.furniture}</span>
                            <ChevronRight className="w-3 h-3" />
                            <span>{selectedLocation.position}</span>
                        </div>
                    )}

                    {/* Items grid */}
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p className="font-medium">Keine Artikel gefunden</p>
                            <p className="text-sm mt-1">Füge einen neuen Artikel hinzu.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredItems.map(item => {
                                const cond = CONDITIONS.find(c => c.value === item.condition) || CONDITIONS[0];
                                return (
                                    <Card key={item.id} className="p-4 hover:border-border/80 transition-colors">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-foreground truncate">{item.name}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => openEditItem(item)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                {permissions.isManager && (
                                                    <button onClick={() => deleteItemMutation.mutate(item.id)} className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cond.color}`}>
                                                {cond.label}
                                            </span>
                                            {item.quantity > 1 && (
                                                <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                                            )}
                                        </div>

                                        {item.location_label && (
                                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                                <MapPin className="w-3 h-3 shrink-0" />
                                                <span className="truncate">{item.location_label}</span>
                                            </p>
                                        )}

                                        {item.description && (
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Item Modal */}
            <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Artikel bearbeiten' : 'Neuer Artikel'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Name *</Label>
                            <Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Kategorie</Label>
                                <Select value={itemForm.category} onValueChange={v => setItemForm(f => ({ ...f, category: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Zustand</Label>
                                <Select value={itemForm.condition} onValueChange={v => setItemForm(f => ({ ...f, condition: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Anzahl</Label>
                                <Input type="number" min={1} value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: Number(e.target.value) }))} className="mt-1" />
                            </div>
                            <div>
                                <Label>Lagerort</Label>
                                <Select value={itemForm.location_id || '__none'} onValueChange={v => handleItemFormLocChange(v === '__none' ? '' : v)}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Kein Ort" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none">Kein Ort</SelectItem>
                                        {locations.map(l => (
                                            <SelectItem key={l.id} value={l.id}>
                                                {l.area} › {l.furniture} › {l.position}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Beschreibung</Label>
                            <Input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setItemModalOpen(false)}>Abbrechen</Button>
                        <Button onClick={handleSaveItem} disabled={savItemMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                            Speichern
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Location Modal */}
            <Dialog open={locModalOpen} onOpenChange={setLocModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingLoc ? 'Lagerort bearbeiten' : 'Neuer Lagerort'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Bereich *</Label>
                            <Input placeholder="z.B. Keller, Büro" value={locForm.area} onChange={e => setLocForm(f => ({ ...f, area: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Möbel / Behälter *</Label>
                            <Input placeholder="z.B. Regal A, Schrank 1" value={locForm.furniture} onChange={e => setLocForm(f => ({ ...f, furniture: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Position *</Label>
                            <Input placeholder="z.B. Fach 2, Oben links" value={locForm.position} onChange={e => setLocForm(f => ({ ...f, position: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Notizen</Label>
                            <Input value={locForm.notes} onChange={e => setLocForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" />
                        </div>
                        {editingLoc && permissions.isManager && (
                            <Button variant="outline" className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
                                onClick={() => { deleteLocMutation.mutate(editingLoc.id); setLocModalOpen(false); }}>
                                <Trash2 className="w-4 h-4 mr-2" /> Lagerort löschen
                            </Button>
                        )}
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setLocModalOpen(false)}>Abbrechen</Button>
                        <Button onClick={handleSaveLoc} disabled={saveLocMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                            Speichern
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}