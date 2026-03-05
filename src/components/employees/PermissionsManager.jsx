import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield } from 'lucide-react';
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
            { key: 'canViewEvents', label: 'Events ansehen' },
            { key: 'canEditEvents', label: 'Events bearbeiten' },
        ]
    },
    {
        title: 'Einkauf & Lager',
        permissions: [
            { key: 'canViewWarehouse', label: 'Lager (Artikelverwaltung) ansehen' },
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
        title: 'Team & Rezepte',
        permissions: [
            { key: 'canViewEmployees', label: 'Team ansehen' },
            { key: 'canEditEmployees', label: 'Team bearbeiten' },
            { key: 'canViewRecipes', label: 'Rezepte ansehen' },
            { key: 'canEditRecipes', label: 'Rezepte bearbeiten' },
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

export default function PermissionsManager({ employee, onSave }) {
    const [open, setOpen] = useState(false);
    const [permissions, setPermissions] = useState(employee?.permissions || {});

    const handleToggle = (key) => {
        setPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = () => {
        onSave(permissions);
        setOpen(false);
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => {
                    setPermissions(employee?.permissions || {});
                    setOpen(true);
                }}
                className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
            >
                <Shield className="w-4 h-4 mr-2" />
                Berechtigungen
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Berechtigungen für {employee?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                                Diese individuellen Berechtigungen überschreiben die Standard-Rechte der Rolle "{employee?.role}".
                            </p>
                        </div>

                        {PERMISSION_GROUPS.map(group => (
                            <div key={group.title} className="space-y-3">
                                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">
                                    {group.title}
                                </h3>
                                <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                                    {group.permissions.map(perm => (
                                        <div key={perm.key} className="flex items-center justify-between py-2">
                                            <Label 
                                                htmlFor={perm.key}
                                                className="text-sm text-slate-600 cursor-pointer"
                                            >
                                                {perm.label}
                                            </Label>
                                            <Switch
                                                id={perm.key}
                                                checked={permissions[perm.key] ?? false}
                                                onCheckedChange={() => handleToggle(perm.key)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1"
                        >
                            Abbrechen
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            Speichern
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}