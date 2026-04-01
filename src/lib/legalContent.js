/**
 * Zentrale Legal-Textvorlagen mit Placeholder-System
 * Alle Texte werden dynamisch mit CompanyInfo-Daten befüllt
 */

export const LEGAL_PLACEHOLDERS = {
  COMPANY_NAME: '[COMPANY_NAME]',
  STREET: '[STREET]',
  POSTAL_CODE: '[POSTAL_CODE]',
  CITY: '[CITY]',
  EMAIL: '[EMAIL]',
  PHONE: '[PHONE]',
  OWNER_NAME: '[OWNER_NAME]',
  LEGAL_FORM: '[LEGAL_FORM]',
  DP_CONTACT: '[DP_CONTACT]',
};

export const PRIVACY_POLICY_TEMPLATE = `DATENSCHUTZERKLÄRUNG

1. Verantwortlicher
Verantwortlich für die Datenverarbeitung in dieser App ist:

${LEGAL_PLACEHOLDERS.COMPANY_NAME}
${LEGAL_PLACEHOLDERS.STREET}
${LEGAL_PLACEHOLDERS.POSTAL_CODE} ${LEGAL_PLACEHOLDERS.CITY}

E-Mail: ${LEGAL_PLACEHOLDERS.EMAIL}
Telefon: ${LEGAL_PLACEHOLDERS.PHONE}

2. Allgemeine Hinweise zur Datenverarbeitung
Wir nehmen den Schutz Ihrer personenbezogenen Daten sehr ernst. Die Verarbeitung Ihrer Daten erfolgt im Einklang mit den geltenden Datenschutzgesetzen, insbesondere der DSGVO.

3. Erhebung und Verarbeitung personenbezogener Daten
Im Rahmen der Nutzung dieser App werden folgende Daten verarbeitet:
- Mitarbeiterdaten (Name, Adresse, Kontaktdaten)
- Arbeitszeiten und Zeiterfassung
- Personalbogendaten (z. B. Bankverbindung, Steuerdaten, sofern eingegeben)
- Dokumente (z. B. PDFs, Personalunterlagen)
- Reservierungsdaten (Name, Kontaktinformationen von Gästen)
- Aufgaben- und To-do-Daten
- Wartungs- und Betriebsdaten
- Nutzerdaten (Login, Rollen, Zugriffe)

Die Daten werden ausschließlich zur Organisation des Betriebs und zur Durchführung arbeitsbezogener Prozesse verwendet.

4. Zweck der Verarbeitung
Die Verarbeitung erfolgt zu folgenden Zwecken:
- Verwaltung von Mitarbeitern
- Organisation von Schichten und Arbeitszeiten
- Durchführung von betrieblichen Abläufen
- Dokumentation (z. B. Hygiene, HACCP, Wartung)
- Kommunikation innerhalb des Teams

5. Rechtsgrundlagen
Die Verarbeitung erfolgt auf Grundlage von:
- Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
- Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Verpflichtungen)
- Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am Betrieb der App)

6. Zugriff auf Daten
Der Zugriff auf personenbezogene Daten erfolgt rollenbasiert:
- Mitarbeiter: Zugriff nur auf eigene Daten
- Manager: Zugriff auf relevante Teamdaten
- Administratoren: erweiterter Zugriff

7. Speicherung und Speicherdauer
Personenbezogene Daten werden nur so lange gespeichert, wie dies für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.

8. Dokumente und Uploads
Hochgeladene Dokumente (z. B. Personalbögen) werden sicher gespeichert und sind nur für berechtigte Nutzer zugänglich.

9. Weitergabe von Daten
Eine Weitergabe an Dritte erfolgt nicht, es sei denn, dies ist gesetzlich erforderlich oder zur Vertragserfüllung notwendig.

10. Rechte der Nutzer
Nutzer haben das Recht auf:
- Auskunft über ihre Daten
- Berichtigung
- Löschung
- Einschränkung der Verarbeitung
- Datenübertragbarkeit

Anfragen können an die oben genannten Kontaktdaten gerichtet werden.

11. Sicherheit
Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten vor Verlust, Missbrauch oder unbefugtem Zugriff zu schützen.

12. Änderungen
Diese Datenschutzerklärung kann aktualisiert werden. Nutzer werden über wesentliche Änderungen informiert.`;

export const CONSENT_TEXT_TEMPLATE = `Datenschutz & Nutzung

Ich habe die Datenschutzerklärung gelesen und bin damit einverstanden, dass meine personenbezogenen Daten im Rahmen der Nutzung dieser App verarbeitet werden.`;

export const PRIVACY_SHORT_TEMPLATE = `Datenschutz

Diese App verarbeitet personenbezogene Daten (z. B. Mitarbeiterdaten, Arbeitszeiten und Dokumente), um den Betrieb zu organisieren.

Bitte bestätige, dass du die Datenschutzerklärung gelesen hast.`;

export const IMPRINT_TEMPLATE = `IMPRESSUM

Angaben gemäß § 5 TMG

${LEGAL_PLACEHOLDERS.COMPANY_NAME}
${LEGAL_PLACEHOLDERS.STREET}
${LEGAL_PLACEHOLDERS.POSTAL_CODE} ${LEGAL_PLACEHOLDERS.CITY}

Vertreten durch:
${LEGAL_PLACEHOLDERS.OWNER_NAME}

Kontakt:
E-Mail: ${LEGAL_PLACEHOLDERS.EMAIL}
Telefon: ${LEGAL_PLACEHOLDERS.PHONE}

Verantwortlich für den Inhalt:
${LEGAL_PLACEHOLDERS.OWNER_NAME}`;

export const AGB_TEMPLATE = `ALLGEMEINE GESCHÄFTSBEDINGUNGEN

1. Geltungsbereich
Diese App dient der Organisation von Betriebsabläufen in Gastronomiebetrieben. Betreiber: ${LEGAL_PLACEHOLDERS.COMPANY_NAME}.

2. Nutzung
Die Nutzung erfolgt auf eigene Verantwortung des Betreibers. Alle Nutzer müssen die Datenschutzerklärung akzeptiert haben.

3. Datenverarbeitung
Die Verarbeitung personenbezogener Daten erfolgt gemäß Datenschutzerklärung. Für die Datenverarbeitung verantwortlich: ${LEGAL_PLACEHOLDERS.OWNER_NAME}.

4. Haftung
Für Schäden durch fehlerhafte Nutzung wird keine Haftung übernommen, soweit gesetzlich zulässig.

5. Änderungen
Der Anbieter behält sich vor, Funktionen und Inhalte der App anzupassen. Wesentliche Änderungen der AGB werden den Nutzern mitgeteilt.

6. Gültigkeitsbereich
Diese AGB gelten für die Nutzung der App durch autorisierte Mitarbeiter und Manager des Betreibers.`;

/**
 * Platzhalter in Text mit realen Daten ersetzen
 */
export function fillLegalTemplate(template, companyInfo) {
  if (!template) return 'Rechtstexte nicht verfügbar.';

  let filled = template;
  const ph = LEGAL_PLACEHOLDERS;

  // Sichere Ersetzung: nur wenn Daten vorhanden, sonst Hinweis lassen
  const replacements = {
    [ph.COMPANY_NAME]: companyInfo?.company_name || '❌ Firmenname nicht angegeben',
    [ph.STREET]: companyInfo?.street || '',
    [ph.POSTAL_CODE]: companyInfo?.postal_code || '',
    [ph.CITY]: companyInfo?.city || '',
    [ph.EMAIL]: companyInfo?.email || '❌ E-Mail nicht angegeben',
    [ph.PHONE]: companyInfo?.phone || '',
    [ph.OWNER_NAME]: companyInfo?.owner_name || '❌ Name des Betreibers nicht angegeben',
    [ph.LEGAL_FORM]: companyInfo?.legal_form || '',
    [ph.DP_CONTACT]: companyInfo?.data_protection_contact || companyInfo?.email || '',
  };

  Object.entries(replacements).forEach(([placeholder, value]) => {
    filled = filled.replace(new RegExp(placeholder, 'g'), value?.trim() || '');
  });

  return filled;
}

/**
 * Prüfe, welche Pflichtangaben fehlen
 */
export function getMissingRequiredFields(companyInfo) {
  const required = ['company_name', 'email', 'owner_name'];
  const recommended = ['street', 'postal_code', 'city', 'phone'];

  const missing = {
    required: required.filter(field => !companyInfo?.[field]),
    recommended: recommended.filter(field => !companyInfo?.[field]),
  };

  return missing;
}

/**
 * Berechne Completeness-Prozentsatz
 */
export function getCompletionPercentage(companyInfo) {
  const allFields = ['company_name', 'street', 'postal_code', 'city', 'email', 'phone', 'owner_name', 'legal_form'];
  const filledFields = allFields.filter(field => companyInfo?.[field]);
  return Math.round((filledFields.length / allFields.length) * 100);
}

/**
 * Legal document versions for tracking
 */
export const LEGAL_VERSIONS = {
  PRIVACY_POLICY: '1.0',
  IMPRINT: '1.0',
  AGB: '1.0'
};

/**
 * Exported content objects for ConsentDialog and legal pages
 */
export const CONSENT_DIALOG_TEXT = {
  title: 'Zustimmung erforderlich',
  subtitle: 'Bitte akzeptieren Sie die folgenden Dokumente',
  description: 'Um diese App nutzen zu können, müssen Sie unseren Datenschutzerklärung und dem Impressum zustimmen.',
  items: [
    {
      id: 'privacy',
      label: 'Datenschutzerklärung',
      description: 'Ich habe die Datenschutzerklärung gelesen und akzeptiert'
    },
    {
      id: 'imprint',
      label: 'Impressum',
      description: 'Ich habe das Impressum zur Kenntnis genommen'
    }
  ],
  buttons: {
    viewPrivacy: 'Datenschutz ansehen',
    viewImprint: 'Impressum ansehen',
    accept: 'Zustimmen'
  },
  footer: 'Sie können Ihre Einstellungen jederzeit ändern.'
};

export const PRIVACY_POLICY_CONTENT = {
  sections: {
    intro: {
      title: 'Datenschutzerklärung',
      content: 'Diese App verarbeitet personenbezogene Daten zum Betrieb.'
    },
    purposes: {
      title: '1. Zweck der Verarbeitung',
      content: 'Die Verarbeitung erfolgt zur Organisation von Betriebsabläufen.'
    },
    rights: {
      title: '2. Ihre Rechte',
      items: [
        'Auskunft über Ihre Daten',
        'Berichtigung und Löschung',
        'Einschränkung der Verarbeitung',
        'Datenübertragbarkeit'
      ]
    }
  }
};

export const IMPRINT_CONTENT = {
  lastUpdated: new Date().toLocaleDateString('de-DE'),
  sections: {
    responsible: {
      title: 'Verantwortlicher',
      items: [
        { label: 'Anbieter', value: 'BarManager' },
        { label: 'Kontakt', value: 'info@barmanager.de' }
      ]
    },
    legal: {
      title: 'Angaben gemäß § 5 TMG',
      content: 'Die genauen Angaben werden aus den Unternehmenseinstellungen übernommen.'
    }
  }
};