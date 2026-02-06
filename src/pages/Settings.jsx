import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Monitor, Clock, Volume2, Globe, Download, Trash2, Info, AlertCircle, BarChart3 } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function Settings() {
    const queryClient = useQueryClient();
    const [theme, setTheme] = useState('system');
    const [timeFormat, setTimeFormat] = useState('24h');
    const [dateFormat, setDateFormat] = useState('de');
    const [language, setLanguage] = useState('de');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [vibrationEnabled, setVibrationEnabled] = useState(true);
    const [barcodeSoundEnabled, setBarcodeSoundEnabled] = useState(true);
    const [showOfflineStatus, setShowOfflineStatus] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [appVersion] = useState('1.0.0');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'system';
        const savedTimeFormat = localStorage.getItem('timeFormat') || '24h';
        const savedDateFormat = localStorage.getItem('dateFormat') || 'de';
        const savedLanguage = localStorage.getItem('language') || 'de';
        const savedSound = localStorage.getItem('soundEnabled') !== 'false';
        const savedVibration = localStorage.getItem('vibrationEnabled') !== 'false';
        const savedBarcodeSound = localStorage.getItem('barcodeSoundEnabled') !== 'false';

        setTheme(savedTheme);
        setTimeFormat(savedTimeFormat);
        setDateFormat(savedDateFormat);
        setLanguage(savedLanguage);
        setSoundEnabled(savedSound);
        setVibrationEnabled(savedVibration);
        setBarcodeSoundEnabled(savedBarcodeSound);
        applyTheme(savedTheme);

        base44.auth.me().then(setCurrentUser);
    }, []);

    const applyTheme = (newTheme) => {
        const root = document.documentElement;
        
        if (newTheme === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', systemPrefersDark);
        } else if (newTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    const handleSettingChange = (key, value, storageKey) => {
        const stateSetters = {
            timeFormat: setTimeFormat,
            dateFormat: setDateFormat,
            language: setLanguage,
            soundEnabled: setSoundEnabled,
            vibrationEnabled: setVibrationEnabled,
            barcodeSoundEnabled: setBarcodeSoundEnabled,
        };
        
        if (stateSetters[key]) {
            stateSetters[key](value);
            localStorage.setItem(storageKey || key, value);
        }
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

    const themes = [
        {
            value: 'light',
            label: 'Hell',
            icon: Sun,
            description: 'Heller Modus'
        },
        {
            value: 'dark',
            label: 'Dunkel',
            icon: Moon,
            description: 'Dunkler Modus'
        },
        {
            value: 'system',
            label: 'System',
            icon: Monitor,
            description: 'Folgt den Systemeinstellungen'
        }
    ];

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <SettingsIcon className="w-8 h-8 text-amber-400" />
                        <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">
                            Einstellungen
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Passe die App nach deinen Wünschen an
                    </p>
                </div>

                {/* Appearance Section */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground mb-4">Darstellung</h2>
                        
                        <Card className="p-6 bg-card border-border">
                            <Label className="text-base font-medium text-foreground mb-4 block">
                                Farbschema
                            </Label>
                            <p className="text-sm text-muted-foreground mb-6">
                                Wähle das Erscheinungsbild der App
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {themes.map((themeOption) => {
                                    const Icon = themeOption.icon;
                                    const isActive = theme === themeOption.value;
                                    
                                    return (
                                        <button
                                            key={themeOption.value}
                                            onClick={() => handleThemeChange(themeOption.value)}
                                            className={`
                                                relative p-4 rounded-xl border-2 transition-all
                                                ${isActive 
                                                    ? 'border-amber-500 bg-amber-500/10' 
                                                    : 'border-border bg-secondary hover:bg-accent'
                                                }
                                            `}
                                        >
                                            <div className="flex flex-col items-center gap-3">
                                                <div className={`
                                                    p-3 rounded-lg
                                                    ${isActive 
                                                        ? 'bg-amber-500/20' 
                                                        : 'bg-muted'
                                                    }
                                                `}>
                                                    <Icon className={`
                                                        w-6 h-6
                                                        ${isActive 
                                                            ? 'text-amber-500' 
                                                            : 'text-muted-foreground'
                                                        }
                                                    `} />
                                                </div>
                                                <div className="text-center">
                                                    <p className={`
                                                        font-medium mb-1
                                                        ${isActive 
                                                            ? 'text-foreground' 
                                                            : 'text-foreground'
                                                        }
                                                    `}>
                                                        {themeOption.label}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {themeOption.description}
                                                    </p>
                                                </div>
                                                {isActive && (
                                                    <div className="absolute top-3 right-3 w-2 h-2 bg-amber-500 rounded-full" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    {/* Info */}
                    <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                        <p className="text-sm text-blue-400">
                            <strong>Tipp:</strong> Im System-Modus passt sich die App automatisch an deine Geräteeinstellungen an.
                        </p>
                    </Card>
                </div>

                {/* Zeit & Datum Section */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Zeit & Datum
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="p-4 bg-card border-border">
                            <Label htmlFor="timeFormat" className="text-sm font-medium text-foreground mb-2 block">
                                Zeitformat
                            </Label>
                            <Select value={timeFormat} onValueChange={(val) => handleSettingChange('timeFormat', val)}>
                                <SelectTrigger id="timeFormat">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="24h">24-Stunden (14:30)</SelectItem>
                                    <SelectItem value="12h">12-Stunden (02:30 PM)</SelectItem>
                                </SelectContent>
                            </Select>
                        </Card>

                        <Card className="p-4 bg-card border-border">
                            <Label htmlFor="dateFormat" className="text-sm font-medium text-foreground mb-2 block">
                                Datumsformat
                            </Label>
                            <Select value={dateFormat} onValueChange={(val) => handleSettingChange('dateFormat', val)}>
                                <SelectTrigger id="dateFormat">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="de">Deutsch (06.02.2026)</SelectItem>
                                    <SelectItem value="en">Englisch (02/06/2026)</SelectItem>
                                    <SelectItem value="iso">ISO (2026-02-06)</SelectItem>
                                </SelectContent>
                            </Select>
                        </Card>
                    </div>
                </div>

                {/* Benachrichtigungen Section */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Volume2 className="w-5 h-5" />
                        Benachrichtigungen
                    </h2>

                    <div className="space-y-3">
                        <Card className="p-4 bg-card border-border">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="sound" className="text-sm font-medium text-foreground">
                                    Benachrichtigungstöne
                                </Label>
                                <Switch 
                                    id="sound"
                                    checked={soundEnabled}
                                    onCheckedChange={(val) => handleSettingChange('soundEnabled', val, 'soundEnabled')}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Töne bei neuen Benachrichtigungen abspielen</p>
                        </Card>

                        <Card className="p-4 bg-card border-border">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="vibration" className="text-sm font-medium text-foreground">
                                    Vibrationen
                                </Label>
                                <Switch 
                                    id="vibration"
                                    checked={vibrationEnabled}
                                    onCheckedChange={(val) => handleSettingChange('vibrationEnabled', val, 'vibrationEnabled')}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Gerät vibrieren lassen bei Benachrichtigungen</p>
                        </Card>

                        <Card className="p-4 bg-card border-border">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="barcode" className="text-sm font-medium text-foreground">
                                    Barcode-Scanner Ton
                                </Label>
                                <Switch 
                                    id="barcode"
                                    checked={barcodeSoundEnabled}
                                    onCheckedChange={(val) => handleSettingChange('barcodeSoundEnabled', val, 'barcodeSoundEnabled')}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Ton beim Scannen von Barcodes abspielen</p>
                        </Card>
                    </div>
                </div>

                {/* Sprache Section */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Sprache
                    </h2>

                    <Card className="p-4 bg-card border-border">
                        <Label htmlFor="language" className="text-sm font-medium text-foreground mb-2 block">
                            App-Sprache
                        </Label>
                        <Select value={language} onValueChange={(val) => handleSettingChange('language', val)}>
                            <SelectTrigger id="language">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="de">Deutsch</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">Noch nicht vollständig implementiert</p>
                    </Card>
                </div>

                {/* Datenmanagement Section */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Daten
                    </h2>

                    <div className="space-y-3">
                        <Card className="p-4 bg-card border-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium text-foreground">
                                        Daten exportieren
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">Speichere ein Backup deiner Daten als JSON</p>
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

                {/* Über die App Section */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        Über die App
                    </h2>

                    <Card className="p-6 bg-card border-border space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Version</span>
                            <span className="font-semibold text-foreground">{appVersion}</span>
                        </div>
                        <div className="border-t border-border pt-4">
                            <p className="text-xs text-muted-foreground mb-3">
                                BarManager - Professionelle Bar-Management Software
                            </p>
                            <div className="space-y-2">
                                <a href="#" className="text-xs text-amber-400 hover:text-amber-300 block">
                                    Datenschutzerklärung
                                </a>
                                <a href="#" className="text-xs text-amber-400 hover:text-amber-300 block">
                                    Nutzungsbedingungen
                                </a>
                                <a href="#" className="text-xs text-amber-400 hover:text-amber-300 block">
                                    Impressum
                                </a>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}