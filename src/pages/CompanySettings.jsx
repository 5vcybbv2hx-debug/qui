import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Upload, Download, Share2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import DigitalBusinessCard from '@/components/company/DigitalBusinessCard';
import OpeningHoursEditor from '@/components/company/OpeningHoursEditor';

export default function CompanySettingsPage() {
    const [formData, setFormData] = useState({
        company_name: '',
        street: '',
        postal_code: '',
        city: '',
        country: 'Deutschland',
        phone: '',
        email: '',
        website: '',
        tax_id: '',
        vat_id: '',
        bank_name: '',
        iban: '',
        bic: '',
        opening_hours: '',
        description: '',
        logo_url: ''
    });
    const [uploading, setUploading] = useState(false);

    const queryClient = useQueryClient();

    const { data: companyInfo, isLoading } = useQuery({
         queryKey: ['company-info'],
         queryFn: async () => {
             const infos = await base44.entities.CompanyInfo.list('-last_updated', 1);
             return infos[0] || null;
         }
     });

    const initialized = React.useRef(false);
    useEffect(() => {
        if (companyInfo && !initialized.current) {
            initialized.current = true;
            setFormData(companyInfo);
        }
    }, [companyInfo]);

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (companyInfo?.id) {
                return await base44.entities.CompanyInfo.update(companyInfo.id, data);
            } else {
                return await base44.entities.CompanyInfo.create(data);
            }
        },
        onSuccess: (savedData) => {
            // Update cache directly without triggering a re-fetch that could reset formData
            queryClient.setQueryData(['company-info'], savedData);
            toast.success('Firmendaten gespeichert');
        },
        onError: (error) => {
            toast.error('Fehler beim Speichern: ' + error.message);
        }
    });

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Bitte nur Bilddateien hochladen');
            return;
        }

        setUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setFormData(prev => ({ ...prev, logo_url: file_url }));
            toast.success('Logo hochgeladen');
        } catch (error) {
            toast.error('Fehler beim Hochladen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = () => {
        if (!formData.company_name) {
            toast.error('Bitte Firmennamen eingeben');
            return;
        }
        saveMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
                <div className="text-white">Lädt...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-amber-500" />
                        Firmenstammdaten
                    </h1>
                    <p className="text-slate-400">Verwalte deine Firmeninformationen und digitale Visitenkarte</p>
                </div>

                <Tabs defaultValue="data" className="space-y-6">
                    <TabsList className="bg-slate-800 border border-slate-700">
                        <TabsTrigger value="data" className="data-[state=active]:bg-amber-600">
                            <Building2 className="w-4 h-4 mr-2" />
                            Stammdaten
                        </TabsTrigger>
                        <TabsTrigger value="card" className="data-[state=active]:bg-amber-600">
                            <QrCode className="w-4 h-4 mr-2" />
                            Digitale Visitenkarte
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="data">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                {/* Grunddaten */}
                                <Card className="bg-slate-800/50 border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="text-white">Grunddaten</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label className="text-slate-300">Firmenname *</Label>
                                            <Input
                                                value={formData.company_name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                                                className="bg-slate-900 border-slate-600 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Beschreibung</Label>
                                            <Textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                className="bg-slate-900 border-slate-600 text-white"
                                                rows={3}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Adresse */}
                                <Card className="bg-slate-800/50 border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="text-white">Adresse</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label className="text-slate-300">Straße & Hausnummer</Label>
                                            <Input
                                                value={formData.street}
                                                onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                                                className="bg-slate-900 border-slate-600 text-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-slate-300">PLZ</Label>
                                                <Input
                                                    value={formData.postal_code}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                                                    className="bg-slate-900 border-slate-600 text-white"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-slate-300">Stadt</Label>
                                                <Input
                                                    value={formData.city}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                                    className="bg-slate-900 border-slate-600 text-white"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Land</Label>
                                            <Input
                                                value={formData.country}
                                                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                                                className="bg-slate-900 border-slate-600 text-white"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Kontakt */}
                                <Card className="bg-slate-800/50 border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="text-white">Kontakt</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label className="text-slate-300">Telefon</Label>
                                            <Input
                                                value={formData.phone}
                                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                className="bg-slate-900 border-slate-600 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">E-Mail</Label>
                                            <Input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                className="bg-slate-900 border-slate-600 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Webseite</Label>
                                            <Input
                                                value={formData.website}
                                                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                                className="bg-slate-900 border-slate-600 text-white"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300 mb-3 block">Öffnungszeiten</Label>
                                            <OpeningHoursEditor
                                                value={formData.opening_hours}
                                                onChange={(val) => setFormData(prev => ({ ...prev, opening_hours: val }))}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Finanzen */}
                                <Card className="bg-slate-800/50 border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="text-white">Finanzdaten</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-slate-300">Steuernummer</Label>
                                                <Input
                                                    value={formData.tax_id}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                                                    className="bg-slate-900 border-slate-600 text-white"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-slate-300">USt-IdNr.</Label>
                                                <Input
                                                    value={formData.vat_id}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, vat_id: e.target.value }))}
                                                    className="bg-slate-900 border-slate-600 text-white"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Bank</Label>
                                            <Input
                                                value={formData.bank_name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                                                className="bg-slate-900 border-slate-600 text-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-slate-300">IBAN</Label>
                                                <Input
                                                    value={formData.iban}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value }))}
                                                    className="bg-slate-900 border-slate-600 text-white"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-slate-300">BIC</Label>
                                                <Input
                                                    value={formData.bic}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, bic: e.target.value }))}
                                                    className="bg-slate-900 border-slate-600 text-white"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Button
                                    onClick={handleSave}
                                    className="w-full bg-amber-600 hover:bg-amber-700"
                                    disabled={saveMutation.isPending}
                                >
                                    {saveMutation.isPending ? 'Speichert...' : 'Speichern'}
                                </Button>
                            </div>

                            {/* Logo Upload */}
                            <div>
                                <Card className="bg-slate-800/50 border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="text-white">Logo</CardTitle>
                                        <CardDescription className="text-slate-400">
                                            Lade dein Firmenlogo hoch
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {formData.logo_url && (
                                            <div className="aspect-square bg-white rounded-lg p-4 flex items-center justify-center">
                                                <img
                                                    src={formData.logo_url}
                                                    alt="Logo"
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                disabled={uploading}
                                                className="bg-slate-900 border-slate-600 text-white"
                                            />
                                            {uploading && (
                                                <p className="text-sm text-slate-400 mt-2">Lädt hoch...</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="card">
                        <DigitalBusinessCard companyInfo={formData} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}