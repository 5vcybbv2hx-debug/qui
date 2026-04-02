import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Analyzes daily data and returns interpretative insights.
 * Derives status (green/yellow/red) and lists top issues.
 */
export default function InsightsPanel({
    revenue = 0,
    dailyLaborCost = 0,
    fullTimeLaborCost = 0,
    dailyPaidCount = 0,
    fullTimeCount = 0,
    totalRatio = null,
    barMinusPersonnel = null,
    staffCount = 0,
    dailyTimeEntriesCount = 0,
    hasRevenue = false,
}) {
    const insights = useMemo(() => {
        const issues = [];
        let status = 'good'; // good | warning | critical

        // Issue 1: No revenue uploaded yet
        if (!hasRevenue && revenue === 0) {
            issues.push({
                type: 'warning',
                icon: AlertCircle,
                text: 'Z-Abschlag noch nicht erfasst',
                action: { label: 'Hochladen', hint: 'Scrolle zu den KPIs' }
            });
            status = 'warning';
        }

        // Issue 2: Negative or very low bar minus personnel
        if (barMinusPersonnel !== null && barMinusPersonnel < 0) {
            issues.push({
                type: 'critical',
                icon: AlertTriangle,
                text: `Tagesgewinn negativ (${barMinusPersonnel.toFixed(2)} €)`,
                hint: 'Personalkosten übersteigen Umsatz'
            });
            status = 'critical';
        } else if (barMinusPersonnel !== null && barMinusPersonnel < 100) {
            issues.push({
                type: 'warning',
                icon: AlertCircle,
                text: `Gewinn sehr niedrig (${barMinusPersonnel.toFixed(2)} €)`,
                hint: 'Unter 100 € nach Personalkosten'
            });
            if (status !== 'critical') status = 'warning';
        }

        // Issue 3: High personnel ratio
        if (totalRatio !== null && totalRatio > 35) {
            issues.push({
                type: 'critical',
                icon: AlertTriangle,
                text: `Hohe Personalquote: ${totalRatio.toFixed(1)}%`,
                hint: '> 35% ist kritisch'
            });
            status = 'critical';
        } else if (totalRatio !== null && totalRatio > 28) {
            issues.push({
                type: 'warning',
                icon: AlertCircle,
                text: `Erhöhte Personalquote: ${totalRatio.toFixed(1)}%`,
                hint: 'Zielwert liegt unter 25%'
            });
            if (status !== 'critical') status = 'warning';
        }

        // Issue 4: Staff imbalance
        if (dailyPaidCount === 0 && fullTimeCount > 0) {
            issues.push({
                type: 'info',
                icon: AlertCircle,
                text: 'Nur Festangestellte eingeteilt',
                hint: 'Keine Aushilfen in Personalkalkulation'
            });
        }

        // Positive: Everything looks good
        if (issues.length === 0) {
            return { status: 'good', issues };
        }

        return { status, issues };
    }, [revenue, dailyLaborCost, fullTimeLaborCost, dailyPaidCount, fullTimeCount, totalRatio, barMinusPersonnel, staffCount, hasRevenue]);

    // Status styling
    const statusConfig = {
        good: {
            label: 'Alles stabil',
            icon: CheckCircle2,
            color: 'from-green-500/20 to-green-600/20',
            border: 'border-green-500/40',
            badge: 'bg-green-500/20 text-green-400',
        },
        warning: {
            label: 'Auffälligkeiten',
            icon: AlertCircle,
            color: 'from-amber-500/20 to-amber-600/20',
            border: 'border-amber-500/40',
            badge: 'bg-amber-500/20 text-amber-400',
        },
        critical: {
            label: 'Probleme vorhanden',
            icon: AlertTriangle,
            color: 'from-red-500/20 to-red-600/20',
            border: 'border-red-500/40',
            badge: 'bg-red-500/20 text-red-400',
        },
    };

    const config = statusConfig[insights.status];
    const StatusIcon = config.icon;

    return (
        <Card className={cn(
            'border-2 bg-gradient-to-br',
            config.color,
            config.border,
        )}>
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2">
                    <StatusIcon className="w-5 h-5" />
                    <span className={cn('text-sm font-bold', config.badge)}>
                        {config.label}
                    </span>
                </div>

                {/* Issues list */}
                {insights.issues.length > 0 && (
                    <div className="space-y-2">
                        {insights.issues.slice(0, 4).map((issue, idx) => {
                            const IconComponent = issue.icon;
                            return (
                                <Alert
                                    key={idx}
                                    className={cn(
                                        'py-2 px-3',
                                        issue.type === 'critical' && 'bg-red-900/20 border-red-700',
                                        issue.type === 'warning' && 'bg-amber-900/20 border-amber-700',
                                        issue.type === 'info' && 'bg-blue-900/20 border-blue-700',
                                    )}
                                >
                                    <IconComponent className="w-3.5 h-3.5 mt-0.5" />
                                    <AlertDescription className="text-xs ml-1">
                                        <p className="font-semibold">{issue.text}</p>
                                        {issue.hint && (
                                            <p className="text-[11px] opacity-75 mt-0.5">{issue.hint}</p>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            );
                        })}
                        {insights.issues.length > 4 && (
                            <p className="text-xs text-muted-foreground">+{insights.issues.length - 4} weitere</p>
                        )}
                    </div>
                )}

                {/* Good status message */}
                {insights.status === 'good' && (
                    <div className="flex items-center gap-2 text-xs text-green-300 bg-green-900/20 rounded-lg p-2">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span>Der Tag läuft stabil. Gute Zusammensetzung und Profitabilität.</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}