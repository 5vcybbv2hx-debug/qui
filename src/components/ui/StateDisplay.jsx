/**
 * App-weite StateDisplay Komponenten
 * Einheitliche Loading, Empty, Error States
 */

import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Card } from '@/components/ui/card';

/**
 * LoadingState
 * Nutze diesen State, während Daten geladen werden
 */
export function LoadingState({ text = 'Lädt…', fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return (
    <Card className="p-8 text-center">
      {content}
    </Card>
  );
}

/**
 * EmptyState
 * Nutze diesen State, wenn keine Daten vorhanden sind UND Loading fertig ist
 */
export function EmptyState({ 
  text = 'Keine Einträge vorhanden', 
  icon = Inbox,
  action = null,
  fullScreen = false 
}) {
  const Icon = icon;
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return (
    <Card className="p-8 text-center">
      {content}
    </Card>
  );
}

/**
 * ErrorState
 * Nutze diesen State bei Fehlern (Query-Fehler, API-Fehler, etc.)
 */
export function ErrorState({ 
  text = 'Ein Fehler ist aufgetreten',
  details = null,
  retry = null,
  fullScreen = false 
}) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <p className="text-sm text-foreground font-medium">{text}</p>
      {details && (
        <p className="text-xs text-muted-foreground max-w-sm text-center">{details}</p>
      )}
      {retry && (
        <button
          onClick={retry}
          className="mt-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return (
    <Card className="p-8 text-center bg-red-500/5 border-red-500/20">
      {content}
    </Card>
  );
}

/**
 * Skeleton Loader für Listen
 * Simuliert Ladeinhalt visuell
 */
export function ListSkeleton({ count = 3, height = 'h-12' }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${height} bg-secondary rounded-lg animate-pulse`} />
      ))}
    </div>
  );
}

/**
 * State Manager Hook (simpel)
 * Nutze diesen Hook, um States zu verwalten
 * 
 * const { isLoading, isError, isEmpty, data } = useDataState(query);
 */
export function useDataState(query) {
  if (!query) {
    return {
      isLoading: false,
      isError: false,
      isEmpty: false,
      data: null,
    };
  }

  const { isLoading, isError, data } = query;

  return {
    isLoading,
    isError,
    isEmpty: !isLoading && !isError && (!data || data.length === 0),
    data,
  };
}

export default {
  LoadingState,
  EmptyState,
  ErrorState,
  ListSkeleton,
  useDataState,
};