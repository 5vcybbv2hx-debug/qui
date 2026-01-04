import React from 'react';
import { Package } from 'lucide-react';

export default function Restock() {
    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Auffülliste</h1>
                    <p className="text-slate-400 text-sm mt-1">Theke aus dem Lager auffüllen</p>
                </div>

                <div className="flex items-center justify-center py-20">
                    <div className="text-center text-slate-500">
                        <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Bereit für neue Funktionen</p>
                    </div>
                </div>
            </div>
        </div>
    );
}