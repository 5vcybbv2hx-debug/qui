import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PullToRefresh({ onRefresh, children }) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const containerRef = useRef(null);

    const handleTouchStart = (e) => {
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e) => {
        if (isRefreshing || !containerRef.current || containerRef.current.scrollTop > 0) return;
        
        const currentY = e.touches[0].clientY;
        const distance = Math.max(0, currentY - startY.current);
        
        if (distance > 0) {
            e.preventDefault();
            setPullDistance(Math.min(distance, 120));
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance > 80) {
            setIsRefreshing(true);
            if ('vibrate' in navigator) navigator.vibrate(30);
            
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
    };

    return (
        <div 
            ref={containerRef}
            className="relative h-full overflow-auto"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div 
                className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center transition-all duration-200 pointer-events-none"
                style={{ 
                    height: `${pullDistance}px`,
                    opacity: pullDistance / 100,
                    marginTop: 'env(safe-area-inset-top)'
                }}
            >
                <div className="flex items-center gap-2 text-slate-400">
                    <RefreshCw 
                        className={cn(
                            "w-5 h-5",
                            isRefreshing && "animate-spin"
                        )} 
                    />
                    <span className="text-sm font-medium">
                        {isRefreshing ? 'Wird aktualisiert...' : pullDistance > 80 ? 'Loslassen' : 'Ziehen zum Aktualisieren'}
                    </span>
                </div>
            </div>
            
            {/* Content */}
            <div style={{ paddingTop: `${pullDistance}px` }}>
                {children}
            </div>
        </div>
    );
}