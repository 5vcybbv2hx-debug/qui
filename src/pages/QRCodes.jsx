import React, { useState } from 'react';
import TableQRGenerator from '@/components/qr/TableQRGenerator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExternalLink, QrCode, Copy, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGuestMenuLink, getGuestReservationLink, copyToClipboard, shareLink } from '@/lib/guestLinks';

function LinkCard({ title, description, url, shareTitle }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await copyToClipboard(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = () => shareLink(url, shareTitle);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm break-all">
                    {url}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 min-h-[44px]" onClick={handleCopy}>
                        {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied ? 'Kopiert!' : 'Kopieren'}
                    </Button>
                    <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => window.open(url, '_blank')}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Öffnen
                    </Button>
                    <Button variant="outline" className="min-h-[44px]" onClick={handleShare} title="Teilen">
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function QRCodes() {
    const menuUrl = getGuestMenuLink();
    const reservationUrl = getGuestReservationLink();

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
                    <LinkCard
                        title="Digitale Getränkekarte"
                        description="Öffentlicher Link zur Getränkekarte"
                        url={menuUrl}
                        shareTitle="Getränkekarte"
                    />
                    <LinkCard
                        title="Online Reservierung"
                        description="Öffentlicher Link zum Reservierungsformular"
                        url={reservationUrl}
                        shareTitle="Online Reservierung"
                    />
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