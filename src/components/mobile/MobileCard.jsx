import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Consistent mobile card component.
 * Used for list items, task cards, status cards.
 */
export default function MobileCard({ 
  children, 
  className = '',
  status = null,  // 'completed', 'pending', 'alert'
  onClick = null,
  interactive = false
}) {
  const statusStyles = {
    completed: 'bg-green-500/5 border-green-500/30',
    pending: 'bg-amber-500/5 border-amber-500/30',
    alert: 'bg-red-500/5 border-red-500/30',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border px-3 sm:px-4 py-3 sm:py-4',
        'bg-card border-border/50 transition-all',
        status && statusStyles[status],
        interactive && 'hover:bg-accent/30 cursor-pointer active:bg-accent/50',
        className
      )}
    >
      {children}
    </div>
  );
}