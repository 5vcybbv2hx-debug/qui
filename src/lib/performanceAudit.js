/**
 * Performance Audit & Query-Optimierung Guide
 * Best Practices für React Query, Render-Performance, Bundle-Size
 */

/**
 * Query Caching Strategien
 */
export const QUERY_CACHING_STRATEGIES = [
  {
    name: 'Infinite Queries (Listen)',
    description: 'Für Liste mit Pagination/Scroll',
    example: 'useInfiniteQuery({ queryKey: ["articles"], queryFn, getNextPageParam })',
    benefit: 'Reduziert Refetch, stale data minimal',
  },
  {
    name: 'Stale Time',
    description: 'Data als "fresh" markieren für X Sekunden',
    example: 'staleTime: 5 * 60 * 1000 // 5 Minuten',
    benefit: 'Vermeidet unnötige Re-fetches',
  },
  {
    name: 'Cache Time (gcTime)',
    description: 'Wie lange Daten im Cache bleiben (inaktiv)',
    example: 'gcTime: 10 * 60 * 1000 // 10 Minuten',
    benefit: 'Instant re-render wenn User zurückkommt',
  },
  {
    name: 'Query Deduplication',
    description: 'Mehrfache gleichzeitige Queries kombinieren',
    example: 'Automatisch durch React Query',
    benefit: 'Nur 1 Request statt mehrere',
  },
  {
    name: 'Optimistic Updates',
    description: 'UI sofort updaten, Server im Hintergrund',
    example: 'useMutation({ onMutate: (data) => {...} })',
    benefit: 'Bessere UX, schneller Feedback',
  },
  {
    name: 'Pagination statt Infinite',
    description: 'Für kontrollierte Seiten-Navigation',
    example: 'useQuery({ queryKey: ["items", page], pageIndex })',
    benefit: 'Vorhersehbare Memory-Nutzung',
  },
];

/**
 * Render-Optimierungs-Strategien
 */
export const RENDER_OPTIMIZATION = [
  {
    technique: 'React.memo',
    when: 'Props ändern selten, viele Child-Components',
    code: 'const Card = React.memo(({ title, data }) => {...})',
    impact: 'Verhindert unnötige Re-renders',
  },
  {
    technique: 'useMemo',
    when: 'Teure Berechnungen in jedem Render',
    code: 'const filtered = useMemo(() => data.filter(...), [data])',
    impact: 'Berechnung nur bei Dependency-Änderung',
  },
  {
    technique: 'useCallback',
    when: 'Function ist Dependency eines Child-Components',
    code: 'const handleClick = useCallback(() => {...}, [])',
    impact: 'Function-Referenz bleibt gleich',
  },
  {
    technique: 'Virtual Scrolling (react-window)',
    when: 'Listen mit 100+ Items',
    code: 'import { FixedSizeList } from "react-window"',
    impact: 'Nur sichtbare Items rendern (~50 statt 1000)',
  },
  {
    technique: 'Code Splitting (lazy)',
    when: 'Große Pages/Features',
    code: 'const Dashboard = React.lazy(() => import("./Dashboard"))',
    impact: 'Reduziert initial bundle-size',
  },
  {
    technique: 'useTransition',
    when: 'Heavy state updates',
    code: 'const [isPending, startTransition] = useTransition()',
    impact: 'UI bleibt responsive während Update',
  },
];

/**
 * Query-Caching Best Practices für die App
 */
export const APP_CACHING_CONFIG = {
  // Entities die oft abgerufen werden
  employees: {
    staleTime: 5 * 60 * 1000, // 5 min - Employee-Daten ändern selten
    gcTime: 30 * 60 * 1000, // 30 min im Cache
    refetchInterval: null, // Nur on-demand
  },

  // Shift/Calendar-Daten (ändern öfter)
  shifts: {
    staleTime: 1 * 60 * 1000, // 1 min
    gcTime: 10 * 60 * 1000, // 10 min
    refetchInterval: 5 * 60 * 1000, // Re-fetch alle 5 min
  },

  // Menu/Artikel (ändern selten)
  articles: {
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 60 * 60 * 1000, // 1 Stunde
    refetchInterval: null,
  },

  // Real-time: Tasks, Todos
  todos: {
    staleTime: 30 * 1000, // 30 sec
    gcTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 30 * 1000, // Re-fetch alle 30 sec
  },

  // Storage/Assignments
  storage: {
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 15 * 60 * 1000, // 15 min
    refetchInterval: null,
  },
};

/**
 * Performance Checkliste
 */
export const PERFORMANCE_CHECKLIST = [
  {
    category: 'Query Caching',
    items: [
      '✓ staleTime definieren (nicht zu kurz, nicht zu lang)',
      '✓ gcTime setzen (Cache-Dauer)',
      '✓ refetchInterval für Real-time (falls nötig)',
      '✓ Infinite Queries statt Pagination (wo sinnvoll)',
      '✓ Query-Deduplication überprüfen (React Query automatisch)',
    ],
  },
  {
    category: 'Render-Performance',
    items: [
      '✓ React.memo für häufig re-rendered Components',
      '✓ useMemo für teure Berechnungen',
      '✓ useCallback für Event-Handler (bei Children)',
      '✓ Virtual Scrolling bei Listen >100 Items',
      '✓ Keine Anonymous Functions als Props',
    ],
  },
  {
    category: 'Bundle Size',
    items: [
      '✓ Code Splitting für große Pages',
      '✓ Dynamische Imports (React.lazy)',
      '✓ Tree-shaking überprüfen (unused exports)',
      '✓ Dev-Dependencies nicht im Bundle',
      '✓ Dependencies minimieren (polyfills?)',
    ],
  },
  {
    category: 'Network & Requests',
    items: [
      '✓ Batch-Requests wo möglich (1 Request statt mehrere)',
      '✓ Request-Deduplication (React Query automatisch)',
      '✓ Limit auf aktive Requests (maxPages, refetchOnMount)',
      '✓ Polling minimieren (nicht < 30 sec)',
      '✓ Websocket für Real-time statt Polling',
    ],
  },
  {
    category: 'DOM & Layout',
    items: [
      '✓ Reflows minimieren (batch DOM updates)',
      '✓ Fixed Layout Shifts vermeiden',
      '✓ Lazy load Images (images mit loading="lazy")',
      '✓ Debounce Input-Events (Search, Filter)',
      '✓ ResizeObserver statt Window-Resize-Events',
    ],
  },
];

/**
 * Häufige Performance-Probleme
 */
export const COMMON_BOTTLENECKS = [
  {
    problem: 'Re-fetches bei every component mount',
    symptom: 'Network-Tab zeigt doppelte Requests',
    fix: 'queryKey konsistent halten, useQuery-Dependencies richtig setzen',
  },
  {
    problem: 'Zu viele Components re-rendern bei state change',
    symptom: 'DevTools Profiler zeigt viele yellow/red renders',
    fix: 'State näher zu Components (nicht global wenn nur lokal nötig)',
  },
  {
    problem: 'Große Listen rendern alle Items',
    symptom: 'Scroll laggt bei 500+ Items',
    fix: 'Virtual Scrolling mit react-window oder react-virtualized',
  },
  {
    problem: 'Inline Objects/Arrays als Props',
    symptom: 'Child-Component re-renders obwohl Props logisch gleich',
    fix: 'useMemo für Objects/Arrays, useCallback für Functions',
  },
  {
    problem: 'Zu kurzes staleTime',
    symptom: 'Ständige Refetches, Netzwerk-Last hoch',
    fix: 'staleTime erhöhen (5-10 min für stable data)',
  },
  {
    problem: 'Keine Code-Splitting',
    symptom: 'Initial bundle > 500KB',
    fix: 'React.lazy für Pages, dynamic imports für große Libraries',
  },
];

/**
 * Performance Metrics (Web Vitals)
 */
export const WEB_VITALS = {
  LCP: {
    name: 'Largest Contentful Paint',
    target: '< 2.5s',
    how: 'Image-Optimierung, Server-Response-Zeit',
  },
  FID: {
    name: 'First Input Delay',
    target: '< 100ms',
    how: 'JavaScript-Execution optimieren (useTransition, Debounce)',
  },
  CLS: {
    name: 'Cumulative Layout Shift',
    target: '< 0.1',
    how: 'Fixed dimensions für Media, keine Dynamic Heights',
  },
  TTFB: {
    name: 'Time to First Byte',
    target: '< 600ms',
    how: 'Server-Response optimieren',
  },
};

export default {
  QUERY_CACHING_STRATEGIES,
  RENDER_OPTIMIZATION,
  APP_CACHING_CONFIG,
  PERFORMANCE_CHECKLIST,
  COMMON_BOTTLENECKS,
  WEB_VITALS,
};