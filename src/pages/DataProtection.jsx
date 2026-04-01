import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PrivacyCenter from '@/components/privacy/PrivacyCenter';
import { usePermissions } from '@/components/auth/usePermissions';
import { Shield, Lock, Eye, Trash2 } from 'lucide-react';

export default function DataProtection() {
  const permissions = usePermissions();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-foreground">Datenschutz & Ihre Rechte</h1>
          </div>
          <p className="text-muted-foreground">
            Ihre Daten sind schützenswert. Hier erfahren Sie, wie wir sie verarbeiten und welche Rechte Sie haben.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <Eye className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-sm">Daten einsehen</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Alle Ihre Daten exportieren</p>
              <Button variant="outline" size="sm" className="w-full text-xs h-9">
                Exportieren
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <Lock className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-sm">Berichtigung</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Fehlerhafte Daten korrigieren</p>
              <Button variant="outline" size="sm" className="w-full text-xs h-9">
                Bearbeiten
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-sm">Löschung</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Konto löschen lassen</p>
              <Button variant="outline" size="sm" className="w-full text-xs h-9">
                Anfordern
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-sm">Kontakt</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Datenschutz-Fragen</p>
              <Button variant="outline" size="sm" className="w-full text-xs h-9">
                Kontaktieren
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Privacy Center */}
        <PrivacyCenter />

        {/* Admin Section */}
        {permissions.isManager && (
          <div className="mt-12 pt-12 border-t border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Verwaltung (Admin)</h2>
            
            <Tabs defaultValue="access_logs" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="access_logs">Zugriffsprotokolle</TabsTrigger>
                <TabsTrigger value="deletion_requests">Löschanfragen</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>

              <TabsContent value="access_logs" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Zugriffsprotokolle</CardTitle>
                    <CardDescription>
                      Alle Zugriffe auf sensible Daten werden protokolliert für Audit-Zwecke.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertDescription>
                        Zugriffsprotokolle werden automatisch nach 90 Tagen gelöscht, um Datenschutz zu gewährleisten.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deletion_requests" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ausstehende Löschanfragen</CardTitle>
                    <CardDescription>
                      Anträge zur Löschung von Benutzerkonten (Art. 17 DSGVO).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertDescription>
                        Keine ausstehenden Löschanfragen. Diese müssen innerhalb von 30 Tagen verarbeitet werden.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">DSGVO Compliance-Checkliste</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={true} disabled className="w-4 h-4 accent-green-600" />
                      <span>Datenschutzhinweise in der App vorhanden</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={true} disabled className="w-4 h-4 accent-green-600" />
                      <span>Zugriffskontrolle implementiert</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={true} disabled className="w-4 h-4 accent-green-600" />
                      <span>Audit-Logs aktiv</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={true} disabled className="w-4 h-4 accent-green-600" />
                      <span>DSGVO-Anfragen (Art. 15-22) möglich</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={true} disabled className="w-4 h-4 accent-green-600" />
                      <span>Datenminimierung umgesetzt</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}