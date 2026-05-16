import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { calculateCompletion, getMissingFields, SECTIONS } from '@/lib/employeeCompleteness';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    Users, Package, AlertTriangle, CheckCircle2, ChevronRight,
    TrendingDown, ImageOff, DollarSign, Hash, Tag, RefreshCw
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// ── Mitarbeiter-Check ───────────────────────────────────────────────────────

function EmployeeQualitySection({ employees }) {
    const issues = employees
        .filter(e => e.is_active !== false)
        .map(e => {
            const missing = getMissingFields(e);
            const completion = calculateCompletion(e);
            return { ...e, missing, completion };
        })
        .filter(e => Object.keys(e.missing).length > 0)
        .sort((a, b) => a.completion - b.completion);

    const complete = employees.filter(e => e.is_active !== false).length - issues.length;

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                    <h2 className="text-sm font-bold text-foreground">Mitarbeiter-Personalbögen</h2>
                    <p className="text-xs text-muted-foreground">{issues.length} mit fehlenden Angaben · {complete} vollständig</p>
                </div>
                {issues.length === 0 && <CheckCircle2 className="w-5 h-5 text-green-400" />}
            </div>

            {issues.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Alle Mitarbeiter vollständig ✓</div>
            ) : (
                <div className="divide-y divide-border">
                    {issues.map(emp => (
                        <div key={emp.id} className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-foreground">{emp.name}</p>
                                    <p className="text-xs text-muted-foreground">{emp.role}</p>
                                </div>
                                <span className={cn(
                                    'text-xs font-bold px-2 py-0.5 rounded-full',
                                    emp.completion >= 75 ? 'bg-amber-500/20 text-amber-400' :
                                    emp.completion >= 50 ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-red-500/20 text-red-400'
                                )}>{emp.completion}%</span>
                            </div>
                            <Progress value={emp.completion} className="h-1.5 mb-2" />
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(emp.missing).map(([section, fields]) => (
                                    <span key={section} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                                        {SECTIONS[section]?.label}: {fields.length} Feld{fields.length > 1 ? 'er' : ''}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Artikel-Check ───────────────────────────────────────────────────────────

const ARTICLE_CHECKS = [
    { key: 'no_price',    label: 'Kein Preis',         icon: DollarSign,  check: a => !a.price && a.price !== 0 },
    { key: 'no_category', label: 'Keine Kategorie',    icon: Tag,         check: a => !a.category },
    { key: 'no_unit',     label: 'Keine Einheit',      icon: Hash,        check: a => !a.unit },
    { key: 'no_image',    label: 'Kein Bild',          icon: ImageOff,    check: a => !a.image_url },
    { key: 'no_supplier', label: 'Kein Lieferant',     icon: TrendingDown,check: a => !a.supplier_id && !a.supplier_name },
    { key: 'no_min_stock',label: 'Kein Mindestbestand',icon: RefreshCw,   check: a => a.min_stock === undefined || a.min_stock === null },
];

function ArticleQualitySection({ articles }) {
    const [activeFilter, setActiveFilter] = useState(null);

    const stats = ARTICLE_CHECKS.map(c => ({
        ...c,
        count: articles.filter(c.check).length,
    }));

    const filtered = activeFilter
        ? articles.filter(ARTICLE_CHECKS.find(c => c.key === activeFilter)?.check || (() => false))
        : [];

    const totalOk = articles.filter(a => !ARTICLE_CHECKS.some(c => c.check(a))).length;

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                    <h2 className="text-sm font-bold text-foreground">Artikel-Datenqualität</h2>
                    <p className="text-xs text-muted-foreground">{articles.length} Artikel · {totalOk} ohne Probleme</p>
                </div>
            </div>

            {/* Check-Kacheln */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
                {stats.map(stat => (
                    <button
                        key={stat.key}
                        onClick={() => setActiveFilter(activeFilter === stat.key ? null : stat.key)}
                        className={cn(
                            'flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all',
                            stat.count === 0
                                ? 'border-green-500/20 bg-green-500/5 opacity-60 cursor-default'
                                : activeFilter === stat.key
                                    ? 'border-amber-500/50 bg-amber-500/15'
                                    : 'border-border hover:border-amber-500/30 hover:bg-accent/50 cursor-pointer'
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <stat.icon className={cn(
                                'w-4 h-4',
                                stat.count === 0 ? 'text-green-400' : 'text-amber-400'
                            )} />
                            <span className={cn(
                                'text-lg font-bold',
                                stat.count === 0 ? 'text-green-400' : 'text-foreground'
                            )}>{stat.count}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight">{stat.label}</p>
                    </button>
                ))}
            </div>

            {/* Artikel-Liste für ausgewählten Filter */}
            {activeFilter && filtered.length > 0 && (
                <div className="border-t border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide px-4 pt-3 pb-1">
                        {stats.find(s => s.key === activeFilter)?.label} ({filtered.length})
                    </p>
                    <div className="divide-y divide-border max-h-72 overflow-y-auto">
                        {filtered.map(a => (
                            <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                                {a.image_url ? (
                                    <img src={a.image_url} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                        <Package className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{a.category || '–'}</p>
                                </div>
                                <Link to="/Articles" className="text-xs text-primary hover:underline shrink-0">
                                    Bearbeiten
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Zusammenfassung oben ────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, color }) {
    return (
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}

// ── MAIN ───────────────────────────────────────────────────────────────────

export default function DataQuality() {
    const { data: employees = [], isLoading: loadingEmp } = useQuery({
        queryKey: ['employees-all'],
        queryFn: () => base44.entities.Employee.list(),
    });

    const { data: articles = [], isLoading: loadingArt } = useQuery({
        queryKey: ['articles-all'],
        queryFn: () => base44.entities.Article.list(),
    });

    const activeEmployees = employees.filter(e => e.is_active !== false);
    const empWithIssues = activeEmployees.filter(e => Object.keys(getMissingFields(e)).length > 0).length;
    const artWithIssues = articles.filter(a => ARTICLE_CHECKS.some(c => c.check(a))).length;

    const isLoading = loadingEmp || loadingArt;

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl font-bold text-foreground">Datenqualität</h1>
                <p className="text-sm text-muted-foreground">Übersicht über fehlende oder unvollständige Stammdaten</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-3">
                        <SummaryCard
                            label="Mitarbeiter mit Lücken"
                            value={empWithIssues}
                            icon={Users}
                            color={empWithIssues === 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                        />
                        <SummaryCard
                            label="Artikel mit Problemen"
                            value={artWithIssues}
                            icon={AlertTriangle}
                            color={artWithIssues === 0 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}
                        />
                    </div>

                    <EmployeeQualitySection employees={employees} />
                    <ArticleQualitySection articles={articles} />
                </>
            )}
        </div>
    );
}