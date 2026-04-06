import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Building2, Grid3X3, Sofa, Box, LayoutGrid } from 'lucide-react';
import { generateShortCode, buildFullName } from './storageUtils';

const FURNITURE_TYPES = ['Regal', 'Kühlschrank', 'Schrank', 'Unterschrank', 'Theke', 'Sonstiges'];
const CONTAINER_TYPES = ['Fach', 'Schublade', 'Box', 'Ebene', 'Abteil', 'Sonstiges'];

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────
function useEntityCRUD(entityName, queryKey) {
  const qc = useQueryClient();
  const { data = [], isLoading, isError } = useQuery({
    queryKey: [queryKey],
    queryFn: () => base44.entities[entityName].list('name', 500)
  });
  const saveMut = useMutation({
    mutationFn: ({ id, data }) => id ? base44.entities[entityName].update(id, data) : base44.entities[entityName].create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] })
  });
  const deleteMut = useMutation({
    mutationFn: id => base44.entities[entityName].delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] })
  });
  return { data, isLoading, isError, saveMut, deleteMut };
}

// ── Kleine UI-Bausteine ──────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, count, color, onAdd, canEdit, open, toggle }) {
  return (
    <button onClick={toggle} className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors text-left">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <span className="text-xs bg-secondary text-foreground rounded-full px-2 py-0.5 shrink-0">{count}</span>
      {canEdit && onAdd && (
        <Button size="sm" onClick={e => { e.stopPropagation(); onAdd(); }} className="bg-amber-600 hover:bg-amber-700 text-white h-8 shrink-0">
          <Plus className="w-3 h-3" />
        </Button>
      )}
      {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
    </button>
  );
}

function ItemRow({ label, sublabel, onEdit, onDelete, canEdit }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
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

function EmptyHint({ text }) {
  return <p className="text-sm text-muted-foreground py-3 text-center">{text}</p>;
}

function EntityModal({ open, onClose, title, children, onSave, isPending, canSave }) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
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

// ── Hauptkomponente ──────────────────────────────────────────────────────────
export default function StructureTab({ permissions }) {
  const qc = useQueryClient();
  const canEdit = permissions.isManager;

  // ── Daten laden ──
  const rooms    = useEntityCRUD('Room',        'st-rooms');
  const areas    = useEntityCRUD('Area',        'st-areas');
  const furns    = useEntityCRUD('Furniture',   'st-furniture');
  const conts    = useEntityCRUD('Container',   'st-containers');

  // ── Sections offen/zu ──
  const [openSec, setOpenSec] = useState({ rooms: true, areas: true, furniture: false, containers: false, slots: false });
  const toggle = key => setOpenSec(s => ({ ...s, [key]: !s[key] }));

  // ── Modal-State helper ──
  const emptyModal = { open: false, data: null };
  const [roomMod, setRoomMod] = useState(emptyModal);
  const [areaMod, setAreaMod] = useState(emptyModal);
  const [furMod,  setFurMod]  = useState(emptyModal);
  const [conMod,  setConMod]  = useState(emptyModal);
  const [slotMod, setSlotMod] = useState(false);

  // ── Formular-State ──
  const [roomF, setRoomF] = useState({ name: '', description: '' });
  const [areaF, setAreaF] = useState({ name: '', description: '', room_id: '' });
  const [furF,  setFurF]  = useState({ name: '', type: 'Regal', area_id: '' });
  const [conF,  setConF]  = useState({ name: '', type: 'Fach', furniture_id: '' });
  const [slotF, setSlotF] = useState({ area_id: '', furniture_id: '', container_id: '', prefix: 'Fach', count: 4 });

  // ── Bulk-Slot-Mutation ──
  const slotBulk = useMutation({
    mutationFn: async f => {
      const area = areas.data.find(a => a.id === f.area_id);
      const fur  = furns.data.find(x => x.id === f.furniture_id);
      const con  = conts.data.find(c => c.id === f.container_id);
      if (!area || !fur || !con) throw new Error('Bitte alle Felder ausfüllen.');
      const items = Array.from({ length: f.count }, (_, i) => {
        const name = `${f.prefix} ${i + 1}`;
        return {
          area_id: area.id, area_name: area.name,
          furniture_id: fur.id, furniture_name: fur.name,
          container_id: con.id, container_name: con.name,
          name, full_name: buildFullName(area.name, fur.name, con.name, name),
          short_code: generateShortCode(), is_active: true
        };
      });
      return base44.entities.StorageSlot.bulkCreate(items);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['slots'] }); setSlotMod(false); alert(`${slotF.count} Fächer erfolgreich angelegt!`); },
    onError: e => alert('Fehler: ' + e.message)
  });

  // ── Hilfsfunktionen für Abhängigkeiten ──
  const slotFurniture  = furns.data.filter(f => f.area_id === slotF.area_id);
  const slotContainers = conts.data.filter(c => c.furniture_id === slotF.furniture_id);

  // ── Render ──
  return (
    <div className="space-y-3">

      {/* ── RÄUME ── */}
      <Card className="overflow-hidden">
        <SectionHeader
          icon={Building2} title="Räume" subtitle="Keller, Lagerraum, Küche …"
          color="bg-blue-500/20 text-blue-400" count={rooms.data.length}
          canEdit={canEdit} onAdd={() => { setRoomF({ name: '', description: '' }); setRoomMod({ open: true, data: null }); }}
          open={openSec.rooms} toggle={() => toggle('rooms')}
        />
        {openSec.rooms && (
          <div className="border-t border-border px-4 pb-4 pt-2">
            {rooms.isLoading ? <EmptyHint text="Lädt…" /> :
             rooms.isError   ? <EmptyHint text="Fehler beim Laden." /> :
             !rooms.data.length ? <EmptyHint text="Noch keine Räume vorhanden." /> :
             rooms.data.map(r => (
               <ItemRow key={r.id} label={r.name} sublabel={r.description} canEdit={canEdit}
                 onEdit={() => { setRoomF({ name: r.name, description: r.description || '' }); setRoomMod({ open: true, data: r }); }}
                 onDelete={() => { if (confirm(`"${r.name}" löschen?`)) rooms.deleteMut.mutate(r.id); }}
               />
             ))
            }
          </div>
        )}
      </Card>

      {/* ── BEREICHE ── */}
      <Card className="overflow-hidden">
        <SectionHeader
          icon={Grid3X3} title="Bereiche" subtitle="Hauptbar, Kühlraum, Lager …"
          color="bg-green-500/20 text-green-400" count={areas.data.length}
          canEdit={canEdit} onAdd={() => { setAreaF({ name: '', description: '', room_id: '' }); setAreaMod({ open: true, data: null }); }}
          open={openSec.areas} toggle={() => toggle('areas')}
        />
        {openSec.areas && (
          <div className="border-t border-border px-4 pb-4 pt-2">
            {areas.isLoading ? <EmptyHint text="Lädt…" /> :
             areas.isError   ? <EmptyHint text="Fehler beim Laden." /> :
             !areas.data.length ? <EmptyHint text="Noch keine Bereiche vorhanden." /> :
             areas.data.map(a => (
               <ItemRow key={a.id}
                 label={a.name}
                 sublabel={[a.room_name ? `📍 ${a.room_name}` : null, a.description].filter(Boolean).join('  ·  ')}
                 canEdit={canEdit}
                 onEdit={() => { setAreaF({ name: a.name, description: a.description || '', room_id: a.room_id || '' }); setAreaMod({ open: true, data: a }); }}
                 onDelete={() => { if (confirm(`"${a.name}" löschen?`)) areas.deleteMut.mutate(a.id); }}
               />
             ))
            }
          </div>
        )}
      </Card>

      {/* ── MÖBEL ── */}
      <Card className="overflow-hidden">
        <SectionHeader
          icon={Sofa} title="Möbel" subtitle="Regal, Kühlschrank, Schrank …"
          color="bg-amber-500/20 text-amber-400" count={furns.data.length}
          canEdit={canEdit} onAdd={() => { setFurF({ name: '', type: 'Regal', area_id: '' }); setFurMod({ open: true, data: null }); }}
          open={openSec.furniture} toggle={() => toggle('furniture')}
        />
        {openSec.furniture && (
          <div className="border-t border-border px-4 pb-4 pt-2">
            {furns.isLoading ? <EmptyHint text="Lädt…" /> :
             furns.isError   ? <EmptyHint text="Fehler beim Laden." /> :
             !furns.data.length ? <EmptyHint text="Noch keine Möbel. Erst Bereiche anlegen." /> :
             furns.data.map(f => (
               <ItemRow key={f.id}
                 label={f.name}
                 sublabel={[f.type, f.area_name].filter(Boolean).join(' · ')}
                 canEdit={canEdit}
                 onEdit={() => { setFurF({ name: f.name, type: f.type || 'Regal', area_id: f.area_id || '' }); setFurMod({ open: true, data: f }); }}
                 onDelete={() => { if (confirm(`"${f.name}" löschen?`)) furns.deleteMut.mutate(f.id); }}
               />
             ))
            }
          </div>
        )}
      </Card>

      {/* ── BEHÄLTER ── */}
      <Card className="overflow-hidden">
        <SectionHeader
          icon={Box} title="Behälter" subtitle="Fach, Schublade, Ebene …"
          color="bg-purple-500/20 text-purple-400" count={conts.data.length}
          canEdit={canEdit} onAdd={() => { setConF({ name: '', type: 'Fach', furniture_id: '' }); setConMod({ open: true, data: null }); }}
          open={openSec.containers} toggle={() => toggle('containers')}
        />
        {openSec.containers && (
          <div className="border-t border-border px-4 pb-4 pt-2">
            {conts.isLoading ? <EmptyHint text="Lädt…" /> :
             conts.isError   ? <EmptyHint text="Fehler beim Laden." /> :
             !conts.data.length ? <EmptyHint text="Noch keine Behälter. Erst Möbel anlegen." /> :
             conts.data.map(c => (
               <ItemRow key={c.id}
                 label={c.name}
                 sublabel={[c.type, c.furniture_name, c.area_name].filter(Boolean).join(' · ')}
                 canEdit={canEdit}
                 onEdit={() => { setConF({ name: c.name, type: c.type || 'Fach', furniture_id: c.furniture_id || '' }); setConMod({ open: true, data: c }); }}
                 onDelete={() => { if (confirm(`"${c.name}" löschen?`)) conts.deleteMut.mutate(c.id); }}
               />
             ))
            }
          </div>
        )}
      </Card>

      {/* ── FÄCHER GENERIEREN ── */}
      {canEdit && (
        <Card className="overflow-hidden">
          <SectionHeader
            icon={LayoutGrid} title="Fächer generieren" subtitle="Mehrere Lagerplätze auf einmal anlegen"
            color="bg-orange-500/20 text-orange-400" count={null}
            canEdit={false} open={openSec.slots} toggle={() => toggle('slots')}
          />
          {openSec.slots && (
            <div className="border-t border-border px-4 pb-4 pt-3">
              <p className="text-xs text-muted-foreground mb-3">
                Wähle Bereich → Möbel → Behälter und gib an wie viele Fächer generiert werden sollen.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>1. Bereich *</Label>
                  <Select value={slotF.area_id} onValueChange={v => setSlotF(f => ({ ...f, area_id: v, furniture_id: '', container_id: '' }))}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Bereich wählen" /></SelectTrigger>
                    <SelectContent>{areas.data.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={!slotF.area_id ? 'text-muted-foreground' : ''}>2. Möbel *</Label>
                  <Select value={slotF.furniture_id} disabled={!slotF.area_id} onValueChange={v => setSlotF(f => ({ ...f, furniture_id: v, container_id: '' }))}>
                    <SelectTrigger className="h-11"><SelectValue placeholder={slotF.area_id ? 'Möbel wählen' : '← Zuerst Bereich wählen'} /></SelectTrigger>
                    <SelectContent>
                      {slotFurniture.length ? slotFurniture.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>) : <SelectItem value="_none" disabled>Keine Möbel in diesem Bereich</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={!slotF.furniture_id ? 'text-muted-foreground' : ''}>3. Behälter *</Label>
                  <Select value={slotF.container_id} disabled={!slotF.furniture_id} onValueChange={v => setSlotF(f => ({ ...f, container_id: v }))}>
                    <SelectTrigger className="h-11"><SelectValue placeholder={slotF.furniture_id ? 'Behälter wählen' : '← Zuerst Möbel wählen'} /></SelectTrigger>
                    <SelectContent>
                      {slotContainers.length ? slotContainers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>) : <SelectItem value="_none" disabled>Keine Behälter in diesem Möbelstück</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Präfix</Label>
                    <Input className="h-11" value={slotF.prefix} onChange={e => setSlotF(f => ({ ...f, prefix: e.target.value }))} placeholder="z.B. Fach" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Anzahl</Label>
                    <Input type="number" min={1} max={50} className="h-11" value={slotF.count} onChange={e => setSlotF(f => ({ ...f, count: Math.max(1, parseInt(e.target.value) || 1) }))} />
                  </div>
                </div>
                {slotF.area_id && slotF.furniture_id && slotF.container_id && (
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                    Erzeugt: {Array.from({ length: Math.min(slotF.count, 5) }, (_, i) => `${slotF.prefix} ${i + 1}`).join(', ')}{slotF.count > 5 ? ` … (${slotF.count} gesamt)` : ''}
                  </div>
                )}
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white h-11"
                  disabled={!slotF.area_id || !slotF.furniture_id || !slotF.container_id || slotBulk.isPending}
                  onClick={() => slotBulk.mutate(slotF)}
                >
                  {slotBulk.isPending ? 'Erstellt…' : `${slotF.count} Fächer anlegen`}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════════════════════ */}

      {/* Raum Modal */}
      <EntityModal open={roomMod.open} onClose={() => setRoomMod(emptyModal)}
        title={roomMod.data ? 'Raum bearbeiten' : 'Neuer Raum'}
        onSave={() => rooms.saveMut.mutate({ id: roomMod.data?.id, data: { name: roomF.name.trim(), description: roomF.description.trim() } }, { onSuccess: () => setRoomMod(emptyModal) })}
        isPending={rooms.saveMut.isPending} canSave={!!roomF.name.trim()}>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input className="h-11" placeholder="z.B. Keller" value={roomF.name} onChange={e => setRoomF(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Beschreibung (optional)</Label>
          <Input className="h-11" placeholder="z.B. Untergeschoss" value={roomF.description} onChange={e => setRoomF(f => ({ ...f, description: e.target.value }))} />
        </div>
      </EntityModal>

      {/* Bereich Modal */}
      <EntityModal open={areaMod.open} onClose={() => setAreaMod(emptyModal)}
        title={areaMod.data ? 'Bereich bearbeiten' : 'Neuer Bereich'}
        onSave={() => {
          const room = rooms.data.find(r => r.id === areaF.room_id);
          areas.saveMut.mutate({ id: areaMod.data?.id, data: { name: areaF.name.trim(), description: areaF.description.trim(), room_id: areaF.room_id || null, room_name: room?.name || null, is_active: true, order: 0 } }, { onSuccess: () => setAreaMod(emptyModal) });
        }}
        isPending={areas.saveMut.isPending} canSave={!!areaF.name.trim()}>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input className="h-11" placeholder="z.B. Hauptbar" value={areaF.name} onChange={e => setAreaF(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Raum (optional)</Label>
          <Select value={areaF.room_id || ''} onValueChange={v => setAreaF(f => ({ ...f, room_id: v }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Kein Raum zugeordnet" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>— Kein Raum —</SelectItem>
              {rooms.data.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Beschreibung (optional)</Label>
          <Input className="h-11" placeholder="z.B. Hinter der Theke" value={areaF.description} onChange={e => setAreaF(f => ({ ...f, description: e.target.value }))} />
        </div>
      </EntityModal>

      {/* Möbel Modal */}
      <EntityModal open={furMod.open} onClose={() => setFurMod(emptyModal)}
        title={furMod.data ? 'Möbel bearbeiten' : 'Neues Möbelstück'}
        onSave={() => {
          const area = areas.data.find(a => a.id === furF.area_id);
          furns.saveMut.mutate({ id: furMod.data?.id, data: { name: furF.name.trim(), type: furF.type, area_id: area?.id || null, area_name: area?.name || null, is_active: true, sort_order: 0 } }, { onSuccess: () => setFurMod(emptyModal) });
        }}
        isPending={furns.saveMut.isPending} canSave={!!furF.name.trim() && !!furF.area_id}>
        <div className="space-y-2">
          <Label>Bereich *</Label>
          <Select value={furF.area_id} onValueChange={v => setFurF(f => ({ ...f, area_id: v }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Bereich wählen" /></SelectTrigger>
            <SelectContent>
              {areas.data.length ? areas.data.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>) : <SelectItem value="_none" disabled>Erst Bereiche anlegen</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input className="h-11" placeholder="z.B. Regal links" value={furF.name} onChange={e => setFurF(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={furF.type} onValueChange={v => setFurF(f => ({ ...f, type: v }))}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{FURNITURE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </EntityModal>

      {/* Behälter Modal */}
      <EntityModal open={conMod.open} onClose={() => setConMod(emptyModal)}
        title={conMod.data ? 'Behälter bearbeiten' : 'Neuer Behälter'}
        onSave={() => {
          const fur  = furns.data.find(f => f.id === conF.furniture_id);
          const area = areas.data.find(a => a.id === fur?.area_id);
          conts.saveMut.mutate({ id: conMod.data?.id, data: { name: conF.name.trim(), type: conF.type, furniture_id: fur?.id || null, furniture_name: fur?.name || null, area_id: area?.id || null, area_name: area?.name || null, is_active: true, sort_order: 0 } }, { onSuccess: () => setConMod(emptyModal) });
        }}
        isPending={conts.saveMut.isPending} canSave={!!conF.name.trim() && !!conF.furniture_id}>
        <div className="space-y-2">
          <Label>Möbelstück *</Label>
          <Select value={conF.furniture_id} onValueChange={v => setConF(f => ({ ...f, furniture_id: v }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Möbel wählen" /></SelectTrigger>
            <SelectContent>
              {furns.data.length ? furns.data.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.area_name})</SelectItem>) : <SelectItem value="_none" disabled>Erst Möbel anlegen</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input className="h-11" placeholder="z.B. Schublade 1" value={conF.name} onChange={e => setConF(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={conF.type} onValueChange={v => setConF(f => ({ ...f, type: v }))}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{CONTAINER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </EntityModal>
    </div>
  );
}