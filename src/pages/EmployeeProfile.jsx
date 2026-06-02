import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { STALE } from '@/lib/queryUtils';;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PersonalBogenForm from '@/components/employees/PersonalBogenForm';
import ShortNameEditor from '@/components/employees/ShortNameEditor';
import DocumentManager from '@/components/employees/DocumentManager';
import { calculateCompletion, isComplete } from '@/lib/employeeCompleteness';
import { usePermissions } from '@/components/auth/usePermissions';
import { createPageUrl } from '@/utils';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isManager } = usePermissions();
  const [formData, setFormData] = React.useState({});

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
    staleTime: STALE.SLOW,
  });

  // Fetch employee
  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      return base44.entities.Employee.get(id);
    },
    enabled: !!id
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      toast.success('Personalbogen gespeichert');
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error) => {
      toast.error('Fehler beim Speichern: ' + error.message);
    }
  });

  // Check permissions
  const isCurrentUser = currentUser?.email === employee?.email;
  const canEdit = isCurrentUser || isManager;
  const canEditShortName = isManager;

  // Initialize formData when employee loads
  React.useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        phone: employee.phone || '',
        email: employee.email || '',
        street: employee.street || '',
        postal_code: employee.postal_code || '',
        city: employee.city || '',
        birthday: employee.birthday || '',
        nationality: employee.nationality || '',
        entry_date: employee.entry_date || '',
        contract_type: employee.contract_type || '',
        hourly_rate: employee.hourly_rate || '',
        weekly_hours: employee.weekly_hours || '',
        vacation_days_per_year: employee.vacation_days_per_year || '',
        tax_id: employee.tax_id || '',
        pension_number: employee.pension_number || '',
        health_insurance: employee.health_insurance || '',
        pension_exemption: employee.pension_exemption || false,
        has_main_job: employee.has_main_job || false,
        has_other_minijob: employee.has_other_minijob || false,
        iban: employee.iban || '',
        bic: employee.bic || '',
        bank_name: employee.bank_name || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
      });
    }
  }, [employee]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-4 md:p-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <Alert className="border-red-500/20 bg-red-50 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>Mitarbeiter nicht gefunden</AlertDescription>
        </Alert>
      </div>
    );
  }

  const completion = calculateCompletion(employee);
  const isPersonalBogenComplete = isComplete(employee);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{employee.name}</h1>
            <p className="text-sm text-muted-foreground">
              {employee.role} {employee.employee_number && `• ${employee.employee_number}`}
            </p>
          </div>
          {isPersonalBogenComplete && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Vollständig</span>
            </div>
          )}
        </div>

        {/* Status Banner */}
        {!isPersonalBogenComplete && (
          <Alert className="mb-6 border-orange-500/20 bg-orange-50 dark:bg-orange-950/20">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700 dark:text-orange-400">
              Personalbogen zu {completion}% vollständig. Bitte fehlende Informationen nachtragen.
            </AlertDescription>
          </Alert>
        )}

        {/* Short Name Editor */}
        <ShortNameEditor
          employee={employee}
          isManager={canEditShortName}
          currentUser={currentUser}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['employee', id] })}
        />

        {/* Content Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">Allgemein</TabsTrigger>
            <TabsTrigger value="contract">Vertrag</TabsTrigger>
            <TabsTrigger value="tax">Steuern</TabsTrigger>
            <TabsTrigger value="bank">Bankdaten</TabsTrigger>
            <TabsTrigger value="emergency">Notfall</TabsTrigger>
          </TabsList>

          {/* Allgemein Tab */}
          <TabsContent value="general" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Persönliche Daten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={formData.name} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <Input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Geburtstag</Label>
                    <Input
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nationalität</Label>
                    <Input
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Eintrittsdatum</Label>
                    <Input
                      type="date"
                      value={formData.entry_date}
                      onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Straße</Label>
                    <Input
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PLZ</Label>
                      <Input
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stadt</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
                {canEdit && <Button onClick={() => updateMutation.mutate(formData)} className="w-full"><Save className="w-4 h-4 mr-2" />Speichern</Button>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vertrag Tab */}
          <TabsContent value="contract" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Vertragsdaten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vertragsart</Label>
                    <Input
                      value={formData.contract_type}
                      onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stundensatz (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wochenstunden</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.weekly_hours}
                      onChange={(e) => setFormData({ ...formData, weekly_hours: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Urlaubstage pro Jahr</Label>
                    <Input
                      type="number"
                      value={formData.vacation_days_per_year}
                      onChange={(e) => setFormData({ ...formData, vacation_days_per_year: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                {canEdit && <Button onClick={() => updateMutation.mutate(formData)} className="w-full"><Save className="w-4 h-4 mr-2" />Speichern</Button>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Steuern Tab */}
          <TabsContent value="tax" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Steuer & Soziales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Steuer-ID</Label>
                    <Input
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rentenversicherungsnummer</Label>
                    <Input
                      value={formData.pension_number}
                      onChange={(e) => setFormData({ ...formData, pension_number: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Krankenkasse</Label>
                    <Input
                      value={formData.health_insurance}
                      onChange={(e) => setFormData({ ...formData, health_insurance: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.pension_exemption}
                        onChange={(e) => setFormData({ ...formData, pension_exemption: e.target.checked })}
                        disabled={!canEdit}
                      />
                      Rentenpflicht-Befreiung
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.has_main_job}
                        onChange={(e) => setFormData({ ...formData, has_main_job: e.target.checked })}
                        disabled={!canEdit}
                      />
                      Versicherungspflichtige Hauptbeschäftigung
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.has_other_minijob}
                        onChange={(e) => setFormData({ ...formData, has_other_minijob: e.target.checked })}
                        disabled={!canEdit}
                      />
                      Weitere geringfügige Beschäftigung
                    </Label>
                  </div>
                </div>
                {canEdit && <Button onClick={() => updateMutation.mutate(formData)} className="w-full"><Save className="w-4 h-4 mr-2" />Speichern</Button>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bankdaten Tab */}
          <TabsContent value="bank" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Bankverbindung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bankname</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>BIC</Label>
                  <Input
                    value={formData.bic}
                    onChange={(e) => setFormData({ ...formData, bic: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                {canEdit && <Button onClick={() => updateMutation.mutate(formData)} className="w-full"><Save className="w-4 h-4 mr-2" />Speichern</Button>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notfall Tab */}
          <TabsContent value="emergency" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notfallkontakt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                {canEdit && <Button onClick={() => updateMutation.mutate(formData)} className="w-full"><Save className="w-4 h-4 mr-2" />Speichern</Button>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Zuletzt aktualisiert: {new Date(employee.updated_date).toLocaleDateString('de-DE')}
          </p>
        </div>
      </div>
    </div>
  );
}