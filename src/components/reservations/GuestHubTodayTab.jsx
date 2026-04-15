import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTableDisplayName } from '@/components/tables/TableNameDisplay';

export default function GuestHubTodayTab({ 
    todayReservations, tables, stats, permissions, 
    onAddReservation, onEditReservation 
}) {
    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Frei', count: stats.free, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                    { label: 'Reserviert', count: stats.reserved, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                    { label: 'Heute', count: todayReservations.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                ].map(({ label, count, color, bg }) => (
                    <div key={label} className={cn('rounded-xl border p-3 text-center', bg)}>
                        <p className={cn('text-2xl font-bold', color)}>{count}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                ))}
            </div>

            {/* No table assigned warnings */}
            {todayReservations.filter(r => !r.table).length > 0 && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">
                        <strong>{todayReservations.filter(r => !r.table).length}</strong> Reservierung(en) ohne Tischzuweisung
                    </p>
                </div>
            )}

            {/* Timeline */}
            {todayReservations.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {format(new Date(), "EEEE, d. MMMM", { locale: de })}
                    </p>
                    {todayReservations.map(res => {
                        const tbl = tables.find(t => t.id === res.table || t.number === res.table);
                        const now = new Date();
                        const [rh, rm] = (res.time || '0:0').split(':').map(Number);
                        const diffMin = rh * 60 + rm - (now.getHours() * 60 + now.getMinutes());
                        const isUpcoming = diffMin > 0 && diffMin <= 60;
                        return (
                            <button key={res.id} onClick={() => onEditReservation(res)}
                                className={cn('w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left min-h-[68px] transition-colors hover:bg-accent/30',
                                    isUpcoming ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card')}>
                                <div className="flex flex-col items-center shrink-0 w-12">
                                    <span className="text-sm font-bold text-foreground">{res.time}</span>
                                    <span className="text-[10px] text-muted-foreground">{res.guests}P.</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-semibold text-foreground truncate">{res.customer_name}</p>
                                        {isUpcoming && <span className="text-[10px] text-amber-400 shrink-0">bald</span>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {tbl ? getTableDisplayName(tbl) : <span className="text-amber-400">Kein Tisch</span>}
                                    </p>
                                </div>
                                <span className={cn('text-[10px] px-2 py-1 rounded-full border shrink-0',
                                    res.status === 'bestätigt' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                                    res.status === 'storniert' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                    'bg-amber-500/10 border-amber-500/30 text-amber-400')}>
                                    {res.status}
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-border bg-secondary/20 p-8 text-center">
                    <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Keine Reservierungen heute</p>
                    {permissions.canEditReservations && (
                        <Button size="sm" className="mt-3" onClick={onAddReservation}>
                            <Plus className="w-4 h-4 mr-1.5" />Erste Reservierung
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}