import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function PublicWeeklySpecialDisplay() {
    const { data: activeSpecial = null } = useQuery({
        queryKey: ['public-weekly-special'],
        queryFn: async () => {
            const specials = await base44.asServiceRole.entities.WeeklySpecial.filter({ is_active: true });
            return specials[0] || null;
        }
    });

    const { data: specialItems = [] } = useQuery({
        queryKey: ['public-weekly-special-items', activeSpecial?.id],
        queryFn: () => activeSpecial ? base44.asServiceRole.entities.WeeklySpecialItem.filter({ weekly_special_id: activeSpecial.id }) : Promise.resolve([]),
        enabled: !!activeSpecial?.id
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-900/50 to-transparent border-b border-blue-600/30 px-8 py-6">
                <h1 className="text-6xl font-bold text-center tracking-tight">
                    Wochenspecial
                </h1>
                <p className="text-center text-blue-300 text-lg mt-2">Spezielle Angebote dieser Woche</p>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-8 flex items-center justify-center">
                {!activeSpecial ? (
                    <div className="text-center">
                        <p className="text-2xl text-slate-400">Kein Wochenspecial aktiv</p>
                    </div>
                ) : specialItems.length === 0 ? (
                    <div className="text-center">
                        <p className="text-2xl text-slate-400">Wochenspecial wird geladen...</p>
                    </div>
                ) : (
                    <div className="w-full max-w-6xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-max">
                            {specialItems
                                .sort((a, b) => a.display_order - b.display_order)
                                .map((item) => (
                                    <div
                                        key={item.id}
                                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700/60 to-slate-800/60 border border-blue-500/30 hover:border-blue-500/60 shadow-2xl transition-all hover:shadow-blue-900/50 hover:scale-105"
                                    >
                                        {/* Background effect */}
                                        <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                                        {/* Content */}
                                        <div className="relative p-8 flex flex-col h-full justify-between">
                                            {/* Drink Name */}
                                            <h2 className="text-4xl font-bold text-white mb-8 leading-tight">
                                                {item.menu_item_name}
                                            </h2>

                                            {/* Price Section */}
                                            <div className="space-y-3">
                                                {item.discount_type === 'percent' && (
                                                    <div className="flex items-baseline gap-3">
                                                        <span className="text-lg text-slate-400 line-through">
                                                            {Number(item.original_price).toFixed(2)}€
                                                        </span>
                                                        <span className="text-sm font-semibold text-blue-300 bg-blue-600/30 px-3 py-1 rounded-full">
                                                            -{item.discount_value}%
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Final Price - Large */}
                                                <div className="pt-4 border-t border-blue-500/20">
                                                    <p className="text-5xl font-bold text-blue-400 tracking-tight">
                                                        {Number(item.final_price).toFixed(2)}€
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-gradient-to-r from-transparent to-blue-900/30 border-t border-blue-600/30 px-8 py-4 text-center">
                <p className="text-slate-400 text-sm">Spezielle Angebote gültig während der Aktionswoche</p>
            </footer>
        </div>
    );
}