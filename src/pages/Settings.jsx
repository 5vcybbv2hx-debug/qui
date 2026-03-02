import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Monitor, Clock, Globe, Download, Trash2, Info, Palette } from 'lucide-react';
import ColorCustomizer from '@/components/settings/ColorCustomizer';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import BackupManager from '@/components/backup/BackupManager';
import { usePermissions } from '@/components/auth/usePermissions';

export default function Settings() {
    const queryClient = useQueryClient();
    const [theme, setTheme] = useState('system');
    const [timeFormat, setTimeFormat] = useState('24h');
    const [dateFormat, setDateFormat] = useState('de');
    const [language, setLanguage] = useState('de');
    const [appVersion] = useState('1.0.0');

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

                {/* Farbanpassung */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        Farben anpassen
                    </h2>
                    <ColorCustomizer />
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
            </div>
        </div>
    );
}