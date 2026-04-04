import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { generateShortCode, buildFullName } from './storageUtils';

const FURNITURE_TYPES = ['Regal', 'Kühlschrank', 'Schrank', 'Unterschrank', 'Theke', 'Sonstiges'];
const CONTAINER_TYPES = ['Fach', 'Schublade', 'Box', 'Ebene', 'Abteil', 'Sonstiges'];

// ── Reusable Entity Form Modal ──────────────────────────────────────────────

function EntityModal({ open, onClose, title, children, onSave, isPending, canSave }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">{children}</div>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Abbrechen</Button>
          <Button onClick={onSave} disabled={!canSave || isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
            {isPending ? 'Speichert…' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Collapsible Section ─────────────────────────────────────────────────────

function Section({ title, subtitle, count, onAdd, children, defaultOpen = false, canEdit }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-foreground text-left">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground text-left">{subtitle}</p>}
          </div>
          {count !== undefined && (
            <Badge variant="outline" className="text-xs">{count}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && onAdd && (
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              className="bg-amber-600 hover:bg-amber-700 text-white h-8"
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">{children}</div>}
    </Card>
  );
}

// ── Row item ────────────────────────────────────────────────────────────────

function ItemRow({ label, sublabel, onEdit, onDelete, canEdit }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      {canEdit && (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8 text-muted-foreground">
            <Pencil className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main StructureTab ────────────────────────────────────────────────────────

export default function StructureTab({ permissions }) {
  const qc = useQueryClient();
  const canEdit = permissions.isManager;

  // ── Data ──
  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: () => base44.entities.Area.list('order,name', 100) });
  const { data: furniture = [] } = useQuery({ queryKey: ['furniture'], queryFn: () => base44.entities.Furniture.list('sort_order,name', 500) });
  const { data: containers = [] } = useQuery({ queryKey: ['containers-all'], queryFn: () => base44.entities.Container.list('sort_order,name', 500) });

  // ── Area Modal ──
  const [areaModal, setAreaModal] = useState({ open: false, data: null });
  const [areaForm, setAreaForm] = useState({ name: '', description: '' });

  const openAreaModal = (item = null) => {
    setAreaForm({ name: item?.name || '', description: item?.description || '' });
    setAreaModal({ open: true, data: item });
  };

  const areaMut = useMutation({
    mutationFn: (d) => areaModal.data?.id ? base44.entities.Area.update(areaModal.data.id, d) : base44.entities.Area.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setAreaModal({ open: false, data: null }); },
    onError: (e) => { console.error('Area save error:', e); alert('Fehler: ' + (e?.message || 'Unbekannt')); }
  });

  const deleteArea = useMutation({
    mutationFn: (id) => base44.entities.Area.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas'] }),
    onError: (e) => { console.error(e); alert('Fehler beim Löschen'); }
  });

  // ── Furniture Modal ──
  const [furnitureModal, setFurnitureModal] = useState({ open: false, data: null });
  const [furnitureForm, setFurnitureForm] = useState({ area_id: '', name: '', type: 'Regal' });

  const openFurnitureModal = (item = null) => {
    setFurnitureForm({ area_id: item?.area_id || '', name: item?.name || '', type: item?.type || 'Regal' });
    setFurnitureModal({ open: true, data: item });
  };

  const furnitureMut = useMutation({
    mutationFn: (d) => furnitureModal.data?.id ? base44.entities.Furniture.update(furnitureModal.data.id, d) : base44.entities.Furniture.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['furniture'] }); setFurnitureModal({ open: false, data: null }); },
    onError: (e) => { console.error('Furniture save error:', e); alert('Fehler: ' + (e?.message || 'Unbekannt')); }
  });

  const deleteFurniture = useMutation({
    mutationFn: (id) => base44.entities.Furniture.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['furniture'] }),
    onError: (e) => { console.error(e); alert('Fehler beim Löschen'); }
  });

  // ── Container Modal ──
  const [containerModal, setContainerModal] = useState({ open: false, data: null });
  const [containerForm, setContainerForm] = useState({ furniture_id: '', name: '', type: 'Fach' });

  const openContainerModal = (item = null) => {
    setContainerForm({ furniture_id: item?.furniture_id || '', name: item?.name || '', type: item?.type || 'Fach' });
    setContainerModal({ open: true, data: item });
  };

  const containerMut = useMutation({
    mutationFn: (d) => containerModal.data?.id ? base44.entities.Container.update(containerModal.data.id, d) : base44.entities.Container.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['containers-all'] }); setContainerModal({ open: false, data: null }); },
    onError: (e) => { console.error(e); alert('Fehler: ' + (e?.message || 'Unbekannt')); }
  });

  const deleteContainer = useMutation({
    mutationFn: (id) => base44.entities.Container.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['containers-all'] }),
    onError: (e) => { console.error(e); alert('Fehler beim Löschen'); }
  });

  // ── Slot Bulk Create ──
  const [slotModal, setSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({ area_id: '', furniture_id: '', container_id: '', count: 4, prefix: 'Fach' });

  const slotBulkMut = useMutation({
    mutationFn: async (d) => {
      const area = areas.find(a => a.id === d.area_id);
      const fur = furniture.find(f => f.id === d.furniture_id);
      const con = containers.find(c => c.id === d.container_id);
      const slots = [];
      for (let i = 1; i <= d.count; i++) {
        const name = `${d.prefix} ${i}`;
        slots.push({
          area_id: area.id, area_name: area.name,
          furniture_id: fur.id, furniture_name: fur.name,
          container_id: con.id, container_name: con.name,
          name,
          full_name: buildFullName(area.name, fur.name, con.name, name),
          short_code: generateShortCode(),
          is_active: true
        });
      }
      return base44.entities.StorageSlot.bulkCreate(slots);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['slots'] }); setSlotModal(false); },
    onError: (e) => { console.error(e); alert('Fehler: ' + (e?.message || 'Unbekannt')); }
  });

  const selectedSlotFurniture = furniture.filter(f => f.area_id === slotForm.area_id);
  const selectedSlotContainers = containers.filter(c => c.furniture_id === slotForm.furniture_id);
  const selectedFurnitureForContainer = furniture.filter(f => f.area_id === (containerForm.area_id || areas[0]?.id));

  const furnitureAreaObj = areas.find(a => a.id === furnitureForm.area_id);
  const containerFurnitureObj = furniture.find(f => f.id === containerForm.furniture_id);

  return (
    <div className="space-y-3">
      {/* Areas */}
      <Section
        title="Bereiche"
        subtitle="Hauptbar, Keller, Küche …"
        count={areas.length}
        onAdd={() => openAreaModal()}
        defaultOpen={true}
        canEdit={canEdit}
      >
        {areas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Noch keine Bereiche. Erstelle den ersten!</p>
        ) : (
          areas.map(a => (
            <ItemRow
              key={a.id}
              label={a.name}
              sublabel={a.description}
              canEdit={canEdit}
              onEdit={() => openAreaModal(a)}
              onDelete={() => deleteArea.mutate(a.id)}
            />
          ))
        )}
      </Section>

      {/* Furniture */}
      <Section
        title="Möbel"
        subtitle="Regal links, Kühlschrank 1 …"
        count={furniture.length}
        onAdd={() => openFurnitureModal()}
        canEdit={canEdit}
      >
        {furniture.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Noch keine Möbel angelegt.</p>
        ) : (
          furniture.map(f => (
            <ItemRow
              key={f.id}
              label={f.name}
              sublabel={`${f.area_name} · ${f.type}`}
              canEdit={canEdit}
              onEdit={() => openFurnitureModal(f)}
              onDelete={() => deleteFurniture.mutate(f.id)}
            />
          ))
        )}
      </Section>

      {/* Containers */}
      <Section
        title="Behälter"
        subtitle="Fach, Schublade, Box …"
        count={containers.length}
        onAdd={() => openContainerModal()}
        canEdit={canEdit}
      >
        {containers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Noch keine Behälter angelegt.</p>
        ) : (
          containers.map(c => (
            <ItemRow
              key={c.id}
              label={c.name}
              sublabel={`${c.area_name} · ${c.furniture_name} · ${c.type}`}
              canEdit={canEdit}
              onEdit={() => openContainerModal(c)}
              onDelete={() => deleteContainer.mutate(c.id)}
            />
          ))
        )}
      </Section>

      {/* Bulk Slot Generator */}
      {canEdit && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Fächer generieren</p>
              <p className="text-xs text-muted-foreground">Mehrere Fächer auf einmal anlegen</p>
            </div>
            <Button onClick={() => setSlotModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white h-11">
              <Plus className="w-4 h-4 mr-1" /> Generieren
            </Button>
          </div>
        </Card>
      )}

      {/* Area Modal */}
      <EntityModal
        open={areaModal.open}
        onClose={() => setAreaModal({ open: false, data: null })}
        title={areaModal.data ? 'Bereich bearbeiten' : 'Neuer Bereich'}
        onSave={() => areaMut.mutate({ name: areaForm.name.trim(), description: areaForm.description?.trim() || '', is_active: true, order: 0 })}
        isPending={areaMut.isPending}
        canSave={!!areaForm.name.trim()}
      >
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input className="h-11" placeholder="z.B. Hauptbar" value={areaForm.name} onChange={e => setAreaForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Beschreibung (optional)</Label>
          <Input className="h-11" placeholder="z.B. Hinter der Theke" value={areaForm.description} onChange={e => setAreaForm(f => ({ ...f, description: e.target.value }))} />
        </div>
      </EntityModal>

      {/* Furniture Modal */}
      <EntityModal
        open={furnitureModal.open}
        onClose={() => setFurnitureModal({ open: false, data: null })}
        title={furnitureModal.data ? 'Möbel bearbeiten' : 'Neues Möbelstück'}
        onSave={() => {
          const area = areas.find(a => a.id === furnitureForm.area_id);
          furnitureMut.mutate({ area_id: area.id, area_name: area.name, name: furnitureForm.name.trim(), type: furnitureForm.type, is_active: true, sort_order: 0 });

        }}
        isPending={furnitureMut.isPending}
        canSave={!!furnitureForm.area_id && !!furnitureForm.name.trim()}
      >
        <div className="space-y-2">
          <Label>Bereich *</Label>
          <Select value={furnitureForm.area_id} onValueChange={v => setFurnitureForm(f => ({ ...f, area_id: v }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Bereich wählen" /></SelectTrigger>
            <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input className="h-11" placeholder="z.B. Regal links" value={furnitureForm.name} onChange={e => setFurnitureForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={furnitureForm.type} onValueChange={v => setFurnitureForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{FURNITURE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </EntityModal>

      {/* Container Modal */}
      <EntityModal
        open={containerModal.open}
        onClose={() => setContainerModal({ open: false, data: null })}
        title={containerModal.data ? 'Behälter bearbeiten' : 'Neuer Behälter'}
        onSave={() => {
          const fur = furniture.find(f => f.id === containerForm.furniture_id);
          const area = areas.find(a => a.id === fur?.area_id);
          containerMut.mutate({ area_id: area.id, area_name: area.name, furniture_id: fur.id, furniture_name: fur.name, name: containerForm.name.trim(), type: containerForm.type, is_active: true, sort_order: 0 });
        }}
        isPending={containerMut.isPending}
        canSave={!!containerForm.furniture_id && !!containerForm.name.trim()}
      >
        <div className="space-y-2">
          <Label>Möbelstück *</Label>
          <Select value={containerForm.furniture_id} onValueChange={v => setContainerForm(f => ({ ...f, furniture_id: v }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Möbel wählen" /></SelectTrigger>
            <SelectContent>{furniture.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.area_name})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input className="h-11" placeholder="z.B. Schublade 2" value={containerForm.name} onChange={e => setContainerForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={containerForm.type} onValueChange={v => setContainerForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{CONTAINER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </EntityModal>

      {/* Slot Bulk Modal */}
      <Dialog open={slotModal} onOpenChange={setSlotModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Fächer generieren</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Bereich *</Label>
              <Select value={slotForm.area_id} onValueChange={v => setSlotForm(f => ({ ...f, area_id: v, furniture_id: '', container_id: '' }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Bereich wählen" /></SelectTrigger>
                <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {slotForm.area_id && (
              <div className="space-y-2">
                <Label>Möbelstück *</Label>
                <Select value={slotForm.furniture_id} onValueChange={v => setSlotForm(f => ({ ...f, furniture_id: v, container_id: '' }))}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Möbel wählen" /></SelectTrigger>
                  <SelectContent>{selectedSlotFurniture.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {slotForm.furniture_id && (
              <div className="space-y-2">
                <Label>Behälter *</Label>
                <Select value={slotForm.container_id} onValueChange={v => setSlotForm(f => ({ ...f, container_id: v }))}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Behälter wählen" /></SelectTrigger>
                  <SelectContent>{selectedSlotContainers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Präfix</Label>
              <Input className="h-11" value={slotForm.prefix} onChange={e => setSlotForm(f => ({ ...f, prefix: e.target.value }))} placeholder="z.B. Fach, Ebene, Box" />
            </div>
            <div className="space-y-2">
              <Label>Anzahl Fächer</Label>
              <Input type="number" min={1} max={20} className="h-11" value={slotForm.count} onChange={e => setSlotForm(f => ({ ...f, count: parseInt(e.target.value) || 1 }))} />
            </div>
            {slotForm.area_id && slotForm.furniture_id && slotForm.container_id && (
              <div className="bg-muted/50 rounded p-3 text-xs text-muted-foreground">
                Erzeugt: {Array.from({ length: Math.min(slotForm.count, 5) }, (_, i) => `${slotForm.prefix} ${i + 1}`).join(', ')}{slotForm.count > 5 ? ` … (${slotForm.count} gesamt)` : ''}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setSlotModal(false)} disabled={slotBulkMut.isPending}>Abbrechen</Button>
            <Button
              onClick={() => slotBulkMut.mutate(slotForm)}
              disabled={!slotForm.area_id || !slotForm.furniture_id || !slotForm.container_id || slotBulkMut.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {slotBulkMut.isPending ? 'Erstellt…' : `${slotForm.count} Fächer anlegen`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}