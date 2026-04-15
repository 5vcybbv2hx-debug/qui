/**
 * Deprecated Entities Audit
 * Übersicht veralteter Entities und Migration-Pfade
 */

export const DEPRECATED_ENTITIES = [
  {
    name: 'Room',
    status: 'DEPRECATED',
    replacedBy: 'Area (neue Storage-Hierarchie)',
    reason: 'Alte Raumstruktur → neue hierarchische Struktur (Area → Furniture → Container → StorageSlot)',
    migrationPath: [
      '1. Alle Room-Einträge → Area-Einträge migrieren',
      '2. Room.name → Area.name',
      '3. Alle Möbel/Container neu unter Area organisieren',
      '4. StorageAssignment auf neue StorageSlots verlinken',
    ],
    safeToDelete: false,
    dependencies: ['Furniture (hat area_id)', 'Container (hat area_id)', 'StorageSlot (hat area_id)'],
    lastUsed: '2024-Q4',
    notes: 'Nur löschen NACH kompletter Migration zu Area-System',
  },

  {
    name: 'StorageLocation',
    status: 'DEPRECATED',
    replacedBy: 'StorageSlot',
    reason: 'Redundante Entity → StorageSlot mit besserer Hierarchie',
    migrationPath: [
      '1. Alle StorageLocation.id → StorageSlot.id',
      '2. Alle StorageAssignment.storage_location_id → storage_slot_id',
      '3. Full-path Name berechnen: Area › Furniture › Container › Slot',
      '4. Short-code migrieren oder neu generieren',
    ],
    safeToDelete: false,
    dependencies: ['StorageAssignment (Fremdschlüssel)'],
    lastUsed: '2024-Q4',
    notes: 'Noch in Nutzung. Nach StorageSlot-Migration vollständig entfernen.',
  },

  {
    name: 'StorageItem',
    status: 'DEPRECATED',
    replacedBy: 'StorageAssignment',
    reason: 'Alte Struktur → neue flache StorageAssignment-Struktur',
    migrationPath: [
      '1. Alle StorageItem → StorageAssignment.article_id + storage_slot_id',
      '2. Quantities migrieren',
      '3. Min/Max Stock übernehmen',
    ],
    safeToDelete: false,
    dependencies: ['StorageAssignment (Ersatz)'],
    lastUsed: '2024-Q3',
    notes: 'Vollständig durch StorageAssignment ersetzt.',
  },

  {
    name: 'Table',
    status: 'SEMI-DEPRECATED',
    replacedBy: 'SeatingLayout (für visuelle Floor-Plans)',
    reason: 'Neue Struktur für Tischverwaltung mit Layouts',
    migrationPath: [
      '1. Tables → SeatingLayout-basierte Verwaltung',
      '2. Reservierungen auf neue Struktur anpassen',
    ],
    safeToDelete: false,
    dependencies: ['Reservation (table field)'],
    lastUsed: '2024-current',
    notes: 'Noch in Nutzung, aber neue SeatingLayout wird bevorzugt',
  },

  {
    name: 'ShortNameHistory',
    status: 'OPTIONAL',
    replacedBy: 'Employee.short_name (direct field)',
    reason: 'History-Tracking nicht mehr nötig',
    migrationPath: [
      '1. Letzte ShortNameHistory → Employee.short_name',
      '2. History-Archiv optional',
    ],
    safeToDelete: true,
    dependencies: ['Employee (hat short_name field)'],
    lastUsed: '2024-Q2',
    notes: 'Kann ohne Daten-Verlust gelöscht werden. Nur für Audit-Trail wichtig.',
  },

  {
    name: 'PriceHistory',
    status: 'OPTIONAL',
    replacedBy: 'Article.price (direct) + manuelles Archivieren',
    reason: 'Automatisches Price-Tracking nicht mehr nötig',
    migrationPath: [
      '1. Letzte PriceHistory → Article.purchase_price',
      '2. Archive exportieren (optional)',
    ],
    safeToDelete: true,
    dependencies: ['Article (purchase_price field)'],
    lastUsed: '2024-Q2',
    notes: 'Nur nötig für historische Preisanalysen. Kann archiviert werden.',
  },

  {
    name: 'EmployeeDocument',
    status: 'SEMI-DEPRECATED',
    replacedBy: 'Document (allgemein) + Employee-Verknüpfung',
    reason: 'Generische Dokumentverwaltung statt Entity-Duplikat',
    migrationPath: [
      '1. EmployeeDocument → Document mit employee_id',
      '2. Links aktualisieren',
    ],
    safeToDelete: false,
    dependencies: ['Employee (has_documents)'],
    lastUsed: '2024-current',
    notes: 'Kann zu allgemeinem Document-System migriert werden',
  },
];

/**
 * Migration-Status Summary
 */
export const MIGRATION_STATUS = {
  completed: ['MenuItemEntity (→ MenuItem)'],
  inProgress: ['Room (→ Area)', 'StorageLocation (→ StorageSlot)', 'StorageItem (→ StorageAssignment)'],
  planned: ['Table (→ SeatingLayout)', 'EmployeeDocument (→ Document)'],
  optional: ['ShortNameHistory', 'PriceHistory'],
};

/**
 * Entities, die sicher gelöscht werden können
 */
export function getDeleteableSafely() {
  return DEPRECATED_ENTITIES.filter(e => e.safeToDelete);
}

/**
 * Entities, die noch Dependencies haben
 */
export function getEntitiesWithDependencies() {
  return DEPRECATED_ENTITIES.filter(e => e.dependencies.length > 0 && !e.safeToDelete);
}

/**
 * Generiere Migration Checklist
 */
export function getMigrationChecklist() {
  return DEPRECATED_ENTITIES
    .filter(e => e.status === 'DEPRECATED')
    .map(e => ({
      entity: e.name,
      steps: e.migrationPath,
      priority: e.safeToDelete ? 'low' : 'high',
    }));
}

export default DEPRECATED_ENTITIES;