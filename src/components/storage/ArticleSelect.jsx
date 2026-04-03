import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function ArticleSelect({ value, onChange, className }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles-storage'],
    queryFn: () => base44.entities.Article.filter({ is_active: true }, 'name', 500)
  });

  const filteredArticles = useMemo(() => {
    if (!searchTerm.trim()) return articles.slice(0, 20);
    const q = searchTerm.toLowerCase();
    return articles.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.manufacturer?.toLowerCase() || '').includes(q) ||
      (a.barcode?.toLowerCase() || '').includes(q)
    ).slice(0, 20);
  }, [articles, searchTerm]);

  const selectedArticle = articles.find(a => a.id === value);

  return (
    <div className={cn('space-y-2', className)}>
      <Label>Artikel aus Artikelliste *</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full h-11 px-3 text-left rounded-lg border border-input bg-transparent hover:bg-accent/50 flex items-center justify-between text-base transition-colors"
        >
          <span className={selectedArticle ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedArticle ? selectedArticle.name : 'Artikel wählen...'}
          </span>
          {selectedArticle && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="p-1 hover:bg-destructive/10 rounded"
            >
              <X className="w-4 h-4 text-destructive" />
            </button>
          )}
        </button>

        {open && (
          <div className="absolute top-12 left-0 right-0 z-50 bg-popover border border-border rounded-lg shadow-lg">
            <div className="p-2 border-b border-border sticky top-0 bg-popover">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Artikel suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 text-base"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 text-center text-muted-foreground text-sm">Lädt...</div>
              ) : filteredArticles.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-sm">Keine Artikel gefunden</div>
              ) : (
                filteredArticles.map(article => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => { onChange(article.id); setOpen(false); setSearchTerm(''); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border/50 last:border-b-0"
                  >
                    <p className="font-medium text-foreground">{article.name}</p>
                    {article.manufacturer && (
                      <p className="text-xs text-muted-foreground">{article.manufacturer}</p>
                    )}
                    {article.barcode && (
                      <p className="text-xs text-muted-foreground">EAN: {article.barcode}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}