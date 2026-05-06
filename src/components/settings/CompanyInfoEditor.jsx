import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CompanyInfoEditor() {
    const [payrollEmail, setPayrollEmail] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const { data: company, isLoading } = useQuery({
        queryKey: ['company-info'],
        queryFn: async () => {
            const res = await base44.entities.CompanyInfo.list('last_updated', 1);
            return res?.[0] || null;
        },
        onSuccess: (data) => {
            if (data?.payroll_email) {
                setPayrollEmail(data.payroll_email);
            }
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!company?.id) throw new Error('Company info not found');
            await base44.entities.CompanyInfo.update(company.id, {
                payroll_email: payrollEmail,
                last_updated: new Date().toISOString(),
            });
        },
        onSuccess: () => {
            toast.success('Lohnbüro-Email gespeichert');
            setIsEditing(false);
        },
        onError: (err) => {
            toast.error('Fehler: ' + err.message);
        },
    });

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
                    <p className="text-xs text-amber-600/80 mt-1">Bitte trage zuerst Firmeninformationen in den Betriebsdaten ein.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-4 bg-card border-border">
            <div className="space-y-4">
                <div>
                    <Label htmlFor="payroll_email" className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4" />
                        Lohnbüro-Email
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                        Diese Email-Adresse erhält die monatlichen Zeiterfassungs-Reports
                    </p>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Input
                                id="payroll_email"
                                type="email"
                                value={payrollEmail}
                                onChange={(e) => setPayrollEmail(e.target.value)}
                                placeholder="payroll@example.com"
                                className="flex-1"
                            />
                            <Button
                                size="sm"
                                onClick={() => updateMutation.mutate()}
                                disabled={updateMutation.isPending || !payrollEmail}
                                className="bg-green-600 hover:bg-green-700 gap-2"
                            >
                                <Check className="w-4 h-4" />
                                {updateMutation.isPending ? 'Speichert...' : 'Speichern'}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setIsEditing(false);
                                    if (company.payroll_email) {
                                        setPayrollEmail(company.payroll_email);
                                    }
                                }}
                            >
                                Abbrechen
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm">
                                {payrollEmail || '(nicht konfiguriert)'}
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsEditing(true)}
                            >
                                Bearbeiten
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}