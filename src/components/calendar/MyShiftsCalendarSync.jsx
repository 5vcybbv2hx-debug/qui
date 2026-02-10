import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Link as LinkIcon, Copy, Check, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function MyShiftsCalendarSync({ employeeId }) {
    const [copied, setCopied] = useState(false);
    
    const calendarUrl = `${window.location.origin}/api/functions/my-shifts-calendar?employee_id=${employeeId}`;
    
    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(calendarUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    Kalender Live-Sync
                </CardTitle>
                <CardDescription>
                    Synchronisiere deine Schichten automatisch mit deinem Kalender
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Füge diesen Link zu deinem Kalender hinzu (Google Calendar, Apple Calendar, Outlook, etc.) 
                        um deine Schichten automatisch zu synchronisieren:
                    </p>
                    
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={calendarUrl}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground"
                        />
                        <Button
                            onClick={copyToClipboard}
                            variant="outline"
                            size="icon"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                    <h4 className="font-semibold text-sm text-foreground">Anleitung:</h4>
                    
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">📱 Apple iPhone/iPad</p>
                            <ol className="text-sm text-muted-foreground space-y-1 pl-4 list-decimal">
                                <li>Öffne Einstellungen → Kalender → Accounts</li>
                                <li>Tippe auf "Account hinzufügen" → "Andere"</li>
                                <li>Wähle "Kalender-Abo hinzufügen"</li>
                                <li>Füge den obigen Link ein</li>
                            </ol>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">🌐 Google Calendar</p>
                            <ol className="text-sm text-muted-foreground space-y-1 pl-4 list-decimal">
                                <li>Öffne <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">Google Calendar</a></li>
                                <li>Klicke auf "+" neben "Weitere Kalender"</li>
                                <li>Wähle "Über URL"</li>
                                <li>Füge den obigen Link ein</li>
                            </ol>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">🪟 Outlook</p>
                            <ol className="text-sm text-muted-foreground space-y-1 pl-4 list-decimal">
                                <li>Öffne Outlook → Kalender</li>
                                <li>Klicke auf "Kalender hinzufügen"</li>
                                <li>Wähle "Aus dem Internet abonnieren"</li>
                                <li>Füge den obigen Link ein</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-border">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="text-amber-500 mt-0.5">ℹ️</div>
                        <p className="text-sm text-muted-foreground">
                            Der Kalender aktualisiert sich automatisch jede Stunde. 
                            Alle Änderungen an deinen Schichten werden automatisch synchronisiert.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}