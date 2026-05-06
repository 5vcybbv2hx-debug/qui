import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { toast } from 'sonner';

const getFunctionUrl = (functionName) => {
    const appId = appParams.appId;
    const base = (appParams.appBaseUrl || '').replace(/\/$/, '');
    const origin = base || window.location.origin;
    return `${origin}/api/apps/${appId}/functions/${functionName}`;
};

export default function MyShiftsCalendarSync({ employeeId, existingToken }) {
    const [token, setToken] = useState(existingToken || null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);

    const calendarUrl = token
        ? `${getFunctionUrl('my-shifts-calendar')}?employee_id=${employeeId}&token=${token}`
        : null;

    const generateToken = async () => {
        setLoading(true);
        try {
            const res = await base44.functions.invoke('generateCalendarToken', { employee_id: employeeId });
            setToken(res.data.token);
            toast.success('Neuer Kalender-Link erstellt!');
        } catch (err) {
            toast.error('Fehler: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        if (!calendarUrl) return;
        await navigator.clipboard.writeText(calendarUrl);
        setCopied(true);
        toast.success('Link kopiert!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    Kalender Live-Sync
                </CardTitle>
                <CardDescription>
                    Synchronisiert deine Schichten, Teamgeburtstage und Teamsitzungen mit iPhone, Google Calendar oder Outlook
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!token ? (
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                        <AlertCircle className="w-8 h-8 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">
                            Erstelle deinen persönlichen Kalender-Link.<br />
                            Dieser funktioniert dauerhaft — auch ohne Login.
                        </p>
                        <Button onClick={generateToken} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
                            Kalender-Link erstellen
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Füge diesen Link zu deinem Kalender hinzu. Er funktioniert dauerhaft ohne erneuten Login:
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={calendarUrl}
                                    readOnly
                                    className="flex-1 px-3 py-2 text-xs bg-secondary border border-border rounded-lg text-foreground font-mono"
                                />
                                <Button onClick={copyToClipboard} variant="outline" size="icon">
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-border">
                            <h4 className="font-semibold text-sm">Anleitung:</h4>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-medium">📱 iPhone / iPad</p>
                                    <ol className="text-sm text-muted-foreground space-y-0.5 pl-4 list-decimal mt-1">
                                        <li>Einstellungen → Kalender → Accounts</li>
                                        <li>„Account hinzufügen" → „Andere"</li>
                                        <li>„Kalender-Abo hinzufügen"</li>
                                        <li>Obigen Link einfügen → Weiter → Speichern</li>
                                        <li>Aktualisierung auf „Alle 15 Minuten" oder „Stündlich" stellen</li>
                                    </ol>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">🌐 Google Calendar</p>
                                    <ol className="text-sm text-muted-foreground space-y-0.5 pl-4 list-decimal mt-1">
                                        <li>calendar.google.com öffnen</li>
                                        <li>„+" neben „Weitere Kalender" → „Per URL"</li>
                                        <li>Obigen Link einfügen</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-border">
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
                                <span className="text-amber-500 mt-0.5">ℹ️</span>
                                <p className="text-xs text-muted-foreground">
                                    Der Link ist <strong>persönlich und dauerhaft gültig</strong> — kein erneuter Login nötig. 
                                    iPhone aktualisiert ca. alle 15 Minuten automatisch.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={generateToken}
                                disabled={loading}
                                className="text-xs text-muted-foreground"
                            >
                                <RefreshCw className="w-3 h-3 mr-1.5" />
                                Neuen Link generieren (invalidiert alten)
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}