import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ReservationForm from '@/components/public/ReservationForm';
import { Wine, CheckCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PublicReservation() {
    const [submittedReservation, setSubmittedReservation] = useState(null);

    const { data: companyInfo } = useQuery({
        queryKey: ['companyInfo'],
        queryFn: async () => {
            const infos = await base44.entities.CompanyInfo.list();
            return infos[0] || {};
        }
    });

    const barName = companyInfo?.company_name || 'BarManager';

    const handleSuccess = (reservation) => {
        setSubmittedReservation(reservation);
    };

    if (submittedReservation) {
        const dateObj = new Date(submittedReservation.date);
        const formattedDate = dateObj.toLocaleDateString('de-DE', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <Card className="max-w-2xl w-full">
                    <CardHeader className="text-center">
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <CardTitle className="text-3xl">Reservierung erhalten!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center space-y-2">
                            <p className="text-lg text-muted-foreground">
                                Vielen Dank, <strong>{submittedReservation.customer_name}</strong>!
                            </p>
                            <p className="text-muted-foreground">
                                Wir haben Ihre Reservierung erhalten und werden sie in Kürze bestätigen.
                            </p>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                            <h3 className="font-semibold text-lg mb-4">Ihre Reservierungsdetails:</h3>
                            <div className="grid gap-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Datum:</span>
                                    <span className="font-medium">{formattedDate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Uhrzeit:</span>
                                    <span className="font-medium">{submittedReservation.time} Uhr</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Personen:</span>
                                    <span className="font-medium">{submittedReservation.guests}</span>
                                </div>
                                {submittedReservation.notes && (
                                    <div className="pt-2 border-t">
                                        <span className="text-muted-foreground block mb-1">Ihre Anmerkungen:</span>
                                        <span className="font-medium">{submittedReservation.notes}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                            <p className="text-sm text-center">
                                📧 Sie erhalten in Kürze eine Bestätigungsmail an<br/>
                                <strong>{submittedReservation.email}</strong><br/>
                                mit einem Link zur Verwaltung Ihrer Reservierung.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link to={createPageUrl('PublicMenu')} className="flex-1">
                                <Button variant="outline" className="w-full">
                                    <Wine className="w-4 h-4 mr-2" />
                                    Zur Getränkekarte
                                </Button>
                            </Link>
                            <Button 
                                onClick={() => setSubmittedReservation(null)}
                                variant="outline"
                                className="flex-1"
                            >
                                Neue Reservierung
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-card/95 backdrop-blur-xl border-b border-border/50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                            <Wine className="w-6 h-6 text-slate-900" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{barName}</h1>
                            <p className="text-sm text-muted-foreground">Online Reservierung</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-12">
                <ReservationForm onSuccess={handleSuccess} />

                <div className="max-w-2xl mx-auto mt-8">
                    <Link to={createPageUrl('PublicMenu')}>
                        <Button variant="ghost" className="w-full">
                            <Wine className="w-4 h-4 mr-2" />
                            Zur Getränkekarte
                        </Button>
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-card/95 backdrop-blur-xl border-t border-border/50 mt-20">
                <div className="max-w-7xl mx-auto px-4 py-8 text-center">
                    <p className="text-muted-foreground mb-2">
                        {companyInfo?.address || ''}
                    </p>
                    <p className="text-muted-foreground mb-4">
                        {companyInfo?.phone && `Tel: ${companyInfo.phone}`}
                        {companyInfo?.phone && companyInfo?.email && ' • '}
                        {companyInfo?.email && `E-Mail: ${companyInfo.email}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        © 2026 {barName}. Alle Rechte vorbehalten.
                    </p>
                </div>
            </footer>
        </div>
    );
}