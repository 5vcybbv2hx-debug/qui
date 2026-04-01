/**
 * StateDisplay.jsx
 * Unified component for Loading / Empty / Error states.
 * Eliminates the need to write these patterns inline on every page.
 *
 * Usage:
 *   <StateDisplay loading={isLoading} error={error} empty={!data.length} emptyMessage="Keine Einträge" />
 *   // renders children when none of the above conditions are true
 *   <StateDisplay loading={isLoading}>
 *     <MyContent />
 *   </StateDisplay>
 */
import { Loader2, AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { friendlyMessage } from '@/lib/errorHandler';

// ── Sub-components (also exported for standalone use) ─────────────────────────

export function LoadingState({ message = 'Wird geladen…', className }) {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground', className)}>
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm">{message}</p>
        </div>
    );
}

export function ErrorState({ error, message, onRetry, className }) {
    const display = message ?? friendlyMessage(error);
    return (
        <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground', className)}>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-sm text-center max-w-xs">{display}</p>
            {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 mt-1">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Erneut versuchen
                </Button>
            )}
        </div>
    );
}

export function EmptyState({ message = 'Keine Einträge vorhanden', icon: Icon = Inbox, action, actionLabel, className }) {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground', className)}>
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-sm text-center max-w-xs">{message}</p>
            {action && actionLabel && (
                <Button variant="outline" size="sm" onClick={action} className="mt-1">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export default function StateDisplay({
    loading,
    error,
    empty,
    loadingMessage,
    errorMessage,
    emptyMessage,
    emptyIcon,
    emptyAction,
    emptyActionLabel,
    onRetry,
    className,
    children,
}) {
    if (loading) return <LoadingState message={loadingMessage} className={className} />;
    if (error)   return <ErrorState  error={error} message={errorMessage} onRetry={onRetry} className={className} />;
    if (empty)   return <EmptyState  message={emptyMessage} icon={emptyIcon} action={emptyAction} actionLabel={emptyActionLabel} className={className} />;
    return children ?? null;
}