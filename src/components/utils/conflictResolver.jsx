// Conflict Resolution System für Offline-Sync
// Behandelt Kollisionen wenn mehrere Updates offline auf denselben Entity passieren

class ConflictResolver {
  // Strategien für Konfliktauflösung
  static STRATEGIES = {
    LAST_WRITE_WINS: 'last_write_wins',
    FIRST_WRITE_WINS: 'first_write_wins',
    MERGE: 'merge',
    MANUAL: 'manual'
  };

  static detectConflict(localData, serverData, lastSyncVersion) {
    if (!lastSyncVersion || !serverData) return null;

    const hasLocalChanges = JSON.stringify(localData) !== JSON.stringify(lastSyncVersion);
    const hasServerChanges = JSON.stringify(serverData) !== JSON.stringify(lastSyncVersion);

    if (hasLocalChanges && hasServerChanges) {
      return {
        type: 'UPDATE_CONFLICT',
        local: localData,
        server: serverData,
        base: lastSyncVersion
      };
    }

    return null;
  }

  static resolveConflict(conflict, strategy = this.STRATEGIES.LAST_WRITE_WINS) {
    switch (strategy) {
      case this.STRATEGIES.LAST_WRITE_WINS:
        return this.resolveLastWriteWins(conflict);
      case this.STRATEGIES.FIRST_WRITE_WINS:
        return this.resolveFirstWriteWins(conflict);
      case this.STRATEGIES.MERGE:
        return this.resolveMerge(conflict);
      default:
        return { resolved: false, conflict, needsManual: true };
    }
  }

  static resolveLastWriteWins(conflict) {
    const localTime = conflict.local?.updated_date || 0;
    const serverTime = conflict.server?.updated_date || 0;

    return {
      resolved: true,
      data: serverTime > localTime ? conflict.server : conflict.local,
      strategy: this.STRATEGIES.LAST_WRITE_WINS
    };
  }

  static resolveFirstWriteWins(conflict) {
    const localTime = conflict.local?.updated_date || Infinity;
    const serverTime = conflict.server?.updated_date || Infinity;

    return {
      resolved: true,
      data: serverTime < localTime ? conflict.server : conflict.local,
      strategy: this.STRATEGIES.FIRST_WRITE_WINS
    };
  }

  static resolveMerge(conflict) {
    // Merge: Kombiniere Änderungen wenn möglich
    const merged = { ...conflict.base };

    // Finde geänderte Felder im lokalen Update
    const localChanges = this.getChangedFields(conflict.base, conflict.local);
    // Finde geänderte Felder im Server Update
    const serverChanges = this.getChangedFields(conflict.base, conflict.server);

    // Prüfe auf überlappende Änderungen (gleiches Feld geändert)
    const overlappingFields = Object.keys(localChanges).filter(f => f in serverChanges);

    if (overlappingFields.length > 0) {
      // Überlappende Felder können nicht automatisch gemerged werden
      return {
        resolved: false,
        conflict,
        overlappingFields,
        needsManual: true
      };
    }

    // Merge nicht-überlappende Änderungen
    Object.assign(merged, localChanges, serverChanges);

    return {
      resolved: true,
      data: merged,
      strategy: this.STRATEGIES.MERGE,
      mergedFields: { local: localChanges, server: serverChanges }
    };
  }

  static getChangedFields(base, current) {
    if (!base || !current) return current || {};

    const changes = {};
    for (const key in current) {
      if (JSON.stringify(base[key]) !== JSON.stringify(current[key])) {
        changes[key] = current[key];
      }
    }
    return changes;
  }

  static createConflictRecord(entityName, entityId, conflict, resolution) {
    return {
      id: `${entityName}_${entityId}_${Date.now()}`,
      entity_name: entityName,
      entity_id: entityId,
      timestamp: new Date().toISOString(),
      conflict,
      resolution,
      status: 'pending' // pending, resolved, manual_review
    };
  }
}

export { ConflictResolver };