import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PayrollReportSender({ pdfUrl, year, month }) {
    const [showDialog, setShowDialog] = useState(false);

    const { data: company } = useQuery({
        queryKey: ['company-info'],
        queryFn: async () => {
            const res = await base44.entities.CompanyInfo.list('last_updated', 1);
            return res?.[0] || null;
        },
    });

    const sendMutation = useMutation({
        mutationFn: async () => {
            const res = await base44.functions.invoke('sendPayrollReport', {
                year,
                month,
                pdf_url: pdfUrl,
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(`✉️ Report versendet an ${data.recipient}`);
            setShowDialog(false);
        },
        onError: (err) => {
            toast.error('Fehler: ' + (err.response?.data?.error || err.message));
        },
    });

    if (!company?.payroll_email) {
        return (
            <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="pt-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-600">Lohnbüro-Email nicht konfiguriert</p>
                        <p className="text-xs text-amber-600/80 mt-1">
                            Bitte trage die Email-Adresse des Lohnbüros in den Betriebsdaten ein (Einstellungen → Betriebsdaten).
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <AlertDialogTrigger asChild>
                <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
                    <Mail className="w-4 h-4" />
                    Zum Lohnbüro versenden
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-amber-500" />
                        Report versendet?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Der Monatsbericht wird als PDF an <strong>{company.payroll_email}</strong> versendet.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 space-y-1">
                    <p><strong>Empfänger:</strong> {company.payroll_email}</p>
                    <p><strong>Von:</strong> {company.company_name}</p>
                    <p><strong>Mit:</strong> Professionelle HTML-Signatur & Logo</p>
                </div>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700"
                >
                    {sendMutation.isPending ? (
                        <>
                            <Loader className="w-4 h-4 animate-spin mr-2" />
                            Versende...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4 mr-2" />
                            Ja, versenden
                        </>
                    )}
                </AlertDialogAction>
            </AlertDialogContent>
        </AlertDialog>
    );
}