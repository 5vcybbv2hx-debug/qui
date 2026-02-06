import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Link as LinkIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

export default function TenantDetail() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const tenantId = location.state?.tenantId;
    const [editMode, setEditMode] = useState(false);

    const { data: tenant, isLoading } = useQuery({
        queryKey: ['tenant', tenantId],
        queryFn: () => base44.entities.Tenant.list({ id: tenantId }).then(results => results[0]),
        enabled: !!tenantId
    });

    const { data: invoices = [] } = useQuery({
        queryKey: ['invoices', tenantId],
        queryFn: () => base44.entities.Invoice.filter({ tenant_id: tenantId }, '-invoice_date'),
        enabled: !!tenantId
    });

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.Tenant.update(tenantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['tenant', tenantId]);
            setEditMode(false);
            toast.success('Betrieb aktualisiert');
        }
    });

    const createInvoiceMutation = useMutation({
        mutationFn: (data) => base44.entities.Invoice.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['invoices', tenantId]);
            toast.success('Rechnung erstellt');
        }
    });

    if (isLoading) return <div className="p-4">Lädt...</div>;
    if (!tenant) return <div className="p-4">Betrieb nicht gefunden</div>;

    const handleCreateInvoice = () => {
        const invoiceNumber = `INV-${Date.now()}`;
        const invoiceDate = new Date().toISOString().split('T')[0];
        const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        createInvoiceMutation.mutate({
            tenant_id: tenantId,
            company_name: tenant.company_name,
            invoice_number: invoiceNumber,
            invoice_date: invoiceDate,
            due_date: dueDate,
            amount: tenant.monthly_price,
            description: `Abo-Gebühren ${tenant.subscription_plan}`
        });
    };

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate(createPageUrl('AdminDashboard'))}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Zurück zum Dashboard
                </button>

                {/* Tenant Info */}
                <Card className="mb-8">
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="text-2xl">{tenant.company_name}</CardTitle>
                            <Badge className="mt-2">{tenant.status}</Badge>
                        </div>
                        <Button
                            variant={editMode ? 'outline' : 'default'}
                            onClick={() => setEditMode(!editMode)}
                        >
                            {editMode ? 'Abbrechen' : 'Bearbeiten'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {editMode ? (
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                updateMutation.mutate({
                                    company_name: tenant.company_name,
                                    company_email: tenant.company_email,
                                    phone: tenant.phone,
                                    address: tenant.address,
                                    subscription_plan: tenant.subscription_plan,
                                    monthly_price: tenant.monthly_price
                                });
                            }} className="space-y-4">
                                <div>
                                    <Label>Email</Label>
                                    <Input
                                        value={tenant.company_email || ''}
                                        onChange={(e) => {
                                            // Update would go here in real app
                                        }}
                                    />
                                </div>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? 'Speichert...' : 'Speichern'}
                                </Button>
                            </form>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="font-medium text-foreground">{tenant.company_email || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Telefon</p>
                                    <p className="font-medium text-foreground">{tenant.phone || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Adresse</p>
                                    <p className="font-medium text-foreground">{tenant.address || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Owner</p>
                                    <p className="font-medium text-foreground">{tenant.owner_name}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Abo Info */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Abo-Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Plan</p>
                                <p className="text-lg font-bold text-foreground capitalize">{tenant.subscription_plan}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Monatlich</p>
                                <p className="text-lg font-bold text-foreground">{tenant.monthly_price}€</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Start</p>
                                <p className="text-lg font-bold text-foreground">
                                    {tenant.subscription_start_date 
                                        ? format(new Date(tenant.subscription_start_date), 'dd.MM.yyyy', { locale: de })
                                        : '-'
                                    }
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Gültig bis</p>
                                <p className="text-lg font-bold text-foreground">
                                    {tenant.subscription_end_date 
                                        ? format(new Date(tenant.subscription_end_date), 'dd.MM.yyyy', { locale: de })
                                        : '-'
                                    }
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* App Link */}
                {tenant.app_url && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>App-Zugang</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <a
                                href={tenant.app_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <LinkIcon className="w-4 h-4" />
                                App öffnen
                            </a>
                        </CardContent>
                    </Card>
                )}

                {/* Rechnungen */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Rechnungen</CardTitle>
                        <Button
                            size="sm"
                            onClick={handleCreateInvoice}
                            disabled={createInvoiceMutation.isPending}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Neue Rechnung
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {invoices.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">Keine Rechnungen</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-3 px-4 font-semibold">Nummer</th>
                                            <th className="text-left py-3 px-4 font-semibold">Datum</th>
                                            <th className="text-left py-3 px-4 font-semibold">Betrag</th>
                                            <th className="text-left py-3 px-4 font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map(invoice => (
                                            <tr key={invoice.id} className="border-b border-border hover:bg-accent/50">
                                                <td className="py-3 px-4">{invoice.invoice_number}</td>
                                                <td className="py-3 px-4">
                                                    {format(new Date(invoice.invoice_date), 'dd.MM.yyyy', { locale: de })}
                                                </td>
                                                <td className="py-3 px-4 font-medium">{invoice.amount}€</td>
                                                <td className="py-3 px-4">
                                                    <Badge variant={
                                                        invoice.status === 'bezahlt' ? 'default' :
                                                        invoice.status === 'überfällig' ? 'destructive' :
                                                        'secondary'
                                                    }>
                                                        {invoice.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}