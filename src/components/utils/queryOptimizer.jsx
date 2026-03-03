// Database Query Optimizer: Index Hints, Projections, Pagination
// Reduziert Payload-Größe & Netzwerkbelastung

class QueryOptimizer {
  static SORT_DIRECTIONS = {
    ASC: 1,
    DESC: -1
  };

  // Erstelle optimierte Query mit Projections (nur nötige Felder)
  static projectFields(data, fields) {
    if (!Array.isArray(data)) {
      return this.projectFieldsSingle(data, fields);
    }

    return data.map(item => this.projectFieldsSingle(item, fields));
  }

  static projectFieldsSingle(item, fields) {
    if (!fields || fields.length === 0) return item;

    const projected = {};
    fields.forEach(field => {
      if (field in item) {
        projected[field] = item[field];
      }
    });

    return projected;
  }

  // Optimierte Pagination mit Cursor-basiertem Ansatz
  static createPaginationQuery(pageNumber = 1, pageSize = 20, totalCount = 0) {
    return {
      skip: (pageNumber - 1) * pageSize,
      limit: pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: pageNumber,
      hasNextPage: pageNumber < Math.ceil(totalCount / pageSize)
    };
  }

  // Cursor-basierte Pagination (besser für große Datasets)
  static createCursorPaginationQuery(cursor = null, limit = 20) {
    return {
      cursor,
      limit,
      direction: 'next'
    };
  }

  // Batch Queries für bessere Performance
  static createBatchQuery(ids, fields = null) {
    return {
      filter: { id: { $in: ids } },
      fields: fields ? { $project: fields } : null,
      batchSize: Math.min(ids.length, 100)
    };
  }

  // Aggregation Pipeline für komplexe Queries
  static createAggregationQuery(stages = []) {
    return {
      $pipeline: [
        { $match: {} },
        { $group: {} },
        { $sort: { _id: -1 } },
        { $limit: 100 },
        ...stages
      ]
    };
  }

  // Denormalisierung für häufig zusammen abgerufene Daten
  static createDenormalizedQuery(primaryEntity, relatedEntities = []) {
    return {
      entity: primaryEntity,
      lookups: relatedEntities.map(rel => ({
        from: rel.entity,
        localField: rel.localField,
        foreignField: rel.foreignField,
        as: rel.alias
      }))
    };
  }

  // Estimate Query Cost
  static estimateQueryCost(query) {
    let cost = 0;

    // Basis-Cost für Query
    cost += 1;

    // Filter-Cost
    if (query.filter) {
      cost += Object.keys(query.filter).length * 0.5;
    }

    // Sorting-Cost
    if (query.sort) {
      cost += Object.keys(query.sort).length * 2;
    }

    // Pagination-Cost
    if (query.skip) {
      cost += query.skip * 0.1;
    }

    // Projection-Cost (negative, da weniger Daten)
    if (query.fields) {
      cost -= Object.keys(query.fields).length * 0.3;
    }

    return Math.max(1, cost);
  }

  // Erstelle Index-Hints für Optimizer
  static createIndexHint(fields = {}) {
    return {
      hint: Object.entries(fields).reduce((acc, [field, direction]) => {
        acc[field] = direction === 'asc' ? 1 : -1;
        return acc;
      }, {})
    };
  }

  // Query Caching mit Invalidation Strategy
  static createCacheKey(entity, filter = {}, sort = {}, fields = {}) {
    const key = [
      entity,
      JSON.stringify(filter),
      JSON.stringify(sort),
      JSON.stringify(fields)
    ].join(':');

    return btoa(key); // Base64 encode für sichere Keys
  }

  // Invalidate related cache entries
  static getInvalidationPatterns(entity) {
    return [
      `^${entity}:.*`, // Alle Queries für diese Entity
      `.*:${entity}.*`, // Queries die diese Entity lookup
    ];
  }
}

// React Hook für optimierte Queries
export function useOptimizedQuery(queryKey, queryFn, { fields = null, pageSize = 20, ...options } = {}) {
  const optimizedQueryFn = async () => {
    const data = await queryFn();

    // Projiziere Felder wenn spezifiziert
    if (fields) {
      return QueryOptimizer.projectFields(data, fields);
    }

    return data;
  };

  return {
    fetch: optimizedQueryFn,
    projectionCost: fields ? fields.length : null,
    estimatedPayload: `~${(fields?.length || 20) * 100} bytes per item`
  };
}

export { QueryOptimizer };