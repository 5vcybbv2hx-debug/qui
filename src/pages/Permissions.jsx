import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Search } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const PERMISSION_GROUPS = [
    {
        title: 'Dashboard & Schichten',
        permissions: [
            { key: 'canViewDashboard', label: 'Dashboard ansehen' },
            { key: 'canViewShifts', label: 'Schichtplan ansehen' },
            { key: 'canEditShifts', label: 'Schichten bearbeiten' },
        ]
    },
    {
        title: 'Reservierungen & Events',
        permissions: [
            { key: 'canViewReservations', label: 'Reservierungen ansehen' },
            { key: 'canEditReservations', label: 'Reservierungen bearbeiten' },
        ]
    },
    {
        title: 'Einkauf & Lager',
        permissions: [
            { key: 'canViewShopping', label: 'Einkaufsliste ansehen' },
            { key: 'canEditShopping', label: 'Einkaufsliste bearbeiten' },
            { key: 'canViewRestock', label: 'Auffüllen ansehen' },
            { key: 'canEditRestock', label: 'Auffüllen bearbeiten' },
        ]
    },
    {
        title: 'Organisation',
        permissions: [
            { key: 'canViewCleaning', label: 'Putzliste ansehen' },
            { key: 'canEditCleaning', label: 'Putzliste bearbeiten' },
            { key: 'canViewTodos', label: 'Aufgaben ansehen' },
            { key: 'canEditTodos', label: 'Aufgaben bearbeiten' },
        ]
    },
    {
        title: 'Team',
        permissions: [
            { key: 'canViewEmployees', label: 'Team ansehen' },
            { key: 'canEditEmployees', label: 'Team bearbeiten' },
            { key: 'canClockOutOthers', label: 'Andere ausstempeln' },
        ]
    },
    {
        title: 'Erweitert',
        permissions: [
            { key: 'canViewAnalytics', label: 'Budget & Berichte ansehen' },
            { key: 'canViewPriceCalculator', label: 'Preiskalkulation ansehen' },
        ]
    }
];

const roleColors = {
    'Barkeeper': 'bg-amber-100 text-amber-700',
    'Servicekraft': 'bg-blue-100 text-blue-700',
    'Manager': 'bg-purple-100 text-purple-700',
    'Aushilfe': 'bg-slate-100 text-slate-700'
};

export default function Permissions() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedEmployee, setExpandedEmployee] = useState(null);

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true }, 'name')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, permissions }) => 
            base44.entities.Employee.update(id, { permissions }),
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
        }
    });

    const handleToggle = (employeeId, permKey, currentPerms) => {
        const newPerms = {
            ...currentPerms,
            [permKey]: !currentPerms[permKey]
        };
        updateMutation.mutate({ id: employeeId, permissions: newPerms });
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!permissions.isAdmin) {
        return <PermissionDenied message="Nur Administratoren können Berechtigungen verwalten." />;
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Berechtigungsverwaltung
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Individuelle Zugriffsrechte für {filteredEmployees.length} Mitarbeiter
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Mitarbeiter suchen..."
                            className="pl-10 bg-slate-800 border-slate-700 text-white"
                        />
                    </div>
                </div>

                {/* Info Banner */}
                <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                    <p className="text-sm text-blue-300">
                        💡 Diese individuellen Berechtigungen überschreiben die Standard-Rechte der jeweiligen Rolle.
                        Änderungen werden sofort wirksam.
                    </p>
                </div>

                {/* Employee Cards */}
                <div className="space-y-3">
                    {filteredEmployees.map(employee => {
                        const isExpanded = expandedEmployee === employee.id;
                        const perms = employee.permissions || {};
                        
                        return (
                            <Card 
                                key={employee.id}
                                className="bg-slate-800 border-slate-700"
                            >
                                <div className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                                                style={{ backgroundColor: employee.color || '#64748b' }}
                                            >
                                                {employee.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white">{employee.name}</h3>
                                                <Badge className={cn("text-xs mt-1", roleColors[employee.role])}>
                                                    {employee.role}
                                                </Badge>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setExpandedEmployee(isExpanded ? null : employee.id)}
                                            className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                                        >
                                            <Shield className="w-4 h-4 mr-2" />
                                            {isExpanded ? 'Schließen' : 'Bearbeiten'}
                                        </Button>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-6 pt-6 border-t border-slate-700 space-y-6">
                                            {PERMISSION_GROUPS.map(group => (
                                                <div key={group.title} className="space-y-3">
                                                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                                        {group.title}
                                                    </h4>
                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                        {group.permissions.map(perm => (
                                                            <div 
                                                                key={perm.key}
                                                                className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                                                            >
                                                                <Label 
                                                                    htmlFor={`${employee.id}-${perm.key}`}
                                                                    className="text-sm text-slate-300 cursor-pointer"
                                                                >
                                                                    {perm.label}
                                                                </Label>
                                                                <Switch
                                                                    id={`${employee.id}-${perm.key}`}
                                                                    checked={perms[perm.key] ?? false}
                                                                    onCheckedChange={() => 
                                                                        handleToggle(employee.id, perm.key, perms)
                                                                    }
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {filteredEmployees.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Keine Mitarbeiter gefunden</p>
                    </div>
                )}
            </div>
        </div>
    );
}