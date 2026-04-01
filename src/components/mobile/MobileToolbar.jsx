import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Horizontal toolbar for mobile action buttons.
 * Wraps with flex/gap for responsive button groups.
 */
export default function MobileToolbar({ 
  children, 
  className = '',
  wrap = true,
  justify = 'start'  // 'start', 'between', 'center'
}) {
  const justifyStyles = {
    start: 'justify-start',
    between: 'justify-between',
    center: 'justify-center',
  };

  return (
    <div className={cn(
      'flex items-center gap-1 sm:gap-2',
      wrap && 'flex-wrap',
      justifyStyles[justify],
      className
    )}>
      {children}
    </div>
  );
}