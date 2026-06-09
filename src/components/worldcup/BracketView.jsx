import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getFlag } from './GroupStageView';

// ── Match-Box im Bracket ──────────────────────────────────────────────────────
function BracketMatch({ match, label, compact = false }) {
    if (!match) {
        return (
            <div className={cn(
                "rounded-lg border border-dashed border-border/40 bg-background/30",
                compact ? "p-1.5" : "p-2"
            )}>
                {label && <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-1">{label}</p>}
                <div className="space-y-1">
                    <div className="h-5 rounded bg-secondary/30 w-full" />
                    <div className="flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground/40 font-mono">-:-</span>
                    </div>
                    <div className="h-5 rounded bg-secondary/30 w-full" />
                </div>
            </div>
        );
    }

    const done = match.status === 'beendet';
    const live = match.status === 'live';
    const homeWins = done && Number(match.home_score) > Number(match.away_score);
    const awayWins = done && Number(match.away_score) > Number(match.home_score);

    return (
        <div className={cn(
            "rounded-lg border bg-card overflow-hidden",
            live ? "border-red-500/50 shadow-sm shadow-red-500/20" : "border-border",
            compact ? "" : ""
        )}>
            {label && (
                <div className="px-2 py-0.5 bg-secondary/50 border-b border-border/50">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
                    {live && <span className="ml-1 text-[9px] text-red-400 font-bold animate-pulse">● LIVE</span>}
                </div>
            )}
            {/* Home */}
            <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 border-b border-border/30",
                homeWins && "bg-amber-500/10",
                compact ? "py-0.5" : "py-1"
            )}>
                <span className="text-sm shrink-0">{getFlag(match.home_team)}</span>
                <span className={cn(
                    "flex-1 text-xs truncate",
                    homeWins ? "font-bold text-foreground" : "text-muted-foreground"
                )}>
                    {match.home_team || '?'}
                </span>
                <span className={cn(
                    "font-mono text-xs font-bold shrink-0",
                    homeWins ? "text-amber-400" : done ? "text-muted-foreground" : "text-muted-foreground/40"
                )}>
                    {done || live ? (match.home_score ?? 0) : '-'}
                </span>
            </div>
            {/* Away */}
            <div className={cn(
                "flex items-center gap-1.5 px-2",
                awayWins && "bg-amber-500/10",
                compact ? "py-0.5" : "py-1"
            )}>
                <span className="text-sm shrink-0">{getFlag(match.away_team)}</span>
                <span className={cn(
                    "flex-1 text-xs truncate",
                    awayWins ? "font-bold text-foreground" : "text-muted-foreground"
                )}>
                    {match.away_team || '?'}
                </span>
                <span className={cn(
                    "font-mono text-xs font-bold shrink-0",
                    awayWins ? "text-amber-400" : done ? "text-muted-foreground" : "text-muted-foreground/40"
                )}>
                    {done || live ? (match.away_score ?? 0) : '-'}
                </span>
            </div>
        </div>
    );
}

// ── Runden-Spalte ─────────────────────────────────────────────────────────────
function RoundColumn({ title, matches, placeholders, compact }) {
    const items = matches.length > 0 ? matches : Array(placeholders).fill(null);
    return (
        <div className="flex flex-col gap-2 min-w-0">
            <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                    {title}
                </span>
            </div>
            <div className="flex flex-col justify-around flex-1 gap-2">
                {items.map((m, i) => (
                    <BracketMatch key={m?.id || i} match={m} compact={compact} />
                ))}
            </div>
        </div>
    );
}

// ── Haupt-Export ──────────────────────────────────────────────────────────────
export default function BracketView({ matches }) {
    const rounds = useMemo(() => {
        const r32   = matches.filter(m => m.round === 'Achtelfinale').sort((a,b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
        const qf    = matches.filter(m => m.round === 'Viertelfinale').sort((a,b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
        const sf    = matches.filter(m => m.round === 'Halbfinale').sort((a,b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
        const p3    = matches.filter(m => m.round === 'Spiel um Platz 3');
        const final = matches.filter(m => m.round === 'Finale');
        return { r32, qf, sf, p3, final };
    }, [matches]);

    return (
        <div className="space-y-4">
            {/* Mobile: Stack */}
            <div className="block md:hidden space-y-4">
                {[
                    { title: 'Achtelfinale (16)', items: rounds.r32, ph: 16 },
                    { title: 'Viertelfinale', items: rounds.qf, ph: 8 },
                    { title: 'Halbfinale', items: rounds.sf, ph: 4 },
                    { title: 'Spiel um Platz 3', items: rounds.p3, ph: 1 },
                    { title: '🏆 Finale', items: rounds.final, ph: 1 },
                ].map(({ title, items, ph }) => (
                    <div key={title}>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">{title}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {(items.length > 0 ? items : Array(ph).fill(null)).map((m, i) => (
                                <BracketMatch key={m?.id || i} match={m} compact />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop: Horizontaler Bracket */}
            <div className="hidden md:block overflow-x-auto pb-4">
                <div className="flex gap-3 min-w-max items-stretch">
                    <RoundColumn title="Achtelfinale" matches={rounds.r32} placeholders={16} compact={true} />
                    <div className="w-px bg-border/30 self-stretch mx-1" />
                    <RoundColumn title="Viertelfinale" matches={rounds.qf} placeholders={8} compact={false} />
                    <div className="w-px bg-border/30 self-stretch mx-1" />
                    <RoundColumn title="Halbfinale" matches={rounds.sf} placeholders={4} compact={false} />
                    <div className="w-px bg-border/30 self-stretch mx-1" />
                    <div className="flex flex-col gap-2 min-w-[160px]">
                        <div className="text-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                                Final
                            </span>
                        </div>
                        <div className="space-y-2 flex-1 flex flex-col justify-around">
                            {rounds.p3.length > 0
                                ? <BracketMatch match={rounds.p3[0]} label="Platz 3" />
                                : <BracketMatch match={null} label="Platz 3" />}
                            {rounds.final.length > 0
                                ? <BracketMatch match={rounds.final[0]} label="🏆 Finale" />
                                : <BracketMatch match={null} label="🏆 Finale" />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Info wenn KO-Runde noch nicht gestartet */}
            {rounds.r32.length === 0 && (
                <div className="text-center py-8 text-muted-foreground/50 text-sm">
                    <p className="text-2xl mb-2">⏳</p>
                    <p>Die K.o.-Runde startet nach der Gruppenphase</p>
                    <p className="text-xs mt-1">ab 28. Juni 2026</p>
                </div>
            )}
        </div>
    );
}
