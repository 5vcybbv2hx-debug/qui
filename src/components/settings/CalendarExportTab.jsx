import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Calendar, Info } from 'lucide-react';
import CalendarExport from '@/components/calendar/CalendarExport';
import LiveSyncInstructions from '@/components/calendar/LiveSyncInstructions';

export default function CalendarExportTab({ activeTab }) {
    // Only load shifts & reservations when calendar tab is active
    const { data: shifts = [] } = useQuery({
        queryKey: ['calendar-export-shifts'],
        queryFn: () => base44.entities.Shift.list('-date', 200),
        enabled: activeTab === 'calendar'
    });

    const { data: reservations = [] } = useQuery({
        queryKey: ['calendar-export-reservations'],
        queryFn: () => base44.entities.Reservation.list('-date', 200),
        enabled: activeTab === 'calendar'
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['calendar-export-employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true }),
        enabled: activeTab === 'calendar'
    });

    const birthdaysCount = employees.filter(e => e.birthday).length;

    return (
        <>
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

            {/* Calendar Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 bg-card border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 brand-text" />
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
        </>
    );
}