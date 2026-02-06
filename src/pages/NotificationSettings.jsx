import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckSquare, Calendar, AlertTriangle, Users, Package, Sparkles, Volume2, Download, Trash2 } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PushNotificationManager from '@/components/notifications/PushNotificationManager';

export default function NotificationSettings() {
    const queryClient = useQueryClient();
    const [currentUser, setCurrentUser] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [vibrationEnabled, setVibrationEnabled] = useState(true);
    const [barcodeSoundEnabled, setBarcodeSoundEnabled] = useState(true);
    const [preferences, setPreferences] = useState({
        tasks_assigned: true,
        tasks_deadline: true,
        shifts_reminder: true,
        shifts_swap: true,
        cleaning_overdue: true,
        inventory_low: true,
        maintenance_due: true,
        general_updates: true
    });

    useEffect(() => {
        const savedSound = localStorage.getItem('soundEnabled') !== 'false';
        const savedVibration = localStorage.getItem('vibrationEnabled') !== 'false';
        const savedBarcodeSound = localStorage.getItem('barcodeSoundEnabled') !== 'false';
        
        setSoundEnabled(savedSound);
        setVibrationEnabled(savedVibration);
        setBarcodeSoundEnabled(savedBarcodeSound);

        base44.auth.me().then(user => {
            setCurrentUser(user);
            if (user.notification_preferences) {
                setPreferences({ ...preferences, ...user.notification_preferences });
            }
        });
    }, []);

    const saveMutation = useMutation({
        mutationFn: async () => {
            await base44.auth.updateMe({
                notification_preferences: preferences
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['user']);
            toast.success('Einstellungen gespeichert');
        },
        onError: () => {
            toast.error('Fehler beim Speichern');
        }
    });

    const togglePreference = (key) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSoundToggle = (val) => {
        setSoundEnabled(val);
        localStorage.setItem('soundEnabled', val);
    };

    const handleVibrationToggle = (val) => {
        setVibrationEnabled(val);
        localStorage.setItem('vibrationEnabled', val);
    };

    const handleBarcodeSoundToggle = (val) => {
        setBarcodeSoundEnabled(val);
        localStorage.setItem('barcodeSoundEnabled', val);
    };

    const exportDataMutation = useMutation({
        mutationFn: async () => {
            const data = await base44.functions.invoke('exportUserData', {});
            return data;
        },
        onSuccess: (data) => {
            const element = document.createElement('a');
            element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(data.data, null, 2))}`);
            element.setAttribute('download', `backup-${new Date().toISOString().split('T')[0]}.json`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            toast.success('Daten exportiert');
        },
        onError: () => {
            toast.error('Fehler beim Exportieren');
        }
    });

    const deleteAccountMutation = useMutation({
        mutationFn: async () => {
            await base44.functions.invoke('deleteMyAccount', {});
        },
        onSuccess: () => {
            toast.success('Account wird gelöscht...');
            setTimeout(() => {
                base44.auth.logout();
            }, 2000);
        },
        onError: () => {
            toast.error('Fehler beim Löschen des Accounts');
        }
    });

    const notificationTypes = [
        {
            key: 'tasks_assigned',
            icon: CheckSquare,
            title: 'Aufgaben zugewiesen',
            description: 'Benachrichtigung wenn dir eine neue Aufgabe zugewiesen wurde',
            color: 'text-blue-400'
        },
        {
            key: 'tasks_deadline',
            icon: AlertTriangle,
            title: 'Fällige Aufgaben',
            description: 'Erinnerung an Aufgaben die bald fällig sind (1 Tag vorher)',
            color: 'text-red-400'
        },
        {
            key: 'shifts_reminder',
            icon: Calendar,
            title: 'Schicht-Erinnerung',
            description: 'Erinnerung an deine nächste Schicht (4 Stunden vorher)',
            color: 'text-amber-400'
        },
        {
            key: 'shifts_swap',
            icon: Users,
            title: 'Schichttausch',
            description: 'Benachrichtigung bei neuen Schichttausch-Anfragen',
            color: 'text-purple-400'
        },
        {
            key: 'cleaning_overdue',
            icon: Sparkles,
            title: 'Überfällige Reinigung',
            description: 'Hinweis wenn Reinigungsaufgaben überfällig sind',
            color: 'text-green-400'
        },
        {
            key: 'inventory_low',
            icon: Package,
            title: 'Niedriger Bestand',
            description: 'Warnung bei Artikeln unter Mindestbestand',
            color: 'text-orange-400'
        },
        {
            key: 'maintenance_due',
            icon: AlertTriangle,
            title: 'Wartung fällig',
            description: 'Erinnerung an fällige Wartungsaufgaben (7 Tage vorher)',
            color: 'text-yellow-400'
        },
        {
            key: 'general_updates',
            icon: Bell,
            title: 'Allgemeine Updates',
            description: 'Wichtige Ankündigungen und Systemnachrichten',
            color: 'text-slate-400'
        }
    ];

    if (!currentUser) return null;

    return (
        <div className="min-h-screen bg-slate-900 pb-24 md:pb-0">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Bell className="w-8 h-8 text-amber-400" />
                        <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                            Benachrichtigungs-Einstellungen
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm">
                        Wähle aus, über welche Ereignisse du informiert werden möchtest
                    </p>
                </div>

                {/* Push Notifications */}
                <Card className="p-6 bg-gradient-to-br from-amber-900/30 to-orange-900/20 border-amber-700 mb-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-white font-semibold mb-1">Push-Benachrichtigungen</h3>
                            <p className="text-sm text-amber-200/70">
                                Aktiviere Push-Benachrichtigungen um Echtzeitbenachrichtigungen auf deinem Gerät zu erhalten
                            </p>
                        </div>
                        <PushNotificationManager userEmail={currentUser.email} />
                    </div>
                </Card>

                {/* Notification Preferences */}
                <div className="space-y-3">
                    {notificationTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                            <Card 
                                key={type.key}
                                className="p-4 bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-slate-900 rounded-lg shrink-0">
                                        <Icon className={`w-5 h-5 ${type.color}`} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <Label htmlFor={type.key} className="text-white font-medium cursor-pointer">
                                            {type.title}
                                        </Label>
                                        <p className="text-sm text-slate-400 mt-0.5">
                                            {type.description}
                                        </p>
                                    </div>

                                    <Switch
                                        id={type.key}
                                        checked={preferences[type.key]}
                                        onCheckedChange={() => togglePreference(type.key)}
                                        className="shrink-0"
                                    />
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Save Button */}
                <div className="mt-6 flex justify-end">
                    <Button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {saveMutation.isPending ? 'Speichern...' : 'Einstellungen speichern'}
                    </Button>
                </div>

                {/* Benachrichtigungstöne Section */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Volume2 className="w-5 h-5" />
                        Töne & Vibrationen
                    </h2>

                    <div className="space-y-3">
                        <Card className="p-4 bg-slate-800 border-slate-700">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="sound" className="text-sm font-medium text-white">
                                    Benachrichtigungstöne
                                </Label>
                                <Switch 
                                    id="sound"
                                    checked={soundEnabled}
                                    onCheckedChange={handleSoundToggle}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Töne bei neuen Benachrichtigungen abspielen</p>
                        </Card>

                        <Card className="p-4 bg-slate-800 border-slate-700">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="vibration" className="text-sm font-medium text-white">
                                    Vibrationen
                                </Label>
                                <Switch 
                                    id="vibration"
                                    checked={vibrationEnabled}
                                    onCheckedChange={handleVibrationToggle}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Gerät vibrieren lassen bei Benachrichtigungen</p>
                        </Card>

                        <Card className="p-4 bg-slate-800 border-slate-700">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="barcode" className="text-sm font-medium text-white">
                                    Barcode-Scanner Ton
                                </Label>
                                <Switch 
                                    id="barcode"
                                    checked={barcodeSoundEnabled}
                                    onCheckedChange={handleBarcodeSoundToggle}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Ton beim Scannen von Barcodes abspielen</p>
                        </Card>
                    </div>
                </div>

                {/* Datenmanagement Section */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Download className="w-5 h-5" />
                        Daten
                    </h2>

                    <div className="space-y-3">
                        <Card className="p-4 bg-slate-800 border-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium text-white">
                                        Daten exportieren
                                    </Label>
                                    <p className="text-xs text-slate-400 mt-1">Speichere ein Backup deiner Daten als JSON</p>
                                </div>
                                <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportDataMutation.mutate()}
                                    disabled={exportDataMutation.isPending}
                                    className="gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    {exportDataMutation.isPending ? 'Lädt...' : 'Export'}
                                </Button>
                            </div>
                        </Card>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Card className="p-4 bg-red-500/10 border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-sm font-medium text-red-400">
                                                Account löschen
                                            </Label>
                                            <p className="text-xs text-red-300/70 mt-1">Löscht deinen Account und alle Daten</p>
                                        </div>
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </div>
                                </Card>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Account löschen?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Dies kann nicht rückgängig gemacht werden. Alle deine Daten werden permanent gelöscht.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={() => deleteAccountMutation.mutate()}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Löschen
                                </AlertDialogAction>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* Info Box */}
                <Card className="mt-6 p-4 bg-blue-900/20 border-blue-700">
                    <p className="text-sm text-blue-300">
                        <strong>Hinweis:</strong> Benachrichtigungen werden nur an dich gesendet, wenn du die entsprechenden Berechtigungen hast. 
                        Manche Benachrichtigungen (z.B. Wartungserinnerungen) werden nur an Manager gesendet.
                    </p>
                </Card>
            </div>
        </div>
    );
}