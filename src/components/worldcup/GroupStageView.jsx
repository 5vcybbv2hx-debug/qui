import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
    'Indonesien': '🇮🇩', 'Paraguay': '🇵🇾', 'Panama': '🇵🇦', 'Honduras': '🇭🇳',
    'Jamaika': '🇯🇲', 'Haiti': '🇭🇹', 'Costa Rica': '🇨🇷', 'El Salvador': '🇸🇻',
    'Kuba': '🇨🇺', 'Curaçao': '🇨🇼', 'Bosnien-Herzegowina': '🇧🇦',
    'Albanien': '🇦🇱', 'Slowenien': '🇸🇮', 'Finnland': '🇫🇮', 'Island': '🇮🇸',
    'Kirgisistan': '🇰🇬',
};

export function getFlag(name) {
    return FLAGS[name] || '🏳️';
}

function calcGroupTable(matches) {
    const table = {};
    matches.forEach(m => {
        if (m.status !== 'beendet') return;
        const h = m.home_team, a = m.away_team;
        const hs = Number(m.home_score ?? 0), as_ = Number(m.away_score ?? 0);
        [h, a].forEach(t => {
            if (!table[t]) table[t] = { team: t, sp: 0, g: 0, u: 0, v: 0, tore: 0, gegen: 0, pts: 0 };
        });
        table[h].sp++; table[a].sp++;
        table[h].tore += hs; table[h].gegen += as_;
        table[a].tore += as_; table[a].gegen += hs;
        if (hs > as_)       { table[h].g++; table[h].pts += 3; table[a].v++; }
        else if (hs < as_)  { table[a].g++; table[a].pts += 3; table[h].v++; }
        else                { table[h].u++; table[h].pts++; table[a].u++; table[a].pts++; }
    });
    return Object.values(table)
        .map((r: any) => ({ ...r, diff: r.tore - r.gegen }))
        .sort((a: any, b: any) => b.pts - a.pts || b.diff - a.diff || b.tore - a.tore);
}

function GroupCard({ groupName, matches }) {
    const letter = groupName.replace('Gruppe ', '');
    const table  = useMemo(() => calcGroupTable(matches), [matches]);

    const allTeams = useMemo(() => {
        const set = new Set<string>();
        matches.forEach(m => { set.add(m.home_team); set.add(m.away_team); });
        return [...set];
    }, [matches]);

    const tableTeamSet = new Set(table.map((r: any) => r.team));
    const fullTable = [
        ...table,
        ...allTeams
            .filter(t => !tableTeamSet.has(t))
            .map(t => ({ team: t, sp: 0, g: 0, u: 0, v: 0, tore: 0, gegen: 0, diff: 0, pts: 0 }))
    ];

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border-b border-border">
                <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-900">{letter}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">Gruppe {letter}</span>
            </div>

            {/* Tabelle */}
            <div className="px-2 py-1.5">
                <div className="grid text-[10px] text-muted-foreground/60 font-medium mb-1 px-1"
                     style={{ gridTemplateColumns: '1fr 18px 18px 18px 18px 22px 24px' }}>
                    <span>Team</span>
                    <span className="text-center">Sp</span>
                    <span className="text-center">S</span>
                    <span className="text-center">U</span>
                    <span className="text-center">N</span>
                    <span className="text-center">TD</span>
                    <span className="text-center font-bold">Pts</span>
                </div>
                {fullTable.map((row: any, i) => (
                    <div key={row.team}
                         className={cn(
                             "grid items-center px-1 py-0.5 rounded text-xs",
                             i === 0 && "border-l-2 border-amber-500 bg-amber-500/8",
                             i === 1 && "border-l-2 border-amber-400/40 bg-amber-500/4",
                         )}
                         style={{ gridTemplateColumns: '1fr 18px 18px 18px 18px 22px 24px' }}>
                        <div className="flex items-center gap-1 min-w-0">
                            <span className="text-sm shrink-0">{getFlag(row.team)}</span>
                            <span className={cn("truncate text-[11px]", i < 2 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                                {row.team}
                            </span>
                        </div>
                        <span className="text-center text-muted-foreground text-[10px]">{row.sp}</span>
                        <span className="text-center text-muted-foreground text-[10px]">{row.g}</span>
                        <span className="text-center text-muted-foreground text-[10px]">{row.u}</span>
                        <span className="text-center text-muted-foreground text-[10px]">{row.v}</span>
                        <span className="text-center text-muted-foreground text-[10px]">{row.diff > 0 ? `+${row.diff}` : row.diff}</span>
                        <span className={cn("text-center font-bold text-[11px]", i < 2 ? "text-amber-400" : "text-muted-foreground")}>
                            {row.pts}
                        </span>
                    </div>
                ))}
            </div>

            {/* Spiele */}
            <div className="border-t border-border/40 px-2 py-1.5 space-y-0.5">
                {matches
                    .sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime())
                    .map(m => {
                        const done = m.status === 'beendet';
                        const live = m.status === 'live';
                        const kickoff = new Date(m.kickoff_time);
                        return (
                            <div key={m.id} className={cn(
                                "flex items-center gap-1 text-[10px] rounded px-1 py-0.5",
                                live && "bg-red-500/10",
                                done && "opacity-55",
                            )}>
                                <span className="text-muted-foreground/60 shrink-0 w-9 text-[9px]">
                                    {live ? '🔴' : done ? '✓' : format(kickoff, 'dd.MM.')}
                                </span>
                                <span className={cn("flex-1 truncate", m.is_germany_game && "text-amber-400 font-semibold")}>
                                    {getFlag(m.home_team)} {m.home_team}
                                </span>
                                <span className="font-mono font-bold text-foreground shrink-0 w-8 text-center text-[10px]">
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

// ── Haupt-Export: NUR echte Buchstabengruppen A–L ─────────────────────────
const VALID_GROUPS = new Set(['Gruppe A','Gruppe B','Gruppe C','Gruppe D','Gruppe E','Gruppe F',
    'Gruppe G','Gruppe H','Gruppe I','Gruppe J','Gruppe K','Gruppe L']);

export default function GroupStageView({ matches }) {
    const groups = useMemo(() => {
        const map: Record<string, any[]> = {};
        matches
            .filter(m => VALID_GROUPS.has(m.group_name))   // ← nur echte Gruppen!
            .forEach(m => {
                if (!map[m.group_name]) map[m.group_name] = [];
                map[m.group_name].push(m);
            });
        // Sortierung: Gruppe A, B, C … L
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [matches]);

    if (!groups.length) return (
        <div className="text-center py-16 text-muted-foreground">Keine Gruppenspiele gefunden</div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map(([name, ms]) => (
                <GroupCard key={name} groupName={name} matches={ms} />
            ))}
        </div>
    );
}
