# Permission-System Integrations-Guide

## Überblick

Das neue Permission-System basiert auf 3 Ebenen:
1. **Seite** (Page): z.B. Dashboard, Schichtplan, Zeiterfassung
2. **Unterbereich** (Section): z.B. "Schichten erstellen", "Genehmigungen"
3. **Aktion** (Action): z.B. "Drucken", "Löschen", "Exportieren"

## Zentrale Dateien

- **`lib/permissionRegistry.js`** - Zentrale Definition aller Rechte
- **`lib/permissionGuards.js`** - Helper und Guards für Permission-Checks
- **`pages/PermissionsNew.jsx`** - Neue Berechtigungsseite (Mobile-Optimiert)

## Integration in der App

### 1. Berechtigungscheck in Komponenten

```jsx
import { canAccessSection } from '@/lib/permissionGuards';

export default function MyComponent({ currentEmployee }) {
  if (!canAccessSection(currentEmployee, 'shifts_create')) {
    return <PermissionDenied />;
  }
  
  return <ShiftCreationForm />;
}
```

### 2. Buttons/Aktionen protegieren

```jsx
import { shouldShowButton } from '@/lib/permissionGuards';

<Button
  disabled={!shouldShowButton(employee, 'shifts_edit')}
  onClick={handleEdit}
>
  Bearbeiten
</Button>
```

### 3. Tabs/Navigation filtern

```jsx
import { getVisibleTabs } from '@/lib/permissionGuards';

const allTabs = [
  { key: 'storage_overview', label: 'Übersicht' },
  { key: 'storage_structure', label: 'Struktur' },
  { key: 'storage_labels', label: 'Etiketten' },
];

const visibleTabs = getVisibleTabs(employee, allTabs);
```

### 4. Bedingte Rendering

```jsx
import { shouldShow } from '@/lib/permissionGuards';

{shouldShow(employee, 'dashboard_manager') && <ManagerPanel />}
```

### 5. API/Mutation Guard

```jsx
import { checkPermissionBeforeMutation } from '@/lib/permissionGuards';

const handleSave = async (data) => {
  checkPermissionBeforeMutation(employee, 'shifts_edit', 'edit');
  // Mutation ausführen
};
```

## Permission-Keys in der Registry

### Dashboard
- `dashboard_overview` - Kennzahlen ansehen
- `dashboard_warnings` - Warnungen ansehen
- `dashboard_manager` - Manager-Panel

### Schichtplan (Shifts)
- `shifts_overview` - Übersicht ansehen
- `shifts_create` - Schichten erstellen
- `shifts_edit` - Schichten bearbeiten/löschen
- `shifts_swap` - Schichttausch
- `shifts_unavailable` - Nicht verfügbar
- `shifts_calendar` - Teamkalender
- `shifts_export` - Export

### Zeiterfassung (TimeTracking)
- `time_own` - Eigene Zeiten
- `time_team` - Teamzeiten ansehen
- `time_approvals` - Genehmigungen
- `time_clockout` - Aktives Ausstempeln
- `time_corrections` - Korrektionen

### Lagerplätze (Storage)
- `storage_overview` - Übersicht
- `storage_structure` - Struktur verwalten
- `storage_slots` - Fächer verwalten
- `storage_assignment` - Artikel zuordnen
- `storage_stock` - Bestände
- `storage_labels` - Etiketten + Druck
- `storage_export` - Export

### Getränkekarte (Menu)
- `menu_view` - Ansehen
- `menu_items` - Getränke bearbeiten
- `menu_categories` - Kategorien
- `menu_specials` - Wochenspecial
- `menu_guestlink` - Gäste-Link
- `menu_allergens` - Allergene

### Reservierungen
- `reservations_view` - Ansehen
- `reservations_create` - Erstellen
- `reservations_edit` - Bearbeiten/Löschen
- `reservations_event` - Event-Überschreibung
- `reservations_export` - Export

### Mitarbeiter
- `employees_own` - Eigenes Profil
- `employees_list` - Liste ansehen
- `employees_manage` - Verwalten
- `employees_permissions` - Berechtigungen
- `employees_forms` - Personalbogen exportieren

### Urlaub (Vacation)
- `vacation_own` - Mein Urlaub
- `vacation_approve` - Genehmigungen (Manager)
- `vacation_overview` - Team-Übersicht
- `vacation_stats` - Statistiken/Export

### Weitere
- Cleaning: `cleaning_tasks`, `cleaning_manage`, `cleaning_reports`
- Todos: `todos_own`, `todos_all`, `todos_create`, `todos_categories`
- Einkauf: `shopping_list`, `shopping_articles`, `shopping_suppliers`, `shopping_barcodes`
- Events: `events_view`, `events_manage`, `events_ideas`
- Reports: `reports_view`, `reports_upload`, `reports_export`, `reports_analysis`
- Wartung: `maintenance_tasks`
- Teamsitzung: `meeting_topics`, `meeting_manage`

## Rechte-Level

Jeder Permission kann einen dieser Werte haben:

- **`none`** - Kein Zugriff / nicht sichtbar
- **`view`** - Sichtbar / nur lesen
- **`edit`** - Sichtbar und bearbeiten

## Standard-Rollen

### Admin
- Vollständiger Zugriff auf alle Funktionen (alle Rechte auf `edit`)

### Manager
- Dashboard, Schichtplan (alles), Zeiterfassung (Genehmigungen), Urlaub (Genehmigung)
- Mitarbeiter verwalten, Team-Management

### Employee
- Dashboard (Übersicht), Meine Schichten, Meine Zeiten, Aufgaben, Profil
- Schichttausch, Nicht-verfügbar, Reservierungen (lesen)

## Integration in kritischen Stellen

### 1. Navigation (Layout.jsx)
```jsx
import { getVisibleTabs } from '@/lib/permissionGuards';

// Filter Navs basierend auf Mitarbeiter-Berechtigungen
const visiblePages = mainNavigation.flatMap(section =>
  section.pages.filter(p => canAccessSection(currentEmployee, p.permissionKey, 'view'))
);
```

### 2. Routing (App.jsx)
```jsx
// Nur Seiten rendern, auf die Mitarbeiter Zugriff hat
{visiblePages.map(page => (
  <Route
    path={`/${page.path}`}
    element={<ProtectedPage page={page} />}
  />
))}
```

### 3. Tabs innerhalb von Seiten
```jsx
// In pages/Shifts.jsx beispielsweise:
const shiftsTabs = [
  { key: 'shifts_overview', label: 'Übersicht' },
  { key: 'shifts_create', label: 'Neue Schicht' },
  { key: 'shifts_swap', label: 'Tausch' },
];

const visibleTabs = getVisibleTabs(currentEmployee, shiftsTabs);
```

### 4. Buttons und Aktionen
```jsx
// Import Protection Helpers
import { shouldShowButton, isButtonDisabled } from '@/lib/permissionGuards';

{shouldShowButton(employee, 'shifts_create') && (
  <Button
    disabled={isButtonDisabled(employee, 'shifts_create', 'edit')}
    onClick={handleCreateShift}
  >
    Schicht erstellen
  </Button>
)}
```

### 5. Modals/Dialoge
```jsx
// Nur öffnen wenn Berechtigung vorhanden
const canCreate = shouldShow(employee, 'shifts_create');

{canCreate && (
  <ShiftCreateModal open={open} onOpenChange={setOpen} />
)}
```

## Migration von alten Rechten zu neuem System

Falls bestehende `permissions` Object mit den alten Boolean-Keys vorhanden sind:

```javascript
// Alt:
{ canEditShifts: true, canViewShifts: true }

// Neu: Werden automatisch auf Standardrolle gemappt
// + können dann detailliert überschrieben werden
```

Die `getEmployeePermissions()` Funktion in `permissionRegistry.js` handhabt:
1. Rollen-Template laden (Admin/Manager/Employee)
2. Mitarbeiter-spezifische Overrides applizieren
3. Alte Permissions ignorieren (backward compatible)

## Lokales Testen

### 1. Test-Berechtigungen
```jsx
import { canAccessSection } from '@/lib/permissionGuards';

const testEmp = {
  name: 'Test User',
  permissions: {
    shifts_create: 'edit',
    shifts_edit: 'view',
    time_approvals: 'none',
  }
};

console.log(canAccessSection(testEmp, 'shifts_create', 'edit')); // true
console.log(canAccessSection(testEmp, 'shifts_edit', 'edit'));  // false
console.log(canAccessSection(testEmp, 'time_approvals', 'view')); // false
```

### 2. Rollen-Templates testen
```jsx
import { STANDARD_ROLES } from '@/lib/permissionRegistry';

const managerPerms = STANDARD_ROLES.manager.permissions;
console.log(Object.keys(managerPerms).length); // Sollte ~20+ sein
```

## Häufige Integration-Stellen (Checkliste)

- [ ] **Navigation**: Filter nach Mitarbeiter-Berechtigungen
- [ ] **Routing**: Nur erlaubte Seiten rendern
- [ ] **Tabs**: Nur erlaubte Reiter anzeigen
- [ ] **Buttons**: Erstellen, Bearbeiten, Löschen protegieren
- [ ] **Modals**: Nur öffnen wenn Berechtigung vorhanden
- [ ] **Mutations**: API-Guards vor Ausführung
- [ ] **Exports/Drucken**: Export-Buttons protegieren
- [ ] **Manager-Panels**: Nur für berechtigte Manager zeigen
- [ ] **Genehmigungen**: Approval-Tabs nur wenn `_approve` Recht

## Debugging

```javascript
import { getPermissionLevel } from '@/lib/permissionGuards';

const level = getPermissionLevel(employee, 'shifts_create');
console.log(`Recht für shifts_create: ${level}`); // 'none' | 'view' | 'edit'
```

## Performance

Die Guards sind lightweight - sie machen einfach Object-Lookups. Für große Listen:

```jsx
// Slow (Check pro Item)
items.map(item => canAccessSection(emp, item.key) && ...)

// Fast (Bulk Filter)
import { filterByPermission } from '@/lib/permissionGuards';
const visible = filterByPermission(emp, items);
```

## Sicherheit

⚠️ **WICHTIG**: Permission-Checks in der UI sind NUR UI-Schutz.

Die echte Sicherheit muss auf dem Backend sein:
- Alle API-Calls validieren Berechtigungen
- Entity-Updates prüfen Permission
- Sensible Daten nie im Frontend exponieren

Die Permission-Registry ist **öffentlich zugänglich** - Sie definiert nur die UI-Struktur.

## Next Steps

1. **Bestehende Seiten aktualisieren**: Permission-Guards in kritischen Stellen einbauen
2. **Test-Coverage**: Unit-Tests für Permission-Logik
3. **Documentation**: Diese Datei in App-Wiki integrieren
4. **Monitoring**: Permission-Denials loggen/monitorieren