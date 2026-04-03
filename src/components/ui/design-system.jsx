/**
 * Bar Manager Design System
 * Zentrale, wiederverwendbare UI-Bausteine für alle Seiten.
 * Import: import { PageShell, PageHeader, SectionCard, StatCard, EmptyState, StatusBadge } from '@/components/ui/design-system';
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ── PageShell ──────────────────────────────────────────────────────────────────
// Wraps every page's content with consistent padding and max-width.
export function PageShell({ children, className }) {
    return (
        <div className={cn('min-h-screen bg-background pb-28 md:pb-10', className)}>
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
                {children}
            </div>
        </div>
    );
}

// ── PageHeader ─────────────────────────────────────────────────────────────────
// Consistent page title + optional subtitle + optional right-side action slot.
export function PageHeader({ title, subtitle, action, className }) {
    return (
        <div className={cn('flex items-start justify-between gap-3', className)}>
            <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground tracking-tight leading-tight">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

// ── SectionCard ────────────────────────────────────────────────────────────────
// Standard card container with optional title.
export function SectionCard({ title, children, className, headerAction }) {
    return (
        <div className={cn('bg-card border border-border rounded-2xl overflow-hidden', className)}>
            {title && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    {headerAction && <div>{headerAction}</div>}
                </div>
            )}
            <div className="p-4">{children}</div>
        </div>
    );
}

// ── StatCard ───────────────────────────────────────────────────────────────────
// Prominent metric display.
export function StatCard({ label, value, sub, icon: Icon, accent = false, className }) {
    return (
        <div className={cn(
            'bg-card border border-border rounded-2xl p-4 flex flex-col gap-2',
            accent && 'border-amber-500/30 bg-amber-500/5',
            className
        )}>
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground leading-tight">{label}</p>
                {Icon && (
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', accent ? 'bg-amber-500/15 text-amber-500' : 'bg-secondary text-muted-foreground')}>
                        <Icon className="w-4 h-4" />
                    </div>
                )}
            </div>
            <p className={cn('text-2xl font-bold', accent ? 'text-amber-500' : 'text-foreground')}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
    );
}

// ── ActionCard ─────────────────────────────────────────────────────────────────
// Tappable card for quick-actions / nav tiles.
export function ActionCard({ icon: Icon, label, sub, onClick, accent = false, className }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-2xl transition-all active:scale-95 hover:border-amber-500/40',
                accent && 'border-amber-500/40 bg-amber-500/5',
                className
            )}
        >
            {Icon && (
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', accent ? 'bg-amber-500/15 text-amber-500' : 'bg-secondary text-muted-foreground')}>
                    <Icon className="w-5 h-5" />
                </div>
            )}
            <div className="text-center">
                <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </button>
    );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action, className }) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
            {Icon && (
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-muted-foreground" />
                </div>
            )}
            <p className="text-base font-semibold text-foreground">{title}</p>
            {description && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

// ── StatusBadge ────────────────────────────────────────────────────────────────
// Semantic status pills.
const STATUS_STYLES = {
    success:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    warning:  'bg-amber-500/10 text-amber-400 border-amber-500/25',
    error:    'bg-red-500/10 text-red-400 border-red-500/25',
    info:     'bg-blue-500/10 text-blue-400 border-blue-500/25',
    neutral:  'bg-secondary text-muted-foreground border-border',
    amber:    'bg-amber-500/10 text-amber-400 border-amber-500/25',
};

export function StatusBadge({ status = 'neutral', children, className }) {
    return (
        <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
            STATUS_STYLES[status] || STATUS_STYLES.neutral,
            className
        )}>
            {children}
        </span>
    );
}

// ── LoadingState ───────────────────────────────────────────────────────────────
export function LoadingState({ text = 'Lädt...' }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm">{text}</p>
        </div>
    );
}

// ── ListItem ───────────────────────────────────────────────────────────────────
// Consistent row in a list/card.
export function ListItem({ left, center, right, onClick, className }) {
    const Comp = onClick ? 'button' : 'div';
    return (
        <Comp
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                onClick && 'hover:bg-accent/50 active:bg-accent cursor-pointer',
                className
            )}
        >
            {left && <div className="shrink-0">{left}</div>}
            <div className="flex-1 min-w-0">{center}</div>
            {right && <div className="shrink-0">{right}</div>}
        </Comp>
    );
}

// ── FilterBar ──────────────────────────────────────────────────────────────────
export function FilterBar({ options, active, onChange, className }) {
    return (
        <div className={cn('flex gap-2 overflow-x-auto pb-1', className)}>
            {options.map(opt => {
                const isActive = opt.value === active;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                            isActive
                                ? 'bg-amber-500 text-slate-900 font-semibold'
                                : 'bg-secondary text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {opt.label}
                        {opt.count !== undefined && (
                            <span className={cn('ml-1.5 text-xs', isActive ? 'opacity-70' : 'text-muted-foreground')}>
                                {opt.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ── SectionDivider ─────────────────────────────────────────────────────────────
export function SectionDivider({ label }) {
    return (
        <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border" />
            {label && <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">{label}</span>}
            <div className="flex-1 h-px bg-border" />
        </div>
    );
}

// ── ProgressBar ────────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, accent = false, className }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div className={cn('h-2 bg-secondary rounded-full overflow-hidden', className)}>
            <div
                className={cn('h-full rounded-full transition-all', accent ? 'bg-amber-500' : 'bg-emerald-500')}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}