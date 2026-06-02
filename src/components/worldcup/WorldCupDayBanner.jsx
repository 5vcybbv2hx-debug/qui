import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trophy } from 'lucide-react';
import { getMatchesForDate, getTrafficDot } from './useWorldCupMatches';
import MatchCard from './MatchCard';
import MatchDetailSheet from './MatchDetailSheet';

/**
 * Zeigt WM-Spiele für einen bestimmten Tag als kompakten Banner.
 * Wird im Schichtkalender-Tagesdetail und im Teamkalender eingebettet.
 */
export default function WorldCupDayBanner({ matches, dateStr }) {
    const [selectedMatch, setSelectedMatch] = useState(null);

    const dayMatches = getMatchesForDate(matches, dateStr);
    if (dayMatches.length === 0) return null;

    const hasGermany = dayMatches.some(m => m.is_germany_game);

    return (
        <>
            <div className={`rounded-xl border p-3 mb-3 ${
                hasGermany
                    ? 'bg-gradient-to-r from-yellow-500/10 to-red-500/5 border-yellow-500/40'
                    : 'bg-secondary/30 border-border'
            }`}>
                <div className="flex items-center gap-2 mb-2">
                    <Trophy className={`w-4 h-4 ${hasGermany ? 'text-yellow-400' : 'text-amber-500'}`} />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        WM 2026 – {dayMatches.length} {dayMatches.length === 1 ? 'Spiel' : 'Spiele'}
                    </span>
                </div>
                <div className="space-y-1.5">
                    {dayMatches.map(match => (
                        <MatchCard key={match.id} match={match} onClick={setSelectedMatch} compact />
                    ))}
                </div>
            </div>

            <MatchDetailSheet
                match={selectedMatch}
                open={!!selectedMatch}
                onClose={() => setSelectedMatch(null)}
            />
        </>
    );
}