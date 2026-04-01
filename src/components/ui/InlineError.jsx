/**
 * InlineError.jsx
 * Small inline error message for form fields or card-level errors.
 * Use StateDisplay for full-page / section errors.
 */
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { friendlyMessage } from '@/lib/errorHandler';

export default function InlineError({ error, message, onDismiss, className }) {
    const display = message ?? (error ? friendlyMessage(error) : null);
    if (!display) return null;

    return (
        <div className={cn(
            'flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive',
            className
        )}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">{display}</span>
            {onDismiss && (
                <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}