import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, AlertCircle, AlertTriangle, Save, Building2, CreditCard, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function parseOpeningHours(jsonStr) {
    if (!jsonStr) return {};
    try { return JSON.parse(jsonStr); } catch { return {}; }
}

export default function CompanyInfoEditor() {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ whatsapp_group_link: '' });
    const [openingHours, setOpeningHours] = useState({});

    const { data: companies = [], isLoading } = useQuery({
        queryKey: ['company-info'],
        queryFn: () => base44.entities.CompanyInfo.list('-last_updated', 10),
    });

    const company = companies?.[0] || null;
    const hasDuplicates = companies.length > 1;

    // Sync form when company loads
    useEffect(() => {
        if (company) {
            setForm({
                company_name: company.company_name || '',
                street: company.street || '',
                postal_code: company.postal_code || '',
                city: company.city || '',
                country: company.country || 'Deutschland',
                email: company.email || '',
                phone: company.phone || '',
                website: company.website || '',
                description: company.description || '',
                // Finanzen
                tax_id: company.tax_id || '',
                vat_id: company.vat_id || '',
                bank_name: company.bank_name || '',
                iban: company.iban || '',
                bic: company.bic || '',
                payroll_email: company.payroll_email || '',
                datev_beraternummer: company.datev_beraternummer || '',
                datev_mandantennummer: company.datev_mandantennummer || '',
                whatsapp_group_link: company.whatsapp_group_link || '',
                // Rechtliches
                owner_name: company.owner_name || '',
                legal_form: company.legal_form || '',
                data_protection_contact: company.data_protection_contact || '',
                datenschutz_version: company.datenschutz_version || '1.0',
                agb_version: company.agb_version || '1.0',
                impressum_version: company.impressum_version || '1.0',
            });
            setOpeningHours(parseOpeningHours(company.opening_hours));
        }
    }, [company]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!company?.id) throw new Error('Company info not found');
            await base44.entities.CompanyInfo.update(company.id, {
                ...form,
                opening_hours: JSON.stringify(openingHours),
                last_updated: new Date().toISOString(),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-info'] });
            toast.success('Betriebsdaten gespeichert');
        },
        onError: (err) => toast.error('Fehler: ' + err.message),
    });

    const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

    const setHours = (day, field, value) => {
        setOpeningHours(h => ({ ...h, [day]: { ...(h[day] || {}), [field]: value } }));
    };

    if (isLoading) {
        return (
            <Card className="p-4 bg-card border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Lade Betriebsdaten...</span>
                </div>
            </Card>
        );
    }

    if (!company) {
        return (
            <Card className="p-4 bg-amber-500/10 border-amber-500/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-amber-600">Betriebsdaten nicht gefunden</p>
                    <p className="text-xs text-amber-600/80 mt-1">Bitte trage zuerst Firmeninformationen in den Betriebsdaten (CompanySettings) ein.</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Duplikat-Banner */}
            {hasDuplicates && (
                <Card className="p-3 bg-amber-500/10 border-amber-500/30 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-600">
                        ⚠️ Mehrere Firmendatensätze gefunden – bitte bereinigen. ({companies.length} Einträge)
                    </p>
                </Card>
            )}

            <Card className="p-4 bg-card border-border">
                <Tabs defaultValue="general">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 mb-4">
                        <TabsTrigger value="general" className="py-2 text-xs flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Allgemein</span>
                        </TabsTrigger>
                        <TabsTrigger value="finance" className="py-2 text-xs flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Finanzen</span>
                        </TabsTrigger>
                        <TabsTrigger value="hours" className="py-2 text-xs flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Öffnungszeiten</span>
                        </TabsTrigger>
                        <TabsTrigger value="legal" className="py-2 text-xs flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Rechtliches</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Allgemein */}
                    <TabsContent value="general" className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Firmenname *</Label>
                                <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Muster GmbH" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Straße & Hausnummer</Label>
                                <Input value={form.street} onChange={e => set('street', e.target.value)} placeholder="Musterstraße 1" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">PLZ</Label>
                                    <Input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} placeholder="12345" />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Stadt</Label>
                                    <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Berlin" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Land</Label>
                                <Input value={form.country} onChange={e => set('country', e.target.value)} placeholder="Deutschland" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">E-Mail</Label>
                                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@example.com" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Telefon</Label>
                                <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+49 30 123456" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Webseite</Label>
                                <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://example.com" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Beschreibung</Label>
                                <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Kurze Beschreibung" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">WhatsApp-Gruppenlink</Label>
                                <Input value={form.whatsapp_group_link || ''} onChange={e => set('whatsapp_group_link', e.target.value)} placeholder="https://chat.whatsapp.com/..." />
                                <p className="text-xs text-muted-foreground mt-1">Wird auf der Mitarbeiter-Seite als Team-Gruppe-Button verwendet</p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Finanzen */}
                    <TabsContent value="finance" className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Steuernummer</Label>
                                <Input value={form.tax_id} onChange={e => set('tax_id', e.target.value)} placeholder="12/345/67890" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">USt-IdNr.</Label>
                                <Input value={form.vat_id} onChange={e => set('vat_id', e.target.value)} placeholder="DE123456789" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Kreditinstitut</Label>
                                <Input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="Sparkasse Berlin" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">IBAN</Label>
                                <Input value={form.iban} onChange={e => set('iban', e.target.value)} placeholder="DE89 3704 0044 0532 0130 00" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">BIC</Label>
                                <Input value={form.bic} onChange={e => set('bic', e.target.value)} placeholder="COBADEFFXXX" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5" /> Lohnbüro-Email
                                </Label>
                                <Input type="email" value={form.payroll_email} onChange={e => set('payroll_email', e.target.value)} placeholder="payroll@example.com" />
                                <p className="text-xs text-muted-foreground mt-1">Empfänger der monatlichen Zeiterfassungs-Reports</p>
                            </div>
                            <div className="border-t border-border pt-3 mt-3">
                                <h4 className="text-xs font-semibold text-foreground mb-3">DATEV-Integration</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-1 block">Beraternummer</Label>
                                        <Input value={form.datev_beraternummer} onChange={e => set('datev_beraternummer', e.target.value)} placeholder="123456" />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-1 block">Mandantennummer</Label>
                                        <Input value={form.datev_mandantennummer} onChange={e => set('datev_mandantennummer', e.target.value)} placeholder="1" />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Wird beim DATEV-Lohnbuchführungs-Export verwendet</p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Öffnungszeiten */}
                    <TabsContent value="hours" className="space-y-2">
                        <p className="text-xs text-muted-foreground mb-3">Gib für jeden Wochentag die Öffnungszeiten an. Leer lassen = geschlossen.</p>
                        <div className="space-y-2">
                            {WEEKDAYS.map(day => (
                                <div key={day} className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground w-20 shrink-0">{day.slice(0, 2)}.</span>
                                    <Input
                                        className="h-8 text-xs"
                                        placeholder="10:00"
                                        value={openingHours[day]?.open || ''}
                                        onChange={e => setHours(day, 'open', e.target.value)}
                                    />
                                    <span className="text-xs text-muted-foreground shrink-0">–</span>
                                    <Input
                                        className="h-8 text-xs"
                                        placeholder="23:00"
                                        value={openingHours[day]?.close || ''}
                                        onChange={e => setHours(day, 'close', e.target.value)}
                                    />
                                    <Input
                                        className="h-8 text-xs flex-1"
                                        placeholder="Notiz"
                                        value={openingHours[day]?.note || ''}
                                        onChange={e => setHours(day, 'note', e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Rechtliches */}
                    <TabsContent value="legal" className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Betreiber / Verantwortlicher</Label>
                                <Input value={form.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="Max Mustermann" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Rechtsform</Label>
                                <Select value={form.legal_form} onValueChange={v => set('legal_form', v)}>
                                    <SelectTrigger><SelectValue placeholder="Rechtsform wählen" /></SelectTrigger>
                                    <SelectContent>
                                        {['Einzelunternehmer', 'GbR', 'oHG', 'KG', 'GmbH', 'AG', 'Ltd.', 'Sonstiges'].map(v => (
                                            <SelectItem key={v} value={v}>{v}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Datenschutz-Kontakt</Label>
                                <Input value={form.data_protection_contact} onChange={e => set('data_protection_contact', e.target.value)} placeholder="datenschutz@example.com" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Datenschutz v.</Label>
                                    <Input value={form.datenschutz_version} onChange={e => set('datenschutz_version', e.target.value)} placeholder="1.0" />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">AGB v.</Label>
                                    <Input value={form.agb_version} onChange={e => set('agb_version', e.target.value)} placeholder="1.0" />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Impressum v.</Label>
                                    <Input value={form.impressum_version} onChange={e => set('impressum_version', e.target.value)} placeholder="1.0" />
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Speichern */}
                <div className="mt-4 pt-4 border-t border-border flex justify-end">
                    <Button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending}
                        className="gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {updateMutation.isPending ? 'Speichert...' : 'Speichern'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}