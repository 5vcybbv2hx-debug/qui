import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, Link } from "lucide-react";

/**
 * Multi-article linker for menu items.
 * Allows searching and toggling multiple articles from the warehouse.
 */
export default function ArticleLinker({ articles = [], linkedIds = [], onChange }) {
    const [search, setSearch] = useState("");

    const filtered = articles.filter(a =>
        !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.barcode?.includes(search)
    );

    const toggle = (article) => {
        if (linkedIds.includes(article.id)) {
            onChange(linkedIds.filter(id => id !== article.id));
        } else {
            onChange([...linkedIds, article.id]);
        }
    };

    const linkedArticles = articles.filter(a => linkedIds.includes(a.id));

    return (
        <div className="col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
            <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-blue-700" />
                <Label className="text-blue-900 font-semibold">Artikel verknüpfen (Lagerbestand)</Label>
            </div>
            <p className="text-xs text-blue-700">
                Verknüpfte Artikel werden im Lager-Bestand angezeigt. Mehrere Artikel möglich (z.B. verschiedene Lieferanten).
            </p>

            {/* Selected badges */}
            {linkedArticles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {linkedArticles.map(a => (
                        <Badge key={a.id} variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-300">
                            {a.name}
                            <button
                                type="button"
                                onClick={() => toggle(a)}
                                className="ml-1 hover:text-red-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Artikel suchen..."
                    className="pl-8"
                />
            </div>

            {/* Article list */}
            <div className="max-h-44 overflow-y-auto space-y-1 rounded border border-blue-200 bg-white">
                {filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground p-3">Keine Artikel gefunden.</p>
                )}
                {filtered.slice(0, 50).map(article => {
                    const isLinked = linkedIds.includes(article.id);
                    return (
                        <button
                            key={article.id}
                            type="button"
                            onClick={() => toggle(article)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-blue-50 transition-colors ${isLinked ? 'bg-blue-100 font-medium text-blue-900' : 'text-foreground'}`}
                        >
                            <span>{article.name} {article.barcode ? <span className="text-xs text-muted-foreground">({article.barcode})</span> : null}</span>
                            {isLinked && <span className="text-blue-600 text-xs">✓ Verknüpft</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}