import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Monitor, Clock, Globe, Download, Trash2, Info, Palette, Calendar, Bell, CheckSquare, AlertTriangle, Users, Package, Sparkles, Volume2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ColorCustomizer from '@/components/settings/ColorCustomizer';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import BackupManager from '@/components/backup/BackupManager';
import { usePermissions } from '@/components/auth/usePermissions';
import CalendarExport from '@/components/calendar/CalendarExport';
import LiveSyncInstructions from '@/components/calendar/LiveSyncInstructions';
import PushNotificationManager from '@/components/notifications/PushNotificationManager';

const notificationTypes = [
    { key: 'tasks_assigned', icon: CheckSquare, title: 'Aufgaben zugewiesen', description: 'Benachrichtigung wenn dir eine neue Aufgabe zugewiesen wurde', color: 'text-blue-400' },
    { key: 'tasks_deadline', icon: AlertTriangle, title: 'Fällige Aufgaben', description: 'Erinnerung an Aufgaben die bald fällig sind (1 Tag vorher)', color: 'text-red-400' },
    { key: 'shifts_reminder', icon: Calendar, title: 'Schicht-Erinnerung', description: 'Erinnerung an deine nächste Schicht (4 Stunden vorher)', color: 'text-amber-400' },
    { key: 'shifts_swap', icon: Users, title: 'Schichttausch', description: 'Benachrichtigung bei neuen Schichttausch-Anfragen', color: 'text-purple-400' },
    { key: 'cleaning_overdue', icon: Sparkles, title: 'Überfällige Reinigung', description: 'Hinweis wenn Reinigungsaufgaben überfällig sind', color: 'text-green-400' },
    { key: 'inventory_low', icon: Package, title: 'Niedriger Bestand', description: 'Warnung bei Artikeln unter Mindestbestand', color: 'text-orange-400' },
    { key: 'maintenance_due', icon: AlertTriangle, title: 'Wartung fällig', description: 'Erinnerung an fällige Wartungsaufgaben (7 Tage vorher)', color: 'text-yellow-400' },
    { key: 'general_updates', icon: Bell, title: 'Allgemeine Updates', description: 'Wichtige Ankündigungen und Systemnachrichten', color: 'text-slate-400' }
];

export default function Settings() {
     const queryClient = useQueryClient();
     const permissions = usePermissions();
     const [activeTab, setActiveTab] = useState('appearance');
     const [theme, setTheme] = useState('system');
     const [timeFormat, setTimeFormat] = useState('24h');
     const [dateFormat, setDateFormat] = useState('de');
     const [language, setLanguage] = useState('de');
     const [appVersion] = useState('1.0.0');

     // Notification state
     const [currentUser, setCurrentUser] = useState(null);
     const [soundEnabled, setSoundEnabled] = useState(true);
     const [vibrationEnabled, setVibrationEnabled] = useState(true);
     const [barcodeSoundEnabled, setBarcodeSoundEnabled] = useState(true);
     const [notifPreferences, setNotifPreferences] = useState({
         tasks_assigned: true, tasks_deadline: true, shifts_reminder: true, shifts_swap: true,
         cleaning_overdue: true, inventory_low: true, maintenance_due: true, general_updates: true
     });

     // Fetch calendar data
     const { data: shifts = [] } = useQuery({
         queryKey: ['shifts'],
         queryFn: () => base44.entities.Shift.list('-date', 200)
     });

     const { data: reservations = [] } = useQuery({
         queryKey: ['reservations'],
         queryFn: () => base44.entities.Reservation.list('-date', 200)
     });

     const { data: employees = [] } = useQuery({
         queryKey: ['employees'],
         queryFn: () => base44.entities.Employee.filter({ is_active: true })
     });

     const birthdaysCount = employees.filter(e => e.birthday).length;

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'system';
        const savedTimeFormat = localStorage.getItem('timeFormat') || '24h';
        const savedDateFormat = localStorage.getItem('dateFormat') || 'de';
        const savedLanguage = localStorage.getItem('language') || 'de';

        setTheme(savedTheme);
        setTimeFormat(savedTimeFormat);
        setDateFormat(savedDateFormat);
        setLanguage(savedLanguage);
        applyTheme(savedTheme);
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
        };
        
        if (stateSetters[key]) {
            stateSetters[key](value);
            localStorage.setItem(storageKey || key, value);
        }
    };

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

                 {/* Tabs */}
                 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                     <TabsList className="grid w-full grid-cols-2 bg-card border border-border h-auto p-1">
                         <TabsTrigger value="appearance" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                             <SettingsIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                             <span>Allgemein</span>
                         </TabsTrigger>
                         <TabsTrigger value="calendar" className="data-[state=active]:bg-amber-600 py-3 sm:py-2.5 text-xs sm:text-sm flex-col sm:flex-row gap-1">
                             <Calendar className="w-5 h-5 sm:w-4 sm:h-4" />
                             <span>Kalender</span>
                         </TabsTrigger>
                     </TabsList>

                     {/* Appearance Tab */}
                     <TabsContent value="appearance" className="space-y-6">

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

                {/* Farbanpassung – nur für Manager/Admin */}
                {permissions.isManager && (
                    <div className="mt-8">
                        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Palette className="w-5 h-5" />
                            Farben anpassen
                        </h2>
                        <p className="text-xs text-muted-foreground mb-4">
                            Diese Einstellungen gelten für alle Mitarbeiter.
                        </p>
                        <ColorCustomizer />
                    </div>
                )}

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
                                    <SelectValue placeholder="Zeitformat wählen" />
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
                                    <SelectValue placeholder="Datumsformat wählen" />
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
                                <SelectValue placeholder="Sprache wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="de">Deutsch</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">Noch nicht vollständig implementiert</p>
                    </Card>
                </div>



                {/* Backup Section */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Download className="w-5 h-5" />
                        Sicherung
                    </h2>

                    <Card className="p-6 bg-card border-border">
                        <p className="text-sm text-muted-foreground mb-4">
                            Erstelle Sicherungen deiner Daten und exportiere Informationen.
                        </p>
                        <BackupManager />
                    </Card>
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
                     </TabsContent>

                     {/* Calendar Tab */}
                     <TabsContent value="calendar" className="space-y-6">
                         {/* Calendar Export */}
                         <div>
                             <h2 className="text-lg font-semibold text-foreground mb-4">Kalenderexport</h2>
                             <Card className="p-6 bg-card border-border">
                                 <div className="flex items-start gap-4">
                                     <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0">
                                         <Download className="w-6 h-6 text-emerald-500" />
                                     </div>
                                     <div className="flex-1">
                                         <h3 className="font-semibold text-foreground mb-2">Kalender exportieren</h3>
                                         <p className="text-sm text-muted-foreground mb-4">
                                             Exportiere deine Schichten, Reservierungen und Geburtstage als .ics Datei für alle gängigen Kalender-Apps.
                                         </p>
                                         <div className="flex flex-col sm:flex-row gap-3">
                                             <CalendarExport shifts={shifts} reservations={reservations} />
                                             <div className="text-xs text-muted-foreground sm:ml-4 sm:self-center">
                                                 Kompatibel mit: Google Calendar, Outlook, Apple Calendar, etc.
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             </Card>

                             <Alert className="bg-blue-900/20 border-blue-700 mt-4">
                                 <Info className="h-4 w-4 text-blue-400" />
                                 <AlertDescription className="text-blue-300 text-sm">
                                     Der Export erstellt eine Momentaufnahme deiner aktuellen Termine. Für automatische Updates nutze die Live-Sync Funktion.
                                 </AlertDescription>
                             </Alert>
                         </div>

                         {/* Live Sync */}
                         <div>
                             <h2 className="text-lg font-semibold text-foreground mb-4">Live-Synchronisation</h2>
                             <Card className="p-6 bg-card border-border">
                                 <div className="flex items-start gap-4">
                                     <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0">
                                         <Calendar className="w-6 h-6 text-blue-500" />
                                     </div>
                                     <div className="flex-1">
                                         <h3 className="font-semibold text-foreground mb-2">Live-Synchronisation</h3>
                                         <p className="text-sm text-muted-foreground mb-4">
                                             Verbinde deinen Kalender mit einem Live-Feed, der automatisch aktualisiert wird, wenn sich Termine ändern.
                                         </p>
                                         <LiveSyncInstructions />
                                     </div>
                                 </div>
                             </Card>
                         </div>

                         {/* Calendar Overview Stats */}
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                             <Card className="p-4 bg-card border-border">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                                         <Calendar className="w-5 h-5 text-amber-500" />
                                     </div>
                                     <div>
                                         <p className="text-2xl font-bold text-foreground">{shifts.length}</p>
                                         <p className="text-xs text-muted-foreground">Schichten</p>
                                     </div>
                                 </div>
                             </Card>

                             <Card className="p-4 bg-card border-border">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                         <Calendar className="w-5 h-5 text-blue-500" />
                                     </div>
                                     <div>
                                         <p className="text-2xl font-bold text-foreground">{reservations.length}</p>
                                         <p className="text-xs text-muted-foreground">Reservierungen</p>
                                     </div>
                                 </div>
                             </Card>

                             <Card className="p-4 bg-card border-border">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                                         <Calendar className="w-5 h-5 text-purple-500" />
                                     </div>
                                     <div>
                                         <p className="text-2xl font-bold text-foreground">{birthdaysCount}</p>
                                         <p className="text-xs text-muted-foreground">Geburtstage</p>
                                     </div>
                                 </div>
                             </Card>
                         </div>
                     </TabsContent>
                    </Tabs>
                    </div>
                    </div>
                    );
                    }