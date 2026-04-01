import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Sticky bottom action footer for mobile forms/lists.
 * Wraps with safe-area padding for notches/home indicators.
 */
export default function MobileActionFooter({ 
  children, 
  className = '',
  showSeparator = true 
}) {
  return (
    <div className={cn(
      'shrink-0 px-3 sm:px-4 py-3 sm:py-4 bg-card',
      'border-t border-border/50 flex flex-col gap-2.5 sm:gap-3 pb-safe',
      showSeparator && 'border-t',
      className
    )}>
      {children}
    </div>
  );
}