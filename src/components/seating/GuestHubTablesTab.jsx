import { List, Grid2x2, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTableDisplayName } from '@/components/tables/TableNameDisplay';
import { STATUS_CONFIG } from './QuickReservationSheet';

export default function GuestHubTablesTab({
    tableWithStatus, stats, guestFilter, suggested, permissions,
    planView, onTableSelect, onCreateTable, onEditTable
}) {
    return (
        <div className="space-y-3">
            {/* Suggestions */}
            {guestFilter && suggested.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5" />Passende Tische für {guestFilter} Personen
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {suggested.map(t => (
                            <button key={t.id} onClick={() => onTableSelect(t)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-sm font-medium text-amber-300 min-h-[44px]">
                                {getTableDisplayName(t)} · {t.capacity} Pl.
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {guestFilter && suggested.length === 0 && (
                <div className="rounded-xl border border-border bg-secondary/20 p-3 text-sm text-muted-foreground text-center">
                    Kein passender freier Tisch für {guestFilter} Personen
                </div>
            )}

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Frei', count: stats.free, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                    { label: 'Reserviert', count: stats.reserved, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                    { label: 'Bald', count: stats.soon, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                ].map(({ label, count, color, bg }) => (
                    <div key={label} className={cn('rounded-xl border p-3 text-center', bg)}>
                        <p className={cn('text-2xl font-bold', color)}>{count}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                ))}
            </div>

            {/* Grid view */}
            {planView === 'plan' && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {tableWithStatus.map(({ table, status, reservation }) => (
                        <button key={table.id} onClick={() => onTableSelect(table)}
                            className={cn('rounded-2xl border-2 p-4 text-left transition-all active:scale-95 min-h-[100px] flex flex-col justify-between',
                                STATUS_CONFIG[status].color,
                                suggested.some(s => s.id === table.id) && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background')}>
                            <div className="flex items-start justify-between gap-1">
                                <span className="text-xl font-bold break-words flex-1">{table.name || table.number}</span>
                                <span className={cn('w-2.5 h-2.5 rounded-full mt-1 shrink-0', STATUS_CONFIG[status].dot)} />
                            </div>
                            <div>
                                <p className="text-xs font-medium">{STATUS_CONFIG[status].label}</p>
                                <p className="text-xs opacity-70">{table.capacity} Pl.</p>
                                {reservation && <p className="text-xs font-semibold truncate mt-0.5">{reservation.time}</p>}
                            </div>
                        </button>
                    ))}
                    {permissions.isManager && (
                        <button onClick={() => onCreateTable({})}
                            className="rounded-2xl border-2 border-dashed border-border p-4 min-h-[100px] flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                            <Plus className="w-5 h-5" />
                            <span className="text-xs">Tisch</span>
                        </button>
                    )}
                </div>
            )}

            {/* List view */}
            {planView === 'list' && (
                <div className="space-y-2">
                    {tableWithStatus.map(({ table, status, reservation }) => (
                        <button key={table.id} onClick={() => onTableSelect(table)}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-accent/30 active:scale-[0.99] transition-all min-h-[64px] text-left">
                            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0', STATUS_CONFIG[status].color)}>
                                {table.number}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-foreground">{getTableDisplayName(table)}</p>
                                    {table.room && <span className="text-xs text-muted-foreground">· {table.room}</span>}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {table.capacity} Pl.{reservation ? ` · ${reservation.time} · ${reservation.customer_name} (${reservation.guests}P.)` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={cn('text-xs px-2 py-1 rounded-full border', STATUS_CONFIG[status].color)}>{STATUS_CONFIG[status].label}</span>
                                {permissions.isManager && (
                                    <button onClick={e => { e.stopPropagation(); onEditTable(table); }}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent">
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </button>
                    ))}
                    {tableWithStatus.length === 0 && (
                        <div className="rounded-2xl border border-border bg-secondary/20 p-8 text-center">
                            <p className="text-muted-foreground text-sm">Keine Tische</p>
                            {permissions.isManager && <Button className="mt-3" size="sm" onClick={() => onCreateTable({})}><Plus className="w-4 h-4 mr-1.5" />Tisch anlegen</Button>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}