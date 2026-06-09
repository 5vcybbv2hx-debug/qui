import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trophy, Search, RefreshCw, Plus, Filter, X, Upload, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWorldCupMatches, getTrafficColor, getTrafficLabel, getTrafficDot } from '@/components/worldcup/useWorldCupMatches';
import MatchCard from '@/components/worldcup/MatchCard';
import MatchDetailSheet from '@/components/worldcup/MatchDetailSheet';
import MatchEditModal from '@/components/worldcup/MatchEditModal';
import WorldCupImporter from '@/components/worldcup/WorldCupImporter';
import { usePermissions } from '@/components/auth/usePermissions';

const FILTERS = [
    { id: 'all', label: 'Alle' },
    { id: 'germany', label: '🇩🇪 Deutschland' },
    { id: 'today', label: '📅 Heute' },
    { id: 'tomorrow', label: '📅 Morgen' },
    { id: 'top', label: '⭐ Top-Spiele' },
    { id: 'knockout', label: '🏆 K.o.-Runde' },
    { id: 'live', label: '🔴 Live' },
];

export default function WorldCupSchedule() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const { data: matches = [], isLoading, dataUpdatedAt } = useWorldCupMatches();
    const [activeFilter, setActiveFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showImporter, setShowImporter] = useState(false);
    const [editMatch, setEditMatch] = useState(null); // null = closed, {} = new, match = edit

    const filtered = useMemo(() => {
        let list = [...matches];

        // Search
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(m =>
                m.home_team?.toLowerCase().includes(q) ||
                m.away_team?.toLowerCase().includes(q) ||
                m.venue?.toLowerCase().includes(q)
            );
        }

        // Filter
        switch (activeFilter) {
            case 'germany': list = list.filter(m => m.is_germany_game); break;
            case 'today': list = list.filter(m => isToday(new Date(m.kickoff_time))); break;
            case 'tomorrow': list = list.filter(m => isTomorrow(new Date(m.kickoff_time))); break;
            case 'top': list = list.filter(m => m.is_top_game || m.is_germany_game); break;
            case 'knockout': list = list.filter(m => {
                const r = (m.round || '').toLowerCase();
                return ['finale', 'halbfinale', 'viertelfinale', 'achtelfinale'].some(x => r.includes(x));
            }); break;
            case 'live': list = list.filter(m => m.status === 'live'); break;
        }

        // Sort by kickoff
        list.sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
        return list;
    }, [matches, activeFilter, search]);

    // Group by date
    const grouped = useMemo(() => {
        const groups = {};
        filtered.forEach(m => {
            const d = new Date(m.kickoff_time);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });
        return groups;
    }, [filtered]);

    const sortedDates = Object.keys(grouped).sort();

    const formatDateHeader = (dateStr) => {
        const d = parseISO(dateStr);
        if (isToday(d)) return '📅 Heute';
        if (isTomorrow(d)) return '📅 Morgen';
        return format(d, 'EEEE, d. MMMM yyyy', { locale: de });
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-amber-600/20 via-background to-background border-b border-border/50 px-4 pt-4 pb-0">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">WM 2026</h1>
                            <p className="text-xs text-muted-foreground">
                                {matches.length} Spiele
                                {dataUpdatedAt > 0 && (
                                    <span className="ml-2">· Stand {format(new Date(dataUpdatedAt), 'HH:mm')}</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {permissions.isManager && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditMatch({})}
                                    className="text-xs"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Spiel
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowImporter(true)}
                                    className="text-xs"
                                >
                                    <Upload className="w-3.5 h-3.5 mr-1" />
                                    Import
                                </Button>
                            </>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => queryClient.invalidateQueries(['world-cup-matches'])}
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Team oder Stadion suchen..."
                        className="w-full pl-9 pr-9 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {/* Filter Chips — horizontal scroll */}
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                                activeFilter === f.id
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-secondary/50 text-muted-foreground border-border hover:border-border/80'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4 space-y-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : sortedDates.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">Keine Spiele gefunden</p>
                        {matches.length === 0 && (
                            <div className="mt-4">
                                <p className="text-sm mb-3">Noch keine Spiele importiert.</p>
                                {permissions.isManager && (
                                    <Button onClick={() => setShowImporter(true)} className="bg-amber-600 hover:bg-amber-700">
                                        <Upload className="w-4 h-4 mr-2" />
                                        Spielplan importieren
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    sortedDates.map(dateStr => {
                        const dayMatches = grouped[dateStr];
                        const hasGermany = dayMatches.some(m => m.is_germany_game);
                        return (
                            <div key={dateStr}>
                                {/* Date header */}
                                <div className={`flex items-center gap-2 mb-3 px-1 ${hasGermany ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                                    <div className={`h-px flex-1 ${hasGermany ? 'bg-yellow-500/30' : 'bg-border'}`} />
                                    <span className="text-xs font-bold uppercase tracking-wide shrink-0">
                                        {formatDateHeader(dateStr)}
                                    </span>
                                    <div className={`h-px flex-1 ${hasGermany ? 'bg-yellow-500/30' : 'bg-border'}`} />
                                </div>

                                {/* Match cards */}
                                <div className="space-y-3">
                                    {dayMatches.map(match => (
                                        <div key={match.id} className="relative group">
                                            <MatchCard
                                                match={match}
                                                onClick={setSelectedMatch}
                                            />
                                            {permissions.isManager && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); setEditMatch(match); }}
                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-secondary border border-border hover:bg-accent transition-all"
                                                    title="Bearbeiten"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Match detail sheet */}
            <MatchDetailSheet
                match={selectedMatch}
                open={!!selectedMatch}
                onClose={() => setSelectedMatch(null)}
            />

            {/* Edit / New Match Modal */}
            <MatchEditModal
                match={editMatch?.id ? editMatch : null}
                open={editMatch !== null}
                onClose={() => setEditMatch(null)}
            />

            {/* Import Dialog */}
            <Dialog open={showImporter} onOpenChange={setShowImporter}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            Spielplan importieren
                        </DialogTitle>
                    </DialogHeader>
                    <WorldCupImporter onClose={() => setShowImporter(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}