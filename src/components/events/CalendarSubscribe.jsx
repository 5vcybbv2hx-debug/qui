import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar, Copy, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CalendarSubscribe({ appBaseUrl = window.location.origin }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const calendarUrl = `${appBaseUrl}/api/events-calendar`;
    const icsUrl = `${calendarUrl}/events.ics`;

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <Button
                onClick={() => setDialogOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs h-10"
            >
                <Calendar className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Eventkalender abonnieren</span>
                <span className="sm:hidden">Kalender</span>
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-400" />
                            Eventkalender abonnieren
                        </DialogTitle>
                        <DialogDescription>
                            Abonniere unsere Events und erhalte automatische Updates in deinem Kalender.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-6">
                        {/* Info Box */}
                        <Card className="bg-blue-500/10 border-blue-500/30">
                            <CardContent className="pt-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-200">
                                        <p className="font-medium">Was passiert beim Abonnieren?</p>
                                        <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                                            <li>Alle kommenden Events werden in deinem Kalender angezeigt</li>
                                            <li>Automatische Updates bei neuen oder geänderten Events</li>
                                            <li>Funktioniert mit Google Calendar, Outlook, Apple Calendar etc.</li>
                                            <li>Du kannst das Abonnement jederzeit deaktivieren</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Subscription Methods */}
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-slate-300">Option 1: Kalender-URL kopieren</p>
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={icsUrl}
                                        className="text-xs bg-slate-900 border-slate-700"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToClipboard(icsUrl)}
                                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500">
                                    URL kopieren und in deinen Kalender einfügen (Einstellungen → Kalender abonnieren)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-slate-300">Option 2: Datei herunterladen</p>
                                <a 
                                    href={icsUrl}
                                    download="bar-events.ics"
                                    className={cn(
                                        "inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        "bg-indigo-600 hover:bg-indigo-700 text-white"
                                    )}
                                >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Events-Datei (ICS) herunterladen
                                </a>
                                <p className="text-xs text-slate-500">
                                    Datei importieren in Google Calendar, Outlook oder Apple Calendar
                                </p>
                            </div>
                        </div>

                        {/* Support Info */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="pt-4">
                                <p className="text-xs text-slate-400">
                                    <strong>Unterstützte Kalender:</strong><br />
                                    Google Calendar, Microsoft Outlook, Apple Calendar (iCal), Mozilla Thunderbird und viele weitere
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button 
                            variant="outline" 
                            onClick={() => setDialogOpen(false)}
                            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                            Schließen
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}