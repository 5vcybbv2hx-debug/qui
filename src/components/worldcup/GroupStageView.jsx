import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ── Flaggen-Emojis ────────────────────────────────────────────────────────────
const FLAGS = {
    'Deutschland': '🇩🇪', 'Frankreich': '🇫🇷', 'Spanien': '🇪🇸', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Portugal': '🇵🇹', 'Belgien': '🇧🇪', 'Niederlande': '🇳🇱', 'Italien': '🇮🇹',
    'Argentinien': '🇦🇷', 'Brasilien': '🇧🇷', 'Mexiko': '🇲🇽', 'USA': '🇺🇸',
    'Kanada': '🇨🇦', 'Japan': '🇯🇵', 'Südkorea': '🇰🇷', 'Marokko': '🇲🇦',
    'Senegal': '🇸🇳', 'Schweiz': '🇨🇭', 'Kroatien': '🇭🇷', 'Uruguay': '🇺🇾',
    'Kolumbien': '🇨🇴', 'Ecuador': '🇪🇨', 'Saudi-Arabien': '🇸🇦', 'Iran': '🇮🇷',
    'Australien': '🇦🇺', 'Dänemark': '🇩🇰', 'Österreich': '🇦🇹', 'Schweden': '🇸🇪',
    'Norwegen': '🇳🇴', 'Türkei': '🇹🇷', 'Tschechien': '🇨🇿', 'Schottland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'Polen': '🇵🇱', 'Serbien': '🇷🇸', 'Ukraine': '🇺🇦', 'Ungarn': '🇭🇺',
    'Rumänien': '🇷🇴', 'Slowakei': '🇸🇰', 'Griechenland': '🇬🇷', 'Georgien': '🇬🇪',
    'Südafrika': '🇿🇦', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭', 'Elfenbeinküste': '🇨🇮',
    'Ägypten': '🇪🇬', 'Algerien': '🇩🇿', 'Tunesien': '🇹🇳', 'Kamerun': '🇨🇲',
    'Mali': '🇲🇱', 'Kap Verde': '🇨🇻', 'DR Kongo': '🇨🇩', 'Neuseeland': '🇳🇿',
    'Katar': '🇶🇦', 'Irak': '🇮🇶', 'Jordanien': '🇯🇴', 'Usbekistan': '🇺🇿',
    'Indonesien': '🇮🇩', 'Paraguay': '🇵🇾', 'Bolivien': '🇧🇴', 'Venezuela': '🇻🇪',
    'Panama': '🇵🇦', 'Honduras': '🇭🇳', 'Jamaika': '🇯🇲', 'Haiti': '🇭🇹',
    'Costa Rica': '🇨🇷', 'El Salvador': '🇸🇻', 'Kuba': '🇨🇺', 'Curaçao': '🇨🇼',
    'Bosnien-Herzegowina': '🇧🇦', 'Albanien': '🇦🇱', 'Slowenien': '🇸🇮',
    'Finnland': '🇫🇮', 'Island': '🇮🇸', 'Aserbaidschan': '🇦🇿',
    'Kasachstan': '🇰🇿', 'Kirgisistan': '🇰🇬',
};

export function getFlag(name) {
    return FLAGS[name] || '🏳️';
}

// ── Gruppentabellen berechnen ─────────────────────────────────────────────────
function calcGroupTable(matches) {
    const table = {};
    matches.forEach(m => {
        if (m.status !== 'beendet') return;
        const h = m.home_team, a = m.away_team;
        const hs = Number(m.home_score ?? 0), as = Number(m.away_score ?? 0);
        [h, a].forEach(t => { if (!table[t]) table[t] = { team: t, sp: 0, g: 0, u: 0, v: 0, tore: 0, gegen: 0, diff: 0, pts: 0 }; });
        table[h].sp++; table[a].sp++;
        table[h].tore += hs; table[h].gegen += as;
        table[a].tore += as; table[a].gegen += hs;
        if (hs > as) { table[h].g++; table[h].pts += 3; table[a].v++; }
        else if (hs < as) { table[a].g++; table[a].pts += 3; table[h].v++; }
        else { table[h].u++; table[h].pts++; table[a].u++; table[a].pts++; }
    });
    return Object.values(table)
        .map(r => ({ ...r, diff: r.tore - r.gegen }))
        .sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.tore - a.tore);
}

// ── Einzelne Gruppe ───────────────────────────────────────────────────────────
function GroupCard({ groupName, matches }) {
    const letter = groupName.replace('Gruppe ', '');
    const table  = useMemo(() => calcGroupTable(matches), [matches]);

    // Alle Teams aus Matches sammeln (auch noch nicht gespielte)
    const allTeams = useMemo(() => {
        const set = new Set();
        matches.forEach(m => { set.add(m.home_team); set.add(m.away_team); });
        return [...set];
    }, [matches]);

    // Teams die noch nicht in der Tabelle sind (kein Spiel beendet)
    const tableTeams = new Set(table.map(r => r.team));
    const missingTeams = allTeams.filter(t => !tableTeams.has(t));
    const fullTable = [
        ...table,
        ...missingTeams.map(t => ({ team: t, sp: 0, g: 0, u: 0, v: 0, tore: 0, gegen: 0, diff: 0, pts: 0 }))
    ];

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border-b border-border">
                <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-900">{letter}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">Gruppe {letter}</span>
            </div>

            {/* Tabelle */}
            <div className="px-2 py-1.5">
                <div className="grid text-[10px] text-muted-foreground font-medium mb-1 px-1" style={{gridTemplateColumns: '1fr 20px 20px 20px 20px 20px 24px'}}>
                    <span>Team</span>
                    <span className="text-center">Sp</span>
                    <span className="text-center">S</span>
                    <span className="text-center">U</span>
                    <span className="text-center">N</span>
                    <span className="text-center">TD</span>
                    <span className="text-center font-bold">Pts</span>
                </div>
                {fullTable.map((row, i) => (
                    <div key={row.team} className={cn(
                        "grid items-center px-1 py-1 rounded text-xs",
                        i < 2 && "bg-amber-500/8",
                        i === 0 && "border-l-2 border-amber-500",
                        i === 1 && "border-l-2 border-amber-400/50",
                    )} style={{gridTemplateColumns: '1fr 20px 20px 20px 20px 20px 24px'}}>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm shrink-0">{getFlag(row.team)}</span>
                            <span className={cn("truncate text-[11px]", i < 2 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                                {row.team}
                            </span>
                        </div>
                        <span className="text-center text-muted-foreground">{row.sp}</span>
                        <span className="text-center text-muted-foreground">{row.g}</span>
                        <span className="text-center text-muted-foreground">{row.u}</span>
                        <span className="text-center text-muted-foreground">{row.v}</span>
                        <span className="text-center text-muted-foreground">{row.diff > 0 ? `+${row.diff}` : row.diff}</span>
                        <span className={cn("text-center font-bold", i < 2 ? "text-amber-400" : "text-muted-foreground")}>{row.pts}</span>
                    </div>
                ))}
            </div>

            {/* Spiele */}
            <div className="border-t border-border/50 px-2 py-1.5 space-y-1">
                {matches.map(m => {
                    const done = m.status === 'beendet';
                    const live = m.status === 'live';
                    const kickoff = new Date(m.kickoff_time);
                    return (
                        <div key={m.id} className={cn(
                            "flex items-center gap-1 text-[10px] rounded px-1 py-0.5",
                            live && "bg-red-500/10",
                            done && "opacity-60",
                        )}>
                            <span className="text-muted-foreground shrink-0 w-9">
                                {live ? '🔴' : done ? '✓' : format(kickoff, 'dd.MM.')}
                            </span>
                            <span className={cn("flex-1 truncate", m.is_germany_game && "text-amber-400 font-semibold")}>
                                {getFlag(m.home_team)} {m.home_team}
                            </span>
                            <span className="font-mono font-bold text-foreground shrink-0 w-8 text-center">
                                {done || live ? `${m.home_score}:${m.away_score}` : '-:-'}
                            </span>
                            <span className={cn("flex-1 truncate text-right", m.is_germany_game && "text-amber-400 font-semibold")}>
                                {m.away_team} {getFlag(m.away_team)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Haupt-Export ──────────────────────────────────────────────────────────────
export default function GroupStageView({ matches }) {
    const groups = useMemo(() => {
        const map = {};
        matches
            .filter(m => m.round === 'Gruppenphase' || !m.round || m.group_name)
            .forEach(m => {
                const g = m.group_name || 'Gruppe ?';
                if (!map[g]) map[g] = [];
                map[g].push(m);
            });
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [matches]);

    if (!groups.length) return (
        <div className="text-center py-16 text-muted-foreground">Keine Gruppenspiele gefunden</div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {groups.map(([name, ms]) => (
                <GroupCard key={name} groupName={name} matches={ms} />
            ))}
        </div>
    );
}
