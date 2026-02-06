import React from 'react';
import TableQRGenerator from '@/components/qr/TableQRGenerator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExternalLink, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QRCodes() {
    const menuUrl = `${window.location.origin}/public-menu`;
    const reservationUrl = `${window.location.origin}/public-reservation`;

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">QR-Codes für Gäste</h1>
                    <p className="text-muted-foreground">
                        Generieren Sie QR-Codes für Ihre Tische und teilen Sie Links mit Ihren Gästen.
                    </p>
                </div>

                <TableQRGenerator />

                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <QrCode className="w-5 h-5" />
                                Digitale Getränkekarte
                            </CardTitle>
                            <CardDescription>
                                Öffentlicher Link zur Getränkekarte
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm break-all">
                                {menuUrl}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => navigator.clipboard.writeText(menuUrl)}
                                >
                                    Link kopieren
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => window.open(menuUrl, '_blank')}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <QrCode className="w-5 h-5" />
                                Online Reservierung
                            </CardTitle>
                            <CardDescription>
                                Öffentlicher Link zum Reservierungsformular
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm break-all">
                                {reservationUrl}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => navigator.clipboard.writeText(reservationUrl)}
                                >
                                    Link kopieren
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => window.open(reservationUrl, '_blank')}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Verwendungsmöglichkeiten</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <h3 className="font-semibold">📱 QR-Codes auf Tischen</h3>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Gäste scannen Code am Tisch</li>
                                    <li>Direkter Zugriff auf Getränkekarte</li>
                                    <li>Keine App-Installation nötig</li>
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold">🌐 Links auf Website</h3>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Integration in Ihre Website</li>
                                    <li>Social Media Posts</li>
                                    <li>E-Mail Signatur</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}