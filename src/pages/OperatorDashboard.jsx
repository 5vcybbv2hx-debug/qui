import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
    Package, CheckSquare, ShoppingCart, ClipboardCheck, AlertTriangle,
    ChevronRight, CheckCircle2, Circle, AlertCircle, TrendingDown,
    Sun, Lock, Zap, RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import SmartSuggestions from '@/components/dashboard/SmartSuggestions';

function StatCard({ icon: Icon, label, value, sub, color, to }) {
    const inner = (
        <div className={cn('rounded-2xl border p-4 flex items-center gap-4 transition-all hover:opacity-80', color || 'bg-card border-border')}>
            <Icon className="w-8 h-8 shrink-0 opacity-80" />
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
                {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
            </div>
        </div>
    );
    return to ? <Link to={to}>{inner}</Link> : inner;
}

function SectionHeader({ icon: Icon, title, to, color = 'text-muted-foreground' }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <Icon className={cn('w-4 h-4', color)} />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h2>
            </div>
            {to && (
                <Link to={to} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Alle <ChevronRight className="w-3 h-3" />
                </Link>
            )}
        </div>
    );
}

export default function OperatorDashboard() {
    const permissions = usePermissions();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const { data: articles = [] } = useQuery({
        queryKey: ['op-articles'],
        queryFn: () => base44.entities.Article.filter({ is_active: true })
    });

    const { data: todos = [] } = useQuery({
        queryKey: ['op-todos'],
        queryFn: () => base44.entities.TodoItem.filter({ is_archived: false })
    });

    const { data: shopping = [] } = useQuery({
        queryKey: ['op-shopping'],
        queryFn: () => base44.entities.ShoppingList.list()
    });


    if (permissions.isLoading) return null;
    if (!permissions.isManager) return <PermissionDenied />;

    // Derived data
    const lowStock = articles.filter(a => a.min_stock != null && a.current_stock != null && a.current_stock <= a.min_stock);
    const criticalStock = lowStock.filter(a => a.current_stock <= 0);

    const openTodos = todos.filter(t => t.status !== 'erledigt');
    const urgentTodos = openTodos.filter(t => t.priority === 'dringend');
    const dueTodayTodos = openTodos.filter(t => t.due_date === todayStr);

    const kanbanItems = shopping.filter(s => s.status === 'offen');
    const orderedItems = shopping.filter(s => s.status === 'bestellt');


    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Operator-Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(), "EEEE, d. MMMM yyyy – HH:mm", { locale: de })} Uhr
                    </p>
                </div>

                {/* Stat Summary Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard
                        icon={TrendingDown}
                        label="Lagerwarnung"
                        value={lowStock.length}
                        sub={criticalStock.length > 0 ? `${criticalStock.length} leer` : 'Artikel'}
                        color={lowStock.length > 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-card border-border text-foreground'}
                        to={createPageUrl('Articles')}
                    />
                    <StatCard
                        icon={CheckSquare}
                        label="Offene Aufgaben"
                        value={openTodos.length}
                        sub={urgentTodos.length > 0 ? `${urgentTodos.length} dringend` : 'Aufgaben'}
                        color={urgentTodos.length > 0 ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-card border-border text-foreground'}
                        to={createPageUrl('Todos')}
                    />
                    <StatCard
                        icon={ShoppingCart}
                        label="Kanban-Trigger"
                        value={kanbanItems.length}
                        sub={orderedItems.length > 0 ? `${orderedItems.length} bestellt` : 'offen'}
                        color={kanbanItems.length > 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-card border-border text-foreground'}
                        to={createPageUrl('Shopping')}
                    />
                    
                </div>

                

                {/* Smart Suggestions */}
                <SmartSuggestions />

                {/* Low Stock */}
                {lowStock.length > 0 && (
                    <section>
                        <SectionHeader icon={TrendingDown} title="Niedriger Bestand" color="text-red-400" to={createPageUrl('Articles')} />
                        <div className="space-y-2">
                            {lowStock.slice(0, 6).map(a => (
                                <Link key={a.id} to={createPageUrl('Articles')}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors">
                                    {a.current_stock <= 0
                                        ? <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                    }
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                                        <p className="text-xs text-muted-foreground">{a.category}{a.storage_location ? ` · ${a.storage_location}` : ''}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={cn('text-sm font-bold', a.current_stock <= 0 ? 'text-red-400' : 'text-amber-400')}>
                                            {a.current_stock ?? 0}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Min: {a.min_stock}</p>
                                    </div>
                                </Link>
                            ))}
                            {lowStock.length > 6 && (
                                <Link to={createPageUrl('Articles')} className="block text-center text-xs text-muted-foreground hover:text-foreground py-2">
                                    +{lowStock.length - 6} weitere →
                                </Link>
                            )}
                        </div>
                    </section>
                )}

                {/* Open Tasks */}
                <section>
                    <SectionHeader icon={CheckSquare} title="Offene Aufgaben" color="text-emerald-400" to={createPageUrl('Todos')} />
                    {openTodos.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border rounded-xl">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                            <p className="text-sm text-muted-foreground">Alle Aufgaben erledigt</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {[...urgentTodos, ...dueTodayTodos.filter(t => t.priority !== 'dringend'), ...openTodos.filter(t => t.priority !== 'dringend' && t.due_date !== todayStr)]
                                .slice(0, 6).map(todo => (
                                <Link key={todo.id} to={createPageUrl('Todos')}
                                    className={cn('flex items-center gap-3 p-3 rounded-xl border transition-colors',
                                        todo.priority === 'dringend' ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10' : 'border-border bg-card hover:bg-accent/30'
                                    )}>
                                    {todo.priority === 'dringend'
                                        ? <Zap className="w-4 h-4 text-red-400 shrink-0" />
                                        : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                                    }
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{todo.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {todo.assigned_to || todo.category}
                                            {todo.due_date && ` · Fällig ${format(new Date(todo.due_date), 'dd.MM.', { locale: de })}`}
                                        </p>
                                    </div>
                                    <Badge className={cn('text-xs shrink-0 border',
                                        todo.priority === 'dringend' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        todo.priority === 'hoch' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                        'bg-secondary text-muted-foreground border-border'
                                    )}>{todo.priority}</Badge>
                                </Link>
                            ))}
                            {openTodos.length > 6 && (
                                <Link to={createPageUrl('Todos')} className="block text-center text-xs text-muted-foreground hover:text-foreground py-2">
                                    +{openTodos.length - 6} weitere →
                                </Link>
                            )}
                        </div>
                    )}
                </section>

                {/* Kanban / Shopping Triggers */}
                <section>
                    <SectionHeader icon={ShoppingCart} title="Kanban-Trigger" color="text-amber-400" to={createPageUrl('Shopping')} />
                    {kanbanItems.length === 0 && orderedItems.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border rounded-xl">
                            <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-amber-400 opacity-60" />
                            <p className="text-sm text-muted-foreground">Keine offenen Bestellungen</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {[...kanbanItems, ...orderedItems].slice(0, 6).map(item => (
                                <Link key={item.id} to={createPageUrl('Shopping')}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors">
                                    <ShoppingCart className="w-4 h-4 text-amber-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{item.item_name}</p>
                                        <p className="text-xs text-muted-foreground">{item.category} · {item.quantity} {item.unit}</p>
                                    </div>
                                    <Badge className={cn('text-xs shrink-0 border',
                                        item.status === 'offen' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                    )}>{item.status}</Badge>
                                </Link>
                            ))}
                            {(kanbanItems.length + orderedItems.length) > 6 && (
                                <Link to={createPageUrl('Shopping')} className="block text-center text-xs text-muted-foreground hover:text-foreground py-2">
                                    +{kanbanItems.length + orderedItems.length - 6} weitere →
                                </Link>
                            )}
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
}