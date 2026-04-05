import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { generateShortCode, buildFullName } from './storageUtils';
import { LoadingSpinner, ErrorState, EmptyState } from './StorageLoading';

const FURNITURE_TYPES = ['Regal', 'Kühlschrank', 'Schrank', 'Unterschrank', 'Theke', 'Sonstiges'];
const CONTAINER_TYPES = ['Fach', 'Schublade', 'Box', 'Ebene', 'Abteil', 'Sonstiges'];

function EntityModal({ open, onClose, title, children, onSave, isPending, canSave }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
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

function Section({ title, subtitle, count, onAdd, children, defaultOpen = false, canEdit }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-foreground text-left">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground text-left">{subtitle}</p>}
          </div>
          {count != null && (
            <span className="text-xs bg-secondary text-foreground rounded-full px-2 py-0.5">{count}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && onAdd && (
            <Button size="sm" onClick={e => { e.stopPropagation(); onAdd(); }} className="bg-amber-600 hover:bg-amber-700 text-white h-8">
              <Plus className="w-3 h-3" />
            </Button>
          )}
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && <div className="border-t border-border px-4 pb-4 pt-3 space-y-1">{children}</div>}
    </Card>
  );
}

function ItemRow({ label, sublabel, onEdit, onDelete, canEdit }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      {canEdit && (
        <div className="flex gap-1 shrink-0 ml-2">
          <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8 text-muted-foreground"><Pencil className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></Button>
        </div>
      )}
    </div>
  );
}

export default function StructureTab({ permissions }) {
  const qc = useQueryClient();
  const canEdit = permissions.isManager;

  const { data: rooms, isLoading: roomsLoading, isError: roomsError } = useQuery({
    queryKey: ['storage-rooms'],
    queryFn: () => base44.entities.Room.list('name', 100)
  });
  const { data: areas, isLoading: areasLoading, isError: areasError } = useQuery({
    queryKey: ['areas'],
    queryFn: () => base44.entities.Area.list('name', 100)
  });
  const { data: furniture, isLoading: furLoading, isError: furError } = useQuery({
    queryKey: ['furniture'],
    queryFn: () => base44.entities.Furniture.list('sort_order,name', 500)
  });
  const { data: containers, isLoading: conLoading, isError: conError } = useQuery({
    queryKey: ['containers'],
    queryFn: () => base44.entities.Container.list('sort_order,name', 500)
  });

  // ── Room Modal ──
  const [roomModal, setRoomModal] = useState({ open: false, data: null });
  const [roomForm, setRoomForm] = useState({ name: '', description: '' });

  const roomMut = useMutation({
    mutationFn: d => roomModal.data?.id ? base44.entities.Room.update(roomModal.data.id, d) : base44.entities.Room.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-rooms'] }); setRoomModal({ open: false, data: null }); },
    onError: e => { console.error('Room save:', e); alert('Fehler: ' + (e?.message || 'Unbekannt')); }
  });
  const deleteRoom = useMutation({
    mutationFn: id => base44.entities.Room.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storage-rooms'] }),
    onError: e => { console.error('Room delete:', e); alert('Löschen fehlgeschlagen'); }
  });

  const openRoomModal = (item = null) => {
    setRoomForm({ name: item?.name || '', description: item?.description || '' });
    setRoomModal({ open: true, data: item });
  };

  // ── Area Modal ──
  const [areaModal, setAreaModal] = useState({ open: false, data: null });
  const [areaForm, setAreaForm] = useState({ name: '', description: '' });

  const areaMut = useMutation({
    mutationFn: d => areaModal.data?.id ? base44.entities.Area.update(areaModal.data.id, d) : base44.entities.Area.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setAreaModal({ open: false, data: null }); },
    onError: e => { console.error('Area save:', e); alert('Fehler: ' + (e?.message || 'Unbekannt')); }
  });
  const deleteArea = useMutation({
    mutationFn: id => base44.entities.Area.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas'] }),
    onError: e => { console.error('Area delete:', e); alert('Löschen fehlgeschlagen'); }
  });

  const openAreaModal = (item = null) => {
    setAreaForm({ name: item?.name || '', description: item?.description || '' });
    setAreaModal({ open: true, data: item });
  };

  // ── Furniture Modal ──
  const [furModal, setFurModal] = useState({ open: false, data: null });
  const [furForm, setFurForm] = useState({ area_id: '', name: '', type: 'Regal' });

  const furMut = useMutation({
    mutationFn: d => furModal.data?.id ? base44.entities.Furniture.update(furModal.data.id, d) : base44.entities.Furniture.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['furniture'] }); setFurModal({ open: false, data: null }); },
    onError: e => { console.error('Furniture save:', e); alert('Fehler: ' + (e?.message || 'Unbekannt')); }
  });
  const deleteFur = useMutation({
    mutationFn: id => base44.entities.Furniture.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['furniture'] }),
    onError: e => { console.error('Furniture delete:', e); alert('Löschen fehlgeschlagen'); }
  });

  const openFurModal = (item = null) => {
    setFurForm({ area_id: item?.area_id || '', name: item?.name || '', type: item?.type || 'Regal' });
    setFurModal({ open: true, data: item });
  };

  const saveFurniture = () => {
    const area = (areas || []).find(a => a.id === furForm.area_id);
    if (!area) { alert('Bitte wähle einen gültigen Bereich.'); return; }
    furMut.mutate({ area_id: area.id, area_name: area.name, name: furForm.name.trim(), type: furForm.type, is_active: true, sort_order: 0 });
  };

  // ── Container Modal ──
  const [conModal, setConModal] = useState({ open: false, data: null });
  const [conForm, setConForm] = useState({ furniture_id: '', name: '', type: 'Fach' });

  const conMut = useMutation({
    mutationFn: d => conModal.data?.id ? base44.entities.Container.update(conModal.data.id, d) : base44.entities.Container.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['containers'] }); setConModal({ open: false, data: null }); },
    onError: e => { console.error('Container save:', e); alert('Fehler: ' + (e?.message || 'Unbekannt')); }
  });
  const deleteCon = useMutation({
    mutationFn: id => base44.entities.Container.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['containers'] }),
    onError: e => { console.error('Container delete:', e); alert('Löschen fehlgeschlagen'); }
  });

  const openConModal = (item = null) => {
    setConForm({ furniture_id: item?.furniture_id || '', name: item?.name || '', type: item?.type || 'Fach' });
    setConModal({ open: true, data: item });
  };

  const saveContainer = () => {
    const fur = (furniture || []).find(f => f.id === conForm.furniture_id);
    if (!fur) { alert('Bitte wähle ein gültiges Möbelstück.'); return; }
    const area = (areas || []).find(a => a.id === fur.area_id);
    if (!area) { alert('Bereich des Möbelstücks nicht gefunden.'); return; }
    conMut.mutate({ area_id: area.id, area_name: area.name, furniture_id: fur.id, furniture_name: fur.name, name: conForm.name.trim(), type: conForm.type, is_active: true, sort_order: 0 });
  };

  // ── Slot Bulk ──
  const [slotModal, setSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({ area_id: '', furniture_id: '', container_id: '', count: 4, prefix: 'Fach' });

  const slotBulkMut = useMutation({
    mutationFn: async d => {
      const area = (areas || []).find(a => a.id === d.area_id);
      const fur = (furniture || []).find(f => f.id === d.furniture_id);
      const con = (containers || []).find(c => c.id === d.container_id);
      if (!area || !fur || !con) throw new Error('Fehlende Stammdaten. Bitte Seite neu laden.');
      const slots = Array.from({ length: d.count }, (_, i) => {
        const name = `${d.prefix} ${i + 1}`;
        return { area_id: area.id, area_name: area.name, furniture_id: fur.id, furniture_name: fur.name, container_id: con.id, container_name: con.name, name, full_name: buildFullName(area.name, fur.name, con.name, name), short_code: generateShortCode(), is_active: true };
      });
      return base44.entities.StorageSlot.bulkCreate(slots);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['slots'] }); setSlotModal(false); },
    onError: e => { console.error('Slot bulk:', e); alert('Fehler: ' + (e?.message || 'Unbekannt')); }
  });

  const slotFurniture = (furniture || []).filter(f => f.area_id === slotForm.area_id);
  const slotContainers = (containers || []).filter(c => c.furniture_id === slotForm.furniture_id);
  const conFurniture = furniture || [];

  return (
    <div className="space-y-3">
      {/* Rooms */}
      <Section title="Räume" subtitle="Keller, Lagerraum, Küche …" count={(rooms || []).length} onAdd={() => openRoomModal()} defaultOpen canEdit={canEdit}>
        {roomsLoading ? <LoadingSpinner text="Lade Räume…" /> :
         roomsError ? <ErrorState text="Räume konnten nicht geladen werden." /> :
         !rooms?.length ? <EmptyState text="Noch keine Räume. Erstelle den ersten!" /> :
         rooms.map(r => (
           <ItemRow key={r.id} label={r.name} sublabel={r.description} canEdit={canEdit}
             onEdit={() => openRoomModal(r)} onDelete={() => deleteRoom.mutate(r.id)} />
         ))
        }
      </Section>

      {/* Areas */}
      <Section title="Bereiche" subtitle="Hauptbar, Keller, Küche …" count={(areas || []).length} onAdd={() => openAreaModal()} defaultOpen canEdit={canEdit}>
        {areasLoading ? <LoadingSpinner text="Lade Bereiche…" /> :
         areasError ? <ErrorState text="Bereiche konnten nicht geladen werden." /> :
         !areas?.length ? <EmptyState text="Noch keine Bereiche. Erstelle den ersten!" /> :
         areas.map(a => (
           <ItemRow key={a.id} label={a.name} sublabel={a.description} canEdit={canEdit}
             onEdit={() => openAreaModal(a)} onDelete={() => deleteArea.mutate(a.id)} />
         ))
        }
      </Section>

      {/* Furniture */}
      <Section title="Möbel" subtitle="Regal links, Kühlschrank 1 …" count={(furniture || []).length} onAdd={() => openFurModal()} canEdit={canEdit}>
        {furLoading ? <LoadingSpinner text="Lade Möbel…" /> :
         furError ? <ErrorState text="Möbel konnten nicht geladen werden." /> :
         !furniture?.length ? <EmptyState text="Noch keine Möbel. Erstelle zuerst einen Bereich." /> :
         furniture.map(f => (
           <ItemRow key={f.id} label={f.name} sublabel={`${f.area_name} · ${f.type}`} canEdit={canEdit}
             onEdit={() => openFurModal(f)} onDelete={() => deleteFur.mutate(f.id)} />
         ))
        }
      </Section>

      {/* Containers */}
      <Section title="Behälter" subtitle="Fach, Schublade, Box …" count={(containers || []).length} onAdd={() => openConModal()} canEdit={canEdit}>
        {conLoading ? <LoadingSpinner text="Lade Behälter…" /> :
         conError ? <ErrorState text="Behälter konnten nicht geladen werden." /> :
         !containers?.length ? <EmptyState text="Noch keine Behälter. Erstelle zuerst Möbel." /> :
         containers.map(c => (
           <ItemRow key={c.id} label={c.name} sublabel={`${c.area_name} · ${c.furniture_name} · ${c.type}`} canEdit={canEdit}
             onEdit={() => openConModal(c)} onDelete={() => deleteCon.mutate(c.id)} />
         ))
        }
      </Section>

      {/* Bulk Slot */}
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

      {/* Room Modal */}
      <EntityModal open={roomModal.open} onClose={() => setRoomModal({ open: false, data: null })}
        title={roomModal.data ? 'Raum bearbeiten' : 'Neuer Raum'}
        onSave={() => roomMut.mutate({ name: roomForm.name.trim(), description: roomForm.description.trim() })}
        isPending={roomMut.isPending} canSave={!!roomForm.name.trim()}>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input className="h-11" placeholder="z.B. Keller" value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Beschreibung (optional)</Label>
          <Input className="h-11" placeholder="z.B. Untergeschoss links" value={roomForm.description} onChange={e => setRoomForm(f => ({ ...f, description: e.target.value }))} />
        </div>
      </EntityModal>

      {/* Area Modal */}
      <EntityModal open={areaModal.open} onClose={() => setAreaModal({ open: false, data: null })}
        title={areaModal.data ? 'Bereich bearbeiten' : 'Neuer Bereich'}
        onSave={() => areaMut.mutate({ name: areaForm.name.trim(), description: areaForm.description.trim(), is_active: true, order: 0 })}
        isPending={areaMut.isPending} canSave={!!areaForm.name.trim()}>
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
      <EntityModal open={furModal.open} onClose={() => setFurModal({ open: false, data: null })}
        title={furModal.data ? 'Möbel bearbeiten' : 'Neues Möbelstück'}
        onSave={saveFurniture} isPending={furMut.isPending}
        canSave={!!furForm.area_id && !!furForm.name.trim()}>
        <div className="space-y-2">
          <Label>Bereich *</Label>
          {areasLoading ? <p className="text-sm text-muted-foreground">Lädt Bereiche…</p> : (
            <Select value={furForm.area_id} onValueChange={v => setFurForm(f => ({ ...f, area_id: v }))}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Bereich wählen" /></SelectTrigger>
              <SelectContent>{(areas || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input className="h-11" placeholder="z.B. Regal links" value={furForm.name} onChange={e => setFurForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={furForm.type} onValueChange={v => setFurForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{FURNITURE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </EntityModal>

      {/* Container Modal */}
      <EntityModal open={conModal.open} onClose={() => setConModal({ open: false, data: null })}
        title={conModal.data ? 'Behälter bearbeiten' : 'Neuer Behälter'}
        onSave={saveContainer} isPending={conMut.isPending}
        canSave={!!conForm.furniture_id && !!conForm.name.trim()}>
        <div className="space-y-2">
          <Label>Möbelstück *</Label>
          {furLoading ? <p className="text-sm text-muted-foreground">Lädt Möbel…</p> : (
            <Select value={conForm.furniture_id} onValueChange={v => setConForm(f => ({ ...f, furniture_id: v }))}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Möbel wählen" /></SelectTrigger>
              <SelectContent>{conFurniture.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.area_name})</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input className="h-11" placeholder="z.B. Schublade 2" value={conForm.name} onChange={e => setConForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={conForm.type} onValueChange={v => setConForm(f => ({ ...f, type: v }))}>
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
                <SelectContent>{(areas || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {slotForm.area_id && (
              <div className="space-y-2">
                <Label>Möbelstück *</Label>
                <Select value={slotForm.furniture_id} onValueChange={v => setSlotForm(f => ({ ...f, furniture_id: v, container_id: '' }))}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Möbel wählen" /></SelectTrigger>
                  <SelectContent>{slotFurniture.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {slotForm.furniture_id && (
              <div className="space-y-2">
                <Label>Behälter *</Label>
                <Select value={slotForm.container_id} onValueChange={v => setSlotForm(f => ({ ...f, container_id: v }))}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Behälter wählen" /></SelectTrigger>
                  <SelectContent>{slotContainers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
                Erzeugt: {Array.from({ length: Math.min(slotForm.count, 5) }, (_, i) => `${slotForm.prefix} ${i + 1}`).join(', ')}
                {slotForm.count > 5 ? ` … (${slotForm.count} gesamt)` : ''}
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