import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

/**
 * Status/stats card for dashboard-style info.
 * Shows progress, counts, or status indicators.
 */
export default function MobileStatCard({ 
  icon = null,
  label,
  value,
  progress = null,  // 0-100
  secondaryText = null,
  variant = 'default'  // 'default', 'success', 'warning', 'alert'
}) {
  const variantStyles = {
    default: 'bg-card border-border/50',
    success: 'bg-green-500/10 border-green-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    alert: 'bg-red-500/10 border-red-500/30',
  };

  return (
    <div className={cn(
      'rounded-xl border px-3 sm:px-4 py-3 sm:py-4',
      variantStyles[variant]
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg sm:text-xl">{icon}</span>}
          <span className="text-xs sm:text-sm font-medium text-foreground">
            {label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-lg sm:text-xl font-bold text-foreground">
            {value}
          </p>
          {secondaryText && (
            <p className="text-xs text-muted-foreground">{secondaryText}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progress !== null && (
        <Progress value={progress} className="h-2" />
      )}
    </div>
  );
}