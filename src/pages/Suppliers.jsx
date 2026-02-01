import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export default function Suppliers() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        order: 0,
        is_active: true
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => base44.entities.Supplier.list('order')
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Supplier.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['suppliers']);
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['suppliers']);
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Supplier.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['suppliers']);
        }
    });

    const openModal = (supplier = null) => {
        if (supplier) {
            setSelectedSupplier(supplier);
            setFormData({
                name: supplier.name,
                order: supplier.order || 0,
                is_active: supplier.is_active
            });
        } else {
            setSelectedSupplier(null);
            setFormData({
                name: '',
                order: suppliers.length,
                is_active: true
            });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedSupplier(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedSupplier) {
            updateMutation.mutate({ id: selectedSupplier.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Lieferant wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    if (!permissions.isManager) {
        return <PermissionDenied message="Nur Manager können Lieferanten verwalten." />;
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Lieferanten</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Verwalte deine Großhändler und Lieferanten
                        </p>
                    </div>
                    <Button onClick={() => openModal()} className="bg-amber-600 hover:bg-amber-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Lieferant
                    </Button>
                </div>

                <div className="space-y-3">
                    {suppliers.map(supplier => (
                        <Card key={supplier.id} className="p-4 bg-slate-800 border-slate-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <GripVertical className="w-4 h-4 text-slate-500" />
                                    <div>
                                        <h3 className="font-semibold text-white">{supplier.name}</h3>
                                        <p className="text-xs text-slate-400">Reihenfolge: {supplier.order}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-700">
                                        <span className="text-xs text-slate-300">
                                            {supplier.is_active ? 'Aktiv' : 'Inaktiv'}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${supplier.is_active ? 'bg-green-500' : 'bg-slate-500'}`} />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openModal(supplier)}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(supplier.id)}
                                        className="text-red-500 hover:text-red-400"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {suppliers.length === 0 && (
                        <Card className="p-12 bg-slate-800 border-slate-700">
                            <div className="text-center text-slate-400">
                                <p className="text-lg font-medium">Keine Lieferanten</p>
                                <p className="text-sm mt-1">Füge deinen ersten Lieferanten hinzu</p>
                            </div>
                        </Card>
                    )}
                </div>

                <Dialog open={modalOpen} onOpenChange={closeModal}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedSupplier ? 'Lieferant bearbeiten' : 'Neuer Lieferant'}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="z.B. Metro"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Reihenfolge</Label>
                                <Input
                                    type="number"
                                    value={formData.order}
                                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                                    placeholder="0"
                                />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <Label>Aktiv</Label>
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                                    {selectedSupplier ? 'Speichern' : 'Hinzufügen'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}