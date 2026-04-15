import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getTopPages } from '@/hooks/usePageTracking';
import { allPages } from '@/components/navigation/navigationConfig';
import { Zap } from 'lucide-react';

// Fallback pages if user has no history yet
const FALLBACK_PAGES = ['Todos', 'Calendar', 'Shopping', 'Cleaning'];

export default function PersonalizedQuickLinks({ userEmail, permissions }) {
    const allowedPages = useMemo(() => {
        return allPages
            .filter(p => !permissions || permissions[p.permission])
            .map(p => p.page);
    }, [permissions]);

    const topPages = useMemo(() => {
        const tracked = getTopPages(userEmail, 4, allowedPages);
        if (tracked.length >= 2) return tracked.map(t => t.page);
        // fall back to first 4 allowed pages from default list
        const defaults = FALLBACK_PAGES.filter(p => allowedPages.includes(p));
        return [...new Set([...tracked.map(t => t.page), ...defaults])].slice(0, 4);
    }, [userEmail, allowedPages]);

    const pageInfos = topPages.map(page => allPages.find(p => p.page === page)).filter(Boolean);

    if (pageInfos.length === 0) return null;

    const colors = ['bg-amber-600', 'bg-blue-600', 'bg-purple-600', 'bg-teal-600'];

    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Schnellzugriff</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {pageInfos.map((item, idx) => (
                    <Link key={item.page} to={createPageUrl(item.page)}>
                        <Card className="bg-card border-border hover:bg-accent/50 active:scale-95 transition-all">
                            <CardContent className="p-3 text-center">
                                <div className={cn('w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center', colors[idx % colors.length])}>
                                    <item.icon className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-[10px] font-semibold text-foreground leading-tight line-clamp-2">{item.name}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </section>
    );
}