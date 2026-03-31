import React, { useState, useCallback, useMemo } from 'react';

/**
 * Hook for virtual scrolling large lists
 * Returns visible items and scroll handler
 */
export const useVirtualScroll = (items, options = {}) => {
  const {
    itemHeight = 60,
    containerHeight = 500,
    overscan = 3
  } = options;

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;

  const getVisibleItems = useCallback((scrollTop) => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    
    return {
      items: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, visibleCount, overscan]);

  return {
    totalHeight,
    visibleCount,
    getVisibleItems,
    itemHeight
  };
};

/**
 * Virtualized List Component
 */
export function VirtualizedList({ items, itemHeight = 60, renderItem, containerHeight = 500 }) {
  const virtual = useVirtualScroll(items, { itemHeight, containerHeight });
  const [scrollTop, setScrollTop] = React.useState(0);

  const visible = virtual.getVisibleItems(scrollTop);

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      className="border rounded-lg"
    >
      <div style={{ height: virtual.totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${visible.offsetY}px)` }}>
          {visible.items.map((item, idx) => (
            <div
              key={visible.startIndex + idx}
              style={{ height: itemHeight }}
              className="border-b last:border-b-0"
            >
              {renderItem(item, visible.startIndex + idx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}