/**
 * Zentrale Legal-Content Verwaltung
 * Versionierung ermöglicht einfaches Update & Tracking
 */

export const LEGAL_VERSIONS = {
  PRIVACY_POLICY: '1.0',
  IMPRINT: '1.0'
};

/**
 * IMPRESSUM - Strukturierte Inhalte
 * Anpassbar: Ersetze [PLACEHOLDER] mit echten Daten
 */
export const IMPRINT_CONTENT = {
  version: LEGAL_VERSIONS.IMPRINT,
  lastUpdated: '2026-04-01',
  sections: {
    operator: {
      title: 'Betreiber der App',
      content: `
        BarManager GmbH
        Musterstraße 123
        10115 Berlin
        Deutschland
      `.trim()
    },
    contact: {
      title: 'Kontaktdaten',
      items: [
        { label: 'E-Mail', value: 'info@barmanager-app.de' },
        { label: 'Telefon', value: '+49 (0) 30 123456789' },
        { label: 'Geschäftszeiten', value: 'Mo-Fr 09:00-17:00 Uhr' }
      ]
    },
    registration: {
      title: 'Registrierung & Vertretung',
      content: `
        Registereintrag: Handelsregister Berlin-Charlottenburg, HR-Nr. HRB 12345
        
        Geschäftsführung:
        Max Müller
        Anna Schmidt
      `.trim()
    },
    responsible: {
      title: 'Verantwortliche Person für Inhalte',
      content: `
        Max Müller
        E-Mail: max.mueller@barmanager-app.de
        Tel: +49 (0) 30 123456789
      `.trim()
    },
    vat: {
      title: 'Steuernummer & USt-ID',
      content: `
        Steuernummer: 12 345 678 901
        Umsatzsteuer-ID: DE123456789
      `.trim()
    },
    liability: {
      title: 'Haftungsausschluss',
      content: `
        Die Inhalte unserer App werden mit großer Sorgfalt erstellt. 
        Dennoch übernehmen wir keine Gewähr für Richtigkeit, Vollständigkeit 
        und Aktualität der bereitgestellten Inhalte.
        
        Für externe Links ist der jeweilige Anbieter verantwortlich. 
        Eine ständige Überwachung aller Links ist ohne konkrete Anhaltspunkte 
        auf Rechtsverstoß nicht zumutbar.
      `.trim()
    }
  }
};

/**
 * DATENSCHUTZERKLÄRUNG - Strukturierte Inhalte
 * DSGVO-konform
 */
export const PRIVACY_POLICY_CONTENT = {
  version: LEGAL_VERSIONS.PRIVACY_POLICY,
  lastUpdated: '2026-04-01',
  sections: {
    intro: {
      title: 'Datenschutzerklärung',
      subtitle: 'BarManager GmbH',
      content: `
        Wir nehmen den Datenschutz ernst. Diese Erklärung informiert Sie darüber, 
        wie wir Ihre personenbezogenen Daten verarbeiten.
      `.trim()
    },
    controller: {
      title: '1. Verantwortlicher',
      content: `
        BarManager GmbH
        Musterstraße 123
        10115 Berlin
        E-Mail: datenschutz@barmanager-app.de
      `.trim()
    },
    dataCollected: {
      title: '2. Welche Daten erfassen wir?',
      subsections: [
        {
          title: 'Bei der Anmeldung:',
          items: [
            'Vollständiger Name',
            'E-Mail-Adresse',
            'Telefonnummer',
            'Passwort (verschlüsselt)'
          ]
        },
        {
          title: 'Beim Betrieb der App:',
          items: [
            'Arbeitszeitstempel',
            'Schichtinformationen',
            'Dokumentationen (Schichten, Aufgaben)',
            'Technische Logs (IP-Adresse, Browser-Info)'
          ]
        },
        {
          title: 'Sensible Daten (optional):',
          items: [
            'Steuernummer (verschlüsselt)',
            'IBAN (verschlüsselt)',
            'Geburtsdatum',
            'Adressdaten'
          ]
        }
      ]
    },
    purposes: {
      title: '3. Wofür nutzen wir Ihre Daten?',
      items: [
        'Betrieb der App und Benutzerverwaltung',
        'Abwicklung von Arbeitsverträgen',
        'Lohnabrechnung und Steuererklärungen',
        'Sicherheit und Fraud-Prevention',
        'Erfüllung gesetzlicher Verpflichtungen',
        'Verbesserung der App (nur anonymisiert)'
      ]
    },
    recipients: {
      title: '4. Wer erhält Zugriff auf Ihre Daten?',
      items: [
        'App-Administratoren (verschlüsselte Verbindung)',
        'Ihre Schichtmanager (nur Ihre Schichten)',
        'Externe Dienstleister (Zahlungsanbieter, Backup)',
        'Behörden (nur bei rechtlicher Verpflichtung)'
      ]
    },
    retention: {
      title: '5. Wie lange speichern wir Ihre Daten?',
      content: `
        Arbeitszeitdaten: 3 Jahre nach Ende des Arbeitsverhältnisses
        Abrechnungsdaten: 6 Jahre (gesetzliche Aufbewahrungspflicht)
        Adressdaten: Bis zu ihrer Löschung oder Ende des Nutzung
        Logs: 90 Tage (automatisch gelöscht)
        Deleted Accounts: Sofort gelöscht (außer Aufbewahrungspflichten)
      `.trim()
    },
    rights: {
      title: '6. Ihre Rechte',
      subsections: [
        {
          title: 'Sie haben folgende Rechte:',
          items: [
            'Recht auf Auskunft (Art. 15 DSGVO)',
            'Recht auf Berichtigung (Art. 16)',
            'Recht auf Löschung (Art. 17)',
            'Recht auf Einschränkung (Art. 18)',
            'Recht auf Datenportabilität (Art. 20)',
            'Widerspruchsrecht (Art. 21)'
          ]
        },
        {
          title: 'So üben Sie Ihre Rechte aus:',
          content: `
            Senden Sie eine E-Mail an: datenschutz@barmanager-app.de
            Oder nutzen Sie die "Datenschutz-Anfrage" in der App.
            Antwortzeit: Innerhalb von 30 Tagen.
          `.trim()
        }
      ]
    },
    security: {
      title: '7. Sicherheit Ihrer Daten',
      content: `
        Ihre Daten werden verschlüsselt übertragen (TLS/SSL).
        Sensitive Felder (IBAN, Steuernummer) sind verschlüsselt.
        Zugriff ist rollen-basiert und protokolliert.
        Regelmäßige Sicherheits-Audits durchgeführt.
      `.trim()
    },
    cookies: {
      title: '8. Cookies & Tracking',
      content: `
        Wir verwenden minimal Cookies:
        - Session-Cookie (für Anmeldung, wird gelöscht nach Logout)
        - Keine Tracking-Cookies
        - Keine Third-Party-Cookies
        
        Sie können Cookies in Ihren Browser-Einstellungen deaktivieren.
      `.trim()
    },
    changes: {
      title: '9. Änderungen dieser Datenschutzerklärung',
      content: `
        Wir können diese Erklärung jederzeit anpassen. 
        Bei wesentlichen Änderungen benachrichtigen wir Sie per E-Mail.
        Ihre fortgesetzte Nutzung bedeutet Akzeptanz.
      `.trim()
    },
    contact: {
      title: '10. Kontakt & Datenschutzbeauftragte',
      content: `
        Datenschutz-Anfragen:
        E-Mail: datenschutz@barmanager-app.de
        
        Beschwerde bei Aufsichtsbehörde:
        Berliner Beauftragte für Datenschutz und Informationsfreiheit
        www.datenschutz-berlin.de
      `.trim()
    }
  }
};

/**
 * CONSENT DIALOG - Text
 */
export const CONSENT_DIALOG_TEXT = {
  title: '📋 Willkommen zu BarManager',
  subtitle: 'Bitte akzeptieren Sie unsere Datenschutzrichtlinie',
  description: `
    Damit Sie die App nutzen können, müssen Sie den folgenden Dokumenten zustimmen:
  `,
  items: [
    {
      id: 'privacy',
      label: 'Datenschutzerklärung',
      description: 'Ich habe die Datenschutzerklärung zur Kenntnis genommen und akzeptiert'
    },
    {
      id: 'imprint',
      label: 'Impressum',
      description: 'Ich habe das Impressum zur Kenntnis genommen'
    }
  ],
  buttons: {
    accept: '✅ Akzeptieren & Fortfahren',
    decline: 'Ablehnen',
    viewPrivacy: '📄 Datenschutz anschauen',
    viewImprint: '📄 Impressum anschauen'
  },
  footer: `
    Sie können diese Einstellungen später in "Einstellungen > Rechtliches" ändern.
  `
};