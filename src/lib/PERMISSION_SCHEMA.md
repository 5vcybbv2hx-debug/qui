# Permission Data Schema & Structure

## 🗂️ Datenstruktur in Employee-Entity

### Employee.permissions Field (neu)

Speichert alle Berechtigungen als flaches Objekt:

```javascript
{
  // Boolean → String Rechte
  // Jeder Schlüssel ist ein Permission-Key aus der Registry
  // Jeder Wert ist: 'none' | 'view' | 'edit'
  
  // Beispiel:
  permissions: {
    // Dashboard
    "dashboard_overview": "view",
    "dashboard_warnings": "view",
    "dashboard_manager": "edit",
    
    // Schichten
    "shifts_overview": "view",
    "shifts_create": "edit",
    "shifts_edit": "edit",
    "shifts_swap": "view",
    "shifts_unavailable": "edit",
    "shifts_calendar": "view",
    "shifts_export": "none",
    
    // Zeiterfassung
    "time_own": "edit",
    "time_team": "view",
    "time_approvals": "none",
    "time_clockout": "none",
    
    // Lager
    "storage_overview": "view",
    "storage_structure": "none",
    "storage_labels": "edit",
    
    // ... alle anderen Berechtigungen
  }
}
```

---

## 📋 PERMISSION_REGISTRY Struktur

```javascript
PERMISSION_REGISTRY = {
  [pageKey]: {
    pageKey: string,              // Eindeutige ID
    displayName: string,          // "Schichtplan"
    description: string,          // "Schichten planen..."
    category: string,             // "HR" | "Inventory" | "Operations" | ...
    
    sections: {
      [sectionKey]: {
        key: string,              // Eindeutige Permission-ID
        displayName: string,       // "Schichten erstellen"
        description: string,       // "Neue Schichten eintragen"
        actions: array<string>,    // ['view', 'edit', 'delete', 'print']
      },
      // ... mehr Sections
    }
  },
  // ... mehr Seiten
}
```

### Beispiel Detail:
```javascript
shifts: {
  pageKey: "Shifts",
  displayName: "Schichtplan",
  description: "Schichten planen, tauschen und verwalten",
  category: "HR",
  
  sections: {
    overview: {
      key: "shifts_overview",
      displayName: "Übersicht",
      description: "Schichtplan ansehen und filtern",
      actions: ["view"]
    },
    create: {
      key: "shifts_create",
      displayName: "Schichten erstellen",
      description: "Neue Schichten eintragen",
      actions: ["view", "edit"]
    },
    edit: {
      key: "shifts_edit",
      displayName: "Schichten bearbeiten",
      description: "Bestehende Schichten ändern oder löschen",
      actions: ["view", "edit", "delete"]
    },
    swap: {
      key: "shifts_swap",
      displayName: "Schichttausch",
      description: "Schichten tauschen und Tauschvermittlung",
      actions: ["view", "edit"]
    }
  }
}
```

---

## 👤 Employee-Objekt (vollständig)

```javascript
{
  id: "123abc",
  name: "Max Mustermann",
  short_name: "MM",
  role: "Manager",           // Bestimmt Rollen-Template
  email: "max@bar.de",
  phone: "030/1234567",
  color: "#FF5733",
  
  // ─── NEU: Berechtigungen ───
  permissions: {
    // Hat standardmäßig alle Manager-Rechte
    // + individuelle Overrides
    
    // Überschreibt Manager-Template:
    "storage_labels": "edit",    // Normaler Manager würde "none" haben
    "time_approvals": "none",    // Nimmt dem Manager ein Recht weg
  },
  
  // Alte Felder (für Abwärtskompatibilität, werden ignoriert):
  canViewDashboard: true,
  canEditShifts: true,
  // ... alte Boolean-Permissions
}
```

---

## 🔄 Datenfluss

```
Employee in DB
      │
      ▼
getEmployeePermissions(employee)
      │
      ├─→ Hole Rollen-Template (z.B. Manager)
      │   {dashboard_overview: 'view', shifts_edit: 'edit', ...}
      │
      ├─→ Merge mit employee.permissions Overrides
      │   {'storage_labels': 'edit', 'time_approvals': 'none'}
      │
      ▼
Finale Permissions-Objekt
{
  dashboard_overview: 'view',      ← Aus Manager-Template
  shifts_edit: 'edit',             ← Aus Manager-Template
  storage_labels: 'edit',          ← Override
  time_approvals: 'none',          ← Override
  ... alle anderen Manager-Rechte
}
      │
      ▼
canAccessSection(employee, 'shifts_edit', 'edit')
      │
      ▼
Lookup: permissions['shifts_edit'] === 'edit'
      │
      ▼
true / false
```

---

## 📊 PERMISSION LEVELS Mapping

```javascript
PERMISSION_LEVELS = {
  NONE: 'none',   // 0 - Kein Zugriff
  VIEW: 'view',   // 1 - Nur Lesen
  EDIT: 'edit',   // 2 - Bearbeiten
}

// Implizite Hierarchie (nicht enforce, nur konzeptionell):
// none < view < edit
```

### Was bedeutet jedes Level:

#### `'none'`
- Feature ist in der UI komplett versteckt
- Buttons sind nicht sichtbar
- Seite ist nicht in Navigation
- Bei direktem Zugriff: Redirect zu Unauthorized
- Best für: Manager-Panels, Admin-Funktionen, sensitive Bereiche

#### `'view'`
- Feature ist sichtbar
- Nur Lesezugriff (Buttons deaktiviert)
- Listen können angeschaut werden
- Keine Create/Edit/Delete möglich
- Best für: Berichte, Team-Übersicht, Monitoring

#### `'edit'`
- Feature ist sichtbar
- Volle Lese- und Schreibzugriff
- Create, Read, Update, Delete möglich
- Best für: Normal-Nutzungsfall, Vollzugriff

---

## 🗃️ STANDARD_ROLES Struktur

```javascript
STANDARD_ROLES = {
  admin: {
    displayName: "Admin",
    description: "Vollständiger Zugriff auf alle Funktionen",
    permissions: {
      // Alle Rechte auf 'edit'
      [every_permission_key]: 'edit'
    }
  },
  
  manager: {
    displayName: "Manager",
    description: "Manager-Funktionen: Planung, Genehmigungen, Team",
    permissions: {
      // Ausgewählte Rechte auf verschiedenen Levels
      dashboard_overview: 'view',
      dashboard_warnings: 'view',
      dashboard_manager: 'edit',
      
      shifts_overview: 'view',
      shifts_create: 'edit',
      shifts_edit: 'edit',
      // ...
      
      time_approvals: 'edit',
      employees_manage: 'edit',
      // ... etc
    }
  },
  
  employee: {
    displayName: "Mitarbeiter",
    description: "Basis-Zugriff: Meine Schichten, Zeiten, Aufgaben",
    permissions: {
      // Minimale Rechte
      dashboard_overview: 'view',
      shifts_overview: 'view',
      shifts_swap: 'view',
      time_own: 'edit',
      // ...
    }
  }
}
```

---

## 🔀 Kombinieren: Rolle + Overrides

```javascript
// Szenario: Max ist Manager, bekommt aber extra "Etiketten drucken"

const employee = {
  id: "123",
  name: "Max",
  role: "Manager",
  permissions: {
    'storage_labels': 'edit'  // Override
  }
};

const final = getEmployeePermissions(employee);
// Result:
// {
//   ... alle Manager-Rechte (aus STANDARD_ROLES.manager) ...
//   'storage_labels': 'edit',  // ← Override angewendet
//   // Falls Manager standardmäßig storage_labels: 'none' hätte,
//   // wird es hier zu 'edit' überschrieben
// }
```

---

## 🗂️ Kategorien in Registry

```javascript
// Alle Seiten sind nach Kategorie gruppiert:

PERMISSION_REGISTRY = {
  // Core
  dashboard: { category: 'Core', ... },
  myArea: { category: 'Core', ... },
  
  // HR
  shifts: { category: 'HR', ... },
  timeTracking: { category: 'HR', ... },
  vacation: { category: 'HR', ... },
  employees: { category: 'HR', ... },
  
  // Inventory
  storage: { category: 'Inventory', ... },
  drinkMenu: { category: 'Inventory', ... },
  shopping: { category: 'Inventory', ... },
  recipes: { category: 'Inventory', ... },
  
  // Operations
  reservations: { category: 'Operations', ... },
  seating: { category: 'Operations', ... },
  cleaning: { category: 'Operations', ... },
  todos: { category: 'Operations', ... },
  events: { category: 'Operations', ... },
  teamMeeting: { category: 'Operations', ... },
  
  // Analytics
  reports: { category: 'Analytics', ... },
  salesAnalysis: { category: 'Analytics', ... },
  
  // Admin
  settings: { category: 'Admin', ... },
  auditLog: { category: 'Admin', ... },
}
```

---

## 📈 Migrations von Alt zu Neu

### Altes System (Boolean-Permissions)
```javascript
permissions: {
  canViewDashboard: true,
  canViewShifts: true,
  canEditShifts: true,
  canViewEmployees: true,
  canEditEmployees: false,
  // ...
}
```

### Neues System (String-Levels)
```javascript
permissions: {
  'dashboard_overview': 'view',
  'shifts_overview': 'view',
  'shifts_edit': 'edit',
  'employees_list': 'view',
  'employees_manage': 'none',
  // ...
}
```

### Migration-Logik (in getEmployeePermissions):
```javascript
function getEmployeePermissions(employee) {
  // 1. Hole Rollen-Template basierend auf role
  const roleTemplate = STANDARD_ROLES[employee.role] || STANDARD_ROLES.employee;
  const merged = {...roleTemplate.permissions};
  
  // 2. Merge mit employee.permissions (neue Format)
  if (employee.permissions && typeof employee.permissions === 'object') {
    // Filtere nur neue Permission-Keys
    Object.entries(employee.permissions).forEach(([key, value]) => {
      if (['none', 'view', 'edit'].includes(value)) {
        merged[key] = value;  // Ist neues Format
      }
      // Boolean-Werte ignorieren (altes Format)
    });
  }
  
  return merged;
}
```

---

## 🎯 Wichtige Invarianten

1. **Jeder Permission-Key ist eindeutig**
   - Keine Duplikate in der Registry
   - Format: `${page}_${section}` (z.B. `shifts_create`)

2. **Permissions sind flat (nicht nested)**
   - Nicht: `{shifts: {create: 'edit'}}`
   - Sondern: `{shifts_create: 'edit'}`
   - Einfaches Lookup in JS-Objekten

3. **Employee.permissions ist optional**
   - Fehlen bedeutet: Rollen-Template wird 1:1 verwendet
   - Vorhandene Keys überschreiben Template-Values
   - Unbekannte Keys werden ignoriert

4. **Keine Implikationen zwischen Permissions**
   - `shifts_create: 'edit'` impliziert NICHT `shifts_overview: 'view'`
   - Jedes Recht wird einzeln gecheckt
   - UI muss sicherstellen, dass logische Abhängigkeiten erfüllt sind

---

## 💾 Speichern in DB

```javascript
// Employee-Entity speichert einfach permissions-Objekt:
{
  id: "123",
  name: "Max",
  role: "Manager",
  permissions: {
    'storage_labels': 'edit',
    'time_approvals': 'none'
  },
  // ... andere Felder
}

// Bei Update:
await base44.entities.Employee.update(id, {
  permissions: {
    'storage_labels': 'edit',
    'time_approvals': 'none',
    'shifts_create': 'edit'
  }
});
```

---

## 🔍 Abfrage-Pattern

```javascript
// Get alle Rechte eines Mitarbeiters
const perms = getEmployeePermissions(employee);

// Check einzelnes Recht
const canEdit = canAccessSection(employee, 'shifts_edit', 'edit');

// Get Level
const level = getPermissionLevel(employee, 'shifts_edit');
// Returns: 'none' | 'view' | 'edit'

// Bulk-Check: alle haben Zugriff?
const allCan = hasAllPermissions(employee, [
  'shifts_edit',
  'shifts_create'
], 'edit');

// Check: mindestens eines?
const anyCan = hasAnyPermission(employee, [
  'time_approvals',
  'time_clockout'
], 'edit');
```

---

## 📝 TypeScript Interface (falls später gebraucht)

```typescript
interface PermissionLevel {
  NONE: 'none';
  VIEW: 'view';
  EDIT: 'edit';
}

interface Section {
  key: string;
  displayName: string;
  description: string;
  actions: string[];
}

interface Page {
  pageKey: string;
  displayName: string;
  description: string;
  category: string;
  sections: Record<string, Section>;
}

interface PermissionRegistry {
  [key: string]: Page;
}

interface StandardRole {
  displayName: string;
  description: string;
  permissions: Record<string, 'none' | 'view' | 'edit'>;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  permissions?: Record<string, 'none' | 'view' | 'edit'>;
  // ... andere Felder
}
```

---

## ✅ Validierung

```javascript
// Ist ein Permission-Key valid?
function isValidPermissionKey(key) {
  return Object.values(PERMISSION_REGISTRY).some(page =>
    Object.values(page.sections).some(section => section.key === key)
  );
}

// Ist ein Permission-Level valid?
function isValidPermissionLevel(level) {
  return ['none', 'view', 'edit'].includes(level);
}

// Validate Employee.permissions object
function validatePermissions(perms) {
  Object.entries(perms).forEach(([key, level]) => {
    if (!isValidPermissionKey(key)) {
      console.warn(`Invalid permission key: ${key}`);
    }
    if (!isValidPermissionLevel(level)) {
      console.warn(`Invalid permission level: ${level}`);
    }
  });
}
``