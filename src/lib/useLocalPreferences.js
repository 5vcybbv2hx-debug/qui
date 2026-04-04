/**
 * Adaptive preference store — persists to localStorage.
 * Tracks: last used values, usage frequency counts.
 * Used to power smart defaults, prioritized lists and quick suggestions.
 *
 * Usage:
 *   const prefs = useLocalPreferences('storage');
 *   prefs.track('area', areaId);
 *   prefs.getLast('area');          // last used area id
 *   prefs.getTop('area', 5);        // top 5 most used area ids
 *   prefs.sortByFrequency(items, item => item.id, 'area');
 */
import { useCallback, useMemo } from 'react';

const PREFIX = 'bm_prefs_';
const MAX_HISTORY = 50;

function load(ns) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + ns) || '{}');
  } catch {
    return {};
  }
}

function save(ns, data) {
  try {
    localStorage.setItem(PREFIX + ns, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

export function useLocalPreferences(namespace) {
  const ns = namespace;

  const track = useCallback((key, value) => {
    if (!value) return;
    const data = load(ns);
    // Last used
    if (!data.last) data.last = {};
    data.last[key] = value;

    // Frequency
    if (!data.freq) data.freq = {};
    if (!data.freq[key]) data.freq[key] = {};
    data.freq[key][value] = (data.freq[key][value] || 0) + 1;

    // Trim freq map if too large
    const entries = Object.entries(data.freq[key]);
    if (entries.length > MAX_HISTORY) {
      const trimmed = entries.sort((a, b) => b[1] - a[1]).slice(0, MAX_HISTORY);
      data.freq[key] = Object.fromEntries(trimmed);
    }

    save(ns, data);
  }, [ns]);

  const getLast = useCallback((key) => {
    const data = load(ns);
    return data.last?.[key] ?? null;
  }, [ns]);

  const getTop = useCallback((key, limit = 5) => {
    const data = load(ns);
    const freq = data.freq?.[key] || {};
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }, [ns]);

  const getFrequency = useCallback((key, value) => {
    const data = load(ns);
    return data.freq?.[key]?.[value] || 0;
  }, [ns]);

  /**
   * Sort items by usage frequency — most used first.
   * @param {Array} items
   * @param {Function} getId — fn(item) => string
   * @param {string} key — preference key (e.g. 'area', 'slot')
   */
  const sortByFrequency = useCallback((items, getId, key) => {
    const data = load(ns);
    const freq = data.freq?.[key] || {};
    return [...items].sort((a, b) => {
      const fa = freq[getId(a)] || 0;
      const fb = freq[getId(b)] || 0;
      return fb - fa;
    });
  }, [ns]);

  return useMemo(() => ({
    track,
    getLast,
    getTop,
    getFrequency,
    sortByFrequency,
  }), [track, getLast, getTop, getFrequency, sortByFrequency]);
}

// ── Convenience standalone functions (no React, for use outside hooks) ───────

export function trackPref(namespace, key, value) {
  if (!value) return;
  const data = load(namespace);
  if (!data.last) data.last = {};
  if (!data.freq) data.freq = {};
  if (!data.freq[key]) data.freq[key] = {};
  data.last[key] = value;
  data.freq[key][value] = (data.freq[key][value] || 0) + 1;
  save(namespace, data);
}

export function getPref(namespace, key) {
  return load(namespace)?.last?.[key] ?? null;
}

export function getTopPrefs(namespace, key, limit = 5) {
  const freq = load(namespace)?.freq?.[key] || {};
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
}