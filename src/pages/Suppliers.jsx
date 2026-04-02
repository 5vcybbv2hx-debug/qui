import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, GripVertical, UserPlus, Mail, Phone, MapPin, Globe, X, Building2, Clock, Package, ChevronDown, ChevronUp, Star } from 'lucide-react';
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
import { cn } from "@/lib/utils";

export default function Suppliers() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [expandedSupplier, setExpandedSupplier] = useState(null);
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

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name')
    });

    // Build map: supplierName -> articles (checks both supplier_details and legacy suppliers array)
    const articlesBySupplier = useMemo(() => {
        const map = {};
        articles.forEach(a => {
            const names = [
                ...(a.supplier_details || []).map(s => s.supplier_name),
                ...(a.suppliers || [])
            ];
            [...new Set(names.filter(Boolean))].forEach(name => {
                if (!map[name]) map[name] = [];
                if (!map[name].find(x => x.id === a.id)) map[name].push(a);
            });
        });
        return map;
    }, [articles]);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Supplier.create(data),
        onSuccess: () => { queryClient.invalidateQueries(['suppliers']); closeModal(); }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
        onSuccess: () => { queryClient.invalidateQueries(['suppliers']); closeModal(); }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Supplier.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['suppliers'])
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
        setFormData({ ...formData, contacts: formData.contacts.filter((_, i) => i !== index) });
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
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Kontakte & Lieferanten</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {suppliers.length} Einträge · {articles.length} Artikel verknüpft
                        </p>
                    </div>
                    <Button onClick={() => openModal()} className="bg-amber-600 hover:bg-amber-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Kontakt
                    </Button>
                </div>

                <div className="space-y-3">
                    {suppliers.map(supplier => {
                        const linkedArticles = articlesBySupplier[supplier.name] || [];
                        const isExpanded = expandedSupplier === supplier.id;

                        return (
                            <Card key={supplier.id} className="bg-card border-border overflow-hidden">
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="font-semibold text-foreground">{supplier.name}</h3>
                                                <Badge variant="outline" className="text-xs">
                                                    {supplier.type || 'Lieferant'}
                                                </Badge>
                                                {!supplier.is_active && (
                                                    <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
                                                )}
                                            </div>

                                            <div className="space-y-1 text-sm text-muted-foreground">
                                                {supplier.street && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3 h-3 shrink-0" />
                                                        <span>{supplier.street}, {supplier.postal_code} {supplier.city}</span>
                                                    </div>
                                                )}
                                                {supplier.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-3 h-3 shrink-0" />
                                                        <a href={`mailto:${supplier.email}`} className="hover:text-amber-500 truncate">
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
                                            </div>

                                            {/* Linked articles chip summary */}
                                            {linkedArticles.length > 0 && (
                                                <button
                                                    onClick={() => setExpandedSupplier(isExpanded ? null : supplier.id)}
                                                    className="mt-3 flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors"
                                                >
                                                    <Package className="w-4 h-4" />
                                                    <span className="font-medium">{linkedArticles.length} Artikel verknüpft</span>
                                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </button>
                                            )}
                                            {linkedArticles.length === 0 && (
                                                <p className="mt-2 text-xs text-muted-foreground">Keine Artikel verknüpft</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button variant="ghost" size="icon" onClick={() => openModal(supplier)}
                                                className="text-muted-foreground hover:text-foreground h-9 w-9">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)}
                                                className="text-red-400 hover:text-red-300 h-9 w-9">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded article list */}
                                {isExpanded && linkedArticles.length > 0 && (
                                    <div className="border-t border-border px-4 py-3 bg-muted/20">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Verknüpfte Artikel</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {linkedArticles.map(a => {
                                                // Find price for this supplier
                                                const supplierDetail = (a.supplier_details || []).find(s => s.supplier_name === supplier.name);
                                                const isPrimary = supplierDetail?.is_primary;
                                                const price = supplierDetail?.purchase_price;
                                                return (
                                                    <div key={a.id} className={cn(
                                                        'flex items-center gap-2 p-2 rounded-lg border text-sm',
                                                        isPrimary ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card'
                                                    )}>
                                                        {a.image_url ? (
                                                            <img src={a.image_url} alt={a.name} className="w-8 h-8 rounded object-cover shrink-0" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                                                                <Package className="w-4 h-4 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-foreground truncate text-sm">{a.name}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{a.category || '—'}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {price && (
                                                                <span className="text-xs text-green-400 font-semibold">{parseFloat(price).toFixed(2)} €</span>
                                                            )}
                                                            {isPrimary && (
                                                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}

                    {suppliers.length === 0 && (
                        <Card className="p-12 bg-card border-border">
                            <div className="text-center text-muted-foreground">
                                <p className="text-lg font-medium">Keine Kontakte</p>
                                <p className="text-sm mt-1">Füge deinen ersten Lieferanten oder Kontakt hinzu</p>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Modal */}
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
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Grunddaten</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Name *</Label>
                                        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="z.B. Metro" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Typ</Label>
                                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
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
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Adresse</h3>
                                <div className="space-y-2">
                                    <Label>Straße & Hausnummer</Label>
                                    <Input value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                        placeholder="z.B. Hauptstraße 1" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>PLZ</Label>
                                        <Input value={formData.postal_code} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                            placeholder="12345" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Stadt</Label>
                                        <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="z.B. Berlin" />
                                    </div>
                                </div>
                            </div>

                            {/* Niederlassungen */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Niederlassungen</h3>
                                    <Button type="button" size="sm" variant="outline" onClick={addBranch}>
                                        <Building2 className="w-4 h-4 mr-2" />Hinzufügen
                                    </Button>
                                </div>
                                {formData.branches.map((branch, index) => (
                                    <Card key={index} className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium">Niederlassung {index + 1}</h4>
                                            <Button type="button" size="icon" variant="ghost" onClick={() => removeBranch(index)}
                                                className="text-red-500 hover:text-red-600"><X className="w-4 h-4" /></Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2 col-span-2">
                                                <Label className="text-xs">Name / Bezeichnung</Label>
                                                <Input value={branch.name} onChange={(e) => updateBranch(index, 'name', e.target.value)} placeholder="z.B. Filiale Nord" className="text-sm" />
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <Label className="text-xs">Straße</Label>
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
                                                <Label className="text-xs">Öffnungszeiten</Label>
                                                <Textarea value={branch.opening_hours || ''} onChange={(e) => updateBranch(index, 'opening_hours', e.target.value)} placeholder={"Mo–Fr: 07:00–18:00\nSa: 08:00–14:00"} rows={2} className="text-sm" />
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <Label className="text-xs">Notizen</Label>
                                                <Textarea value={branch.notes} onChange={(e) => updateBranch(index, 'notes', e.target.value)} placeholder="Weitere Infos..." rows={2} className="text-sm" />
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                {formData.branches.length === 0 && (
                                    <div className="text-center p-4 bg-muted/20 rounded-lg border-2 border-dashed border-border">
                                        <p className="text-sm text-muted-foreground">Keine Niederlassungen eingetragen</p>
                                    </div>
                                )}
                            </div>

                            {/* Kontaktdaten */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Kontaktdaten</h3>
                                <div className="space-y-2">
                                    <Label>E-Mail</Label>
                                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="info@beispiel.de" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Webseite</Label>
                                    <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://www.beispiel.de" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Öffnungszeiten</Label>
                                    <Textarea value={formData.opening_hours} onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                                        placeholder={"Mo–Fr: 07:00–18:00\nSa: 08:00–14:00\nSo: geschlossen"} rows={3} />
                                </div>
                            </div>

                            {/* Ansprechpartner */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ansprechpartner</h3>
                                    <Button type="button" size="sm" variant="outline" onClick={addContact}>
                                        <UserPlus className="w-4 h-4 mr-2" />Hinzufügen
                                    </Button>
                                </div>
                                {formData.contacts.map((contact, index) => (
                                    <Card key={index} className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium">Ansprechpartner {index + 1}</h4>
                                            <Button type="button" size="icon" variant="ghost" onClick={() => removeContact(index)} className="text-red-500 hover:text-red-600">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2"><Label className="text-xs">Name</Label>
                                                <Input value={contact.name} onChange={(e) => updateContact(index, 'name', e.target.value)} placeholder="Max Mustermann" className="text-sm" /></div>
                                            <div className="space-y-2"><Label className="text-xs">Funktion</Label>
                                                <Input value={contact.role} onChange={(e) => updateContact(index, 'role', e.target.value)} placeholder="Geschäftsführer" className="text-sm" /></div>
                                            <div className="space-y-2"><Label className="text-xs">Telefon</Label>
                                                <Input value={contact.phone} onChange={(e) => updateContact(index, 'phone', e.target.value)} placeholder="030 123456" className="text-sm" /></div>
                                            <div className="space-y-2"><Label className="text-xs">Mobil</Label>
                                                <Input value={contact.mobile} onChange={(e) => updateContact(index, 'mobile', e.target.value)} placeholder="0170 123456" className="text-sm" /></div>
                                            <div className="space-y-2 col-span-2"><Label className="text-xs">E-Mail</Label>
                                                <Input type="email" value={contact.email} onChange={(e) => updateContact(index, 'email', e.target.value)} placeholder="name@beispiel.de" className="text-sm" /></div>
                                            <div className="space-y-2 col-span-2"><Label className="text-xs">Notizen</Label>
                                                <Textarea value={contact.notes} onChange={(e) => updateContact(index, 'notes', e.target.value)} placeholder="Weitere Informationen..." rows={2} className="text-sm" /></div>
                                        </div>
                                    </Card>
                                ))}
                                {formData.contacts.length === 0 && (
                                    <div className="text-center p-4 bg-muted/20 rounded-lg border-2 border-dashed border-border">
                                        <p className="text-sm text-muted-foreground">Noch keine Ansprechpartner</p>
                                    </div>
                                )}
                            </div>

                            {/* Notizen */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notizen</h3>
                                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Allgemeine Notizen..." rows={3} />
                            </div>

                            {/* Einstellungen */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Einstellungen</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Reihenfolge</Label>
                                        <Input type="number" value={formData.order}
                                            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })} placeholder="0" />
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <Label>Aktiv</Label>
                                        <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Abbrechen</Button>
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