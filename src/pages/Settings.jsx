import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Monitor } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Settings() {
    const [theme, setTheme] = useState('system');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'system';
        setTheme(savedTheme);
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
            </div>
        </div>
    );
}