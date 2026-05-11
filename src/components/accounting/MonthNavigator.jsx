import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Wiederverwendbare Monatsnavigation für alle Buchhaltungsseiten.
 * Props:
 *   value: string — aktueller Monat im Format "yyyy-MM"
 *   onChange: (value: string) => void
 */
export default function MonthNavigator({ value, onChange }) {
    const current = parseISO(value + '-01');
    const isCurrentMonth = value === format(new Date(), 'yyyy-MM');

    const prev = () => onChange(format(subMonths(current, 1), 'yyyy-MM'));
    const next = () => onChange(format(addMonths(current, 1), 'yyyy-MM'));
    const today = () => onChange(format(new Date(), 'yyyy-MM'));

    return (
        <div className="flex items-center gap-1">
            <button
                onClick={prev}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            <button
                onClick={today}
                className="px-3 h-8 rounded-lg text-sm font-semibold text-foreground hover:bg-accent/50 transition-colors min-w-[120px] text-center"
                title="Zum aktuellen Monat"
            >
                {format(current, 'MMMM yyyy', { locale: de })}
            </button>

            <button
                onClick={next}
                disabled={isCurrentMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}