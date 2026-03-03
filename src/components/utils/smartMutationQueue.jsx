// Smart Mutation Queue mit Prioritäten & Dependencies
// Intelligentes Queuing für Offline-Sync mit intelligenter Ausführungsreihenfolge

class MutationQueueManager {
  constructor() {
    this.queue = [];
    this.executing = false;
    this.executionStats = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    };
  }

  // Priority Levels
  static PRIORITY = {
    CRITICAL: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1,
    DEFERRED: 0
  };

  // Mutation Types für Dependency-Tracking
  static MUTATION_TYPES = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete'
  };

  addMutation(mutation) {
    const queueItem = {
      id: `${mutation.entity}_${Date.now()}_${Math.random()}`,
      entity: mutation.entity,
      entityId: mutation.entityId,
      type: mutation.type || this.constructor.MUTATION_TYPES.UPDATE,
      data: mutation.data,
      priority: mutation.priority || this.constructor.PRIORITY.NORMAL,
      dependsOn: mutation.dependsOn || [],
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
      status: 'pending'
    };

    this.queue.push(queueItem);
    this.sortQueue();
    return queueItem.id;
  }

  sortQueue() {
    this.queue.sort((a, b) => {
      // Sortiere nach: Priority DESC, dann timestamp ASC (FIFO für gleiche Priority)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });
  }

  getNextExecutable() {
    const executable = this.queue.find(item => {
      if (item.status !== 'pending') return false;

      // Prüfe ob alle Dependencies erfüllt sind
      const depsResolved = item.dependsOn.every(depId => {
        const dep = this.queue.find(q => q.id === depId);
        return dep && dep.status === 'completed';
      });

      return depsResolved;
    });

    return executable;
  }

  async executeQueue(mutationFn) {
    if (this.executing) return;
    this.executing = true;

    try {
      while (true) {
        const next = this.getNextExecutable();
        if (!next) break;

        await this.executeMutation(next, mutationFn);
      }
    } finally {
      this.executing = false;
    }
  }

  async executeMutation(queueItem, mutationFn) {
    queueItem.status = 'executing';

    try {
      await mutationFn(queueItem);
      queueItem.status = 'completed';
      queueItem.completedAt = Date.now();
      this.executionStats.successful++;
    } catch (error) {
      queueItem.retries++;

      if (queueItem.retries < queueItem.maxRetries) {
        // Retry: exponential backoff
        const delay = Math.pow(2, queueItem.retries) * 1000;
        queueItem.status = 'pending';
        queueItem.nextRetryAt = Date.now() + delay;
      } else {
        queueItem.status = 'failed';
        queueItem.error = error.message;
        this.executionStats.failed++;
      }
    }
  }

  // Batch-Mutations mit Dependency-Handling
  addBatch(mutations, parentDependencies = []) {
    const batchIds = [];

    mutations.forEach((mutation, index) => {
      const dependsOn = [
        ...parentDependencies,
        ...mutation.dependsOn || [],
        ...(index > 0 ? [batchIds[index - 1]] : []) // Vorherige Item in Batch als Dependency
      ];

      const id = this.addMutation({
        ...mutation,
        dependsOn
      });

      batchIds.push(id);
    });

    return batchIds;
  }

  // Optimiere Queue: Entferne redundante Operationen
  optimizeQueue() {
    const optimized = [];
    const seen = new Map();

    for (const item of this.queue) {
      if (item.status !== 'pending') {
        optimized.push(item);
        continue;
      }

      const key = `${item.entity}_${item.entityId}`;
      const existing = seen.get(key);

      if (existing) {
        // Wenn neue Operation höhere Priority hat oder aktueller ist, ersetze
        if (item.priority > existing.priority || item.timestamp > existing.timestamp) {
          optimized.splice(optimized.indexOf(existing), 1);
          optimized.push(item);
          seen.set(key, item);
        }
        // Sonst ignoriere das neuere Item (FIFO mit Priority)
      } else {
        optimized.push(item);
        seen.set(key, item);
      }
    }

    this.queue = optimized;
    this.sortQueue();
  }

  // Statistiken
  getStats() {
    return {
      ...this.executionStats,
      queueLength: this.queue.length,
      pending: this.queue.filter(q => q.status === 'pending').length,
      failed: this.queue.filter(q => q.status === 'failed').length,
      completed: this.queue.filter(q => q.status === 'completed').length
    };
  }

  // Setze fehlgeschlagene Items zurück zum Retry
  retryFailed() {
    this.queue.forEach(item => {
      if (item.status === 'failed' && item.retries < item.maxRetries) {
        item.status = 'pending';
        item.retries = 0;
      }
    });
    this.sortQueue();
  }

  clear() {
    this.queue = [];
    this.executing = false;
    this.executionStats = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    };
  }
}

export { MutationQueueManager };