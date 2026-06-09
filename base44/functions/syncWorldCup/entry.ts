import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    'Kyrgyzstan': 'Kirgisistan',
};

// ── Runden-Mapping: API type → Anzeigename ─────────────────────────────────
const ROUND_MAP: Record<string, string> = {
    'group':  'Gruppenphase',
    'r32':    'Achtelfinale',   // Round of 32
    'r16':    'Achtelfinale',   // Round of 16 (falls vorhanden)
    'qf':     'Viertelfinale',
    'sf':     'Halbfinale',
    'third':  'Spiel um Platz 3',
    'final':  'Finale',
};

// ── Nur echte Buchstaben-Gruppen (A–L) bekommen group_name ────────────────
const GROUP_LETTERS = new Set(['A','B','C','D','E','F','G','H','I','J','K','L']);

function toGerman(name: string): string {
    return TEAM_MAP[name] || name;
}

function parseKickoff(localDate: string): string {
    const [datePart, timePart] = localDate.split(' ');
    const [mm, dd, yyyy] = datePart.split('/');
    return `${yyyy}-${mm}-${dd}T${timePart}:00.000Z`;
}

function isGermanyGame(home: string, away: string): boolean {
    return home === 'Germany' || away === 'Germany';
}

function isTopGame(home: string, away: string, type: string): boolean {
    const topTeams = ['Germany','France','Spain','Brazil','Argentina','England','Portugal','Netherlands'];
    return (topTeams.includes(home) && topTeams.includes(away)) || type !== 'group';
}

// ── KO-Placeholder-Label übersetzen ────────────────────────────────────────
function translateLabel(label: string): string {
    if (!label) return '';
    return label
        .replace('Winner Group', 'Sieger Gr.')
        .replace('Runner-up Group', '2. Gr.')
        .replace('3rd Group', '3. Gr.');
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
        const isAutomation = body.automation === true;

        if (!isAutomation) {
            const user = await base44.auth.me().catch(() => null);
            if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const apiResp = await fetch('https://worldcup26.ir/get/games', {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });
        if (!apiResp.ok) return Response.json({ error: `API error: ${apiResp.status}` }, { status: 502 });

        const apiData = await apiResp.json();
        const games: any[] = apiData.games || apiData || [];
        if (!games.length) return Response.json({ error: 'No games returned' }, { status: 502 });

        const existing = await base44.asServiceRole.entities.WorldCupMatch.list('kickoff_time', 500);
        const byExternalId = new Map<string, any>();
        existing.forEach((m: any) => { if (m.external_match_id) byExternalId.set(m.external_match_id, m); });

        let created = 0, updated = 0, skipped = 0;
        const now = new Date().toISOString();

        for (const game of games) {
            const extId       = String(game.id);
            const apiType     = game.type || 'group';
            const isGroupGame = apiType === 'group';

            // Teams: Gruppenspiele haben Namen, KO-Spiele haben Labels
            const homeEn = (isGroupGame ? game.home_team_name_en : null) || '';
            const awayEn = (isGroupGame ? game.away_team_name_en : null) || '';
            // KO-Spiele: Placeholder-Labels bis Ergebnisse feststehen
            const homeDE = homeEn
                ? toGerman(homeEn)
                : translateLabel(game.home_team_label || '');
            const awayDE = awayEn
                ? toGerman(awayEn)
                : translateLabel(game.away_team_label || '');

            const kickoff   = parseKickoff(game.local_date);
            const homeScore = (game.home_score != null && game.home_score !== '') ? Number(game.home_score) : null;
            const awayScore = (game.away_score != null && game.away_score !== '') ? Number(game.away_score) : null;
            const finished  = String(game.finished).toUpperCase() === 'TRUE';
            const elapsed   = (game.time_elapsed || '').toLowerCase();
            const isLive    = elapsed !== 'notstarted' && elapsed !== '' && !finished;

            let status = 'geplant';
            if (finished)  status = 'beendet';
            else if (isLive) status = 'live';

            const round     = ROUND_MAP[apiType] || 'Gruppenphase';
            // group_name NUR für echte Buchstaben-Gruppen setzen!
            const groupLetter = (game.group || '').replace(/^Gruppe\s*/i, '').trim();
            const groupName = GROUP_LETTERS.has(groupLetter) ? `Gruppe ${groupLetter}` : '';

            const matchData: any = {
                home_team: homeDE || '?', away_team: awayDE || '?',
                kickoff_time: kickoff, round, group_name: groupName,
                status,
                is_germany_game: isGermanyGame(homeEn, awayEn),
                is_top_game:     isTopGame(homeEn, awayEn, apiType),
                external_match_id: extId, last_updated: now,
            };
            if (homeScore !== null && !isNaN(homeScore)) matchData.home_score = homeScore;
            if (awayScore !== null && !isNaN(awayScore)) matchData.away_score = awayScore;

            const existingMatch = byExternalId.get(extId);
            if (existingMatch) {
                const changed = existingMatch.home_score !== matchData.home_score
                    || existingMatch.away_score !== matchData.away_score
                    || existingMatch.status !== status
                    || existingMatch.home_team !== matchData.home_team
                    || existingMatch.away_team !== matchData.away_team
                    || existingMatch.group_name !== matchData.group_name;
                if (changed) {
                    await base44.asServiceRole.entities.WorldCupMatch.update(existingMatch.id, matchData);
                    updated++;
                } else { skipped++; }
            } else {
                await base44.asServiceRole.entities.WorldCupMatch.create(matchData);
                created++;
            }
        }

        return Response.json({ success: true, total: games.length, created, updated, skipped,
            message: `✅ ${created} neu, ${updated} aktualisiert, ${skipped} unverändert` });

    } catch (error: any) {
        console.error('syncWorldCup error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
