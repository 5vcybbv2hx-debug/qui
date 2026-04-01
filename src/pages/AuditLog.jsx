import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/components/auth/usePermissions';

export default function AuditLog() {
  const permissions = usePermissions();
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['accessLogs'],
    queryFn: () => base44.entities.AccessLog.list('-timestamp', 500),
    enabled: permissions.isAdmin || permissions.isManager
  });

  if (!permissions.isAdmin && !permissions.isManager) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 border-red-500/20 bg-red-500/10">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <h2 className="font-semibold text-red-400 mb-1">Zugriff verweigert</h2>
              <p className="text-sm text-red-300">Nur Administratoren und Manager können das Audit-Log einsehen.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const filtered = logs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterUser && !log.user_email.toLowerCase().includes(filterUser.toLowerCase())) return false;
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    return true;
  });

  const getActionColor = (action) => {
    const colors = {
      'view_document': 'bg-blue-500/20 text-blue-400',
      'view_employee': 'bg-cyan-500/20 text-cyan-400',
      'update_employee': 'bg-purple-500/20 text-purple-400',
      'delete_document': 'bg-red-500/20 text-red-400',
      'export_data': 'bg-green-500/20 text-green-400',
    };
    return colors[action] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusColor = (status) => {
    return status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';
  };

  const handleExport = () => {
    const csv = [
      ['Datum', 'Nutzer', 'Aktion', 'Ressource', 'Status', 'Notizen'].join(','),
      ...filtered.map(log =>
        [
          new Date(log.timestamp).toLocaleString('de-DE'),
          log.user_email,
          log.action,
          log.resource_type,
          log.status,
          log.notes || ''
        ].map(v => `"${v}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Audit-Log</h1>
          <p className="text-muted-foreground">Protokoll aller Zugriffe und Änderungen an sensiblen Daten</p>
        </div>

        {/* Filters */}
        <Card className="p-6 bg-card border-border mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Filter</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Aktion</label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="view_document">Dokument ansehen</SelectItem>
                  <SelectItem value="view_employee">Mitarbeiter ansehen</SelectItem>
                  <SelectItem value="update_employee">Mitarbeiter ändern</SelectItem>
                  <SelectItem value="delete_document">Dokument löschen</SelectItem>
                  <SelectItem value="export_data">Daten exportieren</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-2">Nutzer</label>
              <Input
                placeholder="E-Mail..."
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="bg-secondary"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-2">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="success">Erfolgreich</SelectItem>
                  <SelectItem value="denied">Abgelehnt</SelectItem>
                  <SelectItem value="error">Fehler</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <Download className="w-4 h-4" />
                Exportieren
              </Button>
            </div>
          </div>
        </Card>

        {/* Logs */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground">Lädt...</p>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center bg-card border-border">
              <p className="text-muted-foreground">Keine Einträge gefunden</p>
            </Card>
          ) : (
            filtered.map((log) => (
              <Card key={log.id} className="p-4 bg-card border-border hover:bg-accent/50 transition-colors">
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Datum</p>
                    <p className="font-mono text-sm text-foreground">
                      {new Date(log.timestamp).toLocaleString('de-DE', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Nutzer</p>
                    <p className="text-sm text-foreground truncate">{log.user_email}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Aktion</p>
                    <Badge className={getActionColor(log.action)}>
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Ressource</p>
                    <p className="text-sm text-foreground">{log.resource_type}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(log.status)}>
                      {log.status}
                    </Badge>
                  </div>

                  <div className="hidden sm:block">
                    {log.notes && (
                      <p className="text-xs text-muted-foreground truncate" title={log.notes}>
                        {log.notes}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          <Card className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground mb-1">Insgesamt</p>
            <p className="text-2xl font-bold text-foreground">{logs.length}</p>
          </Card>
          <Card className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground mb-1">Erfolgreiche Zugriffe</p>
            <p className="text-2xl font-bold text-green-400">{logs.filter(l => l.status === 'success').length}</p>
          </Card>
          <Card className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground mb-1">Abgelehnt</p>
            <p className="text-2xl font-bold text-red-400">{logs.filter(l => l.status === 'denied').length}</p>
          </Card>
          <Card className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground mb-1">Eindeutige Nutzer</p>
            <p className="text-2xl font-bold text-blue-400">{new Set(logs.map(l => l.user_email)).size}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}