import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Package, ChevronRight, ArrowLeft, X, AlertTriangle } from 'lucide-react';

// ── Slot Detail View ─────────────────────────────────────────────────────────

function SlotDetail({ slot, assignments, onBack }) {
  const slotAssignments = assignments.filter(a => a.storage_slot_id === slot.id);
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Suche
      </button>
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="font-bold text-foreground">{slot.full_name}</p>
            <Badge variant="outline" className="mt-1 text-xs font-mono">{slot.short_code}</Badge>
          </div>
        </div>
      </Card>

      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Inhalt ({slotAssignments.length} Artikel)
        </p>
        {slotAssignments.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">Dieses Fach ist leer</Card>
        ) : (
          <div className="space-y-2">
            {slotAssignments.map(a => {
              const isLow = a.min_stock != null && a.quantity < a.min_stock;
              return (
                <Card key={a.id} className={`p-4 flex items-center gap-3 ${isLow ? 'border-red-500/40' : ''}`}>
                  {a.article_image_url ? (
                    <img src={a.article_image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{a.article_name}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`text-sm font-bold ${isLow ? 'text-red-500' : 'text-foreground'}`}>
                        {a.quantity} {a.unit}
                      </span>
                      {a.min_stock != null && (
                        <span className="text-xs text-muted-foreground">Min: {a.min_stock}</span>
                      )}
                      {isLow && (
                        <Badge variant="destructive" className="text-xs py-0 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Kritisch
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Article Results ──────────────────────────────────────────────────────────

function ArticleResult({ article, articleAssignments, slots, onSelectSlot }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors"
      >
        {article.image_url ? (
          <img src={article.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 text-left min-w-0">
          <p className="font-bold text-foreground">{article.name}</p>
          <p className="text-xs text-muted-foreground">{articleAssignments.length} Lagerplatz{articleAssignments.length !== 1 ? 'e' : ''}</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-border">
          {articleAssignments.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Kein Lagerplatz zugeordnet</p>
          ) : (
            articleAssignments.map((a, i) => {
              const slot = slots.find(s => s.id === a.storage_slot_id);
              const isLow = a.min_stock != null && a.quantity < a.min_stock;
              return (
                <button
                  key={a.id}
                  onClick={() => slot && onSelectSlot(slot)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left ${i > 0 ? 'border-t border-border/50' : ''}`}
                >
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {slot?.full_name || a.storage_slot_name || '—'}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className={`text-xs font-medium ${isLow ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {a.quantity} {a.unit}
                        {a.min_stock != null && ` (Min: ${a.min_stock})`}
                      </span>
                      {slot?.short_code && (
                        <span className="text-xs font-mono text-muted-foreground">{slot.short_code}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
}

// ── Main SearchTab ────────────────────────────────────────────────────────────

export default function SearchTab() {
  const [search, setSearch] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.filter({ is_active: true }, 'name', 1000)
  });

  const { data: slots = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: () => base44.entities.StorageSlot.list('full_name', 1000)
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.StorageAssignment.filter({ is_active: true }, 'article_name', 1000)
  });

  // Artikel die mindestens eine Zuordnung haben
  const assignedArticleIds = useMemo(() => new Set(assignments.map(a => a.article_id)), [assignments]);

  const matchingArticles = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase().trim();
    return articles
      .filter(a => a.name.toLowerCase().includes(q) && assignedArticleIds.has(a.id))
      .slice(0, 15);
  }, [articles, search, assignedArticleIds]);

  // Slot-Suche: wenn kein Artikel gefunden, zeige passende Slots
  const matchingSlots = useMemo(() => {
    if (!search.trim() || matchingArticles.length > 0) return [];
    const q = search.toLowerCase().trim();
    return slots.filter(s => s.full_name?.toLowerCase().includes(q) || s.short_code?.toLowerCase().includes(q)).slice(0, 10);
  }, [slots, search, matchingArticles]);

  if (selectedSlot) {
    return <SlotDetail slot={selectedSlot} assignments={assignments} onBack={() => setSelectedSlot(null)} />;
  }

  return (
    <div className="space-y-4">
      {/* Hero Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <Input
          className="pl-12 pr-10 h-14 text-base rounded-xl border-2 focus-visible:border-amber-500"
          placeholder="Artikel suchen… z.B. Gin, Wodka, Soda"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {/* Leerzustand */}
      {!search && (
        <Card className="p-8 text-center">
          <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="font-semibold text-foreground">Wo ist was?</p>
          <p className="text-sm text-muted-foreground mt-1">Gib einen Artikelnamen ein, um den Lagerplatz zu finden.</p>
        </Card>
      )}

      {/* Artikel-Ergebnisse */}
      {matchingArticles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">{matchingArticles.length} Artikel gefunden</p>
          {matchingArticles.map(article => (
            <ArticleResult
              key={article.id}
              article={article}
              articleAssignments={assignments.filter(a => a.article_id === article.id)}
              slots={slots}
              onSelectSlot={setSelectedSlot}
            />
          ))}
        </div>
      )}

      {/* Lagerplatz-Ergebnisse (Fallback) */}
      {matchingSlots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Lagerplätze</p>
          {matchingSlots.map(slot => (
            <Card key={slot.id} className="overflow-hidden">
              <button
                onClick={() => setSelectedSlot(slot)}
                className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors text-left"
              >
                <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{slot.full_name}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{slot.short_code}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Kein Ergebnis */}
      {search && matchingArticles.length === 0 && matchingSlots.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <p className="font-medium">Kein Artikel gefunden für „{search}"</p>
          <p className="text-sm mt-1">Prüfe ob der Artikel einem Lagerplatz zugeordnet ist.</p>
        </Card>
      )}
    </div>
  );
}