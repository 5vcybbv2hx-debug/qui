import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

async function fetchAllMatches() {
    const allMatches = [];
    let skip = 0;
    const limit = 50;
    while (true) {
        const batch = await base44.entities.WorldCupMatch.list('kickoff_time', limit, skip);
        if (!Array.isArray(batch) || batch.length === 0) break;
        allMatches.push(...batch);
        if (batch.length < limit) break;
        skip += limit;
    }
    return allMatches;
}

export function useWorldCupMatches() {
    return useQuery({
        queryKey: ['world-cup-matches'],
        queryFn: fetchAllMatches,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Berechnet Wichtigkeit, erwarteten Andrang und Personalempfehlung für ein Spiel.
 */
export function calculateMatchImportance(match) {
    const kickoff = new Date(match.kickoff_time);
    const hour = kickoff.getHours();
    const dayOfWeek = kickoff.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isEvening = hour >= 17;
    const round = (match.round || '').toLowerCase();

    const isKnockout = ['finale', 'halbfinale', 'viertelfinale', 'achtelfinale'].some(r => round.includes(r));
    const isFinal = round.includes('finale') && !round.includes('halb') && !round.includes('viertel') && !round.includes('achtel');
    const isSemiFinal = round.includes('halbfinale');
    const isQuarterFinal = round.includes('viertelfinale');

    let importance = 'low';
    let traffic = 'normal';
    let staffExtra = 0;

    if (match.is_germany_game) {
        importance = 'very_high'; traffic = 'extreme'; staffExtra = isEvening ? 4 : 3;
    } else if (isFinal) {
        importance = 'very_high'; traffic = 'extreme'; staffExtra = 5;
    } else if (isSemiFinal) {
        importance = 'very_high'; traffic = 'very_busy'; staffExtra = 3;
    } else if (isQuarterFinal) {
        importance = 'high'; traffic = 'very_busy'; staffExtra = 2;
    } else if (isKnockout) {
        importance = 'high'; traffic = 'busy'; staffExtra = 2;
    } else if (match.is_top_game) {
        importance = 'high'; traffic = isEvening ? 'very_busy' : 'busy'; staffExtra = isEvening ? 2 : 1;
    } else if (isEvening && isWeekend) {
        importance = 'high'; traffic = 'busy'; staffExtra = 1;
    } else if (isEvening) {
        importance = 'medium'; traffic = 'busy'; staffExtra = 1;
    } else if (isWeekend) {
        importance = 'medium'; traffic = 'normal'; staffExtra = 0;
    }

    const staffRec = staffExtra > 0 ? `+${staffExtra} Mitarbeiter empfohlen` : 'Normale Besetzung';
    return { importance, traffic, staff_recommendation: staffRec };
}

export function getTrafficColor(traffic) {
    switch (traffic) {
        case 'extreme':   return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'very_busy': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        case 'busy':      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        default:          return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
}

export function getTrafficLabel(traffic) {
    switch (traffic) {
        case 'extreme':   return 'Extrem voll';
        case 'very_busy': return 'Sehr voll';
        case 'busy':      return 'Erhöhter Andrang';
        default:          return 'Normal';
    }
}

export function getTrafficDot(traffic) {
    switch (traffic) {
        case 'extreme':   return '🔴';
        case 'very_busy': return '🟠';
        case 'busy':      return '🟡';
        default:          return '🟢';
    }
}

export function getMatchesForDate(matches, dateStr) {
    return matches.filter(m => {
        const d = new Date(m.kickoff_time);
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${y}-${mo}-${da}` === dateStr;
    });
}
