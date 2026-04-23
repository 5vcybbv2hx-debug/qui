# Permission-System Quick Reference

## 1️⃣ Import Guards

```javascript
import { 
  canAccessSection,
  shouldShowButton,
  shouldShow,
  getVisibleTabs,
  filterByPermission,
  checkPermissionBeforeMutation
} from '@/lib/permissionGuards';

import {
  PERMISSION_REGISTRY,
  STANDARD_ROLES,
  getEmployeePermissions
} from '@/lib/permissionRegistry';
```

---

## 2️⃣ Häufige Patterns

### Check ob User Zugriff hat
```jsx
if (canAccessSection(employee, 'shifts_create', 'edit')) {
  // Zugriff gewährt
}
```

### Button conditional rendern
```jsx
{shouldShowButton(employee, 'shifts_edit') && (
  <Button onClick={handleEdit}>Bearbeiten</Button>
)}
```

### Ganze Section verstecken?
```jsx
{shouldShow(employee, 'dashboard_manager') && (
  <ManagerPanel />
)}
```

### Tabs filtern
```jsx
const visibleTabs = getVisibleTabs(employee, [
  {key: 'shifts_overview', label: 'Übersicht'},
  {key: 'shifts_create', label: 'Erstellen'},
  {key: 'shifts_swap', label: 'Tausch'},
]);
```

### Mutation protegieren
```jsx
const handleSave = async (data) => {
  try {
    checkPermissionBeforeMutation(employee, 'shifts_edit');
    // Mutation ausführen
  } catch (err) {
    toast.error('Keine Berechtigung');
  }
};
```

### Liste filtern
```jsx
const visibleItems = filterByPermission(employee, items, 'permissionKey');
```

---

## 3️⃣ Permission-Keys (Top 20)

| Seite | Unterbereich | Key |
|-------|-------------|-----|
| **Dashboard** | Übersicht | `dashboard_overview` |
| | Manager-Panel | `dashboard_manager` |
| **Schichten** | Übersicht | `shifts_overview` |
| | Erstellen | `shifts_create` |
| | Bearbeiten | `shifts_edit` |
| | Tausch | `shifts_swap` |
| **Zeit** | Meine Zeiten | `time_own` |
| | Genehmigungen | `time_approvals` |
| | Ausstempeln | `time_clockout` |
| **Lager** | Übersicht | `storage_overview` |
| | Struktur | `storage_structure` |
| | Etiketten | `storage_labels` |
| | Bestände | `storage_stock` |
| **Mitarbeiter** | Verwalten | `employees_manage` |
| | Berechtigungen | `employees_permissions` |
| **Urlaub** | Genehmigung | `vacation_approve` |
| **Reservierungen** | Bearbeiten | `reservations_edit` |
| **Einkauf** | Artikel | `shopping_articles` |
| **Menü** | Getränke editieren | `menu_items` |
| **Cleaning** | Verwalten | `cleaning_manage` |

Vollständige Liste: `lib/permissionRegistry.js`

---

## 4️⃣ Rechte-Level

```
┌──────────────────────────────────┐
│  getEmployeePermissions(emp)     │
│  returns {                       │
│    'shifts_create': 'edit',      │ ← Editierbar
│    'shifts_view': 'view',        │ ← Nur lesen
│    'time_approvals': 'none',     │ ← Kein Zugriff
│  }                               │
└──────────────────────────────────┘
        │         │           │
      'edit'    'view'      'none'
        │         │           │
    ✅ Sehen    ✅ Sehen    ❌ Versteckt
    ✅ Ändern   ❌ Ändern   ❌ Inaktiv
    ✅ Löschen  ❌ Löschen
```

---

## 5️⃣ Rollen anwenden

```javascript
// Get Admin-Rolle
const adminPerms = STANDARD_ROLES.admin.permissions;

// Get Manager-Rolle
const managerPerms = STANDARD_ROLES.manager.permissions;

// Get Employee-Rolle
const employeePerms = STANDARD_ROLES.employee.permissions;

// Mit Overrides kombinieren
const mergedPerms = {
  ...STANDARD_ROLES.manager.permissions,
  'storage_labels': 'edit'  // Extra-Recht hinzufügen
};
```

---

## 6️⃣ Berechtigungen für User holen

```javascript
// Kombiniert Rollen-Template + individuelle Overrides
const permissions = getEmployeePermissions({
  id: '123',
  name: 'Max',
  role: 'manager',  // Role bestimmt Template
  permissions: {    // Overrides
    'storage_labels': 'edit'  // Extra-Rechte
  }
});

// Result:
// {
//   dashboard_overview: 'view',
//   shifts_overview: 'view',
//   shifts_edit: 'edit',
//   ... (alle Manager-Rechte)
//   storage_labels: 'edit'  // Override angewendet
// }
```

---

## 7️⃣ Häufige Seiten-Integrationen

### Seite: Schichtplan (Shifts)
```jsx
import { shouldShow } from '@/lib/permissionGuards';

function ShiftsPage({ currentEmployee }) {
  return (
    <div>
      <ShiftOverview />
      
      {shouldShow(currentEmployee, 'shifts_create') && (
        <Button onClick={openCreateModal}>Neue Schicht</Button>
      )}
      
      {shouldShow(currentEmployee, 'shifts_swap') && (
        <ShiftSwapSection />
      )}
    </div>
  );
}
```

### Seite: Zeiterfassung (TimeTracking)
```jsx
function TimeTrackingPage({ currentEmployee }) {
  const canApprove = canAccessSection(
    currentEmployee, 
    'time_approvals', 
    'edit'
  );

  return (
    <div>
      <div>Meine Zeiten:</div>
      <MyTimeEntries />
      
      {canApprove && (
        <div>
          <h3>Genehmigungen</h3>
          <ApprovalPanel />
        </div>
      )}
    </div>
  );
}
```

### Navigation mit Filtering
```jsx
import { getVisibleTabs } from '@/lib/permissionGuards';

const allTabs = [
  {key: 'shifts_overview', label: 'Übersicht'},
  {key: 'shifts_create', label: 'Neu'},
  {key: 'shifts_swap', label: 'Tausch'},
];

const tabs = getVisibleTabs(currentEmployee, allTabs);
// Nur zeigen wenn Berechtigung vorhanden
```

---

## 8️⃣ Debugging

```javascript
import { getPermissionLevel } from '@/lib/permissionGuards';

// Level für spezifische Permission
const level = getPermissionLevel(employee, 'shifts_create');
console.log(level); // 'none' | 'view' | 'edit'

// Alle Berechtigungen eines Mitarbeiters
const perms = getEmployeePermissions(employee);
console.log(perms);
// {shifts_create: 'edit', time_approvals: 'none', ...}

// Check ob alle erforderlichen Rechte vorhanden
import { hasAllPermissions } from '@/lib/permissionGuards';
const hasAccess = hasAllPermissions(
  employee,
  ['shifts_edit', 'shifts_swap'],
  'edit'
);
```

---

## 9️⃣ Fehlerbehandlung

```javascript
import { 
  checkPermissionBeforeMutation,
  getPermissionDenialMessage 
} from '@/lib/permissionGuards';

try {
  checkPermissionBeforeMutation(employee, 'shifts_edit');
  // Mutation ausführen
} catch (err) {
  const msg = getPermissionDenialMessage('shifts_edit');
  toast.error(msg); // "Du darfst Schichten nicht bearbeiten"
}
```

---

## 🔟 Neue Permission hinzufügen

### 1. In permissionRegistry.js:
```javascript
shifts: {
  // ...
  sections: {
    // ...
    export: {  // ← Neue Section
      key: 'shifts_export',
      displayName: 'Exportieren',
      description: 'Schichtplan als PDF/Excel exportieren',
      actions: ['view', 'export'],
    }
  }
}
```

### 2. In der Komponente:
```jsx
import { shouldShowButton } from '@/lib/permissionGuards';

{shouldShowButton(employee, 'shifts_export') && (
  <Button onClick={handleExport}>Exportieren</Button>
)}
```

### 3. In neue Rollen aufnehmen (optional):
```javascript
STANDARD_ROLES.manager.permissions['shifts_export'] = 'view';
```

---

## ⚡ Performance-Tipps

### Slow ❌
```jsx
// Check für jedes Item einzeln
items.map(item => 
  canAccessSection(emp, item.key) ? <Item /> : null
)
```

### Fast ✅
```jsx
// Bulk-Filter einmal
import { filterByPermission } from '@/lib/permissionGuards';
const visible = filterByPermission(emp, items);
visible.map(item => <Item />)
```

---

## 🛡️ Sicherheit-Checklist

✅ **Frontend:**
- Permission-Checks für UI-Elemente

✅ **Backend:**
- MUSS Permission-Checks haben in:
  - API-Endpoints
  - Entity Updates
  - Delete Operations
  - Admin-Funktionen

⚠️ **Frontend-Checks sind NICHT sicher!**
- Können umgangen werden
- Sind nur für UX
- Backend muss eigene Validation haben

---

## 📚 Weitere Ressourcen

- **Vollständige Dokumentation**: `lib/PERMISSION_INTEGRATION.md`
- **Alle Permission-Keys**: `lib/permissionRegistry.js`
- **Zusammenfassung**: `PERMISSION_SYSTEM_SUMMARY.md`
- **Neue Seite**: `pages/PermissionsNew.jsx`

---

## 🚀 TL;DR

```jsx
import { shouldShow, canAccessSection } from '@/lib/permissionGuards';

// Show nur wenn Zugriff
{shouldShow(emp, 'shifts_create') && <CreateButton />}

// Check Berechtigungen vor Mutation
canAccessSection(emp, 'shifts_edit', 'edit') && handleSave();

// Level holen
const level = getPermissionLevel(emp, 'shifts_edit');
// 'none' | 'view' | 'edit'
``