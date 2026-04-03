import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import LocationSelect from '@/components/storage/LocationSelect';
import AreaSelect from '@/components/storage/AreaSelect';
import ContainerSelect from '@/components/storage/ContainerSelect';
import ArticleSelect from '@/components/storage/ArticleSelect';

// Tab Navigation
function TabNav({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 font-medium text-sm transition-colors ${
            active === tab.id
              ? 'border-b-2 border-amber-500 text-amber-500'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Tab 1: Lagerstruktur verwalten
function TabStructure() {
  const [expandedLocation, setExpandedLocation] = useState(null);
  const [expandedArea, setExpandedArea] = useState(null);
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [locForm, setLocForm] = useState({ name: '' });
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.filter({ is_active: true }, '-order,name')
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => base44.entities.Area.filter({ is_active: true })
  });

  const { data: containers = [] } = useQuery({
    queryKey: ['containers'],
    queryFn: () => base44.entities.Container.filter({ is_active: true })
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingLoc?.id
      ? base44.entities.Location.update(editingLoc.id, data)
      : base44.entities.Location.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setLocModalOpen(false);
      setLocForm({ name: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Location.update(id, { is_active: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] })
  });

  const openAddLoc = () => { setEditingLoc(null); setLocForm({ name: '' }); setLocModalOpen(true); };
  const openEditLoc = (loc) => { setEditingLoc(loc); setLocForm({ name: loc.name }); setLocModalOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Lagerstruktur</h2>
        <Button onClick={openAddLoc} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Lagerort
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Noch keine Lagerorte. Klicke „Lagerort" um zu beginnen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map(loc => {
            const locAreas = areas.filter(a => a.area_id === loc.id);
            const isOpen = expandedLocation === loc.id;
            return (
              <div key={loc.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedLocation(isOpen ? null : loc.id)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span className="font-semibold">{loc.name}</span>
                    <Badge variant="outline">{locAreas.length} Bereich(e)</Badge>
                  </div>
                  {permissions.isManager && (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEditLoc(loc)} className="p-1 hover:bg-accent rounded">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(loc.id)} className="p-1 hover:bg-destructive/10 rounded">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 py-3 bg-background border-t border-border space-y-2">
                    {locAreas.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Keine Bereiche vorhanden</p>
                    ) : (
                      locAreas.map(area => {
                        const areaContainers = containers.filter(c => c.area_id === area.id);
                        const isAreaOpen = expandedArea === area.id;
                        return (
                          <div key={area.id} className="border border-border/50 rounded bg-card/50 overflow-hidden">
                            <button
                              onClick={() => setExpandedArea(isAreaOpen ? null : area.id)}
                              className="w-full px-3 py-2 flex items-center justify-between hover:bg-accent/30 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isAreaOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                <span className="text-sm font-medium">{area.icon || '📦'} {area.name}</span>
                                <Badge variant="outline" className="text-xs">{areaContainers.length}</Badge>
                              </div>
                            </button>
                            {isAreaOpen && (
                              <div className="px-3 py-2 bg-background/50 text-xs space-y-1">
                                {areaContainers.map(cont => (
                                  <div key={cont.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/20">
                                    <span>•</span>
                                    <span>{cont.name}</span>
                                    {cont.type && <Badge variant="outline" className="text-xs">{cont.type}</Badge>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={locModalOpen} onOpenChange={setLocModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLoc ? 'Lagerort bearbeiten' : 'Neuer Lagerort'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={locForm.name}
                onChange={e => setLocForm({ name: e.target.value })}
                placeholder="z.B. Lagerkeller, Bar Hauptbereich"
                className="h-11 text-base"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLocModalOpen(false)} className="flex-1">Abbrechen</Button>
              <Button onClick={() => saveMutation.mutate(locForm)} disabled={!locForm.name.trim() || saveMutation.isPending} className="flex-1">
                {saveMutation.isPending ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Tab 2: Artikel zuordnen
function TabAssignments() {
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [form, setForm] = useState({
    article_id: '',
    location_id: '',
    area_id: '',
    container_id: '',
    quantity: 1,
    unit: 'Stück',
    min_stock: 0,
    notes: ''
  });
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  const { data: assignments = [] } = useQuery({
    queryKey: ['storage-assignments'],
    queryFn: () => base44.entities.StorageAssignment.filter({ is_active: true })
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles-storage'],
    queryFn: () => base44.entities.Article.filter({ is_active: true }, 'name', 500)
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingAssignment?.id
      ? base44.entities.StorageAssignment.update(editingAssignment.id, data)
      : base44.entities.StorageAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-assignments'] });
      setAssignModalOpen(false);
      setForm({ article_id: '', location_id: '', area_id: '', container_id: '', quantity: 1, unit: 'Stück', min_stock: 0, notes: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StorageAssignment.update(id, { is_active: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['storage-assignments'] })
  });

  const openAddAssignment = () => { setEditingAssignment(null); setAssignModalOpen(true); };
  const openEditAssignment = (a) => { setEditingAssignment(a); setForm({ ...a, quantity: a.quantity || 1 }); setAssignModalOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Artikel zuordnen</h2>
        <Button onClick={openAddAssignment} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Zuordnung
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Noch keine Artikel zugeordnet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {assignments.map(a => {
            const article = articles.find(ar => ar.id === a.article_id);
            const isLowStock = a.min_stock && a.quantity < a.min_stock;
            return (
              <div key={a.id} className={`border rounded-lg p-3 ${isLowStock ? 'border-red-500/50 bg-red-500/5' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{a.article_name}</p>
                    <p className="text-xs text-muted-foreground">{a.location_name} › {a.area_name}</p>
                  </div>
                  {permissions.isManager && (
                    <div className="flex gap-1">
                      <button onClick={() => openEditAssignment(a)} className="p-1 hover:bg-accent rounded">
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(a.id)} className="p-1 hover:bg-destructive/10 rounded">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={isLowStock ? 'bg-red-600' : 'bg-emerald-600'}>
                    {a.quantity} {a.unit}
                  </Badge>
                  {a.min_stock && (
                    <Badge variant="outline" className="text-xs">min: {a.min_stock}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? 'Zuordnung bearbeiten' : 'Neue Zuordnung'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <ArticleSelect value={form.article_id} onChange={id => setForm({ ...form, article_id: id })} />
            <LocationSelect value={form.location_id} onChange={id => setForm({ ...form, location_id: id, area_id: '', container_id: '' })} />
            <AreaSelect value={form.area_id} onChange={id => setForm({ ...form, area_id: id, container_id: '' })} />
            <ContainerSelect areaId={form.area_id} value={form.container_id} onChange={id => setForm({ ...form, container_id: id })} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Menge *</Label>
                <Input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Einheit</Label>
                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="h-11 px-3 rounded-lg border border-input bg-background">
                  <option>Stück</option>
                  <option>l</option>
                  <option>ml</option>
                  <option>kg</option>
                  <option>g</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mindestbestand</Label>
              <Input type="number" min={0} value={form.min_stock} onChange={e => setForm({ ...form, min_stock: Number(e.target.value) })} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Notizen</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="h-11" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAssignModalOpen(false)} className="flex-1">Abbrechen</Button>
              <Button
                onClick={() => {
                  if (!form.article_id || !form.location_id || !form.area_id || !form.container_id) return;
                  saveMutation.mutate(form);
                }}
                disabled={!form.article_id || !form.location_id || !form.area_id || !form.container_id || saveMutation.isPending}
                className="flex-1"
              >
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Hauptkomponente
export default function StorageRefactored() {
  const [activeTab, setActiveTab] = useState('structure');
  const permissions = usePermissions();

  if (permissions.isLoading) return null;
  if (!permissions.canViewInventory && !permissions.isManager) return <PermissionDenied />;

  const tabs = [
    { id: 'structure', label: '📦 Struktur' },
    { id: 'assignments', label: '🏷️ Artikel' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8 pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Lagerverwaltung</h1>
        <p className="text-muted-foreground text-sm mt-1">Strukturierte Verwaltung von Lagerorten, Bereichen und Artikeln</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <TabNav tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <div className="p-4 sm:p-6">
          {activeTab === 'structure' && <TabStructure />}
          {activeTab === 'assignments' && <TabAssignments />}
        </div>
      </div>
    </div>
  );
}