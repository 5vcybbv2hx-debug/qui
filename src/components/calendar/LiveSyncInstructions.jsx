import React, { useState } from 'react';
import { Calendar, Copy, Check, ExternalLink, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function LiveSyncInstructions() {
    const [copied, setCopied] = useState(false);
    
    // Get the calendar feed URL
    const calendarUrl = `${window.location.origin}/api/functions/calendar-feed`;
    
    const copyUrl = () => {
        navigator.clipboard.writeText(calendarUrl);
        setCopied(true);
        toast.success('URL kopiert!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Live-Synchronisation
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Kalender Live-Synchronisation
                    </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Automatische Synchronisation</p>
                            <p>Alle Schichten, Reservierungen und Geburtstage werden automatisch in deinen Kalender synchronisiert. Änderungen werden innerhalb von 1 Stunde aktualisiert.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Kalender-URL</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={calendarUrl}
                                readOnly
                                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-600"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyUrl}
                            >
                                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-800">Anleitung</h3>
                        
                        {/* Google Calendar */}
                        <Card className="p-4 border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">G</span>
                                </div>
                                <h4 className="font-semibold text-slate-800">Google Kalender</h4>
                            </div>
                            <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                                <li>Öffne <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Google Kalender <ExternalLink className="w-3 h-3" /></a></li>
                                <li>Klicke auf das <strong>+</strong> neben "Andere Kalender"</li>
                                <li>Wähle <strong>"Per URL hinzufügen"</strong></li>
                                <li>Füge die obige URL ein und klicke auf "Kalender hinzufügen"</li>
                            </ol>
                        </Card>

                        {/* Apple Calendar */}
                        <Card className="p-4 border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm"></span>
                                </div>
                                <h4 className="font-semibold text-slate-800">Apple Kalender</h4>
                            </div>
                            <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                                <li>Öffne die <strong>Kalender App</strong> auf Mac/iPhone</li>
                                <li>Gehe zu <strong>Ablage → Neues Kalenderabonnement</strong> (Mac) oder <strong>Einstellungen → Accounts → Account hinzufügen</strong> (iPhone)</li>
                                <li>Füge die obige URL ein</li>
                                <li>Klicke auf "Abonnieren" und bestätige</li>
                            </ol>
                        </Card>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
                        <p className="font-medium text-slate-800 mb-2">Was wird synchronisiert?</p>
                        <ul className="space-y-1 list-disc list-inside">
                            <li><strong>Schichten:</strong> Alle geplanten Mitarbeiter-Schichten</li>
                            <li><strong>Reservierungen:</strong> Alle bestätigten und vorgemerkten Reservierungen</li>
                            <li><strong>Urlaub:</strong> Alle genehmigten Urlaubsanträge</li>
                            <li><strong>Feiertage:</strong> Gesetzliche Feiertage Baden-Württemberg</li>
                            <li><strong>Geburtstage:</strong> Geburtstage aller Mitarbeiter (jährlich wiederkehrend)</li>
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}