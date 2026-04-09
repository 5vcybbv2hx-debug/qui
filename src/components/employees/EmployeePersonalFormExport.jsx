import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileDown, Loader2, PenLine } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SignaturePad from './SignaturePad';

export default function EmployeePersonalFormExport({ employee }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [steuerberaterEmail, setSteuerberaterEmail] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [showSignatures, setShowSignatures] = useState(false);
    const [sigEmployee, setSigEmployee] = useState(null);
    const [sigEmployer, setSigEmployer] = useState(null);

    const nameParts = employee.name?.split(' ') || ['', ''];
    const vorname = nameParts[0] || '';
    const nachname = nameParts.slice(1).join(' ') || '';

    const handleGenerate = async () => {
        setLoading(true);
        setPdfUrl(null);
        setEmailSent(false);
        try {
            const formData = {
                vorname,
                name: nachname,
                street: employee.street || '',
                postal_code: employee.postal_code || '',
                city: employee.city || '',
                nationality: employee.nationality || '',
                birthday: employee.birthday || '',
                birth_name: employee.birth_name || '',
                birth_place: employee.birth_place || '',
                entry_date: employee.entry_date || '',
                activity: employee.activity || '',
                education: employee.education || '',
                weekly_hours: employee.weekly_hours || '',
                hourly_rate: employee.hourly_rate || '',
                tax_id: employee.tax_id || '',
                pension_number: employee.pension_number || '',
                health_insurance: employee.health_insurance || '',
                pension_exemption: employee.pension_exemption || false,
                has_main_job: employee.has_main_job || false,
                has_other_minijob: employee.has_other_minijob || false,
                other_minijob_details: employee.other_minijob_details || '',
                bank_name: employee.bank_name || '',
                iban: employee.iban || '',
                bic: employee.bic || '',
                steuerberater_email: '',
            };

            const { data: result } = await base44.functions.invoke('generatePersonalFormPDF', { formData, sigEmployee, sigEmployer });
            setPdfUrl(result?.pdf_url);
        } catch (e) {
            alert('Fehler beim Generieren: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendEmail = async () => {
        if (!steuerberaterEmail || !pdfUrl) return;
        setLoading(true);
        try {
            await base44.integrations.Core.SendEmail({
                to: steuerberaterEmail,
                subject: `Personalbogen - ${employee.name}`,
                body: `Hallo,\n\nim Anhang finden Sie den Personalbogen für:\n\nName: ${employee.name}\nEintrittsdatum: ${employee.entry_date || '-'}\nTätigkeit: ${employee.activity || '-'}\n\nDownload-Link: ${pdfUrl}\n\nMit freundlichen Grüßen\nBarManager System`.trim()
            });
            setEmailSent(true);
        } catch (e) {
            alert('Fehler beim Versenden: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => { setOpen(true); setPdfUrl(null); setEmailSent(false); setSteuerberaterEmail(''); setShowSignatures(false); setSigEmployee(null); setSigEmployer(null); }}
                className="flex-1 border-slate-700/50 text-slate-300 hover:bg-slate-800/50"
            >
                <FileDown className="w-4 h-4 mr-1" />
                Personalbogen
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Personalbogen – {employee.name}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        {!pdfUrl ? (
                            <div className="space-y-4">
                                {/* Toggle Unterschriften */}
                                <button
                                    onClick={() => setShowSignatures(v => !v)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border hover:bg-accent/50 text-sm text-foreground transition-colors"
                                >
                                    <span className="flex items-center gap-2"><PenLine className="w-4 h-4 text-amber-400" /> Unterschriften hinzufügen (optional)</span>
                                    <span className="text-muted-foreground">{showSignatures ? '▲' : '▼'}</span>
                                </button>

                                {showSignatures && (
                                    <div className="space-y-4 p-3 bg-secondary/30 rounded-lg">
                                        <SignaturePad label="Unterschrift Arbeitnehmer" onSign={setSigEmployee} />
                                        <SignaturePad label="Unterschrift Arbeitgeber" onSign={setSigEmployer} />
                                    </div>
                                )}

                                <Button onClick={handleGenerate} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />PDF wird generiert...</> : 'PDF generieren'}
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
                                    ✓ PDF erfolgreich generiert
                                </div>
                                <a
                                    href={pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
                                >
                                    <FileDown className="w-4 h-4" />
                                    PDF herunterladen
                                </a>

                                <div className="pt-3 border-t border-border space-y-2">
                                    <Label>Per E-Mail an Steuerberater senden</Label>
                                    <Input
                                        type="email"
                                        placeholder="steuerberater@example.com"
                                        value={steuerberaterEmail}
                                        onChange={(e) => setSteuerberaterEmail(e.target.value)}
                                    />
                                    <Button
                                        onClick={handleSendEmail}
                                        disabled={loading || !steuerberaterEmail || emailSent}
                                        className="w-full bg-green-600 hover:bg-green-700"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                        {emailSent ? '✓ E-Mail gesendet!' : 'E-Mail senden'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}