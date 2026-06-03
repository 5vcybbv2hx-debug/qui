/**
 * StructureTab — Bereich → Möbel verwalten (2 Ebenen)
 * Kein Container mehr. Möbel haben Typ + Bereich.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { STALE } from '@/lib/queryUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Layers, ChevronRight, ChevronDown, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FURNITURE_TYPES = ['Regal','Schrank','Kühlschrank','Tiefkühlschrank','Schubladenbox','Tisch','Kiste','Sonstiges'];

const FURNITURE_ICONS = {
  'Kühlschrank':      '🧊',
  'Tiefkühlschrank':  '❄️',
  'Regal':            '📦',
  'Schrank':          '🗄️',
  'Schubladenbox':    '🗃️',
  'Tisch':            '🍽️',
  'Kiste':            '📫',
  'Sonstiges':        '📌',
};

export default function StructureTab({ permissions }) {
  const qc = useQueryClient();
  const canEdit = permissions.isManager;

  const [expandedAreas, setExpandedAreas] = useState({});
  const [areaModal,  setAreaModal]  = useState({ open: false, data: null });
  const [furModal,   setFurModal]   = useState({ open: false, data: null, areaId: '' });
  const [areaForm,   setAreaForm]   = useState({ name: '', description: '' });
  const [furForm,    setFurForm]    = useState({ name: '', type: '', area_id: '', notes: '' });

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: areas = [],     isLoading: aL } = useQuery({ queryKey: ['st-areas'],     queryFn: () => base44.entities.Area.list('name', 100),      staleTime: STALE.SLOW });
  const { data: furniture = [], isLoading: fL } = useQuery({ queryKey: ['st-furniture'], queryFn: () => base44.entities.Furniture.list('name', 200), staleTime: STALE.SLOW });
  const { data: slots = [] }                    = useQuery({ queryKey: ['slots'],         queryFn: () => base44.entities.StorageSlot.list('name', 1000), staleTime: STALE.MEDIUM });

  const isLoading = aL || fL;

  // ── Area CRUD ────────────────────────────────────────────────────────────────
  const saveAreaMut = useMutation({
    mutationFn: d => areaModal.data?.id ? base44.entities.Area.update(areaModal.data.id, d) : base44.entities.Area.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['st-areas'] }); setAreaModal({ open: false, data: null }); toast.success('Bereich gespeichert'); },
    onError: e => toast.error('Fehler: ' + (e?.message || 'Unbekannt')),
  });

  const deleteAreaMut = useMutation({
    mutationFn: id => base44.entities.Area.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['st-areas'] }); toast.success('Bereich gelöscht'); },
    onError: () => toast.error('Löschen fehlgeschlagen — hat dieser Bereich noch Möbel?'),
  });

  // ── Furniture CRUD ───────────────────────────────────────────────────────────
  const saveFurMut = useMutation({
    mutationFn: d => furModal.data?.id ? base44.entities.Furniture.update(furModal.data.id, d) : base44.entities.Furniture.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['st-furniture'] }); setFurModal({ open: false, data: null, areaId: '' }); toast.success('Möbel gespeichert'); },
    onError: e => toast.error('Fehler: ' + (e?.message || 'Unbekannt')),
  });

  const deleteFurMut = useMutation({
    mutationFn: id => base44.entities.Furniture.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['st-furniture'] }); toast.success('Möbel gelöscht'); },
    onError: () => toast.error('Löschen fehlgeschlagen — hat dieses Möbel noch Fächer?'),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const openAddArea = () => { setAreaForm({ name: '', description: '' }); setAreaModal({ open: true, data: null }); };
  const openEditArea = a => { setAreaForm({ name: a.name, description: a.description || '' }); setAreaModal({ open: true, data: a }); };

  const openAddFur = (areaId) => { setFurForm({ name: '', type: '', area_id: areaId, notes: '' }); setFurModal({ open: true, data: null, areaId }); };
  const openEditFur = f => { setFurForm({ name: f.name, type: f.type || '', area_id: f.area_id, notes: f.notes || '' }); setFurModal({ open: true, data: f, areaId: f.area_id }); };

  const toggleArea = id => setExpandedAreas(p => ({ ...p, [id]: !p[id] }));

  const furByArea = useMemo(() => {
    const m = {};
    for (const f of furniture) {
      if (!m[f.area_id]) m[f.area_id] = [];
      m[f.area_id].push(f);
    }
    return m;
  }, [furniture]);

  const slotCountByFurniture = useMemo(() => {
    const m = {};
    for (const s of slots) {
      m[s.furniture_id] = (m[s.furniture_id] || 0) + 1;
    }
    return m;
  }, [slots]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">{areas.length} Bereiche · {furniture.length} Möbel</p>
        {canEdit && (
          <Button size="sm" onClick={openAddArea} className="bg-amber-600 hover:bg-amber-700 text-white h-9">
            <Plus className="w-4 h-4 mr-1" /> Bereich
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : areas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Bereiche angelegt</p>
          {canEdit && <Button size="sm" variant="outline" onClick={openAddArea} className="mt-3">Ersten Bereich anlegen</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {areas.map(area => {
            const areaFurniture = furByArea[area.id] || [];
            const isExpanded = expandedAreas[area.id] !== false; // default expanded
            const totalSlots = areaFurniture.reduce((sum, f) => sum + (slotCountByFurniture[f.id] || 0), 0);

            return (
              <Card key={area.id} className="overflow-hidden">
                {/* Area header */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => toggleArea(area.id)}
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{area.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {areaFurniture.length} Möbel · {totalSlots} Fächer
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"
                          onClick={e => { e.stopPropagation(); openEditArea(area); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={e => { e.stopPropagation(); if (window.confirm(`"${area.name}" löschen?`)) deleteAreaMut.mutate(area.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Furniture list */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {areaFurniture.map(f => {
                      const slotCount = slotCountByFurniture[f.id] || 0;
                      return (
                        <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                          <span className="text-lg w-7 text-center">{FURNITURE_ICONS[f.type] || '📦'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{f.name}</p>
                            <p className="text-[11px] text-muted-foreground">{f.type} · {slotCount} Fach{slotCount !== 1 ? 'er' : ''}</p>
                          </div>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => openEditFur(f)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => { if (window.confirm(`"${f.name}" löschen?`)) deleteFurMut.mutate(f.id); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {canEdit && (
                      <button
                        onClick={() => openAddFur(area.id)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-amber-500 hover:bg-amber-500/5 transition-colors font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Möbel hinzufügen
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Area Modal ────────────────────────────────────────────────────────── */}
      <Dialog open={areaModal.open} onOpenChange={open => !open && setAreaModal({ open: false, data: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{areaModal.data ? 'Bereich bearbeiten' : 'Neuer Bereich'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="z.B. Bar, Keller, Küche…" value={areaForm.name} onChange={e => setAreaForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Beschreibung (optional)</Label>
              <Input placeholder="Kurze Beschreibung" value={areaForm.description} onChange={e => setAreaForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAreaModal({ open: false, data: null })}>Abbrechen</Button>
            <Button onClick={() => { if (!areaForm.name.trim()) { toast.error('Name erforderlich'); return; } saveAreaMut.mutate({ name: areaForm.name.trim(), description: areaForm.description, is_active: true }); }}
              disabled={saveAreaMut.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saveAreaMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Furniture Modal ───────────────────────────────────────────────────── */}
      <Dialog open={furModal.open} onOpenChange={open => !open && setFurModal({ open: false, data: null, areaId: '' })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{furModal.data ? 'Möbel bearbeiten' : 'Neues Möbel'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Typ *</Label>
              <Select value={furForm.type} onValueChange={v => setFurForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Möbeltyp wählen…" /></SelectTrigger>
                <SelectContent>
                  {FURNITURE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{FURNITURE_ICONS[t] || '📦'} {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="z.B. Kühlschrank Bar, Regal Links…" value={furForm.name} onChange={e => setFurForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Bereich *</Label>
              <Select value={furForm.area_id} onValueChange={v => setFurForm(f => ({ ...f, area_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Bereich wählen…" /></SelectTrigger>
                <SelectContent>
                  {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notizen (optional)</Label>
              <Input placeholder="z.B. Nur Getränke" value={furForm.notes} onChange={e => setFurForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFurModal({ open: false, data: null, areaId: '' })}>Abbrechen</Button>
            <Button
              onClick={() => {
                const area = areas.find(a => a.id === furForm.area_id);
                if (!furForm.name.trim() || !furForm.type || !area) { toast.error('Bitte alle Felder ausfüllen'); return; }
                saveFurMut.mutate({ name: furForm.name.trim(), type: furForm.type, area_id: area.id, area_name: area.name, notes: furForm.notes, is_active: true });
              }}
              disabled={saveFurMut.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saveFurMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
