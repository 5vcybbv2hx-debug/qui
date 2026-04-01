import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmployeeCompletenessOverview from '@/components/employees/EmployeeCompletenessOverview';
import { usePermissions } from '@/components/auth/usePermissions';
import { createPageUrl } from '@/utils';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeesImproved() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  const [showNewEmployeeDialog, setShowNewEmployeeDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Aushilfe',
    contract_type: 'Minijob',
    email: '',
    phone: ''
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: (newEmployee) => {
      toast.success('Mitarbeiter angelegt');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowNewEmployeeDialog(false);
      setFormData({
        name: '',
        role: 'Aushilfe',
        contract_type: 'Minijob',
        email: '',
        phone: ''
      });
      // Optionally navigate to new employee profile
      navigate(createPageUrl('EmployeeProfile', { id: newEmployee.id }));
    },
    onError: (error) => {
      toast.error('Fehler: ' + error.message);
    }
  });

  const handleCreateEmployee = () => {
    if (!formData.name) {
      toast.error('Name erforderlich');
      return;
    }
    createMutation.mutate(formData);
  };

  // Only managers/admins can create employees
  if (!permissions.isManager) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Nur Manager und Admin können auf diese Seite zugreifen.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mitarbeiterverwaltung</h1>
            <p className="text-muted-foreground mt-1">Verwaltung von Personalbögen und Mitarbeiterdaten</p>
          </div>
          <Button
            onClick={() => setShowNewEmployeeDialog(true)}
            className="h-11 gap-2"
          >
            <Plus className="w-5 h-5" />
            Neuer Mitarbeiter
          </Button>
        </div>

        {/* Überblick */}
        <EmployeeCompletenessOverview />

        {/* New Employee Dialog */}
        <Dialog open={showNewEmployeeDialog} onOpenChange={setShowNewEmployeeDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Neuen Mitarbeiter anlegen</DialogTitle>
              <DialogDescription>
                Grunddaten eingeben. Der Personalbogen kann später ausgefüllt werden.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Vollständiger Name"
                  disabled={createMutation.isPending}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="max@example.com"
                  disabled={createMutation.isPending}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon (optional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+49 123 456789"
                  disabled={createMutation.isPending}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Position</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger id="role" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aushilfe">Aushilfe</SelectItem>
                    <SelectItem value="Vollzeit">Vollzeit</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract">Vertragsart</Label>
                <Select value={formData.contract_type} onValueChange={(value) => setFormData(prev => ({ ...prev, contract_type: value }))}>
                  <SelectTrigger id="contract" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Minijob">Minijob</SelectItem>
                    <SelectItem value="Teilzeit">Teilzeit</SelectItem>
                    <SelectItem value="Vollzeit">Vollzeit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowNewEmployeeDialog(false)}
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleCreateEmployee}
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wird erstellt...
                    </>
                  ) : (
                    'Anlegen'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}