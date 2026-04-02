import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PersonalBogenForm from '@/components/employees/PersonalBogenForm';
import ShortNameEditor from '@/components/employees/ShortNameEditor';
import DocumentManager from '@/components/employees/DocumentManager';
import { calculateCompletion, isComplete } from '@/lib/employeeCompleteness';
import { createPageUrl } from '@/utils';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

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
  const isCurrentUser = currentUser?.email === employee?.email || currentUser?.created_by === employee?.email;
  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'Manager';
  const canEdit = isCurrentUser || isManager;
  const canEditShortName = isManager;

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
        <Tabs defaultValue="personalbogen" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
            <TabsTrigger value="personalbogen" className="flex items-center gap-2">
              {isPersonalBogenComplete ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-600" />
              )}
              <span className="hidden sm:inline">Personalbogen</span>
              <span className="sm:hidden">Daten</span>
            </TabsTrigger>
            <TabsTrigger value="dokumente">
              Dokumente
            </TabsTrigger>
          </TabsList>

          {/* Personalbogen Tab */}
          <TabsContent value="personalbogen" className="space-y-6 mt-6">
            <PersonalBogenForm
              employee={employee}
              onSave={(data) => updateMutation.mutate(data)}
              isLoading={updateMutation.isPending}
              isEditable={canEdit}
            />
          </TabsContent>

          {/* Dokumente Tab */}
          <TabsContent value="dokumente" className="space-y-6 mt-6">
            <DocumentManager
              employeeId={employee.id}
              employeeName={employee.name}
              canEdit={canEdit}
            />
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