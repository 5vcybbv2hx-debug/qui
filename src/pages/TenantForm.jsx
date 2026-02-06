import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function TenantForm() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        company_name: '',
        company_email: '',
        phone: '',
        address: '',
        owner_name: '',
        owner_email: '',
        subscription_plan: 'starter',
        monthly_price: '0'
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Tenant.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['tenants']);
            toast.success('Betrieb erstellt');
            navigate(createPageUrl('AdminDashboard'));
        },
        onError: (error) => {
            toast.error('Fehler beim Erstellen: ' + error.message);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate({
            ...formData,
            monthly_price: parseFloat(formData.monthly_price),
            subscription_start_date: new Date().toISOString().split('T')[0]
        });
    };

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Neuen Betrieb hinzufügen</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Betrieb Info */}
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-4">Betriebsinformation</h3>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="company_name">Name des Betriebs *</Label>
                                        <Input
                                            id="company_name"
                                            value={formData.company_name}
                                            onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="company_email">Email</Label>
                                            <Input
                                                id="company_email"
                                                type="email"
                                                value={formData.company_email}
                                                onChange={(e) => setFormData({...formData, company_email: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="phone">Telefon</Label>
                                            <Input
                                                id="phone"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="address">Adresse</Label>
                                        <Input
                                            id="address"
                                            value={formData.address}
                                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Owner Info */}
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-4">Betrieb-Owner</h3>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="owner_name">Name *</Label>
                                        <Input
                                            id="owner_name"
                                            value={formData.owner_name}
                                            onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="owner_email">Email *</Label>
                                        <Input
                                            id="owner_email"
                                            type="email"
                                            value={formData.owner_email}
                                            onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Subscription */}
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-4">Abo</h3>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="subscription_plan">Plan</Label>
                                        <Select value={formData.subscription_plan} onValueChange={(v) => setFormData({...formData, subscription_plan: v})}>
                                            <SelectTrigger id="subscription_plan">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="starter">Starter - €19/Monat</SelectItem>
                                                <SelectItem value="professional">Professional - €49/Monat</SelectItem>
                                                <SelectItem value="enterprise">Enterprise - €99/Monat</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="monthly_price">Monatliche Gebühr (€)</Label>
                                        <Input
                                            id="monthly_price"
                                            type="number"
                                            step="0.01"
                                            value={formData.monthly_price}
                                            onChange={(e) => setFormData({...formData, monthly_price: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate(createPageUrl('AdminDashboard'))}
                                    className="flex-1"
                                >
                                    Abbrechen
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                                >
                                    {createMutation.isPending ? 'Erstellen...' : 'Betrieb erstellen'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}