// Advanced Search mit Fuzzy Matching & Filter-Builder
import { useState, useMemo } from 'react';

class FuzzyMatcher {
  static score(query, target) {
    if (!query || !target) return 0;
    
    const q = query.toLowerCase();
    const t = target.toLowerCase();

    if (t === q) return 100;
    if (t.includes(q)) return 80;

    let score = 0;
    let matchedChars = 0;
    let queryIdx = 0;

    for (let i = 0; i < t.length && queryIdx < q.length; i++) {
      if (t[i] === q[queryIdx]) {
        score += 1;
        matchedChars++;
        queryIdx++;
      }
    }

    if (queryIdx !== q.length) return 0;

    // Bonus für zusammenhängende Matches
    return (matchedChars / t.length) * 100;
  }

  static search(query, items, searchFields = []) {
    if (!query) return items;

    return items
      .map(item => {
        let maxScore = 0;

        searchFields.forEach(field => {
          const fieldValue = this.getNestedValue(item, field);
          const score = this.score(query, String(fieldValue));
          maxScore = Math.max(maxScore, score);
        });

        return { item, score: maxScore };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }

  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
}

export function useAdvancedSearch(items = [], options = {}) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const searchFields = options.searchFields || ['name', 'description'];
  const filterableFields = options.filterableFields || [];

  const results = useMemo(() => {
    let filtered = items;

    // Fuzzy Search
    if (query) {
      filtered = FuzzyMatcher.search(query, filtered, searchFields);
    }

    // Apply Filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value && value.length > 0) {
        filtered = filtered.filter(item => {
          const fieldValue = FuzzyMatcher.getNestedValue(item, field);
          return value.includes(String(fieldValue));
        });
      }
    });

    // Sorting
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = FuzzyMatcher.getNestedValue(a, sortBy);
        const bVal = FuzzyMatcher.getNestedValue(b, sortBy);

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;

        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [items, query, filters, sortBy, sortOrder, searchFields]);

  const clearFilters = () => {
    setQuery('');
    setFilters({});
    setSortBy(null);
  };

  const addFilter = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), value]
    }));
  };

  const removeFilter = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: prev[field]?.filter(v => v !== value) || []
    }));
  };

  return {
    query,
    setQuery,
    filters,
    setFilters,
    addFilter,
    removeFilter,
    clearFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    results,
    resultCount: results.length
  };
}

export function SearchInput({ value, onChange, placeholder = 'Suchen...', className = '' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
    />
  );
}

export function FilterTag({ label, onRemove }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
      {label}
      <button
        onClick={onRemove}
        className="text-primary/60 hover:text-primary transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

export { FuzzyMatcher };