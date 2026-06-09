import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trophy, Search, RefreshCw, Plus, Upload, Layers, GitBranch, List, SyncIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWorldCupMatches, getTrafficColor, getTrafficLabel, getTrafficDot } from '@/components/worldcup/useWorldCupMatches';
import MatchCard from '@/components/worldcup/MatchCard';
import MatchDetailSheet from '@/components/worldcup/MatchDetailSheet';
import MatchEditModal from '@/components/worldcup/MatchEditModal';
import WorldCupImporter from '@/components/worldcup/WorldCupImporter';
import GroupStageView from '@/components/worldcup/GroupStageView';
import BracketView from '@/components/worldcup/BracketView';
import { usePermissions } from '@/components/auth/usePermissions';
import { toast } from 'sonner';

const FILTERS = [
    { id: 'all',      label: 'Alle' },
    { id: 'germany',  label: '🇩🇪 DE' },
    { id: 'today',    label: '📅 Heute' },
    { id: 'tomorrow', label: '📅 Morgen' },
    { id: 'top',      label: '⭐ Top' },
    { id: 'knockout', label: '🏆 K.o.' },
    { id: 'live',     label: '🔴 Live' },
];

export default function WorldCupSchedule() {
    const permissions  = usePermissions();
    const queryClient  = useQueryClient();
    const { data: matches = [], isLoading, dataUpdatedAt } = useWorldCupMatches();
    const [activeFilter, setActiveFilter] = useState('all');
    const [search,       setSearch]       = useState('');
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showImporter,  setShowImporter]  = useState(false);
    const [editMatch,     setEditMatch]     = useState(null);
    const [syncing,       setSyncing]       = useState(false);

    // ── Sync-Handler ────────────────────────────────────────────────────────
    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await base44.functions.invoke('syncWorldCup', { automation: true });
            const d = res?.data || res;
            toast.success(`Sync erfolgreich — ${d.created || 0} neu, ${d.updated || 0} aktualisiert`);
            queryClient.invalidateQueries({ queryKey: ['world-cup-matches'] });
        } catch (err) {
            toast.error('Sync fehlgeschlagen: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    // ── Gefilterte Spiele (für Listen-Tab) ───────────────────────────────────
    const filtered = useMemo(() => {
        let list = [...matches];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(m =>
                m.home_team?.toLowerCase().includes(q) ||
                m.away_team?.toLowerCase().includes(q) ||
                m.venue?.toLowerCase().includes(q)
            );
        }
        switch (activeFilter) {
            case 'germany':  list = list.filter(m => m.is_germany_game); break;
            case 'today':    list = list.filter(m => isToday(new Date(m.kickoff_time))); break;
            case 'tomorrow': list = list.filter(m => isTomorrow(new Date(m.kickoff_time))); break;
            case 'top':      list = list.filter(m => m.is_top_game || m.is_germany_game); break;
            case 'knockout': list = list.filter(m => {
                const r = (m.round || '').toLowerCase();
                return ['finale', 'halbfinale', 'viertelfinale', 'achtelfinale'].some(x => r.includes(x));
            }); break;
            case 'live':     list = list.filter(m => m.status === 'live'); break;
        }
        return list.sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
    }, [matches, activeFilter, search]);

    const grouped = useMemo(() => {
        const groups = {};
        filtered.forEach(m => {
            const d = new Date(m.kickoff_time);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });
        return groups;
    }, [filtered]);

    const sortedDates = Object.keys(grouped).sort();

    const liveCount  = matches.filter(m => m.status === 'live').length;
    const doneCount  = matches.filter(m => m.status === 'beendet').length;

    const formatDateHeader = (dateStr) => {
        const d = parseISO(dateStr);
        if (isToday(d))    return '📅 Heute';
        if (isTomorrow(d)) return '📅 Morgen';
        return format(d, 'EEEE, d. MMMM yyyy', { locale: de });
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-amber-600/20 via-background to-background border-b border-border/50 px-4 pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">WM 2026 ⚽</h1>
                            <p className="text-xs text-muted-foreground">
                                {matches.length} Spiele
                                {liveCount > 0 && <span className="ml-2 text-red-400 font-semibold animate-pulse">● {liveCount} LIVE</span>}
                                {doneCount > 0 && <span className="ml-2">· {doneCount} beendet</span>}
                                {dataUpdatedAt > 0 && <span className="ml-2">· {format(new Date(dataUpdatedAt), 'HH:mm')}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {permissions.isManager && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSync}
                                    disabled={syncing}
                                    className="text-xs"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                                    Sync
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditMatch({})}
                                    className="text-xs"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Spiel
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 pt-4 pb-24 md:pb-6">
                <Tabs defaultValue="groups" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="groups" className="text-xs gap-1.5">
                            <Layers className="w-3.5 h-3.5" /> Gruppen
                        </TabsTrigger>
                        <TabsTrigger value="bracket" className="text-xs gap-1.5">
                            <GitBranch className="w-3.5 h-3.5" /> K.o.-Bracket
                        </TabsTrigger>
                        <TabsTrigger value="list" className="text-xs gap-1.5">
                            <List className="w-3.5 h-3.5" /> Spielplan
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Gruppenphase ── */}
                    <TabsContent value="groups">
                        <GroupStageView matches={matches} />
                    </TabsContent>

                    {/* ── K.o.-Bracket ── */}
                    <TabsContent value="bracket">
                        <BracketView matches={matches} />
                    </TabsContent>

                    {/* ── Spielplan (Liste) ── */}
                    <TabsContent value="list" className="space-y-3">
                        {/* Suche */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Team oder Stadion suchen…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-amber-500/50 transition-colors"
                            />
                        </div>

                        {/* Filter-Pills */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {FILTERS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveFilter(f.id)}
                                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                        activeFilter === f.id
                                            ? 'bg-amber-500 text-slate-900 border-amber-500'
                                            : 'bg-secondary border-border text-muted-foreground'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Spiele */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : sortedDates.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">Keine Spiele gefunden</div>
                        ) : (
                            <div className="space-y-5">
                                {sortedDates.map(dateStr => (
                                    <div key={dateStr}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <h2 className="text-sm font-bold text-foreground capitalize">
                                                {formatDateHeader(dateStr)}
                                            </h2>
                                            <div className="flex-1 h-px bg-border/40" />
                                            <span className="text-xs text-muted-foreground">{grouped[dateStr].length} Spiele</span>
                                        </div>
                                        <div className="space-y-2">
                                            {grouped[dateStr].map(match => (
                                                <MatchCard
                                                    key={match.id}
                                                    match={match}
                                                    onClick={setSelectedMatch}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Detail Sheet */}
            <MatchDetailSheet
                match={selectedMatch}
                open={!!selectedMatch}
                onClose={() => setSelectedMatch(null)}
            />

            {/* Edit Modal */}
            {editMatch !== null && (
                <MatchEditModal
                    match={editMatch}
                    onClose={() => setEditMatch(null)}
                    onSave={() => {
                        setEditMatch(null);
                        queryClient.invalidateQueries({ queryKey: ['world-cup-matches'] });
                    }}
                />
            )}

            {/* Importer */}
            <Dialog open={showImporter} onOpenChange={setShowImporter}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Spiele importieren</DialogTitle>
                    </DialogHeader>
                    <WorldCupImporter onDone={() => {
                        setShowImporter(false);
                        queryClient.invalidateQueries({ queryKey: ['world-cup-matches'] });
                    }} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
