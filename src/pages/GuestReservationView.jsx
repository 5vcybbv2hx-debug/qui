import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wine, Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function GuestReservationView() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const queryClient = useQueryClient();
    const [cancelSuccess, setCancelSuccess] = useState(false);

    const { data: reservation, isLoading, error } = useQuery({
        queryKey: ['guestReservation', token],
        queryFn: async () => {
            if (!token) throw new Error('Kein Token vorhanden');
            const reservations = await base44.entities.Reservation.filter({ guest_token: token });
            if (reservations.length === 0) throw new Error('Reservierung nicht gefunden');
            return reservations[0];
        },
        enabled: !!token
    });

    const cancelMutation = useMutation({
        mutationFn: async () => {
            await base44.entities.Reservation.update(reservation.id, {
                status: 'storniert'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['guestReservation', token]);
            setCancelSuccess(true);
        }
    });

    const { data: companyInfo } = useQuery({
        queryKey: ['companyInfo'],
        queryFn: async () => {
            const infos = await base44.entities.CompanyInfo.list();
            return infos[0] || {};
        }
    });

    const barName = companyInfo?.company_name || 'BarManager';

    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <Card className="max-w-md">
                    <CardHeader className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <CardTitle>Ungültiger Link</CardTitle>
                        <CardDescription>
                            Dieser Link ist nicht gültig. Bitte überprüfen Sie den Link aus Ihrer Bestätigungsmail.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Reservierung wird geladen...</p>
                </div>
            </div>
        );
    }

    if (error || !reservation) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <Card className="max-w-md">
                    <CardHeader className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <CardTitle>Reservierung nicht gefunden</CardTitle>
                        <CardDescription>
                            {error?.message || 'Diese Reservierung konnte nicht gefunden werden.'}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const dateObj = new Date(reservation.date);
    const formattedDate = dateObj.toLocaleDateString('de-DE', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const statusConfig = {
        'vorgemerkt': { color: 'bg-yellow-500', icon: Clock, text: 'Vorgemerkt' },
        'bestätigt': { color: 'bg-green-500', icon: CheckCircle, text: 'Bestätigt' },
        'storniert': { color: 'bg-red-500', icon: XCircle, text: 'Storniert' }
    };

    const config = statusConfig[reservation.status] || statusConfig['vorgemerkt'];
    const StatusIcon = config.icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-card/95 backdrop-blur-xl border-b border-border/50">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                            <Wine className="w-6 h-6 text-slate-900" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{barName}</h1>
                            <p className="text-sm text-muted-foreground">Ihre Reservierung</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                {cancelSuccess && (
                    <Card className="mb-6 border-green-500/50 bg-green-500/10">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                                <div>
                                    <p className="font-semibold">Reservierung storniert</p>
                                    <p className="text-sm text-muted-foreground">
                                        Ihre Reservierung wurde erfolgreich storniert.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-2xl mb-2">
                                    Hallo {reservation.customer_name}!
                                </CardTitle>
                                <CardDescription>
                                    Hier sind die Details Ihrer Reservierung
                                </CardDescription>
                            </div>
                            <Badge className={`${config.color} flex items-center gap-2`}>
                                <StatusIcon className="w-4 h-4" />
                                {config.text}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4">
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                                <Calendar className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Datum</p>
                                    <p className="font-medium">{formattedDate}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                                <Clock className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Uhrzeit</p>
                                    <p className="font-medium">{reservation.time} Uhr</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                                <Users className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Anzahl Personen</p>
                                    <p className="font-medium">{reservation.guests}</p>
                                </div>
                            </div>
                            {reservation.table && (
                                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                                    <Wine className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tisch</p>
                                        <p className="font-medium">Tisch {reservation.table}</p>
                                    </div>
                                </div>
                            )}
                            {reservation.notes && (
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Ihre Anmerkungen</p>
                                    <p className="font-medium">{reservation.notes}</p>
                                </div>
                            )}
                        </div>

                        {reservation.status !== 'storniert' && (
                            <div className="pt-4 border-t">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="w-full">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Reservierung stornieren
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Reservierung stornieren?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Möchten Sie Ihre Reservierung wirklich stornieren? 
                                                Diese Aktion kann nicht rückgängig gemacht werden.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => cancelMutation.mutate()}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                Ja, stornieren
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}

                        {reservation.status === 'vorgemerkt' && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                                <p className="text-sm text-center">
                                    ⏳ Ihre Reservierung ist vorgemerkt und wird in Kürze von unserem Team bestätigt.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-8 text-center text-sm text-muted-foreground">
                    <p>Bei Fragen erreichen Sie uns unter:</p>
                    <p className="mt-2">
                        {companyInfo?.phone && `📞 ${companyInfo.phone}`}
                        {companyInfo?.phone && companyInfo?.email && ' • '}
                        {companyInfo?.email && `📧 ${companyInfo.email}`}
                    </p>
                </div>
            </main>
        </div>
    );
}