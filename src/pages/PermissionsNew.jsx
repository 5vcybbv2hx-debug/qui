import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PERMISSION_REGISTRY, STANDARD_ROLES, PERMISSION_LEVELS } from '@/lib/permissionRegistry';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Search, ChevronDown, ChevronUp, Save, RotateCcw, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function PermissionsNew() {
  const permissions = usePermissions();
  const queryClient = useQueryClient();

  // ──── State ────
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [localPermissions, setLocalPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // ──── Queries ────
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter({ is_active: true }),
  });

  const filteredEmployees = useMemo(
    () => employees.filter(e => 
      e.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [employees, searchQuery]
  );

  // ──── Mutations ────
  const updateMutation = useMutation({
    mutationFn: async ({ employeeId, permissions }) => {
      await base44.entities.Employee.update(employeeId, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setHasChanges(false);
      toast.success('✓ Berechtigungen gespeichert');
    },
    onError: (err) => {
      toast.error('✗ Fehler beim Speichern: ' + err.message);
    },
  });

  // ──── Handlers ────
  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setLocalPermissions(emp.permissions || {});
    setHasChanges(false);
  };

  const handlePermissionChange = (key, level) => {
    const newPerms = { ...localPermissions };
    
    if (level === 'none') {
      delete newPerms[key];
    } else {
      newPerms[key] = level;
    }
    
    setLocalPermissions(newPerms);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!selectedEmployee) return;
    updateMutation.mutate({
      employeeId: selectedEmployee.id,
      permissions: localPermissions,
    });
  };

  const handleReset = () => {
    setLocalPermissions(selectedEmployee?.permissions || {});
    setHasChanges(false);
  };

  const handleApplyRole = (roleName) => {
    const role = STANDARD_ROLES[roleName];
    if (role) {
      setLocalPermissions({ ...role.permissions });
      setHasChanges(true);
    }
  };

  const handleCopyFrom = async (sourceEmp) => {
    setLocalPermissions({ ...(sourceEmp.permissions || {}) });
    setHasChanges(true);
    toast.success(`✓ Berechtigungen von ${sourceEmp.name} kopiert`);
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // ──── Permission Check ────
  if (!permissions.isManager) {
    return <PermissionDenied message="Nur Manager können Berechtigungen verwalten." />;
  }

  const categories = {};
  Object.values(PERMISSION_REGISTRY).forEach(page => {
    const cat = page.category || 'Sonstige';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(page);
  });

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
            Berechtigungsverwaltung
          </h1>
          <p className="text-muted-foreground">
            Granulare Rechtevergabe auf Seiten-, Unterbereichs- und Aktionsebene
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* ──── MITARBEITER-AUSWAHL (Sidebar auf Desktop, oben auf Mobile) ──── */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border sticky top-24 md:top-4 z-20">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm">Mitarbeiter auswählen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-sm"
                  icon={<Search className="w-4 h-4" />}
                />
                
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {filteredEmployees.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Kein Mitarbeiter gefunden
                    </p>
                  ) : (
                    filteredEmployees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => handleSelectEmployee(emp)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-sm transition-all text-xs sm:text-sm',
                          selectedEmployee?.id === emp.id
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'bg-secondary/50 text-foreground hover:bg-secondary'
                        )}
                      >
                        <div className="font-medium truncate">{emp.name}</div>
                        <div className="text-[10px] opacity-70">{emp.role}</div>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ──── BERECHTIGUNGEN (Main Panel) ──── */}
          <div className="lg:col-span-3">
            {!selectedEmployee ? (
              <Card className="bg-card border-border text-center py-12">
                <div className="text-muted-foreground">
                  <p className="text-sm">Wähle einen Mitarbeiter aus, um Berechtigungen zu verwalten</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* ──── EMPLOYEE HEADER ──── */}
                <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-foreground">
                          {selectedEmployee.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedEmployee.role} • {selectedEmployee.email || 'Keine E-Mail'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ──── QUICK ACTIONS ──── */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Schnellaktionen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(STANDARD_ROLES).map(([key, role]) => (
                        <Button
                          key={key}
                          variant="outline"
                          size="sm"
                          onClick={() => handleApplyRole(key)}
                          className="text-xs"
                        >
                          {role.displayName}
                        </Button>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-border">
                      <Label className="text-xs mb-2 block">Berechtigungen von anderem kopieren</Label>
                      <Select onValueChange={(val) => {
                        const emp = employees.find(e => e.id === val);
                        if (emp) handleCopyFrom(emp);
                      }}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Mitarbeiter wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {employees
                            .filter(e => e.id !== selectedEmployee.id)
                            .map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* ──── PERMISSION SECTIONS ──── */}
                {Object.entries(categories).map(([category, pages]) => (
                  <div key={category}>
                    <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
                      {category}
                    </h3>
                    <div className="space-y-3">
                      {pages.map(page => (
                        <Card key={page.pageKey} className="bg-card border-border overflow-hidden">
                          <button
                            onClick={() => toggleSection(page.pageKey)}
                            className="w-full px-4 py-4 hover:bg-secondary/50 transition-colors flex items-center justify-between"
                          >
                            <div className="text-left">
                              <h4 className="font-semibold text-sm text-foreground">{page.displayName}</h4>
                              <p className="text-xs text-muted-foreground">{page.description}</p>
                            </div>
                            {expandedSections[page.pageKey] ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                            )}
                          </button>

                          {expandedSections[page.pageKey] && (
                            <CardContent className="pt-0 border-t border-border/50">
                              <div className="space-y-3 pt-4">
                                {Object.entries(page.sections).map(([sectionKey, section]) => (
                                  <div
                                    key={section.key}
                                    className="p-3 bg-secondary/30 rounded-lg border border-border/50"
                                  >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">
                                          {section.displayName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {section.description}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Permission Level Selection */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                                      <div className="flex-1">
                                        <Select
                                          value={localPermissions[section.key] || 'none'}
                                          onValueChange={(val) =>
                                            handlePermissionChange(section.key, val)
                                          }
                                        >
                                          <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">
                                              ✗ Kein Zugriff
                                            </SelectItem>
                                            <SelectItem value="view">
                                              👁 Lesen (Ansicht)
                                            </SelectItem>
                                            <SelectItem value="edit">
                                              ✎ Bearbeiten
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {localPermissions[section.key] === 'edit' && '✓ Bearbeiten'}
                                        {localPermissions[section.key] === 'view' && '✓ Lesen'}
                                        {!localPermissions[section.key] && '✗ Gesperrt'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}

                {/* ──── SAVE/RESET BUTTONS ──── */}
                {hasChanges && (
                  <div className="fixed bottom-24 sm:bottom-8 left-4 right-4 sm:left-auto sm:right-8 z-50">
                    <Card className="bg-card border-primary/50 shadow-2xl">
                      <CardContent className="p-4 flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleReset}
                          className="flex-1 sm:flex-none"
                          disabled={updateMutation.isPending}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Zurücksetzen
                        </Button>
                        <Button
                          onClick={handleSave}
                          className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
                          disabled={updateMutation.isPending}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {updateMutation.isPending ? 'Speichert...' : 'Speichern'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}