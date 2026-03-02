import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function TableGrid({ tables, reservations, getTableReservation, onTableClick }) {
    return (
        <div className="bg-card rounded-2xl border border-border p-8 min-h-96 overflow-auto">
            <div className="relative w-full h-full" style={{ minHeight: '600px' }}>
                {tables.length === 0 ? (
                    <div className="flex items-center justify-center h-96 text-muted-foreground">
                        Keine Tische definiert
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-6 p-4">
                        {tables.map(table => {
                            const reservation = getTableReservation(table.id);
                            const x = table.position_x || Math.random() * 80;
                            const y = table.position_y || Math.random() * 80;

                            return (
                                <button
                                    key={table.id}
                                    onClick={() => onTableClick(table)}
                                    className={cn(
                                        "relative w-32 h-32 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer",
                                        reservation
                                            ? "bg-amber-500/20 border-amber-500 hover:bg-amber-500/30"
                                            : "bg-green-500/20 border-green-500 hover:bg-green-500/30"
                                    )}
                                >
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-foreground">
                                            {table.table_number}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {table.capacity} Plätze
                                        </div>
                                        {reservation && (
                                            <div className="text-xs text-amber-600 mt-2 font-semibold">
                                                Reserviert
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}