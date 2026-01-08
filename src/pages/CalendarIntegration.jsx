import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Link2, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarExport from '@/components/calendar/CalendarExport';
import LiveSyncInstructions from '@/components/calendar/LiveSyncInstructions';

export default function CalendarIntegration() {
    const [syncStatus, setSyncStatus] = useState(null);

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

    const totalEvents = shifts.length + reservations.length;
    const birthdaysCount = employees.filter(e => e.birthday).length;

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Kalenderintegration</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Verwalte deine Kalenderverbindungen und Exporte
                    </p>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{shifts.length}</p>
                                <p className="text-xs text-slate-400">Schichten</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{reservations.length}</p>
                                <p className="text-xs text-slate-400">Reservierungen</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{birthdaysCount}</p>
                                <p className="text-xs text-slate-400">Geburtstage</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <Tabs defaultValue="export" className="space-y-6">
                    <TabsList className="bg-slate-800 border border-slate-700 grid w-full grid-cols-3">
                        <TabsTrigger value="export">Export</TabsTrigger>
                        <TabsTrigger value="sync">Live-Sync</TabsTrigger>
                        <TabsTrigger value="connect">Verbinden</TabsTrigger>
                    </TabsList>

                    {/* Export Tab */}
                    <TabsContent value="export" className="space-y-4">
                        <Card className="p-6 bg-slate-800 border-slate-700">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0">
                                    <Download className="w-6 h-6 text-emerald-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white mb-2">Kalender exportieren</h3>
                                    <p className="text-sm text-slate-400 mb-4">
                                        Exportiere deine Schichten, Reservierungen und Geburtstage als .ics Datei für alle gängigen Kalender-Apps.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <CalendarExport shifts={shifts} reservations={reservations} />
                                        <div className="text-xs text-slate-500 sm:ml-4 sm:self-center">
                                            Kompatibel mit: Google Calendar, Outlook, Apple Calendar, etc.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Alert className="bg-blue-900/20 border-blue-700">
                            <AlertCircle className="h-4 w-4 text-blue-400" />
                            <AlertDescription className="text-blue-300 text-sm">
                                Der Export erstellt eine Momentaufnahme deiner aktuellen Termine. Für automatische Updates nutze die Live-Sync Funktion.
                            </AlertDescription>
                        </Alert>
                    </TabsContent>

                    {/* Live Sync Tab */}
                    <TabsContent value="sync" className="space-y-4">
                        <Card className="p-6 bg-slate-800 border-slate-700">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0">
                                    <RefreshCw className="w-6 h-6 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white mb-2">Live-Synchronisation</h3>
                                    <p className="text-sm text-slate-400 mb-4">
                                        Verbinde deinen Kalender mit einem Live-Feed, der automatisch aktualisiert wird, wenn sich Termine ändern.
                                    </p>
                                    <LiveSyncInstructions />
                                </div>
                            </div>
                        </Card>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Card className="p-4 bg-slate-800 border-slate-700">
                                <h4 className="font-medium text-white mb-2 text-sm">Was wird synchronisiert?</h4>
                                <ul className="space-y-1 text-sm text-slate-400">
                                    <li>✓ Alle Schichten</li>
                                    <li>✓ Reservierungen</li>
                                    <li>✓ Mitarbeiter-Geburtstage</li>
                                    <li>✓ Automatische Updates</li>
                                </ul>
                            </Card>

                            <Card className="p-4 bg-slate-800 border-slate-700">
                                <h4 className="font-medium text-white mb-2 text-sm">Unterstützte Kalender</h4>
                                <ul className="space-y-1 text-sm text-slate-400">
                                    <li>✓ Google Calendar</li>
                                    <li>✓ Apple Calendar (iOS/macOS)</li>
                                    <li>✓ Outlook Calendar</li>
                                    <li>✓ Alle iCal-kompatiblen Apps</li>
                                </ul>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Connect External Calendars Tab */}
                    <TabsContent value="connect" className="space-y-4">
                        <Card className="p-6 bg-slate-800 border-slate-700">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center shrink-0">
                                    <Link2 className="w-6 h-6 text-purple-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white mb-2">Externe Kalender verbinden</h3>
                                    <p className="text-sm text-slate-400 mb-4">
                                        Verbinde deine Google Calendar oder Outlook Konten für bidirektionale Synchronisation.
                                    </p>

                                    <Alert className="bg-amber-900/20 border-amber-700 mb-4">
                                        <AlertCircle className="h-4 w-4 text-amber-400" />
                                        <AlertDescription className="text-amber-300 text-sm">
                                            <strong>Backend Functions erforderlich:</strong> Um externe Kalender zu verbinden, müssen Backend Functions in den App-Einstellungen aktiviert werden.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="space-y-3">
                                        <div className="p-4 rounded-lg border border-slate-700 opacity-50">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                                                        <Calendar className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white text-sm">Google Calendar</p>
                                                        <p className="text-xs text-slate-400">Nicht verbunden</p>
                                                    </div>
                                                </div>
                                                <Button disabled variant="outline" size="sm" className="border-slate-600">
                                                    Verbinden
                                                </Button>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                Automatischer Import und Export von Terminen
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-lg border border-slate-700 opacity-50">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                                                        <Calendar className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white text-sm">Outlook Calendar</p>
                                                        <p className="text-xs text-slate-400">Nicht verbunden</p>
                                                    </div>
                                                </div>
                                                <Button disabled variant="outline" size="sm" className="border-slate-600">
                                                    Verbinden
                                                </Button>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                Microsoft 365 Integration
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                                        <h4 className="font-medium text-white mb-2 text-sm">Aktivierung:</h4>
                                        <ol className="space-y-1 text-sm text-slate-400 list-decimal list-inside">
                                            <li>Öffne die Dashboard-Einstellungen</li>
                                            <li>Navigiere zu "Backend Functions"</li>
                                            <li>Aktiviere Backend Functions</li>
                                            <li>Kehre zu dieser Seite zurück</li>
                                        </ol>
                                        <Button 
                                            variant="link" 
                                            className="text-amber-500 hover:text-amber-400 mt-2 p-0 h-auto"
                                            onClick={() => window.open('https://docs.base44.com/backend-functions', '_blank')}
                                        >
                                            <ExternalLink className="w-3 h-3 mr-1" />
                                            Mehr über Backend Functions erfahren
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-700/50">
                            <h4 className="font-medium text-white mb-2 text-sm">Geplante Features</h4>
                            <ul className="space-y-1 text-sm text-slate-300">
                                <li>✓ Automatischer Import externer Termine</li>
                                <li>✓ Bidirektionale Synchronisation</li>
                                <li>✓ Konflikt-Erkennung bei Doppelbuchungen</li>
                                <li>✓ Team-Kalender Übersicht</li>
                                <li>✓ Benachrichtigungen bei Änderungen</li>
                            </ul>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}