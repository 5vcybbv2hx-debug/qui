import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Pencil, Trash2, Copy, Check, Printer, QrCode, ExternalLink, Package, Download } from 'lucide-react';
import StorageLabelPrint from './StorageLabelPrint';
import { generateShortCode, buildFullName } from './storageUtils';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateDisplay';

const ALL = '__all__';

// ── Inline QR preview using qrcode library ────────────────────────────────────
function QrPreview({ slotId, slotName, slotCode, onClose }) {
  const canvasRef  = useRef(null);
  const labelRef   = useRef(null);
  const [ready, setReady] = useState(false);
  const url = `${window.location.origin}/StorageLocationScan/${slotId}`;

  // Build a labeled canvas: QR + name below
  useEffect(() => {
    let cancelled = false;
    import('qrcode').then(async (QRCode) => {
      if (cancelled) return;

      const QR_SIZE = 220;
      const LABEL_H = 54;
      const PAD     = 10;
      const W       = QR_SIZE + PAD * 2;
      const H       = QR_SIZE + LABEL_H + PAD * 2;

      // Generate QR into temp canvas
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, url, {
        width: QR_SIZE,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#ffffff' },
      });

      // Compose onto label canvas
      const out = canvasRef.current;
      if (!out || cancelled) return;
      out.width  = W;
      out.height = H;
      const ctx = out.getContext('2d');

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      // QR
      ctx.drawImage(qrCanvas, PAD, PAD, QR_SIZE, QR_SIZE);

      // Divider
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, PAD + QR_SIZE + 6);
      ctx.lineTo(W - PAD, PAD + QR_SIZE + 6);
      ctx.stroke();

      // Short code
      const codeY = PAD + QR_SIZE + 22;
      if (slotCode) {
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(slotCode, W / 2, codeY - 4);
      }

      // Slot name — bold, centered, max 2 lines
      const nameY = slotCode ? codeY + 16 : codeY + 4;
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      const maxW = W - PAD * 2 - 8;
      const words = (slotName || '').split(' ');
      let line1 = '', line2 = '';
      for (const w of words) {
        const test = line1 ? line1 + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line1) { line2 = line2 ? line2 + ' ' + w : w; }
        else { line1 = test; }
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
          <p className="text-[11px] text-muted-foreground text-center break-all px-2 leading-relaxed">{url}</p>
          <div className="flex gap-2 w-full">
            <Button
              size="sm"
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleDownload}
              disabled={!ready}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              PNG downloaden
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Öffnen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SlotsTab({ permissions }) {
  const qc = useQueryClient();
  const canEdit = permissions.isManager;

  const [search, setSearch]                     = useState('');
  const [filterArea, setFilterArea]             = useState(ALL);
  const [filterFurniture, setFilterFurniture]   = useState(ALL);
  const [filterContainer, setFilterContainer]   = useState(ALL);
  const [copiedId, setCopiedId]                 = useState(null);
  const [modal, setModal]                       = useState({ open: false, data: null });
  const [labelSlot, setLabelSlot]               = useState(null);
  const [qrSlot, setQrSlot]                     = useState(null); // { id, name, code }
  const [form, setForm]                         = useState({ area_id: '', furniture_id: '', container_id: '', name: '', notes: '' });

  const { data: areas,      isLoading: aL, isError: aE } = useQuery({ queryKey: ['st-areas'],      queryFn: () => base44.entities.Area.list('name', 100) });
  const { data: furniture,  isLoading: fL, isError: fE } = useQuery({ queryKey: ['st-furniture'],  queryFn: () => base44.entities.Furniture.list('name', 500) });
  const { data: containers, isLoading: cL, isError: cE } = useQuery({ queryKey: ['st-containers'], queryFn: () => base44.entities.Container.list('name', 500) });
  const { data: slots,      isLoading: sL, isError: sE } = useQuery({ queryKey: ['slots'],         queryFn: () => base44.entities.StorageSlot.list('-created_date', 1000) });
  const { data: assignments }                             = useQuery({ queryKey: ['storage-assignments'], queryFn: () => base44.entities.StorageAssignment.list('article_name', 2000) });

  const isLoading = aL || fL || cL || sL;
  const isError   = aE || fE || cE || sE;

  const filteredFurniture  = useMemo(() => (furniture  || []).filter(f => filterArea      === ALL || f.area_id      === filterArea),      [furniture,  filterArea]);
  const filteredContainers = useMemo(() => (containers || []).filter(c => filterFurniture === ALL || c.furniture_id === filterFurniture), [containers, filterFurniture]);

  const filteredSlots = useMemo(() => {
    if (!slots) return [];
    return slots.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !search
        || (s.full_name   || '').toLowerCase().includes(q)
        || (s.short_code  || '').toLowerCase().includes(q);
      const matchArea = filterArea      === ALL || s.area_id      === filterArea;
      const matchFur  = filterFurniture === ALL || s.furniture_id === filterFurniture;
      const matchCon  = filterContainer === ALL || s.container_id === filterContainer;
      return matchSearch && matchArea && matchFur && matchCon;
    });
  }, [slots, search, filterArea, filterFurniture, filterContainer]);

  const saveMut = useMutation({
    mutationFn: d => modal.data?.id
      ? base44.entities.StorageSlot.update(modal.data.id, d)
      : base44.entities.StorageSlot.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['slots'] }); setModal({ open: false, data: null }); },
    onError:   e  => alert('Fehler: ' + (e?.message || 'Unbekannt')),
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.StorageSlot.delete(id),
    onSuccess: ()  => qc.invalidateQueries({ queryKey: ['slots'] }),
    onError:   ()  => alert('Löschen fehlgeschlagen'),
  });

  const openAdd  = () => { setForm({ area_id: '', furniture_id: '', container_id: '', name: '', notes: '' }); setModal({ open: true, data: null }); };
  const openEdit = s  => { setForm({ area_id: s.area_id || '', furniture_id: s.furniture_id || '', container_id: s.container_id || '', name: s.name || '', notes: s.notes || '' }); setModal({ open: true, data: s }); };

  const handleSave = () => {
    const area = (areas     || []).find(a => a.id === form.area_id);
    const fur  = (furniture  || []).find(f => f.id === form.furniture_id);
    const con  = (containers || []).find(c => c.id === form.container_id);
    if (!area || !fur || !con || !form.name.trim()) { alert('Bitte alle Pflichtfelder ausfüllen.'); return; }
    saveMut.mutate({
      area_id: area.id, area_name: area.name,
      furniture_id: fur.id, furniture_name: fur.name,
      container_id: con.id, container_name: con.name,
      name:        form.name.trim(),
      full_name:   buildFullName(area.name, fur.name, con.name, form.name.trim()),
      short_code:  modal.data?.short_code || generateShortCode(),
      notes:       form.notes,
      is_active:   true,
    });
  };

  const copy = text => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toLabelLocation = slot => {
    const slotAssignments = (assignments || []).filter(a => a.storage_slot_id === slot.id && a.is_active !== false);
    return {
      id:            slot.id,
      name:          slot.full_name || slot.name,
      area:          slot.area_name,
      furniture:     slot.furniture_name,
      position:      slot.name,
      short_code:    slot.short_code,
      location_type: 'Fach',
      article_names: slotAssignments.map(a => a.article_name).filter(Boolean),
    };
  };

  const modalFurniture  = useMemo(() => (furniture  || []).filter(f => f.area_id      === form.area_id),      [furniture,  form.area_id]);
  const modalContainers = useMemo(() => (containers || []).filter(c => c.furniture_id === form.furniture_id), [containers, form.furniture_id]);

  const previewName = useMemo(() => {
    if (!form.area_id || !form.furniture_id || !form.container_id || !form.name) return null;
    const area = (areas     || []).find(a => a.id === form.area_id);
    const fur  = (furniture  || []).find(f => f.id === form.furniture_id);
    const con  = (containers || []).find(c => c.id === form.container_id);
    if (!area || !fur || !con) return null;
    return buildFullName(area.name, fur.name, con.name, form.name);
  }, [form, areas, furniture, containers]);

  return (
    <>
      {/* Filters */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10 h-11" placeholder="Name oder Code suchen…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select value={filterArea} onValueChange={v => { setFilterArea(v); setFilterFurniture(ALL); setFilterContainer(ALL); }}>
            <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle Bereiche</SelectItem>
              {(areas || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterFurniture} onValueChange={v => { setFilterFurniture(v); setFilterContainer(ALL); }} disabled={filterArea === ALL || fL}>
            <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle Möbel</SelectItem>
              {filteredFurniture.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterContainer} onValueChange={setFilterContainer} disabled={filterFurniture === ALL || cL}>
            <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle Behälter</SelectItem>
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

      {/* Slot list */}
      {isLoading ? <LoadingState text="Lade Lagerplätze…" /> :
       isError   ? <ErrorState  text="Lagerplätze konnten nicht geladen werden." /> :
       filteredSlots.length === 0 ? (
         <EmptyState text={search || filterArea !== ALL ? 'Keine Lagerplätze für diesen Filter.' : 'Noch keine Lagerplätze angelegt.'} />
       ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filteredSlots.length} Plätze</p>
          {filteredSlots.map((slot, idx) => {
            const slotArticles = (assignments || [])
              .filter(a => a.storage_slot_id === slot.id && a.is_active !== false)
              .map(a => a.article_name).filter(Boolean);
            const lowCount = (assignments || []).filter(a =>
              a.storage_slot_id === slot.id &&
              a.is_active !== false &&
              a.min_stock != null &&
              (a.quantity ?? 0) < a.min_stock
            ).length;

            return (
              <div key={slot.id} className="animate-stagger" style={{ '--delay': `${idx * 35}ms` }}>
                <Card className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Package className="w-5 h-5 text-amber-500" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {slot.full_name || slot.name}
                      </p>
                      <button
                        onClick={() => copy(slot.short_code)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                      >
                        {copiedId === slot.short_code
                          ? <Check className="w-3 h-3 text-green-500" />
                          : <Copy  className="w-3 h-3" />
                        }
                        <span className="font-mono">{slot.short_code}</span>
                      </button>

                      {/* Article chips */}
                      {slotArticles.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {slotArticles.slice(0, 4).map((name, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5 leading-tight"
                            >
                              {name}
                            </span>
                          ))}
                          {slotArticles.length > 4 && (
                            <span className="text-[10px] text-muted-foreground px-1">+{slotArticles.length - 4}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/50 mt-1">Keine Artikel zugeordnet</p>
                      )}

                      {/* Low-stock badge */}
                      {lowCount > 0 && (
                        <p className="text-[10px] text-red-500 font-medium mt-1">
                          ⚠ {lowCount} unter Mindestbestand
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      {/* QR quick preview */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-amber-500 hover:bg-amber-500/10"
                        onClick={() => setQrSlot({ id: slot.id, name: slot.full_name || slot.name, code: slot.short_code })}
                        title="QR-Code anzeigen"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                      {/* Label print */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-muted-foreground hover:bg-secondary"
                        onClick={() => setLabelSlot(slot)}
                        title="Etikett drucken"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground" onClick={() => openEdit(slot)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => deleteMut.mutate(slot.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* QR quick preview dialog */}
      {qrSlot && <QrPreview slotId={qrSlot.id} slotName={qrSlot.name} slotCode={qrSlot.code} onClose={() => setQrSlot(null)} />}

      {/* Label Print dialog */}
      {labelSlot && (
        <StorageLabelPrint
          open={!!labelSlot}
          onClose={() => setLabelSlot(null)}
          location={toLabelLocation(labelSlot)}
        />
      )}

      {/* Add / Edit modal */}
      <Dialog open={modal.open} onOpenChange={o => !o && setModal({ open: false, data: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modal.data ? 'Lagerplatz bearbeiten' : 'Neuer Lagerplatz'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Bereich *</Label>
              <Select value={form.area_id} onValueChange={v => setForm(f => ({ ...f, area_id: v, furniture_id: '', container_id: '' }))}>
                <SelectTrigger><SelectValue placeholder="Bereich wählen…" /></SelectTrigger>
                <SelectContent>
                  {(areas || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Möbelstück *</Label>
              <Select value={form.furniture_id} onValueChange={v => setForm(f => ({ ...f, furniture_id: v, container_id: '' }))} disabled={!form.area_id}>
                <SelectTrigger><SelectValue placeholder="Möbel wählen…" /></SelectTrigger>
                <SelectContent>
                  {modalFurniture.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Behälter *</Label>
              <Select value={form.container_id} onValueChange={v => setForm(f => ({ ...f, container_id: v }))} disabled={!form.furniture_id}>
                <SelectTrigger><SelectValue placeholder="Behälter wählen…" /></SelectTrigger>
                <SelectContent>
                  {modalContainers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fachname *</Label>
              <Input placeholder="z.B. Fach 1, Oben Links…" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Notizen (optional)</Label>
              <Input placeholder="Hinweise…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {previewName && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Vollständiger Name:</p>
                <p className="text-sm font-mono text-foreground">{previewName}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saveMut.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saveMut.isPending ? 'Speichern…' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
