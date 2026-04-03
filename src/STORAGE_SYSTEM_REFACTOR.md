# Lagerverwaltungssystem — Refactoring-Dokumentation

## 📊 Neue Datenmodelle

### 1. **Location** (Lagerorte)
- **Zweck**: Top-Level-Container für die Lagerstruktur
- **Felder**: `id`, `name`, `description`, `address`, `order`, `is_active`
- **Beziehung**: 1 Location → mehrere Areas
- **Beispiele**: "Lagerkeller", "Bar Hauptbereich", "Lagerraum Küche"

### 2. **Area** (Bereiche)
- **Zweck**: Unterabteilung eines Lagerorts
- **Felder**: `id`, `name`, `area_id` (LocationID), `description`, `icon`, `order`, `is_active`
- **Beziehung**: 1 Area → mehrere Containers
- **Beispiele**: "Kühlbereich", "Trockenlagerung", "Werkzeug"

### 3. **Container** (Möbel/Behälter)
- **Zweck**: Konkrete Lagerplätze (Regale, Schränke, etc.)
- **Felder**: `id`, `name`, `area_id`, `type` (Regal|Schrank|Schublade|Kiste|etc.), `description`, `order`, `is_active`
- **Beziehung**: 1 Container → mehrere StorageAssignments
- **Beispiele**: "Regal A", "Schrank 1", "Kühlvitrine"

### 4. **StorageAssignment** (Artikel-Zuordnungen)
- **Zweck**: Verknüpfung zwischen Artikeln und Lagerplätzen
- **Felder**: 
  - `article_id`, `article_name`, `article_image_url` (Snapshot)
  - `location_id`, `location_name` (Denormalisierung)
  - `area_id`, `area_name` (Denormalisierung)
  - `container_id`, `container_name` (Denormalisierung)
  - `quantity`, `unit` (Stück|l|ml|kg|g)
  - `min_stock` (optional)
  - `notes`, `last_counted`, `is_active`
- **Beziehung**: m:n zwischen Article und Container (über StorageAssignment)
- **Vorteil**: Artikel aus zentraler Artikelliste, keine Duplikate, flexible Verknüpfung

---

## 🏗️ Datenstruktur-Hierarchie

```
Location (z.B. "Lagerkeller")
├── Area (z.B. "Getränkelagerung")
│   ├── Container (z.B. "Regal A")
│   │   ├── StorageAssignment → Article "Vodka 0,7l" (Qty: 12)
│   │   └── StorageAssignment → Article "Rum 0,75l" (Qty: 8)
│   └── Container (z.B. "Kühlung Bierfass")
│       └── StorageAssignment → Article "Heineken Draft" (Qty: 2)
└── Area (z.B. "Werkzeugbereich")
    └── Container (z.B. "Schrank Reinigung")
        ├── StorageAssignment → Article "Reinigungstücher" (Qty: 50)
        └── StorageAssignment → Article "Spülmittel 5L" (Qty: 3)
```

---

## 🧩 Wiederverwendbare Komponenten

### **LocationSelect**
- **Pfad**: `components/storage/LocationSelect.jsx`
- **Feature**: Lagerorte auswählen + inline "Neuer Lagerort" Button
- **Dialog**: Schnellerstellung neuer Lagerorte direkt im Formular
- **Rückgabewert**: `location_id`

### **AreaSelect**
- **Pfad**: `components/storage/AreaSelect.jsx`
- **Feature**: Bereiche auswählen (filtered by Location)
- **Dialog**: Inline "Neuer Bereich" Erstellung
- **Abhängigkeit**: erfordert `areaId` zum Filtern
- **Rückgabewert**: `area_id`

### **ContainerSelect**
- **Pfad**: `components/storage/ContainerSelect.jsx`
- **Feature**: Behälter auswählen (filtered by Area)
- **Dialog**: Inline "Neuer Behälter" Erstellung
- **Abhängigkeit**: erfordert `areaId` zum Filtern
- **Rückgabewert**: `container_id`

### **ArticleSelect**
- **Pfad**: `components/storage/ArticleSelect.jsx`
- **Feature**: Artikel aus zentraler Artikelliste (mit Live-Suche)
- **Suche**: Name, Hersteller, Barcode
- **Limit**: Zeigt max. 20 Artikel (Performance)
- **Rückgabewert**: `article_id`

---

## 🎯 Neue Storage-Seite (StorageRefactored)

### **Tab 1: Struktur verwalten**
- **Funktion**: Visualisierung der Lagerhierarchie
  - Location (collapsible)
    - Area mit Icon (collapsible)
      - Container mit Typ (inline)
- **Aktionen**:
  - ➕ Neuen Lagerort erstellen
  - ✏️ Bereich/Behälter bearbeiten (über Modal)
  - 🗑️ Lagerort löschen (soft-delete via `is_active: false`)
- **Mobile**: Expandable/Collapsible Struktur für kompakte Ansicht

### **Tab 2: Artikel zuordnen**
- **Funktion**: Verwaltung von StorageAssignments
- **Formular**:
  1. Artikel wählen (mit Suche)
  2. Lagerort wählen
  3. Bereich wählen (filtered by Location)
  4. Behälter wählen (filtered by Area)
  5. Menge eingeben
  6. Einheit wählen
  7. Mindestbestand (optional)
  8. Notizen (optional)
- **Anzeige**: Grid von Zuordnungen mit:
  - Artikel-Name + Lagerort-Breadcrumb
  - Menge + Einheit
  - ⚠️ Rot-Hervorhebung wenn unter Mindestbestand
  - Edit/Delete Buttons

---

## 🔄 Abhängige Dropdown-Logik

| Select | Abhängig von | Filter |
|--------|-------------|--------|
| **Location** | — | Alle Locations wo `is_active=true` |
| **Area** | Location | `area_id == selectedLocationId` |
| **Container** | Area | `area_id == selectedAreaId` |
| **Article** | — | Alle Articles wo `is_active=true` |
| **StorageAssignment** | Alle oben | Alle Zuordnungen wo `is_active=true` |

**Wichtig**: Wenn User Location ändert → Area & Container resetten!

---

## ✨ Key Improvements

### **Vorher (alte Storage.jsx)**
- ❌ Freie Texteingaben für "Area" und "Furniture"
- ❌ Keine Wiederverwendung von Bereichen/Behältern
- ❌ Keine hierarchische Struktur in der DB
- ❌ Artikel-Duplikate als direkte Eingaben
- ❌ Keine Bestandsverwaltung pro Lagerplatz

### **Nachher (StorageRefactored)**
- ✅ Dropdowns statt Freitext für Struktur-Elemente
- ✅ Location → Area → Container Hierarchie
- ✅ Wiederverwendbare Bereiche/Behälter
- ✅ Artikel nur aus zentraler Artikelliste
- ✅ StorageAssignment mit Menge, Mindestbestand, Notizen
- ✅ Schnellanlage von Bereichen/Behältern im Modal
- ✅ Denormalisierung für Performance (snapshots)
- ✅ Mobile-first Design mit großen Touch-Zielen

---

## 📈 Zukünftige Erweiterungen

### **Phase 2: Inventur & Tracking**
- Inventur-Modus: Artikel vor Ort abhaken
- QR-Code-Scanning auf StorageAssignments
- Bestandsbuchung (Zu-/Abgang)
- Historische Bestandskurven

### **Phase 3: Integration**
- Automatische Warnung bei Unterschreitung Mindestbestand → Einkaufsliste
- Artikel-Zuordnungen mit Artikel-Kategorien verknüpfen
- Lagerplatz-Labels drucken (mit QR-Codes)
- Lagerbewegungen loggen (Audit Trail)

### **Phase 4: Analytics**
- Lagerumschlag pro Bereich
- Schnelldreher identifizieren
- Lagerraum-Auslastung visualisieren
- Bestandswert-Berechnung

---

## 🔐 Berechtigungen

- **canViewInventory**: Lager-Seite ansehen
- **isManager**: Struktur erstellen/löschen, Zuordnungen ändern

---

## 🐛 Known Limitations & TODOs

1. **Denormalisierung**: Bei Updates von Area/Container-Namen werden StorageAssignments nicht auto-aktualisiert → manuell via Update-Mutation nötig
2. **Duplikate**: System verhindert nicht, dass dasselbe Artikel-Container-Paar mehrfach zugeordnet wird (soft-check im Form)
3. **Löschen**: Nur soft-delete via `is_active=false` → Hard-delete müsste mit Cascading für Zuordnungen implementiert werden
4. **Performance**: Bei 1000+ Zuordnungen könnte Grid-Ansicht laden → Pagination/Virtualization später

---

## 📝 Query Keys (React Query)

```javascript
// Immer diese Keys nutzen für Konsistenz:
['locations']
['areas']
['containers']
['storage-assignments']
['articles-storage']  // Snapshot für Performance
```

---

## 🚀 Verwendungsbeispiel

```jsx
// In einer beliebigen Seite:
import LocationSelect from '@/components/storage/LocationSelect';
import AreaSelect from '@/components/storage/AreaSelect';
import ContainerSelect from '@/components/storage/ContainerSelect';

export default function MyPage() {
  const [locationId, setLocationId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [containerId, setContainerId] = useState('');

  return (
    <div>
      <LocationSelect value={locationId} onChange={setLocationId} />
      <AreaSelect value={areaId} onChange={setAreaId} />
      <ContainerSelect areaId={areaId} value={containerId} onChange={setContainerId} />
    </div>
  );
}
``