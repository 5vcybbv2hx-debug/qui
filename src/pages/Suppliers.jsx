import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, GripVertical, UserPlus, Mail, Phone, MapPin, Globe, FileText, X, Building2, Clock } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function Suppliers() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Lieferant',
        street: '',
        postal_code: '',
        city: '',
        email: '',
        website: '',
        contacts: [],
        branches: [],
        opening_hours: '',
        notes: '',
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
                type: supplier.type || 'Lieferant',
                street: supplier.street || '',
                postal_code: supplier.postal_code || '',
                city: supplier.city || '',
                email: supplier.email || '',
                website: supplier.website || '',
                contacts: supplier.contacts || [],
                branches: supplier.branches || [],
                opening_hours: supplier.opening_hours || '',
                notes: supplier.notes || '',
                order: supplier.order || 0,
                is_active: supplier.is_active
            });
        } else {
            setSelectedSupplier(null);
            setFormData({
                name: '',
                type: 'Lieferant',
                street: '',
                postal_code: '',
                city: '',
                email: '',
                website: '',
                contacts: [],
                branches: [],
                opening_hours: '',
                notes: '',
                order: suppliers.length,
                is_active: true
            });
        }
        setModalOpen(true);
    };

    const addBranch = () => {
        setFormData({ ...formData, branches: [...formData.branches, { name: '', street: '', postal_code: '', city: '', phone: '', email: '', notes: '' }] });
    };

    const updateBranch = (index, field, value) => {
        const newBranches = [...formData.branches];
        newBranches[index][field] = value;
        setFormData({ ...formData, branches: newBranches });
    };

    const removeBranch = (index) => {
        setFormData({ ...formData, branches: formData.branches.filter((_, i) => i !== index) });
    };

    const addContact = () => {
        setFormData({
            ...formData,
            contacts: [...formData.contacts, { name: '', role: '', phone: '', mobile: '', email: '', notes: '' }]
        });
    };

    const updateContact = (index, field, value) => {
        const newContacts = [...formData.contacts];
        newContacts[index][field] = value;
        setFormData({ ...formData, contacts: newContacts });
    };

    const removeContact = (index) => {
        const newContacts = formData.contacts.filter((_, i) => i !== index);
        setFormData({ ...formData, contacts: newContacts });
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
                        <h1 className="text-2xl font-bold text-white tracking-tight">Kontakte & Lieferanten</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Verwalte Lieferanten, Steuerberater und wichtige Kontakte
                        </p>
                    </div>
                    <Button onClick={() => openModal()} className="bg-amber-600 hover:bg-amber-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Kontakt
                    </Button>
                </div>

                <div className="space-y-3">
                    {suppliers.map(supplier => (
                        <Card key={supplier.id} className="p-4 bg-slate-800 border-slate-700">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                    <GripVertical className="w-4 h-4 text-slate-500 mt-1" />
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-white">{supplier.name}</h3>
                                            <Badge variant="outline" className="text-xs">
                                                {supplier.type || 'Lieferant'}
                                            </Badge>
                                        </div>
                                        
                                        <div className="space-y-1 text-sm text-slate-400">
                                            {supplier.street && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{supplier.street}, {supplier.postal_code} {supplier.city}</span>
                                                </div>
                                            )}
                                            {supplier.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3 h-3" />
                                                    <a href={`mailto:${supplier.email}`} className="hover:text-amber-500">
                                                        {supplier.email}
                                                    </a>
                                                </div>
                                            )}
                                            {supplier.website && (
                                                <div className="flex items-center gap-2">
                                                    <Globe className="w-3 h-3 shrink-0" />
                                                    <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 truncate max-w-[220px]">
                                                        {supplier.website}
                                                    </a>
                                                </div>
                                            )}
                                            {supplier.opening_hours && (
                                                <div className="flex items-start gap-2">
                                                    <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                                                    <span className="whitespace-pre-line text-xs">{supplier.opening_hours}</span>
                                                </div>
                                            )}
                                            {supplier.branches && supplier.branches.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-3 h-3" />
                                                    <span>{supplier.branches.length} Niederlassung{supplier.branches.length > 1 ? 'en' : ''}</span>
                                                </div>
                                            )}
                                            {supplier.contacts && supplier.contacts.length > 0 && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Phone className="w-3 h-3" />
                                                    <span>{supplier.contacts.length} Ansprechpartner</span>
                                                </div>
                                            )}
                                        </div>
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
                                <p className="text-lg font-medium">Keine Kontakte</p>
                                <p className="text-sm mt-1">Füge deinen ersten Lieferanten oder Kontakt hinzu</p>
                            </div>
                        </Card>
                    )}
                </div>

                <Dialog open={modalOpen} onOpenChange={closeModal}>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedSupplier ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                            {/* Grunddaten */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Grunddaten</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
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
                                        <Label>Typ</Label>
                                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Lieferant">Lieferant</SelectItem>
                                                <SelectItem value="Steuerberater">Steuerberater</SelectItem>
                                                <SelectItem value="Anwalt">Anwalt</SelectItem>
                                                <SelectItem value="Versicherung">Versicherung</SelectItem>
                                                <SelectItem value="Sonstiger Kontakt">Sonstiger Kontakt</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Adresse */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Adresse</h3>
                                
                                <div className="space-y-2">
                                    <Label>Straße & Hausnummer</Label>
                                    <Input
                                        value={formData.street}
                                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                        placeholder="z.B. Hauptstraße 1"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>PLZ</Label>
                                        <Input
                                            value={formData.postal_code}
                                            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                            placeholder="12345"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Stadt</Label>
                                        <Input
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="z.B. Berlin"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Niederlassungen */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Niederlassungen</h3>
                                    <Button type="button" size="sm" variant="outline" onClick={addBranch}>
                                        <Building2 className="w-4 h-4 mr-2" />
                                        Hinzufügen
                                    </Button>
                                </div>

                                {formData.branches.map((branch, index) => (
                                    <Card key={index} className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium">Niederlassung {index + 1}</h4>
                                            <Button type="button" size="icon" variant="ghost" onClick={() => removeBranch(index)} className="text-red-500 hover:text-red-600">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2 col-span-2">
                                                <Label className="text-xs">Name / Bezeichnung</Label>
                                                <Input value={branch.name} onChange={(e) => updateBranch(index, 'name', e.target.value)} placeholder="z.B. Filiale Nord" className="text-sm" />
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <Label className="text-xs">Straße & Hausnummer</Label>
                                                <Input value={branch.street} onChange={(e) => updateBranch(index, 'street', e.target.value)} placeholder="Hauptstraße 1" className="text-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">PLZ</Label>
                                                <Input value={branch.postal_code} onChange={(e) => updateBranch(index, 'postal_code', e.target.value)} placeholder="12345" className="text-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Stadt</Label>
                                                <Input value={branch.city} onChange={(e) => updateBranch(index, 'city', e.target.value)} placeholder="Berlin" className="text-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Telefon</Label>
                                                <Input value={branch.phone} onChange={(e) => updateBranch(index, 'phone', e.target.value)} placeholder="030 123456" className="text-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">E-Mail</Label>
                                                <Input type="email" value={branch.email} onChange={(e) => updateBranch(index, 'email', e.target.value)} placeholder="filiale@beispiel.de" className="text-sm" />
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <Label className="text-xs">Notizen</Label>
                                                <Textarea value={branch.notes} onChange={(e) => updateBranch(index, 'notes', e.target.value)} placeholder="Weitere Infos..." rows={2} className="text-sm" />
                                            </div>
                                        </div>
                                    </Card>
                                ))}

                                {formData.branches.length === 0 && (
                                    <div className="text-center p-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                        <p className="text-sm text-slate-500">Keine Niederlassungen eingetragen</p>
                                    </div>
                                )}
                            </div>

                            {/* Kontaktdaten */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Kontaktdaten</h3>
                                
                                <div className="space-y-2">
                                    <Label>E-Mail</Label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="info@beispiel.de"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Webseite</Label>
                                    <Input
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        placeholder="https://www.beispiel.de"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Öffnungszeiten</Label>
                                    <Textarea
                                        value={formData.opening_hours}
                                        onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                                        placeholder={"Mo–Fr: 07:00–18:00\nSa: 08:00–14:00\nSo: geschlossen"}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Ansprechpartner */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Ansprechpartner</h3>
                                    <Button type="button" size="sm" variant="outline" onClick={addContact}>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Hinzufügen
                                    </Button>
                                </div>

                                {formData.contacts.map((contact, index) => (
                                    <Card key={index} className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium">Ansprechpartner {index + 1}</h4>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => removeContact(index)}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Name</Label>
                                                <Input
                                                    value={contact.name}
                                                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                                                    placeholder="Max Mustermann"
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Funktion</Label>
                                                <Input
                                                    value={contact.role}
                                                    onChange={(e) => updateContact(index, 'role', e.target.value)}
                                                    placeholder="Geschäftsführer"
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Telefon</Label>
                                                <Input
                                                    value={contact.phone}
                                                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                                                    placeholder="030 123456"
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Mobil</Label>
                                                <Input
                                                    value={contact.mobile}
                                                    onChange={(e) => updateContact(index, 'mobile', e.target.value)}
                                                    placeholder="0170 123456"
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs">E-Mail</Label>
                                            <Input
                                                type="email"
                                                value={contact.email}
                                                onChange={(e) => updateContact(index, 'email', e.target.value)}
                                                placeholder="name@beispiel.de"
                                                className="text-sm"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs">Notizen</Label>
                                            <Textarea
                                                value={contact.notes}
                                                onChange={(e) => updateContact(index, 'notes', e.target.value)}
                                                placeholder="Weitere Informationen..."
                                                rows={2}
                                                className="text-sm"
                                            />
                                        </div>
                                    </Card>
                                ))}

                                {formData.contacts.length === 0 && (
                                    <div className="text-center p-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                        <p className="text-sm text-slate-500">Noch keine Ansprechpartner</p>
                                    </div>
                                )}
                            </div>

                            {/* Notizen */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Notizen</h3>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Allgemeine Notizen..."
                                    rows={3}
                                />
                            </div>

                            {/* Einstellungen */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Einstellungen</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
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
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t">
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