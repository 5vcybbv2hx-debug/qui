import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Trash2, Package } from 'lucide-react';

export default function AssignTab({ permissions }) {
  const qc = useQueryClient();
  const canEdit = permissions.isManager;

  const [articleSearch, setArticleSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [slotSearch, setSlotSearch] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ quantity: '', min_stock: '', max_stock: '', unit: 'Stück', notes: '' });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: articles = [] } = useQuery({ queryKey: ['articles'], queryFn: () => base44.entities.Article.filter({ is_active: true }, 'name', 500) });
  const { data: slots = [] } = useQuery({ queryKey: ['slots'], queryFn: () => base44.entities.StorageSlot.list('full_name', 1000) });
  const { data: assignments = [] } = useQuery({ queryKey: ['assignments'], queryFn: () => base44.entities.StorageAssignment.filter({ is_active: true }, '-created_date', 500) });

  const filteredArticles = useMemo(() =>
    articles.filter(a => a.name.toLowerCase().includes(articleSearch.toLowerCase())).slice(0, 10),
    [articles, articleSearch]
  );

  const filteredSlots = useMemo(() =>
    slots.filter(s => s.full_name?.toLowerCase().includes(slotSearch.toLowerCase())).slice(0, 10),
    [slots, slotSearch]
  );

  const saveMut = useMutation({
    mutationFn: (d) => base44.entities.StorageAssignment.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      setSaveSuccess(true);
      setSelectedArticle(null);
      setSelectedSlot(null);
      setArticleSearch('');
      setSlotSearch('');
      setForm({ quantity: '', min_stock: '', max_stock: '', unit: 'Stück', notes: '' });
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (e) => { console.error(e); alert('Fehler: ' + (e?.message || 'Unbekannt')); }
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.StorageAssignment.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
    onError: (e) => { console.error(e); alert('Fehler beim Löschen'); }
  });

  const handleSave = () => {
    if (!selectedArticle || !selectedSlot) return;
    saveMut.mutate({
      article_id: selectedArticle.id,
      article_name: selectedArticle.name,
      article_image_url: selectedArticle.image_url || '',
      storage_slot_id: selectedSlot.id,
      storage_slot_name: selectedSlot.full_name,
      storage_slot_code: selectedSlot.short_code,
      area_id: selectedSlot.area_id,
      area_name: selectedSlot.area_name,
      quantity: parseFloat(form.quantity) || 0,
      min_stock: parseFloat(form.min_stock) || 0,
      max_stock: parseFloat(form.max_stock) || null,
      unit: form.unit,
      notes: form.notes,
      is_active: true
    });
  };

  const UNITS = ['Stück', 'l', 'ml', 'kg', 'g'];

  return (
    <div className="space-y-5">
      {/* Article picker */}
      <Card className="p-4 space-y-3">
        <p className="font-semibold text-foreground">1. Artikel wählen</p>
        {selectedArticle ? (
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="flex items-center gap-3">
              {selectedArticle.image_url && <img src={selectedArticle.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedArticle.name}</p>
                <p className="text-xs text-muted-foreground">{selectedArticle.category}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setSelectedArticle(null); setArticleSearch(''); }}>Ändern</Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-10 h-11" placeholder="Artikel suchen…" value={articleSearch} onChange={e => setArticleSearch(e.target.value)} />
            </div>
            {articleSearch.length > 0 && (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {filteredArticles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Kein Artikel gefunden</p>
                ) : (
                  filteredArticles.map(a => (
                    <button key={a.id} onClick={() => { setSelectedArticle(a); setArticleSearch(''); }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left">
                      {a.image_url && <img src={a.image_url} alt="" className="w-7 h-7 rounded object-cover" />}
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.category}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Slot picker */}
      <Card className="p-4 space-y-3">
        <p className="font-semibold text-foreground">2. Lagerplatz wählen</p>
        {selectedSlot ? (
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedSlot.full_name}</p>
              <p className="text-xs text-muted-foreground">{selectedSlot.short_code}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setSelectedSlot(null); setSlotSearch(''); }}>Ändern</Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-10 h-11" placeholder="Lagerplatz suchen…" value={slotSearch} onChange={e => setSlotSearch(e.target.value)} />
            </div>
            {slotSearch.length > 0 && (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {filteredSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Kein Lagerplatz gefunden</p>
                ) : (
                  filteredSlots.map(s => (
                    <button key={s.id} onClick={() => { setSelectedSlot(s); setSlotSearch(''); }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground">{s.short_code}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Details */}
      {selectedArticle && selectedSlot && (
        <Card className="p-4 space-y-4">
          <p className="font-semibold text-foreground">3. Menge & Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Menge *</Label>
              <Input type="number" min={0} className="h-11" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Einheit</Label>
              <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mindestbestand</Label>
              <Input type="number" min={0} className="h-11" placeholder="0" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Maximalbestand</Label>
              <Input type="number" min={0} className="h-11" placeholder="—" value={form.max_stock} onChange={e => setForm(f => ({ ...f, max_stock: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notizen (optional)</Label>
            <Input className="h-11" placeholder="Hinweise zur Lagerung" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {saveSuccess && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-600 font-medium">
              ✅ Zuordnung gespeichert!
            </div>
          )}

          <Button onClick={handleSave} disabled={saveMut.isPending || !form.quantity} className="w-full bg-amber-600 hover:bg-amber-700 text-white h-11">
            {saveMut.isPending ? 'Speichert…' : 'Zuordnung speichern'}
          </Button>
        </Card>
      )}

      {/* Recent Assignments */}
      {assignments.length > 0 && (
        <div>
          <p className="font-semibold text-foreground mb-3">Aktuelle Zuordnungen</p>
          <div className="space-y-2">
            {assignments.slice(0, 20).map(a => (
              <Card key={a.id} className="p-3 flex items-center gap-3">
                <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.article_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.storage_slot_name} · {a.quantity} {a.unit}</p>
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => deleteMut.mutate(a.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}