import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query'
import { STALE } from '@/lib/queryUtils';;
import { usePermissions } from '@/components/auth/usePermissions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Download, Database, Shield, AlertTriangle, CheckCircle2,
    Clock, FileJson, FileText, Archive, ChevronRight, Layers,
    Users, Calendar, Package, ClipboardList, BarChart2, Settings2, Lock
} from 'lucide-react';
import PermissionDenied from '@/components/auth/PermissionDenied';
import ExportModuleSelector from '@/components/export/ExportModuleSelector';
import ExportRunner from '@/components/export/ExportRunner';
import ExportHistory from '@/components/export/ExportHistory';
import ExportValidation from '@/components/export/ExportValidation';

const TABS = [
    { id: 'overview', label: 'Übersicht', icon: Database },
    { id: 'modules', label: 'Module', icon: Layers },
    { id: 'validation', label: 'Validierung', icon: Shield },
    { id: 'history', label: 'Historie', icon: Clock },
];

export default function DataExport() {
    const permissions = usePermissions();
    const [activeTab, setActiveTab] = useState('overview');
    const [exportConfig, setExportConfig] = useState({
        type: 'full',
        format: 'json',
        selectedModules: [],
        dateRange: null,
    });
    const [showRunner, setShowRunner] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    if (permissions.isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!permissions.isAdmin && !permissions.isManager) {
        return <PermissionDenied message="Nur Administratoren dürfen Daten exportieren." />;
    }

    const handleStartExport = () => {
        if (!confirmed) {
            if (!window.confirm(
                '⚠️ DSGVO-Hinweis\n\nDieser Export enthält personenbezogene Daten (Mitarbeiter, Reservierungen usw.).\n\n' +
                'Der Zugriff wird protokolliert. Nur für autorisierte Migrationen verwenden.\n\nExport jetzt starten?'
            )) return;
            setConfirmed(true);
        }
        setShowRunner(true);
    };

    if (showRunner) {
        return (
            <ExportRunner
                config={exportConfig}
                onBack={() => setShowRunner(false)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-background pb-28 md:pb-8">
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Download className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Datenexport & Migration</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Vollständiger Export aller Systemdaten für Bar Shift Pro 2.0
                        </p>
                    </div>
                    <Badge className="ml-auto bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3" /> Nur Admin
                    </Badge>
                </div>

                {/* DSGVO Banner */}
                <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="p-4 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-200">
                            <p className="font-semibold mb-1">DSGVO-Hinweis</p>
                            <p className="text-amber-300/80">
                                Dieser Bereich enthält personenbezogene Daten. Alle Exporte werden protokolliert.
                                Zugriff nur für autorisierte Administratoren. Daten dürfen nur für die Migration zu Bar Shift Pro 2.0 verwendet werden.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-card border border-border rounded-xl">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5',
                                activeTab === tab.id
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <OverviewTab
                        exportConfig={exportConfig}
                        setExportConfig={setExportConfig}
                        onStartExport={handleStartExport}
                    />
                )}
                {activeTab === 'modules' && (
                    <ExportModuleSelector
                        selected={exportConfig.selectedModules}
                        onChange={(mods) => setExportConfig(c => ({ ...c, selectedModules: mods, type: 'module' }))}
                        onStartExport={handleStartExport}
                    />
                )}
                {activeTab === 'validation' && <ExportValidation />}
                {activeTab === 'history' && <ExportHistory />}
            </div>
        </div>
    );
}

function OverviewTab({ exportConfig, setExportConfig, onStartExport }) {
    const EXPORT_TYPES = [
        {
            id: 'full',
            label: 'Vollständiger Export',
            desc: 'Alle Module, Einstellungen, Dateien & Logs',
            icon: Archive,
            color: 'bg-blue-600',
            badge: 'Empfohlen',
        },
        {
            id: 'module',
            label: 'Modul-Export',
            desc: 'Einzelne Module nach Wahl',
            icon: Layers,
            color: 'bg-purple-600',
        },
        {
            id: 'period',
            label: 'Zeitraum-Export',
            desc: 'Daten eines bestimmten Zeitraums',
            icon: Clock,
            color: 'bg-teal-600',
        },
    ];

    const FORMATS = [
        { id: 'json', label: 'JSON', desc: 'Für Import in Bar Shift Pro 2.0', icon: FileJson, recommended: true },
        { id: 'csv', label: 'CSV', desc: 'Für Tabellenverarbeitung', icon: FileText },
        { id: 'xlsx', label: 'XLSX', desc: 'Excel-kompatibel', icon: FileText },
        { id: 'zip', label: 'ZIP-Backup', desc: 'Komplettarchiv mit allen Dateien', icon: Archive },
    ];

    const QUICK_STATS = [
        { icon: Users, label: 'Mitarbeiter', entity: 'Employee', color: 'text-blue-400' },
        { icon: Calendar, label: 'Schichten', entity: 'Shift', color: 'text-purple-400' },
        { icon: Package, label: 'Artikel', entity: 'Article', color: 'text-amber-400' },
        { icon: ClipboardList, label: 'Aufgaben', entity: 'TodoItem', color: 'text-green-400' },
        { icon: BarChart2, label: 'Zeiteinträge', entity: 'TimeEntry', color: 'text-teal-400' },
        { icon: Settings2, label: 'Reservierungen', entity: 'Reservation', color: 'text-pink-400' },
    ];

    return (
        <div className="space-y-5">
            {/* Export Type */}
            <section>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">Export-Art</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {EXPORT_TYPES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setExportConfig(c => ({ ...c, type: t.id }))}
                            className={cn(
                                'text-left p-4 rounded-xl border transition-all',
                                exportConfig.type === t.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border bg-card hover:bg-accent/30'
                            )}
                        >
                            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', t.color)}>
                                <t.icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-foreground">{t.label}</p>
                                {t.badge && <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">{t.badge}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{t.desc}</p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Format */}
            <section>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">Format</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FORMATS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setExportConfig(c => ({ ...c, format: f.id }))}
                            className={cn(
                                'text-left p-3 rounded-xl border transition-all',
                                exportConfig.format === f.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border bg-card hover:bg-accent/30'
                            )}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <f.icon className="w-4 h-4 text-muted-foreground" />
                                <p className="text-sm font-bold text-foreground">{f.label}</p>
                                {f.recommended && <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">Standard</Badge>}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{f.desc}</p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Quick Stats */}
            <section>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">Zu exportierende Daten</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {QUICK_STATS.map(s => (
                        <QuickStatCard key={s.entity} {...s} />
                    ))}
                </div>
            </section>

            {/* Start Button */}
            <Button
                onClick={onStartExport}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm font-semibold"
            >
                <Download className="w-4 h-4" />
                Export starten ({exportConfig.format.toUpperCase()} · {exportConfig.type === 'full' ? 'Vollständig' : exportConfig.type === 'module' ? 'Module' : 'Zeitraum'})
                <ChevronRight className="w-4 h-4" />
            </Button>
        </div>
    );
}

function QuickStatCard({ icon: Icon, label, entity, color }) {
    const { data = [] } = useQuery({
        queryKey: ['export-stat', entity],
        queryFn: () => base44.entities[entity]?.list('-created_date', 1) || [],
        staleTime: STALE.MEDIUM,
    });

    const { data: countData = [] } = useQuery({
        queryKey: ['export-count', entity],
        queryFn: () => base44.entities[entity]?.list('-created_date', 5000) || [],
        staleTime: STALE.MEDIUM,
    });

    return (
        <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
                <Icon className={cn('w-5 h-5 mx-auto mb-1', color)} />
                <p className="text-lg font-bold text-foreground">{countData.length}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
        </Card>
    );
}