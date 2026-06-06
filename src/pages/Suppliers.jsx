import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE } from '@/lib/queryUtils';
import { Plus, Edit, Trash2, UserPlus, Mail, Phone, MapPin, Globe, X, Building2, Clock, Package, ChevronDown, ChevronUp, Star, Briefcase, Scale, Shield, Users, HelpCircle } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Typ-Konfiguration ─────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    'Lieferant':         { color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   icon: Package,   filterLabel: 'Lieferanten' },
    'Steuerberater':     { color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',      icon: Briefcase, filterLabel: 'Steuerberater' },
    'Anwalt':            { color: 'bg-violet-500/15 text-violet-400 border-violet-500/30', icon: Scale,     filterLabel: 'Anwälte' },
    'Versicherung':      { color: 'bg-green-500/15 text-green-400 border-green-500/30',   icon: Shield,    filterLabel: 'Versicherungen' },
    'Sonstiger Kontakt': { color: 'bg-slate-500/15 text-slate-400 border-slate-500/30',   icon: Users,     filterLabel: 'Sonstige' },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG);

function TypeBadge({ type }) {
    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG['Sonstiger Kontakt'];
    return (
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', cfg.color)}>
            {type || 'Sonstiger Kontakt'}
        </span>
    );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ open, title, description, onConfirm, onCancel }) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
            <DialogContent className="sm:max-w-sm rounded-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
                </DialogHeader>
                <DialogFooter className="flex gap-2 mt-2">
                    <Button variant="outline" onClick={onCancel} className="flex-1">Abbrechen</Button>
                    <Button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Löschen</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Suppliers() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();

    const [modalOpen, setModalOpen]           = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [expandedSupplier, setExpandedSupplier] = useState(null);
    const [activeFilter, setActiveFilter]     = useState('Alle');
    const [confirmDialog, setConfirmDialog]   = useState(null);

    const emptyForm = () => ({
        name: '', type: 'Lieferant', street: '', postal_code: '', city: '',
        email: '', website: '', contacts: [], branches: [],
        opening_hours: '', notes: '', order: 0, is_active: true,
    });

    const [formData, setFormData] = useState(emptyForm());

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => base44.entities.Supplier.list('order'),
        staleTime: STALE.MEDIUM,
    });

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list('name', 500),
        staleTime: STALE.SLOW,
    });

    // ── Artikel pro Lieferant (nur echte Lieferanten) ─────────────────────────
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

    // ── Filter-Tabs ────────────────────────────────────────────────────────────
    const typeCounts = useMemo(() => {
        const counts = { 'Alle': suppliers.length };
        ALL_TYPES.forEach(t => {
            counts[t] = suppliers.filter(s => (s.type || 'Sonstiger Kontakt') === t).length;
        });
        return counts;
    }, [suppliers]);

    const filteredSuppliers = useMemo(() => {
        if (activeFilter === 'Alle') return suppliers;
        return suppliers.filter(s => (s.type || 'Sonstiger Kontakt') === activeFilter);
    }, [suppliers, activeFilter]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Supplier.create(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); closeModal(); },
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); closeModal(); },
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Supplier.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
    });

    // ── Modal ─────────────────────────────────────────────────────────────────
    const openModal = (supplier = null) => {
        if (supplier) {
            setSelectedSupplier(supplier);
            setFormData({
                name: supplier.name, type: supplier.type || 'Lieferant',
                street: supplier.street || '', postal_code: supplier.postal_code || '',
                city: supplier.city || '', email: supplier.email || '',
                website: supplier.website || '', contacts: supplier.contacts || [],
                branches: supplier.branches || [], opening_hours: supplier.opening_hours || '',
                notes: supplier.notes || '', order: supplier.order || 0, is_active: supplier.is_active ?? true,
            });
        } else {
            setSelectedSupplier(null);
            setFormData({ ...emptyForm(), order: suppliers.length });
        }
        setModalOpen(true);
    };

    const closeModal = () => { setModalOpen(false); setSelectedSupplier(null); };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedSupplier) updateMutation.mutate({ id: selectedSupplier.id, data: formData });
        else createMutation.mutate(formData);
    };

    const handleDelete = (supplier) => {
        setConfirmDialog({
            title: `"${supplier.name}" löschen?`,
            description: 'Dieser Eintrag wird unwiderruflich gelöscht.',
            onConfirm: () => { deleteMutation.mutate(supplier.id); setConfirmDialog(null); },
        });
    };

    // ── Branch helpers ────────────────────────────────────────────────────────
    const addBranch = () => setFormData(f => ({ ...f, branches: [...f.branches, { name: '', street: '', postal_code: '', city: '', phone: '', email: '', opening_hours: '', notes: '' }] }));
    const updateBranch = (i, field, val) => setFormData(f => { const b = [...f.branches]; b[i] = { ...b[i], [field]: val }; return { ...f, branches: b }; });
    const removeBranch = (i) => setFormData(f => ({ ...f, branches: f.branches.filter((_, idx) => idx !== i) }));

    // ── Contact helpers ───────────────────────────────────────────────────────
    const addContact = () => setFormData(f => ({ ...f, contacts: [...f.contacts, { name: '', role: '', phone: '', mobile: '', email: '', notes: '' }] }));
    const updateContact = (i, field, val) => setFormData(f => { const c = [...f.contacts]; c[i] = { ...c[i], [field]: val }; return { ...f, contacts: c }; });
    const removeContact = (i) => setFormData(f => ({ ...f, contacts: f.contacts.filter((_, idx) => idx !== i) }));

    if (!permissions.isManager) return <PermissionDenied message="Nur Manager können Kontakte & Partner verwalten." />;

    // ── Filter-Tabs-Reihenfolge ────────────────────────────────────────────────
    const filterTabs = ['Alle', ...ALL_TYPES.filter(t => typeCounts[t] > 0)];

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <ConfirmDialog
                open={!!confirmDialog}
                title={confirmDialog?.title || ''}
                description={confirmDialog?.description}
                onConfirm={confirmDialog?.onConfirm || (() => {})}
                onCancel={() => setConfirmDialog(null)}
            />

            <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Kontakte & Partner</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {suppliers.length} Einträge · {Object.values(articlesBySupplier).flat().length} Artikel verknüpft
                        </p>
                    </div>
                    <Button onClick={() => openModal()} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
                        <Plus className="w-4 h-4 mr-2" />
                        Neu
                    </Button>
                </div>

                {/* Filter-Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
                    {filterTabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveFilter(tab)}
                            className={cn(
                                'shrink-0 h-9 px-4 rounded-full text-sm font-medium border transition-all',
                                activeFilter === tab
                                    ? 'bg-amber-500 text-slate-900 border-amber-500'
                                    : 'bg-card border-border/60 text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {tab === 'Alle' ? 'Alle' : TYPE_CONFIG[tab]?.filterLabel || tab}
                            <span className={cn(
                                'ml-1.5 text-xs',
                                activeFilter === tab ? 'text-slate-900/70' : 'text-muted-foreground'
                            )}>
                                {typeCounts[tab] || 0}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Liste */}
                <div className="space-y-3">
                    {filteredSuppliers.length === 0 && (
                        <Card className="p-10 text-center border-border/40">
                            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-muted-foreground font-medium">Keine Einträge</p>
                        </Card>
                    )}
                    {filteredSuppliers.map(supplier => {
                        const linkedArticles = articlesBySupplier[supplier.name] || [];
                        const isExpanded = expandedSupplier === supplier.id;
                        const isSupplierType = (supplier.type || 'Sonstiger Kontakt') === 'Lieferant';

                        return (
                            <Card key={supplier.id} className={cn("border-border overflow-hidden", !supplier.is_active && "opacity-60")}>
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            {/* Name + Badge */}
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <h3 className="font-semibold text-foreground">{supplier.name}</h3>
                                                <TypeBadge type={supplier.type} />
                                                {!supplier.is_active && (
                                                    <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
                                                )}
                                            </div>

                                            {/* Kontaktdaten */}
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
                                                        <a href={`mailto:${supplier.email}`} className="hover:text-amber-500 truncate">{supplier.email}</a>
                                                    </div>
                                                )}
                                                {supplier.website && (
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="w-3 h-3 shrink-0" />
                                                        <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 truncate max-w-[220px]">
                                                            {supplier.website.replace(/^https?:\/\//, '')}
                                                        </a>
                                                    </div>
                                                )}
                                                {supplier.opening_hours && (
                                                    <div className="flex items-start gap-2">
                                                        <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                                                        <span className="whitespace-pre-line text-xs">{supplier.opening_hours}</span>
                                                    </div>
                                                )}
                                                {/* Ansprechpartner-Vorschau */}
                                                {supplier.contacts?.length > 0 && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <UserPlus className="w-3 h-3 shrink-0" />
                                                        <span className="text-xs">{supplier.contacts.map(c => c.name).filter(Boolean).join(', ')}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Artikel-Link (nur für Lieferanten) */}
                                            {isSupplierType && (
                                                <div className="mt-3">
                                                    {linkedArticles.length > 0 ? (
                                                        <button
                                                            onClick={() => setExpandedSupplier(isExpanded ? null : supplier.id)}
                                                            className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors"
                                                        >
                                                            <Package className="w-4 h-4" />
                                                            <span className="font-medium">{linkedArticles.length} Artikel verknüpft</span>
                                                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                        </button>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground/50">Keine Artikel verknüpft</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => openModal(supplier)}
                                                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(supplier)}
                                                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-900/20 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Artikel-Liste */}
                                {isExpanded && linkedArticles.length > 0 && (
                                    <div className="border-t border-border px-4 py-3 bg-muted/10">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Verknüpfte Artikel</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {linkedArticles.map(a => {
                                                const detail = (a.supplier_details || []).find(s => s.supplier_name === supplier.name);
                                                const isPrimary = detail?.is_primary;
                                                const price = detail?.purchase_price;
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
                                                            <p className="text-xs text-muted-foreground">
                                                                {isPrimary && <span className="text-amber-400 mr-1">★ Haupt</span>}
                                                                {price ? `${parseFloat(price).toFixed(2)} €` : ''}
                                                                {detail?.article_number ? ` · ${detail.article_number}` : ''}
                                                            </p>
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
                </div>
            </div>

            {/* ── Modal ──────────────────────────────────────────────────────── */}
            <Dialog open={modalOpen} onOpenChange={(v) => !v && closeModal()}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedSupplier ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 py-2">
                        {/* Basis */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Allgemein</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label>Name *</Label>
                                    <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="z.B. Getränke GmbH" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Typ</Label>
                                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {ALL_TYPES.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
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
                                <Input value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} placeholder="Musterstraße 1" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>PLZ</Label>
                                    <Input value={formData.postal_code} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} placeholder="12345" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Stadt</Label>
                                    <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Berlin" />
                                </div>
                            </div>
                        </div>

                        {/* Kontakt */}
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
                                        <button type="button" onClick={() => removeContact(index)} className="text-red-400 hover:text-red-300 p-1">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><Label className="text-xs">Name</Label>
                                            <Input value={contact.name} onChange={(e) => updateContact(index, 'name', e.target.value)} placeholder="Max Mustermann" className="text-sm" /></div>
                                        <div className="space-y-1"><Label className="text-xs">Funktion</Label>
                                            <Input value={contact.role} onChange={(e) => updateContact(index, 'role', e.target.value)} placeholder="Gebietsverkauf" className="text-sm" /></div>
                                        <div className="space-y-1"><Label className="text-xs">Telefon</Label>
                                            <Input value={contact.phone} onChange={(e) => updateContact(index, 'phone', e.target.value)} placeholder="030 123456" className="text-sm" /></div>
                                        <div className="space-y-1"><Label className="text-xs">Mobil</Label>
                                            <Input value={contact.mobile} onChange={(e) => updateContact(index, 'mobile', e.target.value)} placeholder="0170 123456" className="text-sm" /></div>
                                        <div className="space-y-2 col-span-2"><Label className="text-xs">E-Mail</Label>
                                            <Input type="email" value={contact.email} onChange={(e) => updateContact(index, 'email', e.target.value)} placeholder="name@beispiel.de" className="text-sm" /></div>
                                        <div className="space-y-2 col-span-2"><Label className="text-xs">Notizen</Label>
                                            <Textarea value={contact.notes} onChange={(e) => updateContact(index, 'notes', e.target.value)} placeholder="Weitere Infos..." rows={2} className="text-sm" /></div>
                                    </div>
                                </Card>
                            ))}
                            {formData.contacts.length === 0 && (
                                <div className="text-center p-4 bg-muted/20 rounded-lg border-2 border-dashed border-border">
                                    <p className="text-sm text-muted-foreground">Noch keine Ansprechpartner</p>
                                </div>
                            )}
                        </div>

                        {/* Niederlassungen (nur für Lieferanten sinnvoll, aber für alle verfügbar) */}
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
                                        <button type="button" onClick={() => removeBranch(index)} className="text-red-400 hover:text-red-300 p-1">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1 col-span-2"><Label className="text-xs">Name</Label>
                                            <Input value={branch.name} onChange={(e) => updateBranch(index, 'name', e.target.value)} placeholder="z.B. Filiale Nord" className="text-sm" /></div>
                                        <div className="space-y-1 col-span-2"><Label className="text-xs">Straße</Label>
                                            <Input value={branch.street} onChange={(e) => updateBranch(index, 'street', e.target.value)} placeholder="Hauptstraße 1" className="text-sm" /></div>
                                        <div className="space-y-1"><Label className="text-xs">PLZ</Label>
                                            <Input value={branch.postal_code} onChange={(e) => updateBranch(index, 'postal_code', e.target.value)} placeholder="12345" className="text-sm" /></div>
                                        <div className="space-y-1"><Label className="text-xs">Stadt</Label>
                                            <Input value={branch.city} onChange={(e) => updateBranch(index, 'city', e.target.value)} placeholder="Berlin" className="text-sm" /></div>
                                        <div className="space-y-1"><Label className="text-xs">Telefon</Label>
                                            <Input value={branch.phone} onChange={(e) => updateBranch(index, 'phone', e.target.value)} placeholder="030 123456" className="text-sm" /></div>
                                        <div className="space-y-1"><Label className="text-xs">E-Mail</Label>
                                            <Input value={branch.email} onChange={(e) => updateBranch(index, 'email', e.target.value)} placeholder="filiale@beispiel.de" className="text-sm" /></div>
                                        <div className="space-y-1 col-span-2"><Label className="text-xs">Öffnungszeiten</Label>
                                            <Textarea value={branch.opening_hours || ''} onChange={(e) => updateBranch(index, 'opening_hours', e.target.value)} placeholder={"Mo–Fr: 07:00–18:00"} rows={2} className="text-sm" /></div>
                                        <div className="space-y-1 col-span-2"><Label className="text-xs">Notizen</Label>
                                            <Textarea value={branch.notes} onChange={(e) => updateBranch(index, 'notes', e.target.value)} placeholder="Weitere Infos..." rows={2} className="text-sm" /></div>
                                    </div>
                                </Card>
                            ))}
                            {formData.branches.length === 0 && (
                                <div className="text-center p-4 bg-muted/20 rounded-lg border-2 border-dashed border-border">
                                    <p className="text-sm text-muted-foreground">Keine Niederlassungen</p>
                                </div>
                            )}
                        </div>

                        {/* Notizen & Einstellungen */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notizen</h3>
                            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Allgemeine Notizen..." rows={3} />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Einstellungen</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Reihenfolge</Label>
                                    <Input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })} placeholder="0" />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <Label>Aktiv</Label>
                                    <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Abbrechen</Button>
                            <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
                                {selectedSupplier ? 'Speichern' : 'Hinzufügen'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
