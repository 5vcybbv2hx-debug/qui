import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Building2, Users, FileText, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function AdminDashboard() {
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: tenants = [] } = useQuery({
        queryKey: ['tenants'],
        queryFn: () => base44.entities.Tenant.list('-created_date')
    });

    const { data: invoices = [] } = useQuery({
        queryKey: ['invoices'],
        queryFn: () => base44.entities.Invoice.list('-invoice_date')
    });

    // Stats
    const activeTenants = tenants.filter(t => t.status === 'aktiv').length;
    const totalRevenue = tenants.reduce((sum, t) => sum + (t.monthly_price || 0), 0);
    const pendingInvoices = invoices.filter(i => i.status === 'ausstehend').length;
    const overdueInvoices = invoices.filter(i => i.status === 'überfällig').length;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                            Verwaltungs-Dashboard
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {user?.full_name ? `Willkommen, ${user.full_name}` : 'Zentrale Verwaltung aller Betriebe'}
                        </p>
                    </div>
                    <Link to={createPageUrl('TenantForm')}>
                        <Button className="bg-amber-600 hover:bg-amber-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Neuer Betrieb
                        </Button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Aktive Betriebe</p>
                                    <p className="text-3xl font-bold text-foreground">{activeTenants}</p>
                                </div>
                                <Building2 className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Monatlicher Umsatz</p>
                                    <p className="text-3xl font-bold text-foreground">{totalRevenue.toFixed(2)}€</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Ausstehende Rechnungen</p>
                                    <p className="text-3xl font-bold text-foreground">{pendingInvoices}</p>
                                </div>
                                <FileText className="w-8 h-8 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Überfällig</p>
                                    <p className="text-3xl font-bold text-red-600">{overdueInvoices}</p>
                                </div>
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Betriebe */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-foreground mb-4">Alle Betriebe</h2>
                    <div className="grid gap-4">
                        {tenants.length === 0 ? (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                    <p className="text-muted-foreground">Noch keine Betriebe hinzugefügt</p>
                                </CardContent>
                            </Card>
                        ) : (
                            tenants.map(tenant => (
                                <Link key={tenant.id} to={createPageUrl('TenantDetail')} state={{ tenantId: tenant.id }}>
                                    <Card className="hover:border-amber-500/50 transition-colors">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-lg font-semibold text-foreground">
                                                            {tenant.company_name}
                                                        </h3>
                                                        <Badge variant={tenant.status === 'aktiv' ? 'default' : 'secondary'}>
                                                            {tenant.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-3">
                                                        Owner: {tenant.owner_name} ({tenant.owner_email})
                                                    </p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Plan</p>
                                                            <p className="font-medium text-foreground capitalize">{tenant.subscription_plan}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Monatlich</p>
                                                            <p className="font-medium text-foreground">{tenant.monthly_price || 0}€</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Gültig bis</p>
                                                            <p className="font-medium text-foreground">
                                                                {tenant.subscription_end_date 
                                                                    ? format(new Date(tenant.subscription_end_date), 'dd.MM.yyyy', { locale: de })
                                                                    : '-'
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <Button variant="outline" size="sm" className="w-full">
                                                                Details
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Letzte Rechnungen */}
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-4">Letzte Rechnungen</h2>
                    <div className="grid gap-4">
                        {invoices.length === 0 ? (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                    <p className="text-muted-foreground">Noch keine Rechnungen</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-3 px-4 font-semibold text-foreground">Rechnung</th>
                                            <th className="text-left py-3 px-4 font-semibold text-foreground">Betrieb</th>
                                            <th className="text-left py-3 px-4 font-semibold text-foreground">Datum</th>
                                            <th className="text-left py-3 px-4 font-semibold text-foreground">Betrag</th>
                                            <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.slice(0, 10).map(invoice => (
                                            <tr key={invoice.id} className="border-b border-border hover:bg-accent/50">
                                                <td className="py-3 px-4">{invoice.invoice_number}</td>
                                                <td className="py-3 px-4">{invoice.company_name}</td>
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
                    </div>
                </div>
            </div>
        </div>
    );
}