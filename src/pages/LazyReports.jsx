import { lazy, Suspense } from 'react';
import { Card } from '@/components/ui/card';

const Reports = lazy(() => import('./Reports'));

export default function LazyReports() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Card className="p-8 bg-slate-800 border-slate-700">
                    <div className="text-center text-white">
                        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p>Berichte werden geladen...</p>
                    </div>
                </Card>
            </div>
        }>
            <Reports />
        </Suspense>
    );
}