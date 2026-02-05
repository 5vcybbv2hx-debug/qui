import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Globe, Download, Share2, QrCode as QrCodeIcon } from 'lucide-react';
import QRCode from 'qrcode';

export default function DigitalBusinessCard({ companyInfo }) {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const canvasRef = useRef(null);

    useEffect(() => {
        if (companyInfo?.company_name) {
            generateVCard();
        }
    }, [companyInfo]);

    const generateVCard = async () => {
        // Generiere vCard Format
        const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${companyInfo.company_name || ''}
ORG:${companyInfo.company_name || ''}
TEL:${companyInfo.phone || ''}
EMAIL:${companyInfo.email || ''}
ADR:;;${companyInfo.street || ''};${companyInfo.city || ''};${companyInfo.postal_code || ''};${companyInfo.country || ''}
URL:${companyInfo.website || ''}
NOTE:${companyInfo.description || ''}
END:VCARD`;

        try {
            // Generiere QR-Code
            const qrUrl = await QRCode.toDataURL(vCard, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            setQrCodeUrl(qrUrl);
        } catch (error) {
            console.error('Fehler beim Generieren des QR-Codes:', error);
        }
    };

    const downloadVCard = () => {
        const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${companyInfo.company_name || ''}
ORG:${companyInfo.company_name || ''}
TEL:${companyInfo.phone || ''}
EMAIL:${companyInfo.email || ''}
ADR:;;${companyInfo.street || ''};${companyInfo.city || ''};${companyInfo.postal_code || ''};${companyInfo.country || ''}
URL:${companyInfo.website || ''}
NOTE:${companyInfo.description || ''}
END:VCARD`;

        const blob = new Blob([vCard], { type: 'text/vcard' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${companyInfo.company_name || 'kontakt'}.vcf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const shareCard = async () => {
        const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${companyInfo.company_name || ''}
ORG:${companyInfo.company_name || ''}
TEL:${companyInfo.phone || ''}
EMAIL:${companyInfo.email || ''}
ADR:;;${companyInfo.street || ''};${companyInfo.city || ''};${companyInfo.postal_code || ''};${companyInfo.country || ''}
URL:${companyInfo.website || ''}
NOTE:${companyInfo.description || ''}
END:VCARD`;

        if (navigator.share) {
            const file = new File([vCard], `${companyInfo.company_name || 'kontakt'}.vcf`, { type: 'text/vcard' });
            try {
                await navigator.share({
                    files: [file],
                    title: companyInfo.company_name,
                    text: `Kontaktdaten von ${companyInfo.company_name}`
                });
            } catch (error) {
                console.error('Fehler beim Teilen:', error);
            }
        } else {
            downloadVCard();
        }
    };

    const downloadQRCode = () => {
        const link = document.createElement('a');
        link.href = qrCodeUrl;
        link.download = `${companyInfo.company_name || 'visitenkarte'}-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!companyInfo?.company_name) {
        return (
            <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center text-slate-400">
                    Bitte zuerst Firmendaten eingeben
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visitenkarten-Vorschau */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Visitenkarte</CardTitle>
                    <CardDescription className="text-slate-400">
                        So sieht deine digitale Visitenkarte aus
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-white rounded-xl p-8 shadow-2xl">
                        {companyInfo.logo_url && (
                            <div className="mb-6 flex justify-center">
                                <img
                                    src={companyInfo.logo_url}
                                    alt="Logo"
                                    className="h-16 object-contain"
                                />
                            </div>
                        )}
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                {companyInfo.company_name}
                            </h2>
                            {companyInfo.description && (
                                <p className="text-sm text-slate-600">
                                    {companyInfo.description}
                                </p>
                            )}
                        </div>
                        <div className="space-y-3 text-sm">
                            {companyInfo.phone && (
                                <div className="flex items-center gap-3 text-slate-700">
                                    <Phone className="w-4 h-4 text-amber-600" />
                                    <span>{companyInfo.phone}</span>
                                </div>
                            )}
                            {companyInfo.email && (
                                <div className="flex items-center gap-3 text-slate-700">
                                    <Mail className="w-4 h-4 text-amber-600" />
                                    <span>{companyInfo.email}</span>
                                </div>
                            )}
                            {(companyInfo.street || companyInfo.city) && (
                                <div className="flex items-start gap-3 text-slate-700">
                                    <MapPin className="w-4 h-4 text-amber-600 mt-0.5" />
                                    <span>
                                        {companyInfo.street && <>{companyInfo.street}<br /></>}
                                        {companyInfo.postal_code} {companyInfo.city}
                                    </span>
                                </div>
                            )}
                            {companyInfo.website && (
                                <div className="flex items-center gap-3 text-slate-700">
                                    <Globe className="w-4 h-4 text-amber-600" />
                                    <span>{companyInfo.website}</span>
                                </div>
                            )}
                        </div>
                        {companyInfo.opening_hours && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <p className="text-xs text-slate-600 font-medium mb-1">Öffnungszeiten:</p>
                                <p className="text-xs text-slate-700 whitespace-pre-line">
                                    {companyInfo.opening_hours}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 mt-6">
                        <Button
                            onClick={downloadVCard}
                            className="flex-1 bg-amber-600 hover:bg-amber-700"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            vCard herunterladen
                        </Button>
                        <Button
                            onClick={shareCard}
                            variant="outline"
                            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Teilen
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* QR-Code */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">QR-Code</CardTitle>
                    <CardDescription className="text-slate-400">
                        Zum Scannen mit dem Smartphone
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {qrCodeUrl ? (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-8 flex items-center justify-center">
                                <img
                                    src={qrCodeUrl}
                                    alt="QR Code"
                                    className="w-full max-w-[300px]"
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-slate-400 mb-4">
                                    Scannen, um Kontaktdaten direkt ins Adressbuch zu speichern
                                </p>
                                <Button
                                    onClick={downloadQRCode}
                                    variant="outline"
                                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    QR-Code herunterladen
                                </Button>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                                <h4 className="text-sm font-medium text-white mb-2">💡 Verwendung:</h4>
                                <ul className="text-xs text-slate-400 space-y-1">
                                    <li>• Drucke den QR-Code auf Flyer oder Plakate</li>
                                    <li>• Zeige ihn auf einem Tablet in der Bar</li>
                                    <li>• Füge ihn in E-Mail-Signaturen ein</li>
                                    <li>• Verwende ihn auf Social Media</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-400">
                            QR-Code wird generiert...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}