/**
 * Unified Loading / Error / Empty state components.
 * Use these app-wide for consistent feedback.
 */
import { AlertCircle, PackageOpen, Loader2 } from 'lucide-react';

export function LoadingState({ text = 'Lädt…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

export function ErrorState({ text = 'Fehler beim Laden.', retry, className = '' }) {
  return (
    <div className={`rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center ${className}`}>
      <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
      <p className="text-sm font-semibold text-destructive">{text}</p>
      {retry && (
        <button onClick={retry} className="mt-3 text-xs text-muted-foreground underline hover:text-foreground">
          Erneut versuchen
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: IconComponent, title = 'Keine Einträge', description, action, className = '' }) {
  const Icon = IconComponent || PackageOpen;
  return (
    <div className={`rounded-xl border border-border bg-card p-8 text-center ${className}`}>
      <Icon className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Guard component: renders children only when data is ready.
 * Shows loading/error/empty states automatically.
 *
 * Usage:
 *   <QueryState isLoading={...} isError={...} data={items} emptyText="Keine Artikel.">
 *     {(data) => data.map(...)}
 *   </QueryState>
 */
export function QueryState({
  isLoading,
  isError,
  data,
  loadingText,
  errorText,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  children,
  retry,
}) {
  if (isLoading) return <LoadingState text={loadingText} />;
  if (isError) return <ErrorState text={errorText} retry={retry} />;
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />;
  }
  return children(data);
}