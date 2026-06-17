import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PROTOCOL_TEXTS = {
  "6a21deed3c0b1b300854565b": `========================================
PROTOKOLL — TEAMSITZUNG
Sonntag, 07. Juni 2026 · 14:00 Uhr · SAVO-Tunnel
Protokollant: Nils Hugendubel
========================================

AGENDA-PUNKTE

→ Wichtige Termine: 20.06. – Nach dem Spiel
   Ergebnis: ✅ Beschlossen

→ Kommunikation verbessern
   Ergebnis: 🔄 Noch zu klären

→ Weisswurst Frühstück
   Ergebnis: ⬜ Besprochen

→ Wichtige Termine: 14.07. – WM Spiele
   Ergebnis: ⬜ Besprochen

→ Missverständnisse im Team
   Ergebnis: ⬜ Besprochen

→ Gemeinschaftliches Arbeiten
   Ergebnis: ⬜ Besprochen

→ Verantwortung & Zuverlässigkeit
   Ergebnis: ⬜ Besprochen

→ Schichtplanung für die kommenden 2 Monate
   Ergebnis: ⬜ Besprochen

→ Verantwortung & Hierarchie
   Ergebnis: ⬜ Besprochen

→ Respekt im Team
   Ergebnis: ⬜ Besprochen

→ Fairness bei wenig los
   Ergebnis: ⬜ Besprochen

→ Sommerausflug: Outdoor Minigolf in Frommern
   Ergebnis: ⬜ Besprochen

→ Gläser ausspülen, Einschaufeln, Löffel reinigen
   Ergebnis: ⬜ Besprochen

→ Putzliste: Schwingtüre Theke / Raucherbereich
   Ergebnis: ⬜ Besprochen

→ Team Preise erst wenn Button im System
   Ergebnis: ⬜ Besprochen

→ Neue Mitarbeiter unter der Woche einteilen
   Ergebnis: ⬜ Besprochen

→ Alkoholverbot an Teamsitzung?
   Ergebnis: ⬜ Besprochen

----------------------------------------
BESCHLÜSSE & MASSNAHMEN

→ Teamleitung — Personalplanung für 20.06. nach dem Spiel anpassen — bis 19.06.2026
→ Alle — Kommunikation direkter und lösungsorientierter gestalten — zeitnah
→ Teamleitung — Termin Weisswurst-Frühstück bekanntgeben — Juni 2026
→ Teamleitung — Schichtplanung für 2 Monate erstellen — bis 14.06.2026
→ Alle — Schwingtüre Theke/Raucherbereich zur Putzliste hinzufügen — zeitnah

----------------------------------------
OFFENE PUNKTE / NÄCHSTE SITZUNG

- Kommunikation verbessern (noch zu klären)
- Weisswurst Frühstück (Termin ausstehend)
- WM Spiele 14.07. (Vorbereitung offen)
- Missverständnisse im Team
- Gemeinschaftliches Arbeiten
- Verantwortung & Zuverlässigkeit
- Sommerausflug Minigolf Frommern
- Alkoholverbot an Teamsitzungen: Entscheidung offen
- Team Preise: erst wenn Button im System verfügbar

========================================`,

  "6a20efe9aaa34f100b5de868": `========================================
PROTOKOLL — TEAMSITZUNG
Sonntag, 07. Juni 2026 · 14:00 Uhr · SAVO-Tunnel
Protokollant: Melina Bilanovic
========================================

AGENDA-PUNKTE

→ Volle Spülkörbe in die Maschine räumen
   Ergebnis: ✅ Beschlossen

→ Warme Gläser getrennt von kalten abstellen
   Ergebnis: ✅ Beschlossen

→ Respektvoller Umgang / kein Lästern
   Ergebnis: ✅ Beschlossen

→ Kommunikation hinter der Theke beim Vorbeigehen
   Ergebnis: ✅ Beschlossen

→ Neuer Standort Spülmaschine (gegenüber)
   Ergebnis: ✅ Beschlossen

→ Pünktlichkeit: bei Verspätung nicht setzen und rauchen
   Ergebnis: ✅ Beschlossen

→ Putzpausen: max. 5 Minuten, nicht 15
   Ergebnis: ✅ Beschlossen

→ Alle Infos in der App auffindbar
   Ergebnis: ✅ Beschlossen

→ Bei wenig Betrieb nicht als Gruppe an der Theke stehen
   Ergebnis: ✅ Beschlossen

→ Pausenzeiten fair und gleichmäßig für alle
   Ergebnis: ✅ Beschlossen

→ Erledigte Putzaufgaben sofort abhaken
   Ergebnis: ✅ Beschlossen

→ Slush-Preis: über Daiquiri buchen
   Ergebnis: ✅ Beschlossen

→ Slush wird selbst geholt
   Ergebnis: ✅ Beschlossen

----------------------------------------
BESCHLÜSSE & MASSNAHMEN

→ Alle — Volle Spülkörbe zeitnah in die Maschine räumen — ab sofort
→ Alle — Warme Gläser getrennt von kalten abstellen — ab sofort
→ Alle — Pünktlichkeit: bei Verspätung nicht setzen/rauchen — ab sofort
→ Alle — Putzpause max. 5 Minuten einhalten — ab sofort
→ Alle — Erledigte Putzaufgaben direkt abhaken — ab sofort
→ Alle — Slush-Preis über Daiquiri buchen, Slush selbst holen — ab sofort
→ Alle — Pausenzeiten gleichmäßig und fair abstimmen — ab sofort
→ Teamleitung — Neuen Standort Spülmaschine umsetzen — zeitnah

----------------------------------------
OFFENE PUNKTE / NÄCHSTE SITZUNG

- Häufigkeit und Verantwortlichkeit Putzliste Schwingtüre klären
- Finaler Standort neue Spülmaschine bestätigen

========================================`,

  "6a2082f18d8e1b43359f93fc": `========================================
PROTOKOLL — TEAMSITZUNG
Sonntag, 07. Juni 2026 · 14:00 Uhr · SAVO-Tunnel
Protokollant: Anastazija Bilanovic
========================================

AGENDA-PUNKTE

→ Wichtige Termine: 20.07. – Nach dem Spiel / Plaza
   Ergebnis: ✅ Beschlossen

→ Wichtige Termine: 14.07. – WM Spiele
   Ergebnis: ✅ Beschlossen

→ Kommunikation im Team verbessern
   Ergebnis: ⬜ Besprochen

→ Weisswurst Frühstück (Termin Juni)
   Ergebnis: ⬜ Besprochen

→ Missverständnisse respektvoll ansprechen
   Ergebnis: ⬜ Besprochen

→ Gegenseitige Unterstützung & klare Kommunikation
   Ergebnis: ⬜ Besprochen

→ Pünktlichkeit, Sauberkeit, Respekt
   Ergebnis: ✅ Beschlossen

→ Schichtplanung 2 Monate im Voraus
   Ergebnis: ✅ Beschlossen

→ Langjährige MA als Vorbilder für neue Kollegen
   Ergebnis: ⬜ Besprochen

→ Fairness & gleiche Bezahlung auch bei wenig Betrieb
   Ergebnis: ⬜ Besprochen

→ Sommerausflug: Outdoor Minigolf Frommern, heute 16:00 Uhr
   Ergebnis: ✅ Beschlossen

→ Alkoholverbot an Teamsitzungen?
   Ergebnis: 🔄 Noch zu klären

→ Team Preise erst wenn Button im System
   Ergebnis: 🔄 Noch zu klären

→ Neue Mitarbeiter unter der Woche einteilen
   Ergebnis: 🔄 Noch zu klären

----------------------------------------
BESCHLÜSSE & MASSNAHMEN

→ Teamleitung — Personalplanung für 20.07. nach dem Spiel vorbereiten — bis 19.07.2026
→ Teamleitung — Schichtplanung 2 Monate im Voraus erstellen — zeitnah
→ Alle — Pünktlichkeit, Sauberkeit und Respekt als Standard einhalten — ab sofort
→ Teamleitung — Termin Sommerausflug Minigolf Frommern koordinieren — zeitnah
→ Teamleitung — Termin Weisswurst-Frühstück bekanntgeben — Juni 2026

----------------------------------------
OFFENE PUNKTE / NÄCHSTE SITZUNG

- Alkoholverbot an Teamsitzungen: Entscheidung steht aus
- Team Preise: erst wenn Button im System verfügbar
- Neue Mitarbeiter Wocheneinteilung: Planung offen
- Kommunikation & Missverständnisse: weiteres Feedback einholen

========================================`
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const results = [];
    for (const [id, ai_summary] of Object.entries(PROTOCOL_TEXTS)) {
      await base44.asServiceRole.entities.MeetingProtocol.update(id, { ai_summary });
      results.push({ id, status: 'updated' });
    }

    return Response.json({ success: true, updated: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
