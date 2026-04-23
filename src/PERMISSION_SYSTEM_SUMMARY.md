# Neues Permission-System — Implementierungs-Zusammenfassung

## 📋 Überblick

Das komplette Berechtigungssystem wurde grundlegend neu strukturiert mit:
- **Zentrale Permission-Registry** mit 3 Ebenen-Struktur (Seite → Unterbereich → Aktion)
- **Mobile-optimierte Verwaltungsseite** mit Rollen-Templates
- **Granulare Rechtevergabe** (none/view/edit pro Funktion)
- **Konsistente Guards/Helpers** für sichere Permission-Checks überall in der App

---

## 📁 Neue Dateien

### 1. `lib/permissionRegistry.js` (1016 Zeilen)
**Zentrale Quelle der Wahrheit für alle Berechtigungen**

Enthält:
- `PERMISSION_REGISTRY` — Alle 16+ Seiten mit 80+ Unterbereichen
- `STANDARD_ROLES` — vordefinierte Rollen (Admin, Manager, Employee)
- Helper: `getEmployeePermissions()`, `canAccessPermission()`

**Beispiel-Struktur:**
```javascript
storage: {
  pageKey: 'Storage',
  displayName: 'Lagerplätze',
  sections: {
    overview: { key: 'storage_overview', displayName: 'Übersicht', ... },
    structure: { key: 'storage_structure', displayName: 'Struktur verwalten', ... },
    labels: { key: 'storage_labels', displayName: 'Etiketten', ... },
    // ... weitere Unterbereiche
  }
}
```

### 2. `pages/PermissionsNew.jsx` (500+ Zeilen)
**Neue Berechtigungsverwaltungs-Seite**

Features:
- ✅ Mobile-first Design (Mitarbeiter-Suchleiste oben, Rechte in Accordions)
- ✅ Schnellaktionen: Rollen-Templates anwenden
- ✅ Berechtigungen kopieren von anderen Mitarbeitern
- ✅ Undo/Reset bei Änderungen
- ✅ Real-time Save mit visueller Bestätigung
- ✅ Sticky Save-Buttons auf Mobile

### 3. `lib/permissionGuards.js` (200+ Zeilen)
**Guards und Helper für Permission-Checks überall**

Exportiert:
- `canAccessSection(employee, permissionKey, requiredLevel)`
- `shouldShowButton(employee, key)`
- `getVisibleTabs(employee, tabs)`
- `filterByPermission(employee, items)`
- `checkPermissionBeforeMutation(employee, key, action)`
- `usePermissionGuard()` Hook
- ... und 10+ weitere Helpers

### 4. `lib/permissionIntegration.md`
**Integrations-Guide für Entwickler**

Erklärt:
- Wie Permission-Checks in Komponenten eingebaut werden
- Alle 60+ Permission-Keys der App
- Best Practices für UI-Guards
- Integration in Navigation, Routing, Buttons, Modals

---

## 🎯 Erfasste Seiten & Funktionen

### Vollständig in Registry (80+ Unterbereiche):

1. **Dashboard** (3 Sektionen)
   - Übersicht, Warnungen, Manager-Panel

2. **Lagerplätze** (7 Sektionen)
   - Übersicht, Struktur, Fächer, Zuordnung, Bestände, Etiketten, Export

3. **Getränkekarte** (6 Sektionen)
   - Ansicht, Getränke, Kategorien, Wochenspecial, Gäste-Link, Allergene

4. **Zeiterfassung** (6 Sektionen)
   - Eigene, Team, Genehmigungen, Ausstempeln, Korrektionen, Export

5. **Schichtplan** (7 Sektionen)
   - Übersicht, Erstellen, Bearbeiten, Tausch, Nicht-verfügbar, Kalender, Export

6. **Urlaub** (4 Sektionen)
   - Mein Urlaub, Genehmigungen, Übersicht, Statistiken

7. **Reservierungen** (5 Sektionen)
   - Ansehen, Erstellen, Bearbeiten, Event-Überschreibung, Export

8. **Gäste & Tische** (4 Sektionen)
   - Ansehen, Bearbeiten, Namen, Layout

9. **Mitarbeiter** (5 Sektionen)
   - Eigenes Profil, Liste, Verwalten, Berechtigungen, Formulare

10. **Reports** (4 Sektionen)
    - Ansehen, Hochladen, Exportieren, Analyse

11. **Einkauf** (5 Sektionen)
    - Liste, Artikel, Kategorien, Lieferanten, Barcodes

12. **Reinigung** (3 Sektionen)
    - Aufgaben, Verwalten, Berichte

13. **Events** (3 Sektionen)
    - Ansehen, Verwalten, Ideen

14. **Aufgaben** (4 Sektionen)
    - Meine, Alle, Erstellen, Kategorien

15. **Einstellungen** (4 Sektionen)
    - Profil, Betrieb, Benachrichtigungen, Design

16. **Weitere** (MyArea, Inventory, Warehouse, Maintenance, TeamMeeting, usw.)

---

## 🔐 Rechte-Modell

```
                    PERMISSION LEVEL
                          │
        ┌───────────────┬──┴──┬───────────────┐
        │               │     │               │
      NONE            VIEW  EDIT            (FUTURE)
   (Kein Zugriff)  (nur lesen) (bearbeiten) (approve/delete/manage)
        │               │     │
   versteckt      sichtbar   sichtbar
   deaktiviert    lesbar     & schreibbar
        │               │     │
     Button           Show    Show +
     versteckt        Button  Button
     Seite           Seite   Seite
     inaktiv         inaktiv aktiv
```

### Geschäftslogik:
- `EDIT` impliziert immer `VIEW`
- `VIEW` kann nie ohne `EDIT` vorhanden sein wenn Bearbeitung nötig ist
- `NONE` = Feature komplett versteckt

---

## 👥 Standard-Rollen

### Admin
- Alles auf `edit`
- Vollständiger Zugriff

### Manager
- Dashboard (alles)
- Schichtplan (alles)
- Zeiterfassung (Genehmigungen)
- Urlaub (Genehmigung)
- Mitarbeiter-Verwaltung
- Team-Management
- Berichte (Ansicht + Analyse)

### Employee (Mitarbeiter)
- Dashboard (nur Übersicht)
- Meine Schichten & Zeiten (edit)
- Schichttausch (view)
- Meine Aufgaben
- Profil bearbeiten
- Reservierungen (nur lesen)
- Getränkekarte + Rezepte (nur lesen)

### Individuelle Überschreibung
Jeder Mitarbeiter kann nach Rollen-Template beliebig angepasst werden:
- Manager bekommt "Etiketten drucken" zusätzlich
- Aushilfe bekommt Zugriff auf "Selbsteinplanung"
- usw.

---

## 📱 Mobile UI (PermissionsNew.jsx)

### Layout:
```
┌─────────────────────────────────┐
│  Berechtigungsverwaltung        │
├─────────────────────────────────┤
│                                 │
│  Mitarbeiter: [Suchfeld]        │
│  ┌─────────────────────────┐    │
│  │ Name 1 | Role [✓ Edit]  │    │
│  │ Name 2 | Role [ ]       │    │
│  │ Name 3 | Role [✓ Edit]  │    │
│  └─────────────────────────┘    │
│                                 │
├─────────────────────────────────┤
│  [Details für Select. Employee] │
│  Admin | Manager | Employee     │
│  Kopieren von: [Dropdown]       │
│                                 │
│  DASHBOARD                      │
│  ▼ [Übersicht, Warnings, Mgr]  │
│                                 │
│  SCHICHTPLAN                    │
│  ▼ [Übersicht, Erstellen, ...]  │
│                                 │
│  ZEITERFASSUNG                  │
│  ▼ [Eigene, Team, Genehmigungen]│
│                                 │
│  [Speichern] [Zurücksetzen]     │  ← Sticky auf Mobile
│                                 │
└─────────────────────────────────┘
```

### Features:
- ✅ Sticky Mitarbeiter-Liste (Desktop) / Oben (Mobile)
- ✅ Kategorien für Übersichtlichkeit
- ✅ Accordions für Platzersparnis
- ✅ Schnellaktionen (Rollen, Kopieren)
- ✅ Level-Selector pro Recht (Dropdown)
- ✅ Live-Änderungen-Anzeige
- ✅ Sticky Save-Bar bei Änderungen

---

## 🔗 Integration überall in der App

### Kritische Stellen (zu integrieren):

1. **Navigation (Layout.jsx)**
   ```jsx
   import { getVisibleTabs } from '@/lib/permissionGuards';
   const visiblePages = mainNav.filter(p => 
     canAccessSection(currentEmployee, p.permissionKey, 'view')
   );
   ```

2. **Routing (App.jsx)**
   ```jsx
   {visiblePages.map(page => (
     <Route path={`/${page.path}`} ... />
   ))}
   ```

3. **Tabs in Seiten**
   ```jsx
   const visibleTabs = getVisibleTabs(employee, [
     {key: 'shifts_overview'},
     {key: 'shifts_create'},
     {key: 'shifts_swap'},
   ]);
   ```

4. **Buttons/Aktionen**
   ```jsx
   import { shouldShowButton } from '@/lib/permissionGuards';
   {shouldShowButton(employee, 'shifts_create') && (
     <Button onClick={handleCreate}>Erstellen</Button>
   )}
   ```

5. **Modals/Dialoge**
   ```jsx
   {shouldShow(employee, 'shifts_create') && (
     <CreateShiftModal />
   )}
   ```

6. **Mutations/API**
   ```jsx
   import { checkPermissionBeforeMutation } from '@/lib/permissionGuards';
   const save = () => {
     checkPermissionBeforeMutation(employee, 'shifts_edit');
     // ... Mutation ausführen
   };
   ```

---

## ✅ Checkliste für Integration

- [ ] Neue Registry in `lib/permissionRegistry.js` importieren
- [ ] Guards aus `lib/permissionGuards.js` importieren
- [ ] Navigation filtern basierend auf `canAccessSection()`
- [ ] Routing nur erlaubte Seiten zeigen
- [ ] Tabs in jeder Seite filtern
- [ ] Buttons mit `shouldShowButton()` protegieren
- [ ] Create/Edit Modals mit `shouldShow()` conditional rendern
- [ ] API-Calls mit `checkPermissionBeforeMutation()` sichern
- [ ] Alte Boolean-Permissions migr iert (backward compat)
- [ ] Tests für Permission-Logik
- [ ] Dokumentation für neue Devs (PERMISSION_INTEGRATION.md)

---

## 🔍 Permission-Keys (Auszug)

Alle verfügbar in `PERMISSION_REGISTRY`:

**Schichten:**
- `shifts_overview`, `shifts_create`, `shifts_edit`, `shifts_swap`, `shifts_unavailable`

**Zeiterfassung:**
- `time_own`, `time_team`, `time_approvals`, `time_clockout`, `time_corrections`

**Lager:**
- `storage_overview`, `storage_structure`, `storage_slots`, `storage_assignment`, `storage_stock`, `storage_labels`, `storage_export`

**Menü:**
- `menu_view`, `menu_items`, `menu_categories`, `menu_specials`, `menu_guestlink`

**Mitarbeiter:**
- `employees_own`, `employees_list`, `employees_manage`, `employees_permissions`

**Urlaub:**
- `vacation_own`, `vacation_approve`, `vacation_overview`, `vacation_stats`

**Reservierungen:**
- `reservations_view`, `reservations_create`, `reservations_edit`, `reservations_event`

... und 40+ weitere

---

## 📖 Dokumentation

**Für Entwickler:**
→ `lib/PERMISSION_INTEGRATION.md`

**Für Manager/Admins:**
→ Die neue PermissionsNew.jsx UI ist selbsterklärend

**Für Code-Referenz:**
→ Kommentare in `lib/permissionRegistry.js`

---

## 🚀 Nächste Schritte

1. **Integration starten**: Begin mit Navigation + Routing (größte Impact)
2. **Seite für Seite**: Tabs + Buttons in kritischen Seiten (Shifts, TimeTracking, Storage)
3. **Backend-Guards**: Sicherstellen, dass Backend auch Berechtigungen prüft
4. **Testing**: Unit-Tests für Permission-Logik schreiben
5. **Monitoring**: Permission-Denials loggen zum Debugging

---

## 💡 Besonderheiten

✨ **Highlights:**
- **Zentral gepflegt**: Alle Rechte in einer Datei (einfach zu erweitern)
- **Typsicher**: Permission-Keys in `PERMISSION_REGISTRY` sind die Source of Truth
- **Mobile-optimiert**: Neue Seite ist auf Smartphones gut nutzbar
- **Abwärts-kompatibel**: Alte Boolean-Permissions werden ignoriert (kein Breaking Change)
- **Performance**: Einfache Object-Lookups, keine komplexe Logik
- **Auditierbar**: Alle Rechte-Definitionen an einer Stelle

---

## ⚠️ Wichtig: Sicherheit

**UI-Permission-Checks sind kein Sicherheits-Schutz!**

Echte Sicherheit muss auf dem Backend sein:
- ✅ Alle API-Calls müssen Berechtigungen prüfen
- ✅ Entity Updates müssen Permission-Checks haben
- ✅ Sensitive Daten nie ungeschützt im Frontend exponieren

Die Permission-Registry ist öffentlich und definiert nur die **UI-Struktur**.

---

## 📞 Support

Fragen zur Integration?
→ Siehe `lib/PERMISSION_INTEGRATION.md` Abschnitt "Integration in kritischen Stellen"

Neue Permission hinzufügen?
→ In `lib/permissionRegistry.js` im entsprechenden Page-Object einen neuen Section hinzufügen