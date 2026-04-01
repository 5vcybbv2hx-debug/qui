# Legal-Compliance Status Report – BarManager App

**Datum:** 2026-04-01  
**Status:** 🟡 PARTIAL – Fundament vorhanden, kritische Teile noch zu sichern

---

## ✅ IMPLEMENTIERT & AKTIV

### 1. Rechtliche Seiten
- ✅ **Impressum** (`/Impressum`) – vollständig
- ✅ **Datenschutzerklärung** (`/PrivacyPolicy`) – vollständig
- ✅ **Einwilligungs-Dialog** – blockiert App-Zugriff bis akzeptiert
- ✅ **Zustimmungs-Versionierung** – UserConsent Entity mit Versions-Tracking

### 2. Datenmodelle
- ✅ **UserConsent** – speichert Zustimmungen + Zeitstempel + Versionierung
- ✅ **EmployeeDocument** – sichere Dokumentenverwaltung mit Upload-Kontrollen
- ✅ **DeletionRequest** – DSGVO-Löschanfragen (Status-Tracking)
- ✅ **AccessLog** – Zugriffs-Audit (wer, was, wann)

### 3. Komponenten & UI
- ✅ **ConsentDialog** – mobil-optimiert, blockierend
- ✅ **LegalSettingsPanel** – Rechtsbereich in Einstellungen
- ✅ **PrivacyCenter** – Datenrechte für Nutzer (Export, Einsicht, Löschanfrage)
- ✅ **DataMinimizationNotice** – DSGVO-Transparenz in Formularen

### 4. Einstellungen
- ✅ **Settings → Rechtliches Tab** – Dokumentzugriff + Zustimmungsstatus

---

## 🔴 KRITISCHE LÜCKEN (Must-Have)

### 1. Row Level Security (RLS)
**Problem:** Nur UI-Sperren, keine Server-Validierung  
**Lösung nötig:** Backend-Funktionen für Datenzugriff mit Auth-Check

### 2. AGB/ToS
- Seite existiert nicht
- Content-Management fehlt

### 3. Audit-Logging
- Entity existiert, aber keine Funktion zum Eintragen
- Keine Integration bei kritischen Aktionen

### 4. Document Access Control
- Keine Signatur-Validierung für Downloads
- Fehlende Rate-Limiting

### 5. Export-Funktionen
- `exportUserData` existiert, aber begrenzt
- CSV/JSON für HR-Daten fehlt

---

## 🟡 EMPFOHLEN (Should-Have)

### 1. Retention Policies
- Automatische Archivierung nach X Jahren
- Ex-Mitarbeiter-Daten Handling

### 2. Fine-Grained Permissions
- Aktuell: Admin/Manager/User
- Nötig: Spezifische Rollen pro Modul

### 3. Notification Compliance
- Push-Nachrichten ohne sensible Daten prüfen

### 4. Form Data Minimization
- Employee-Formular prüfen auf Pflichtfelder
- Optional-Markierungen prüfen

---

## 📋 NÄCHSTE SCHRITTE

**Phase 1 (SOFORT):**
- [ ] AGB-Seite implementieren
- [ ] RLS für EmployeeDocument + Employee
- [ ] Audit-Logging auf kritische Aktionen

**Phase 2 (THIS WEEK):**
- [ ] Export-Funktionen (CSV/PDF)
- [ ] Document Download-Signatur
- [ ] Retention Policies

**Phase 3 (LATER):**
- [ ] Fine-grained permissions
- [ ] Notification filtering
- [ ] Form minimization audit

---

## 🔐 SICHERHEITS-CHECKLISTE

| Feature | Status | Notiz |
|---------|--------|-------|
| Impressum | ✅ | Live |
| Datenschutz | ✅ | Live |
| AGB | 🔴 | Fehlt |
| Zustimmung | ✅ | Blockierend |
| RLS EmployeeDoc | 🔴 | Nur UI |
| RLS Employee | 🔴 | Nur UI |
| Audit-Log | 🟡 | Entity da, nicht genutzt |
| Export | 🟡 | Partiell |
| Document-Signing | 🔴 | Fehlt |
| Retention | 🔴 | Fehlt |

---

## 💾 DATENSICHERHEIT

**Verarbeitet:** Namen, E-Mails, Telefon, Adressen, Bankdaten, Personalinfos  
**Empfindlich:** Steuerdaten, Versicherungsnummern, Notfallkontakte  
**Status:** ⚠️ Minimale Kontrollen, erweiterte Sicherheit nötig

---

**Fazit:** Fundament gut, kritische Sicherheitslücken bei Server-Side Access Control.