import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Pencil, Trash2, Copy, Check } from 'lucide-react';
import { generateShortCode, buildFullName } from './storageUtils';

export default function SlotsTab({ permissions }) {
  const qc = useQueryClient();
  const canEdit = permissions.isManager;

  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterFurniture, setFilterFurniture] = useState('');
  const [filterContainer, setFilterContainer] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const [modal, setModal] = useState({ open: false, data: null });
  const [form, setForm] = useState({ area_id: '', furniture_id: '', container_id: '', name: '', notes: '' });

  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: () => base44.entities.Area.list('sort_order,name', 100) });
  const { data: furniture = [] } = useQuery({ queryKey: ['furniture'], queryFn: () => base44.entities.Furniture.list('sort_order,name', 500) });
  const { data: containers = [] } = useQuery({ queryKey: ['containers-all'], queryFn: () => base44.entities.Container.list('sort_order,name', 500) });
  const { data: slots = [], isLoading } = useQuery({ queryKey: ['slots'], queryFn: () => base44.entities.StorageSlot.list('-created_date', 1000) });

  const filteredFurniture = furniture.filter(f => !filterArea || f.area_id === filterArea);
  const filteredContainers = containers.filter(c => !filterFurniture || c.furniture_id === filterFurniture);

  const filteredSlots = useMemo(() => slots.filter(s => {
    const matchSearch = !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.short_code?.toLowerCase().includes(search.toLowerCase());
    const matchArea = !filterArea || s.area_id === filterArea;
    const matchFurniture = !filterFurniture || s.furniture_id === filterFurniture;
    const matchContainer = !filterContainer || s.container_id === filterContainer;
    return matchSearch && matchArea && matchFurniture && matchContainer;
  }), [slots, search, filterArea, filterFurniture, filterContainer]);

  const saveMut = useMutation({
    mutationFn: (d) => modal.data?.id ? base44.entities.StorageSlot.update(modal.data.id, d) : base44.entities.StorageSlot.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['slots'] }); setModal({ open: false, data: null }); },
    onError: (e) => { console.error(e); alert('Fehler: ' + (e?.message || 'Unbekannt')); }
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.StorageSlot.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
    onError: (e) => { console.error(e); alert('Fehler beim Löschen'); }
  });

  const openAdd = () => {
    setForm({ area_id: '', furniture_id: '', container_id: '', name: '', notes: '' });
    setModal({ open: true, data: null });
  };

  const openEdit = (slot) => {
    setForm({ area_id: slot.area_id, furniture_id: slot.furniture_id, container_id: slot.container_id, name: slot.name, notes: slot.notes || '' });
    setModal({ open: true, data: slot });
  };

  const handleSave = () => {
    const area = areas.find(a => a.id === form.area_id);
    const fur = furniture.find(f => f.id === form.furniture_id);
    const con = containers.find(c => c.id === form.container_id);
    saveMut.mutate({
      area_id: area.id, area_name: area.name,
      furniture_id: fur.id, furniture_name: fur.name,
      container_id: con.id, container_name: con.name,
      name: form.name.trim(),
      full_name: buildFullName(area.name, fur.name, con.name, form.name.trim()),
      short_code: modal.data?.short_code || generateShortCode(),
      notes: form.notes,
      is_active: true
    });
  };

  const copy = (text) => { navigator.clipboard.writeText(text); setCopiedId(text); setTimeout(() => setCopiedId(null), 2000); };

  const modalFurniture = furniture.filter(f => f.area_id === form.area_id);
  const modalContainers = containers.filter(c => c.furniture_id === form.furniture_id);

  return (
    <>
      {/* Filters */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10 h-11" placeholder="Name oder Code suchen…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select value={filterArea} onValueChange={v => { setFilterArea(v); setFilterFurniture(''); setFilterContainer(''); }}>
            <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Bereich" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Alle Bereiche</SelectItem>
              {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterFurniture} onValueChange={v => { setFilterFurniture(v); setFilterContainer(''); }} disabled={!filterArea}>
            <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Möbel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Alle Möbel</SelectItem>
              {filteredFurniture.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterContainer} onValueChange={setFilterContainer} disabled={!filterFurniture}>
            <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Behälter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Alle Behälter</SelectItem>
              {filteredContainers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {canEdit && (
          <Button onClick={openAdd} className="w-full bg-amber-600 hover:bg-amber-700 text-white h-11">
            <Plus className="w-4 h-4 mr-2" /> Neuer Lagerplatz
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-10">Lädt…</p>
      ) : filteredSlots.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Keine Lagerplätze gefunden</Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filteredSlots.length} Plätze</p>
          {filteredSlots.map(slot => (
            <Card key={slot.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{slot.full_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <button
                    onClick={() => copy(slot.short_code)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedId === slot.short_code ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {slot.short_code}
                  </button>
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(slot)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteMut.mutate(slot.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modal.open} onOpenChange={o => !o && setModal({ open: false, data: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{modal.data ? 'Lagerplatz bearbeiten' : 'Neuer Lagerplatz'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Bereich *</Label>
              <Select value={form.area_id} onValueChange={v => setForm(f => ({ ...f, area_id: v, furniture_id: '', container_id: '' }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Bereich wählen" /></SelectTrigger>
                <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.area_id && (
              <div className="space-y-2">
                <Label>Möbelstück *</Label>
                <Select value={form.furniture_id} onValueChange={v => setForm(f => ({ ...f, furniture_id: v, container_id: '' }))}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Möbel wählen" /></SelectTrigger>
                  <SelectContent>{modalFurniture.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.furniture_id && (
              <div className="space-y-2">
                <Label>Behälter *</Label>
                <Select value={form.container_id} onValueChange={v => setForm(f => ({ ...f, container_id: v }))}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Behälter wählen" /></SelectTrigger>
                  <SelectContent>{modalContainers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Fachname *</Label>
              <Input className="h-11" placeholder="z.B. oben links, Ebene 2, Box A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            {form.area_id && form.furniture_id && form.container_id && form.name && (
              <div className="bg-muted/50 rounded p-3">
                <p className="text-xs text-muted-foreground font-medium">Vollständiger Name:</p>
                <p className="text-sm text-foreground mt-1">
                  {buildFullName(
                    areas.find(a => a.id === form.area_id)?.name,
                    furniture.find(f => f.id === form.furniture_id)?.name,
                    containers.find(c => c.id === form.container_id)?.name,
                    form.name
                  )}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notizen (optional)</Label>
              <Input className="h-11" placeholder="z.B. besondere Ausstattung" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setModal({ open: false, data: null })} disabled={saveMut.isPending}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!form.area_id || !form.furniture_id || !form.container_id || !form.name.trim() || saveMut.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saveMut.isPending ? 'Speichert…' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}