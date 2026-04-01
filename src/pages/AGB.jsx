import React from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';

export default function AGB() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Allgemeine Geschäftsbedingungen</h1>
        </div>

        {/* Info */}
        <Card className="p-4 bg-amber-500/10 border-amber-500/20 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400">
              Diese AGB regeln die Nutzung der BarManager-App durch Mitarbeiter und Partner.
            </p>
          </div>
        </Card>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Anwendungsbereich</h2>
            <p className="text-muted-foreground">
              Diese Allgemeinen Geschäftsbedingungen regeln die Nutzung der BarManager-App durch autorisierte Mitarbeiter und Betreiber.
              Die Nutzung der App setzt die Akzeptanz dieser AGB voraus.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Nutzungsrechte</h2>
            <p className="text-muted-foreground">
              Die App wird zur Verfügung gestellt für interne Geschäftszwecke. Eine Weitergabe an unbefugte Personen ist untersagt.
              Alle Inhalte, Funktionen und Daten der App sind Eigentum des Betreibers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Pflichten der Nutzer</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Schutz der Zugangsdaten und PINs</li>
              <li>• Keine Nutzung durch unbefugte Personen</li>
              <li>• Einhaltung geltender Gesetze und Betriebsvorgaben</li>
              <li>• Sofortige Meldung von Sicherheitsverletzungen</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Datensicherheit</h2>
            <p className="text-muted-foreground">
              Der Nutzer akzeptiert die Speicherung und Verarbeitung persönlicher Daten gemäß Datenschutzerklärung.
              Alle Zugriffe werden protokolliert.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Haftung</h2>
            <p className="text-muted-foreground">
              Der Anbieter haftet nicht für Datenverluste oder Ausfallzeiten, soweit nicht durch Fahrlässigkeit verursacht.
              Der Nutzer trägt Verantwortung für seine Zugangsdaten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Änderungen</h2>
            <p className="text-muted-foreground">
              Der Anbieter behält sich das Recht vor, diese AGB zu ändern. Änderungen werden dem Nutzer mitgeteilt.
              Weitere Nutzung nach Änderungen gilt als Akzeptanz.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Kündigung</h2>
            <p className="text-muted-foreground">
              Der Anbieter kann den Zugriff jederzeit ohne Grund einschränken oder beenden.
              Bei Beendigung werden alle Zugangsdaten ungültig.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Schlussbestimmungen</h2>
            <p className="text-muted-foreground">
              Sollte eine Bestimmung ungültig sein, bleibt der Rest gültig.
              Diese AGB unterliegen deutschem Recht.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-card border border-border rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Letzte Aktualisierung:</strong> 01.04.2026
          </p>
        </div>
      </div>
    </div>
  );
}