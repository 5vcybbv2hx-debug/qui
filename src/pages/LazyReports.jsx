import { lazy, Suspense } from 'react';

const Reports = lazy(() => import('./Reports'));

export default function LazyReports() {
    return (
        <Suspense fallback={
            <div className="fixed inset-0 flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
                    <p className="text-sm text-muted-foreground">Berichte werden geladen...</p>
                </div>
            </div>
        }>
            <Reports />
        </Suspense>
    );
}