import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Mapping: externe Teamnamen → deutsche Namen ───────────────────────────────
const TEAM_MAP: Record<string, string> = {
    'Germany': 'Deutschland', 'France': 'Frankreich', 'Spain': 'Spanien',
    'Italy': 'Italien', 'England': 'England', 'Netherlands': 'Niederlande',
    'Portugal': 'Portugal', 'Belgium': 'Belgien', 'Argentina': 'Argentinien',
    'Brazil': 'Brasilien', 'Mexico': 'Mexiko', 'United States': 'USA',
    'Canada': 'Kanada', 'Japan': 'Japan', 'South Korea': 'Südkorea',
    'Morocco': 'Marokko', 'Senegal': 'Senegal', 'Switzerland': 'Schweiz',
    'Croatia': 'Kroatien', 'Uruguay': 'Uruguay', 'Colombia': 'Kolumbien',
    'Ecuador': 'Ecuador', 'Peru': 'Peru', 'Chile': 'Chile',
    'Saudi Arabia': 'Saudi-Arabien', 'Iran': 'Iran', 'Australia': 'Australien',
    'Serbia': 'Serbien', 'Poland': 'Polen', 'Denmark': 'Dänemark',
    'Austria': 'Österreich', 'Sweden': 'Schweden', 'Norway': 'Norwegen',
    'Turkey': 'Türkei', 'Ukraine': 'Ukraine', 'Czech Republic': 'Tschechien',
    'Hungary': 'Ungarn', 'Slovakia': 'Slowakei', 'Scotland': 'Schottland',
    'Wales': 'Wales', 'Greece': 'Griechenland', 'Romania': 'Rumänien',
    'South Africa': 'Südafrika', 'Nigeria': 'Nigeria', 'Ghana': 'Ghana',
    'Ivory Coast': 'Elfenbeinküste', "Côte d'Ivoire": 'Elfenbeinküste',
    'Egypt': 'Ägypten', 'Algeria': 'Algerien', 'Tunisia': 'Tunesien',
    'Cameroon': 'Kamerun', 'Mali': 'Mali', 'Cape Verde': 'Kap Verde',
    'DR Congo': 'DR Kongo', 'Democratic Republic of the Congo': 'DR Kongo',
    'New Zealand': 'Neuseeland', 'Qatar': 'Katar', 'Iraq': 'Irak',
    'Jordan': 'Jordanien', 'Uzbekistan': 'Usbekistan', 'Indonesia': 'Indonesien',
    'Paraguay': 'Paraguay', 'Bolivia': 'Bolivien', 'Venezuela': 'Venezuela',
    'Panama': 'Panama', 'Honduras': 'Honduras', 'Jamaica': 'Jamaika',
    'Haiti': 'Haiti', 'Costa Rica': 'Costa Rica', 'El Salvador': 'El Salvador',
    'Cuba': 'Kuba', 'Curaçao': 'Curaçao', 'Bosnia and Herzegovina': 'Bosnien-Herzegowina',
    'Albania': 'Albanien', 'Slovenia': 'Slowenien', 'Finland': 'Finnland',
    'Iceland': 'Island', 'Georgia': 'Georgien', 'Azerbaijan': 'Aserbaidschan',
    'Kazakhstan': 'Kasachstan', 'Bahrain': 'Bahrain', 'Oman': 'Oman',
    'Kuwait': 'Kuwait', 'United Arab Emirates': 'Vereinigte Arabische Emirate',
    'Angola': 'Angola', 'Zambia': 'Sambia', 'Tanzania': 'Tansania',
    'Guinea': 'Guinea', 'Benin': 'Benin', 'Mozambique': 'Mosambik',
    'Congo': 'Kongo', 'Guatemala': 'Guatemala', 'Trinidad and Tobago': 'Trinidad und Tobago',
    'Colombia': 'Kolumbien', 'Kyrgyzstan': 'Kirgisistan',
};

const ROUND_MAP: Record<string, string> = {
    'group': 'Gruppenphase',
    'round_of_32': 'Achtelfinale',
    'round_of_16': 'Achtelfinale',
    'quarter_final': 'Viertelfinale',
    'semi_final': 'Halbfinale',
    'third_place': 'Spiel um Platz 3',
    'final': 'Finale',
};

function toGerman(name: string): string {
    return TEAM_MAP[name] || name;
}

function parseKickoff(localDate: string): string {
    // Format: "06/11/2026 13:00" (US-Format MM/DD/YYYY HH:MM — Lokalzeit USA/Mexiko)
    const [datePart, timePart] = localDate.split(' ');
    const [mm, dd, yyyy] = datePart.split('/');
    // Wir speichern als ISO — Zeiten sind Lokalzeit der Stadien (vereinfacht als UTC-5/UTC-6)
    // Für Anzeigezwecke reicht UTC-Näherung ohne DST-Konvertierung
    return `${yyyy}-${mm}-${dd}T${timePart}:00.000Z`;
}

function isGermanyGame(home: string, away: string): boolean {
    return home === 'Germany' || away === 'Germany';
}

function isTopGame(home: string, away: string, type: string): boolean {
    const topTeams = ['Germany', 'France', 'Spain', 'Brazil', 'Argentina', 'England', 'Portugal', 'Netherlands'];
    const bothTop = topTeams.includes(home) && topTeams.includes(away);
    return bothTop || type !== 'group';
}

// ── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Auth check — nur Manager/Admin dürfen manuell triggern
        // Bei Automation-Aufruf (POST mit automation key) überspringen
        const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
        const isAutomation = body.automation === true;

        if (!isAutomation) {
            const user = await base44.auth.me().catch(() => null);
            if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        // 1. Spiele von externer API laden
        const apiResp = await fetch('https://worldcup26.ir/get/games', {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });

        if (!apiResp.ok) {
            return Response.json({ error: `API error: ${apiResp.status}` }, { status: 502 });
        }

        const apiData = await apiResp.json();
        const games: any[] = apiData.games || apiData || [];

        if (!games.length) {
            return Response.json({ error: 'No games returned from API' }, { status: 502 });
        }

        // 2. Bestehende Matches aus DB laden (für Update vs. Insert)
        const existing = await base44.asServiceRole.entities.WorldCupMatch.list('kickoff_time', 500);
        const byExternalId = new Map<string, any>();
        existing.forEach((m: any) => {
            if (m.external_match_id) byExternalId.set(m.external_match_id, m);
        });

        let created = 0, updated = 0, skipped = 0;
        const now = new Date().toISOString();

        for (const game of games) {
            const extId      = String(game.id);
            const homeEn     = game.home_team_name_en || game.home_team || '';
            const awayEn     = game.away_team_name_en || game.away_team || '';
            const homeDE     = toGerman(homeEn);
            const awayDE     = toGerman(awayEn);
            const kickoff    = parseKickoff(game.local_date);
            const homeScore  = game.home_score !== undefined && game.home_score !== null && game.home_score !== '' ? Number(game.home_score) : null;
            const awayScore  = game.away_score !== undefined && game.away_score !== null && game.away_score !== '' ? Number(game.away_score) : null;
            const finished   = String(game.finished).toUpperCase() === 'TRUE';
            const timeElapsed = (game.time_elapsed || '').toLowerCase();
            const isLive     = timeElapsed !== 'notstarted' && !finished && timeElapsed !== '';

            let status: string = 'geplant';
            if (finished) status = 'beendet';
            else if (isLive) status = 'live';

            const round      = ROUND_MAP[game.type] || 'Gruppenphase';
            const groupName  = game.group ? `Gruppe ${game.group}` : '';
            const germanyGame = isGermanyGame(homeEn, awayEn);
            const topGame    = isTopGame(homeEn, awayEn, game.type || 'group');

            const matchData: any = {
                home_team:          homeDE,
                away_team:          awayDE,
                kickoff_time:       kickoff,
                round,
                group_name:         groupName,
                status,
                is_germany_game:    germanyGame,
                is_top_game:        topGame,
                external_match_id:  extId,
                last_updated:       now,
            };

            // Scores nur setzen wenn vorhanden
            if (homeScore !== null && !isNaN(homeScore)) matchData.home_score = homeScore;
            if (awayScore !== null && !isNaN(awayScore)) matchData.away_score = awayScore;

            const existing_match = byExternalId.get(extId);

            if (existing_match) {
                // Nur updaten wenn sich Status oder Score geändert hat
                const scoreChanged = existing_match.home_score !== matchData.home_score ||
                                     existing_match.away_score !== matchData.away_score;
                const statusChanged = existing_match.status !== status;

                if (scoreChanged || statusChanged) {
                    await base44.asServiceRole.entities.WorldCupMatch.update(existing_match.id, matchData);
                    updated++;
                } else {
                    skipped++;
                }
            } else {
                await base44.asServiceRole.entities.WorldCupMatch.create(matchData);
                created++;
            }
        }

        return Response.json({
            success: true,
            total:   games.length,
            created,
            updated,
            skipped,
            message: `✅ ${created} neu, ${updated} aktualisiert, ${skipped} unverändert`,
        });

    } catch (error: any) {
        console.error('syncWorldCup error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
