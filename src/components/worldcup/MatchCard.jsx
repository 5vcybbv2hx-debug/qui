import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getTrafficColor, getTrafficLabel, getTrafficDot } from './useWorldCupMatches';

export default function MatchCard({ match, onClick, compact = false }) {
    const kickoff = new Date(match.kickoff_time);
    const time = format(kickoff, 'HH:mm');
    const traffic = match.expected_bar_traffic || 'normal';
    const isGermany = match.is_germany_game;
    const isTop = match.is_top_game;

    if (compact) {
        return (
            <button
                onClick={() => onClick?.(match)}
                className={`w-full text-left rounded-lg border p-2.5 transition-all active:scale-[0.98] ${
                    isGermany
                        ? 'bg-gradient-to-r from-yellow-500/10 via-red-500/10 to-yellow-500/5 border-yellow-500/40'
                        : 'bg-secondary/50 border-border hover:border-border/80'
                }`}
            >
                <div className="flex items-center gap-2">
                    {isGermany && (
                        <span className="text-[9px] font-bold bg-yellow-500 text-black px-1.5 py-0.5 rounded shrink-0">
                            🇩🇪 DE
                        </span>
                    )}
                    <span className="font-mono text-xs font-bold text-primary shrink-0">{time}</span>
                    <span className="text-xs font-medium truncate">
                        {match.home_team} – {match.away_team}
                    </span>
                    <span className="ml-auto text-sm shrink-0">{getTrafficDot(traffic)}</span>
                </div>
                {match.staff_recommendation && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 pl-0 truncate">
                        {match.staff_recommendation}
                    </p>
                )}
            </button>
        );
    }

    return (
        <button
            onClick={() => onClick?.(match)}
            className={`w-full text-left rounded-xl border p-4 transition-all active:scale-[0.98] ${
                isGermany
                    ? 'bg-gradient-to-br from-yellow-500/15 via-red-500/10 to-black/20 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                    : isTop
                        ? 'bg-secondary/70 border-amber-500/30'
                        : 'bg-secondary/40 border-border'
            }`}
        >
            {/* Badges */}
            <div className="flex items-center gap-2 mb-2">
                {isGermany && (
                    <span className="text-xs font-bold bg-yellow-500 text-black px-2 py-0.5 rounded-full">
                        🇩🇪 DEUTSCHLAND
                    </span>
                )}
                {isTop && !isGermany && (
                    <span className="text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        ⭐ TOPPSPIEL
                    </span>
                )}
                <span className="text-xs text-muted-foreground">{match.round}</span>
                <span className={`ml-auto text-xs border rounded-full px-2 py-0.5 ${getTrafficColor(traffic)}`}>
                    {getTrafficDot(traffic)} {getTrafficLabel(traffic)}
                </span>
            </div>

            {/* Teams + Score */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                    <p className="font-bold text-base leading-tight">{match.home_team}</p>
                    <p className="text-xs text-muted-foreground">Heimteam</p>
                </div>
                <div className="text-center shrink-0">
                    {match.status === 'beendet' || match.status === 'live' ? (
                        <div className="font-mono font-bold text-xl">
                            {match.home_score ?? 0} : {match.away_score ?? 0}
                        </div>
                    ) : (
                        <div className="font-mono font-bold text-lg text-primary">{format(kickoff, 'HH:mm')}</div>
                    )}
                    <div className={`text-[10px] font-medium mt-0.5 ${
                        match.status === 'live' ? 'text-red-400 animate-pulse' :
                        match.status === 'beendet' ? 'text-muted-foreground' : 'text-muted-foreground'
                    }`}>
                        {match.status === 'live' ? '● LIVE' :
                         match.status === 'beendet' ? 'Beendet' :
                         match.status === 'verschoben' ? 'Verschoben' : 'Geplant'}
                    </div>
                </div>
                <div className="flex-1 text-right">
                    <p className="font-bold text-base leading-tight">{match.away_team}</p>
                    <p className="text-xs text-muted-foreground">Auswärts</p>
                </div>
            </div>

            {/* Staff recommendation */}
            {match.staff_recommendation && (
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                    <span className="text-sm">👥</span>
                    <p className="text-xs text-muted-foreground">{match.staff_recommendation}</p>
                </div>
            )}
        </button>
    );
}