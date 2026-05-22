import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Wrench, CheckCircle2, AlertCircle, Clock, ChevronRight } from "lucide-react";
import MaintenanceModal from "../components/maintenance/MaintenanceModal";
import { usePermissions } from "../components/auth/usePermissions";
import PermissionDenied from "../components/auth/PermissionDenied";
import {
    getTaskStatus,
    sortTasksByUrgency,
    calculateNextMaintenance,
    formatRelativeDate,
    STATUS_CONFIG,
    CATEGORY_ICONS,
} from "@/lib/maintenanceUtils";
import { cn } from "@/lib/utils";
import { haptics } from "@/components/utils/haptics";
import { toast } from "sonner";

// ── Filter tabs ──────────────────────────────────────────────────────────────
const FILTERS = [
    { key: 'alle',        label: 'Alle' },
    { key: 'überfällig',  label: 'Überfällig' },
    { key: 'bald fällig', label: 'Bald fällig' },
    { key: 'ok',          label: 'OK' },
];

// ── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ count, label, colorClass, icon: Icon }) {
    return (
        <div className={cn("flex-1 rounded-2xl p-3 flex flex-col items-center gap-1", colorClass)}>
            <Icon className="w-5 h-5" />
            <span className="text-2xl font-bold leading-none">{count}</span>
            <span className="text-xs font-medium leading-tight text-center">{label}</span>
        </div>
    );
}

// ── Task card ────────────────────────────────────────────────────────────────
function MaintenanceCard({ task, onEdit, onComplete, canEdit, isCompleting }) {
    const status = getTaskStatus(task);
    const cfg    = STATUS_CONFIG[status];
    const nextLabel = formatRelativeDate(task.next_maintenance);

    return (
        <div className={cn(
            "rounded-2xl border border-border/60 bg-card overflow-hidden border-l-4",
            cfg.border
        )}>
            {/* Top row */}
            <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{CATEGORY_ICONS[task.category] || '🔧'}</span>
                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", cfg.badge)}>
                                {cfg.label}
                            </span>
                            {task.category && (
                                <span className="text-xs text-muted-foreground">{task.category}</span>
                            )}
                        </div>
                        <h3 className="text-base font-bold text-foreground leading-snug">{task.equipment_name}</h3>
                        {task.task_description && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                                {task.task_description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Date row */}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Nächste Wartung</span>
                        <span className={cn("text-sm font-bold", cfg.text)}>{nextLabel}</span>
                    </div>
                    {task.last_maintenance && (
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Zuletzt</span>
                            <span className="text-sm text-foreground">
                                {new Date(task.last_maintenance).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Intervall</span>
                        <span className="text-sm text-foreground capitalize">{task.frequency}</span>
                    </div>
                    {task.responsible && (
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Zuständig</span>
                            <span className="text-sm text-foreground">{task.responsible}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            {canEdit && (
                <div className="px-4 pb-4 flex gap-2 border-t border-border/30 pt-3">
                    {status !== 'ok' && (
                        <Button
                            size="sm"
                            disabled={isCompleting}
                            onClick={() => { haptics.medium(); onComplete(task); }}
                            className="flex-1 h-10 rounded-xl gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {isCompleting ? 'Wird gespeichert…' : 'Wartung erledigt'}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { haptics.light(); onEdit(task); }}
                        className={cn("h-10 rounded-xl gap-1", status === 'ok' ? 'flex-1' : 'px-4')}
                    >
                        Bearbeiten
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )}
        </div>
    );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function MaintenancePage() {
    const permissions  = usePermissions();
    const queryClient  = useQueryClient();
    const [selectedTask, setSelectedTask] = useState(null);
    const [showModal,    setShowModal]    = useState(false);
    const [activeFilter, setActiveFilter] = useState('alle');

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['maintenance-tasks'],
        queryFn:  () => base44.entities.MaintenanceTask.filter({ is_active: true }),
    });

    const completeMutation = useMutation({
        mutationFn: async (task) => {
            const today    = new Date().toISOString().split('T')[0];
            const nextDate = calculateNextMaintenance(today, task.frequency);
            return base44.entities.MaintenanceTask.update(task.id, {
                last_maintenance: today,
                next_maintenance: nextDate,
                status: 'erledigt',
            });
        },
        onSuccess: () => {
            haptics.success();
            toast.success('Wartung als erledigt markiert');
            queryClient.invalidateQueries({ queryKey: ['maintenance-tasks'] });
        },
        onError: (err) => toast.error('Fehler beim Speichern'),
    });

    // Derived data
    const overdueCount  = useMemo(() => tasks.filter(t => getTaskStatus(t) === 'überfällig').length,  [tasks]);
    const dueSoonCount  = useMemo(() => tasks.filter(t => getTaskStatus(t) === 'bald fällig').length, [tasks]);
    const okCount       = useMemo(() => tasks.filter(t => getTaskStatus(t) === 'ok').length,          [tasks]);

    const filteredTasks = useMemo(() => {
        const base = activeFilter === 'alle' ? tasks : tasks.filter(t => getTaskStatus(t) === activeFilter);
        return sortTasksByUrgency(base);
    }, [tasks, activeFilter]);

    const openModal = (task = null) => { setSelectedTask(task); setShowModal(true); };

    if (permissions.loading) return (
        <div className="flex justify-center items-center p-12">
            <div className="w-8 h-8 border-4 border-border border-t-amber-500 rounded-full animate-spin" />
        </div>
    );
    if (!permissions.isManager) return <PermissionDenied />;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 pt-5 pb-28 space-y-5">

                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Wrench className="w-6 h-6 text-amber-500" />
                            Wartung
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Wartungsintervalle & Prüfpflichten
                        </p>
                    </div>
                    {permissions.canEditEmployees && (
                        <Button
                            onClick={() => openModal()}
                            className="h-11 rounded-xl gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold px-5 shrink-0"
                        >
                            <Plus className="w-5 h-5" />
                            Neu
                        </Button>
                    )}
                </div>

                {/* ── Stat pills ── */}
                <div className="flex gap-3">
                    <StatPill
                        count={overdueCount}
                        label="Überfällig"
                        colorClass="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        icon={AlertCircle}
                    />
                    <StatPill
                        count={dueSoonCount}
                        label="Bald fällig"
                        colorClass="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500"
                        icon={Clock}
                    />
                    <StatPill
                        count={okCount}
                        label="OK"
                        colorClass="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        icon={CheckCircle2}
                    />
                </div>

                {/* ── Filter tabs ── */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            className={cn(
                                "shrink-0 px-4 h-9 rounded-xl text-sm font-semibold transition-all",
                                activeFilter === f.key
                                    ? "bg-foreground text-background"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* ── Task list ── */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-border border-t-amber-500 rounded-full animate-spin" />
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="rounded-2xl border border-border/60 bg-card p-10 text-center space-y-2">
                        <Wrench className="w-10 h-10 text-muted-foreground mx-auto" />
                        <p className="font-semibold text-foreground">Keine Einträge</p>
                        <p className="text-sm text-muted-foreground">
                            {activeFilter === 'alle'
                                ? 'Noch keine Wartungsaufgaben angelegt.'
                                : `Keine Einträge mit Status „${activeFilter}".`}
                        </p>
                        {activeFilter === 'alle' && permissions.canEditEmployees && (
                            <Button
                                onClick={() => openModal()}
                                className="mt-3 h-10 rounded-xl gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Erste Wartung anlegen
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTasks.map(task => (
                            <MaintenanceCard
                                key={task.id}
                                task={task}
                                canEdit={permissions.canEditEmployees}
                                onEdit={openModal}
                                onComplete={(t) => completeMutation.mutate(t)}
                                isCompleting={completeMutation.isPending && completeMutation.variables?.id === task.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <MaintenanceModal
                    task={selectedTask}
                    open={showModal}
                    onClose={() => { setShowModal(false); setSelectedTask(null); }}
                />
            )}
        </div>
    );
}