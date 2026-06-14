/**
 * SlotsTab — Bereich → Möbel → Fach
 * Chips statt Dropdowns, AlertDialog statt confirm(), Artikel-Count auf Karte
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { STALE } from '@/lib/queryUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Pencil, Trash2, QrCode, ExternalLink, Package, Download, Loader2, Printer } from 'lucide-react';
import StorageLabelPrint from './StorageLabelPrint';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ALL = '__all__';
const FURNITURE_TYPES = ['Regal','Schrank','Kühlschrank','Tiefkühlschrank','Schubladenbox','Tisch','Kiste','Sonstiges'];

// ── Short code generator ──────────────────────────────────────────────────────
function generateShortCode(areaName, furnitureName, slotName) {
  const initials = (s) => (s || '').replace(/[^a-zA-ZÀ-ž0-9]/g, '').slice(0, 2).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `${initials(areaName)}-${initials(furnitureName)}-${initials(slotName)}${rand}`;
}

// ── QR Preview ────────────────────────────────────────────────────────────────
function QrPreview({ slotId, slotName, slotCode, onClose }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const url = `${window.location.origin}/StorageLocationScan/${slotId}`;

  useEffect(() => {
    let cancelled = false;
    import('qrcode').then(async (QRCode) => {
      if (cancelled) return;
      const QR_SIZE = 220, LABEL_H = 56, PAD = 12;
      const W = QR_SIZE + PAD * 2, H = QR_SIZE + LABEL_H + PAD;
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, url, {
        width: QR_SIZE, margin: 1, errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#ffffff' },
      });
      const out = canvasRef.current;
      if (!out || cancelled) return;
      out.width = W; out.height = H;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(qrCanvas, PAD, PAD, QR_SIZE, QR_SIZE);
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, PAD + QR_SIZE + 8);
      ctx.lineTo(W - PAD, PAD + QR_SIZE + 8);
      ctx.stroke();
      const codeY = PAD + QR_SIZE + 26;
      ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
      if (slotCode) ctx.fillText(slotCode, W / 2, codeY);
      const nameY = slotCode ? codeY + 18 : codeY + 4;
      ctx.font = 'bold 15px Arial, sans-serif'; ctx.fillStyle = '#0f172a'; ctx.textAlign = 'center';
      const maxW = W - PAD * 2 - 8;
      const words = (slotName || '').split(' ');
      let line1 = '', line2 = '';
      for (const w of words) {
        const test = line1 ? line1 + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line1) { line2 = line2 ? line2 + ' ' + w : w; }
        else line1 = test;
      }
      ctx.fillText(line1, W / 2, nameY);
      if (line2) ctx.fillText(line2, W / 2, nameY + 18);
      if (!cancelled) setReady(true);
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [url, slotName, slotCode]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `qr-${(slotName || slotId).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-500" />
            {slotName || 'QR-Code'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-1">
          <div className="rounded-2xl overflow-hidden border border-border bg-white shadow-sm">
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />
          </div>
          <p className="text-[11px] text-muted-foreground text-center break-all px-2">{url}</p>
          <div className="flex gap-2 w-full">
            <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleDownload} disabled={!ready}>
              <Download className="w-3.5 h-3.5 mr-1.5" />PNG laden
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(url, '_blank')}>
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Öffnen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SlotsTab({ permissions }) {
  const qc = useQueryClient();
  const canEdit = permissions.isManager;

  const [search,          setSearch]          = useState('');
  const [filterArea,      setFilterArea]      = useState(ALL);
  const [filterFurniture, setFilterFurniture] = useState(ALL);
  const [modal,           setModal]           = useState({ open: false, data: null });
  const [qrSlot,          setQrSlot]          = useState(null);
  const [labelSlot,       setLabelSlot]       = useState(null);
  const [deleteTarget,    setDeleteTarget]    = useState(null);
  const [form, setForm] = useState({ area_id: '', furniture_id: '', name: '', notes: '' });

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: areas = [] } = useQuery({
    queryKey: ['st-areas'],
    queryFn: () => base44.entities.Area.list('name', 100),
    staleTime: STALE.SLOW,
  });
  const { data: furniture = [] } = useQuery({
    queryKey: ['st-furniture'],
    queryFn: () => base44.entities.Furniture.list('name', 200),
    staleTime: STALE.SLOW,
  });
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['slots'],
    queryFn: () => base44.entities.StorageSlot.list('full_name', 1000),
    staleTime: STALE.MEDIUM,
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.StorageAssignment.filter({ is_active: true }, 'article_name', 1000),
    staleTime: STALE.MEDIUM,
  });

  // ── Filter-Logik ─────────────────────────────────────────────────────────────
  const filteredFurniture = useMemo(() =>
    filterArea === ALL ? furniture : furniture.filter(f => f.area_id === filterArea),
    [furniture, filterArea]
  );

  const filteredSlots = useMemo(() => {
    const q = search.toLowerCase();
    return slots.filter(s => {
      if (filterArea !== ALL && s.area_id !== filterArea) return false;
      if (filterFurniture !== ALL && s.furniture_id !== filterFurniture) return false;
      if (q && !s.name?.toLowerCase().includes(q) &&
               !s.full_name?.toLowerCase().includes(q) &&
               !s.short_code?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [slots, filterArea, filterFurniture, search]);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: d => modal.data?.id
      ? base44.entities.StorageSlot.update(modal.data.id, d)
      : base44.entities.StorageSlot.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      setModal({ open: false, data: null });
      toast.success(modal.data ? 'Fach aktualisiert' : 'Fach erstellt');
    },
    onError: e => toast.error('Fehler: ' + (e?.message || 'Unbekannt')),
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.StorageSlot.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots'] });
      toast.success('Fach gelöscht');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Löschen fehlgeschlagen'),
  });

  const openAdd  = () => { setForm({ area_id: filterArea !== ALL ? filterArea : '', furniture_id: '', name: '', notes: '' }); setModal({ open: true, data: null }); };
  const openEdit = s => { setForm({ area_id: s.area_id || '', furniture_id: s.furniture_id || '', name: s.name || '', notes: s.notes || '' }); setModal({ open: true, data: s }); };

  const handleSave = () => {
    const area = areas.find(a => a.id === form.area_id);
    const fur  = furniture.find(f => f.id === form.furniture_id);
    if (!area || !fur || !form.name.trim()) { toast.error('Bitte alle Felder ausfüllen.'); return; }
    saveMut.mutate({
      area_id:        area.id,
      area_name:      area.name,
      furniture_id:   fur.id,
      furniture_name: fur.name,
      furniture_type: fur.type,
      name:           form.name.trim(),
      full_name:      `${area.name} › ${fur.name} › ${form.name.trim()}`,
      short_code:     modal.data?.short_code || generateShortCode(area.name, fur.name, form.name.trim()),
      notes:          form.notes,
      is_active:      true,
    });
  };

  const modalFurniture = useMemo(() =>
    furniture.filter(f => f.area_id === form.area_id),
    [furniture, form.area_id]
  );

  const toLabelLocation = slot => {
    const slotAssignments = assignments.filter(a => a.storage_slot_id === slot.id && a.is_active !== false);
    return {
      id:            slot.id,
      name:          slot.full_name || slot.name,
      area:          slot.area_name,
      furniture:     slot.furniture_name,
      position:      slot.name,
      short_code:    slot.short_code,
      location_type: slot.furniture_type || 'Fach',
      article_names: slotAssignments.map(a => a.article_name).filter(Boolean),
    };
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Suche */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-10 h-10" placeholder="Fach suchen…" value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Bereich-Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide mb-2">
        <button onClick={() => { setFilterArea(ALL); setFilterFurniture(ALL); }}
          className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
            filterArea === ALL ? 'bg-amber-500 border-amber-500 text-white' : 'border-border text-muted-foreground bg-card hover:text-foreground')}>
          Alle
        </button>
        {areas.map(a => (
          <button key={a.id} onClick={() => { setFilterArea(a.id); setFilterFurniture(ALL); }}
            className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              filterArea === a.id ? 'bg-amber-500 border-amber-500 text-white' : 'border-border text-muted-foreground bg-card hover:text-foreground')}>
            {a.name}
          </button>
        ))}
      </div>

      {/* Möbel-Chips (nur wenn Bereich gewählt) */}
      {filterArea !== ALL && filteredFurniture.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide mb-3">
          <button onClick={() => setFilterFurniture(ALL)}
            className={cn('shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all',
              filterFurniture === ALL ? 'bg-secondary border-border text-foreground' : 'border-border/50 text-muted-foreground bg-card hover:text-foreground')}>
            Alle Möbel
          </button>
          {filteredFurniture.map(f => (
            <button key={f.id} onClick={() => setFilterFurniture(f.id)}
              className={cn('shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all',
                filterFurniture === f.id ? 'bg-secondary border-border text-foreground' : 'border-border/50 text-muted-foreground bg-card hover:text-foreground')}>
              {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Header-Zeile */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {filteredSlots.length} Fach{filteredSlots.length !== 1 ? 'er' : ''}
        </p>
        {canEdit && (
          <Button size="sm" onClick={openAdd} className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />Fach hinzufügen
          </Button>
        )}
      </div>

      {/* Fach-Liste */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : filteredSlots.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine Fächer gefunden</p>
          {canEdit && <Button size="sm" variant="outline" onClick={openAdd} className="mt-3">Erstes Fach anlegen</Button>}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSlots.map(slot => {
            const slotAssignments = assignments.filter(a => a.storage_slot_id === slot.id && a.is_active !== false);
            const lowCount = slotAssignments.filter(a => a.min_stock != null && a.quantity != null && a.quantity < a.min_stock).length;

            return (
              <Card key={slot.id} className="p-3 border-border/60 hover:border-border transition-all">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Package className="w-4 h-4 text-amber-500" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground">{slot.name}</p>
                      {slot.short_code && (
                        <span className="text-[10px] font-mono bg-secondary text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
                          {slot.short_code}
                        </span>
                      )}
                    </div>
                    {/* Breadcrumb */}
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {slot.area_name}{slot.furniture_name ? ` › ${slot.furniture_name}` : ''}
                      {slot.furniture_type ? ` (${slot.furniture_type})` : ''}
                    </p>

                    {/* Artikel-Chips */}
                    {slotAssignments.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {slotAssignments.slice(0, 4).map((a, i) => (
                          <span key={i} className={cn(
                            'text-[10px] border rounded px-1.5 py-0.5',
                            a.min_stock != null && a.quantity != null && a.quantity < a.min_stock
                              ? 'border-red-500/40 bg-red-500/8 text-red-400'
                              : 'bg-secondary text-muted-foreground border-border'
                          )}>
                            {a.article_name}
                            {a.quantity != null ? ` · ${a.quantity}${a.unit ? ' ' + a.unit : ''}` : ''}
                          </span>
                        ))}
                        {slotAssignments.length > 4 && (
                          <span className="text-[10px] text-muted-foreground px-1">+{slotAssignments.length - 4}</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/40 mt-1">Leer</p>
                    )}

                    {/* Low-stock Warnung */}
                    {lowCount > 0 && (
                      <p className="text-[10px] text-red-400 font-semibold mt-1.5">
                        ⚠ {lowCount} unter Mindestbestand
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-0.5 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-500 hover:bg-amber-500/10"
                      onClick={() => setQrSlot({ id: slot.id, name: slot.full_name || slot.name, code: slot.short_code })}
                      title="QR-Code">
                      <QrCode className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-secondary"
                      onClick={() => setLabelSlot(slot)} title="Etikett">
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                    {canEdit && (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"
                          onClick={() => openEdit(slot)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(slot)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit Modal ────────────────────────────────────────────────────── */}
      <Dialog open={modal.open} onOpenChange={open => !open && setModal({ open: false, data: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{modal.data ? 'Fach bearbeiten' : 'Neues Fach'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Bereich *</Label>
              <Select value={form.area_id} onValueChange={v => setForm(f => ({ ...f, area_id: v, furniture_id: '' }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Bereich wählen…" /></SelectTrigger>
                <SelectContent>
                  {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Möbel *</Label>
              <Select value={form.furniture_id} onValueChange={v => setForm(f => ({ ...f, furniture_id: v }))}
                disabled={!form.area_id}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={form.area_id ? 'Möbel wählen…' : 'Erst Bereich wählen'} />
                </SelectTrigger>
                <SelectContent>
                  {modalFurniture.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fach-Bezeichnung *</Label>
              <Input className="h-9" placeholder="z.B. Fach 1, Oben Links…" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notizen (optional)</Label>
              <Input className="h-9" placeholder="Interne Hinweise…" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saveMut.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white">
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fach löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteTarget?.name}" wird unwiderruflich gelöscht.
              {assignments.filter(a => a.storage_slot_id === deleteTarget?.id).length > 0 &&
                ' Achtung: Diesem Fach sind noch Artikel zugewiesen.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Preview */}
      {qrSlot && (
        <QrPreview
          slotId={qrSlot.id}
          slotName={qrSlot.name}
          slotCode={qrSlot.code}
          onClose={() => setQrSlot(null)}
        />
      )}

      {/* Label Print */}
      {labelSlot && (
        <StorageLabelPrint
          location={toLabelLocation(labelSlot)}
          onClose={() => setLabelSlot(null)}
        />
      )}
    </>
  );
}
