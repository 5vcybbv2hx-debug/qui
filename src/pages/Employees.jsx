import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ErrorFallback, useErrorHandler } from '@/components/error/ErrorHandler';
import { Plus, Pencil, Trash2, Phone, MessageCircle, Mail, UserPlus, ShoppingBag, Filter, Archive, ContactRound, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import EmployeeDeleteDialog from '@/components/employees/EmployeeDeleteDialog';
import EmployeePersonalFormExport from '@/components/employees/EmployeePersonalFormExport';
import RVBefreiungExport from '@/components/employees/RVBefreiungExport';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import PDFExportButton from '@/components/export/PDFExportButton';
import PermissionsManager from '@/components/employees/PermissionsManager';
import PersonalFormUploader from '@/components/employees/PersonalFormUploader';
import PersonalFormDigital from '@/components/employees/PersonalFormDigital';
import SalaryHistoryModal from '@/components/employees/SalaryHistoryModal';
import WorkTimeModelsManager from '@/components/employees/WorkTimeModelsManager';
import EmployeesCSVExport from '@/components/employees/EmployeesCSVExport';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { createNotification } from '@/utils/createNotification';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import SignaturePad from '@/components/employees/SignaturePad';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';

const COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
    '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e', '#64748b'
];

const HOURLY_RATES = {
    FULLTIME: 16.00, // Vollzeit/Teilzeit Standard
    MINIJOB: 15.00   // Minijob Standard
};

const roleColors = {
    'Aushilfe': 'bg-muted/80 text-muted-foreground border border-border',
    'Vollzeit': 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    'Manager':  'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    'Teilzeit': 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
};

export default function Employees() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [formData, setFormData] = useState({
        employee_number: '',
        name: '',
        short_name: '',
        role: 'Aushilfe',
        skills: [],
        contract_type: '',
        hourly_rate: '',
        vacation_days_per_year: '',
        color: COLORS[0],
        phone: '',
        email: '',
        birthday: '',
        birth_name: '',
        birth_place: '',
        nationality: '',
        entry_date: '',
        tshirt_size: '',
        pullover_size: '',
        street: '',
        postal_code: '',
        city: '',
        activity: '',
        education: '',
        weekly_hours: '',
        tax_id: '',
        pension_number: '',
        health_insurance: '',
        pension_exemption: false,
        has_main_job: false,
        has_other_minijob: false,
        other_minijob_details: '',
        bank_name: '',
        iban: '',
        bic: '',
        is_active: true
    });
    const [skillsFilter, setSkillsFilter] = useState([]);
    const [showInactive, setShowInactive] = useState(false);
    const [deleteDialogEmployee, setDeleteDialogEmployee] = useState(null);
    
    const { data: companyInfo } = useQuery({
        queryKey: ['company-info'],
        queryFn: async () => {
            const res = await base44.entities.CompanyInfo.list('-last_updated', 1);
            return res?.[0] || null;
        },
        staleTime: 10 * 60 * 1000
    });
    const whatsappGroupLink = companyInfo?.whatsapp_group_link || '';

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list('name', 500),
        staleTime: 2 * 60 * 1000,
    });

    const { data: currentUser } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me(),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    const { data: workTimeModels = [] } = useQuery({
        queryKey: ['work-time-models'],
        queryFn: () => base44.entities.WorkTimeModel.list('name'),
        staleTime: 30 * 60 * 1000, // 30 minutes
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Employee.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data, isOwnProfile, oldEmployee }) => {
            // Gehaltshistorie erstellen, wenn sich Stundensatz oder Vertragsart geändert hat
            if (permissions.isManager && oldEmployee && 
                (oldEmployee.hourly_rate !== data.hourly_rate || 
                 oldEmployee.contract_type !== data.contract_type)) {
                await base44.entities.SalaryHistory.create({
                    employee_id: id,
                    employee_name: data.name,
                    old_hourly_rate: oldEmployee.hourly_rate,
                    new_hourly_rate: data.hourly_rate,
                    old_contract_type: oldEmployee.contract_type,
                    new_contract_type: data.contract_type,
                    change_reason: data.salary_change_reason || 'Manuelle Anpassung',
                    effective_date: new Date().toISOString().split('T')[0],
                    changed_by: currentUser?.email || 'System'
                });
            }

            await base44.entities.Employee.update(id, data);
            
            // Benachrichtigung für Manager erstellen, wenn Mitarbeiter eigene Daten bearbeitet
            if (isOwnProfile && !permissions.isManager) {
                await createNotification({
                    type: 'employee_update',
                    title: 'Mitarbeiterdaten geändert',
                    message: `${data.name} hat seine/ihre Profildaten aktualisiert.`,
                    relatedId: id
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['salary-history'] });
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Employee.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        }
    });

    const openModal = (employee = null) => {
        if (employee) {
            setSelectedEmployee(employee);
            setFormData({
                employee_number: employee.employee_number || '',
                name: employee.name,
                short_name: employee.short_name || '',
                role: employee.role,
                skills: employee.skills || [],
                contract_type: employee.contract_type || '',
                hourly_rate: employee.hourly_rate || '',
                vacation_days_per_year: employee.vacation_days_per_year || '',
                color: employee.color || COLORS[0],
                phone: employee.phone || '',
                email: employee.email || '',
                birthday: employee.birthday || '',
                birth_name: employee.birth_name || '',
                birth_place: employee.birth_place || '',
                nationality: employee.nationality || '',
                entry_date: employee.entry_date || '',
                tshirt_size: employee.tshirt_size || '',
                pullover_size: employee.pullover_size || '',
                street: employee.street || '',
                postal_code: employee.postal_code || '',
                city: employee.city || '',
                activity: employee.activity || '',
                education: employee.education || '',
                weekly_hours: employee.weekly_hours || '',
                tax_id: employee.tax_id || '',
                pension_number: employee.pension_number || '',
                health_insurance: employee.health_insurance || '',
                pension_exemption: employee.pension_exemption || false,
                has_main_job: employee.has_main_job || false,
                has_other_minijob: employee.has_other_minijob || false,
                other_minijob_details: employee.other_minijob_details || '',
                bank_name: employee.bank_name || '',
                iban: employee.iban || '',
                bic: employee.bic || '',
                is_active: employee.is_active !== false,
                sig_employee: employee.sig_employee || ''
            });
        } else {
            setSelectedEmployee(null);
            setFormData({
                employee_number: '',
                name: '',
                role: 'Barkeeper',
                skills: [],
                contract_type: '',
                hourly_rate: HOURLY_RATES.FULLTIME,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                phone: '',
                email: '',
                birthday: '',
                birth_name: '',
                birth_place: '',
                nationality: '',
                entry_date: '',
                tshirt_size: '',
                pullover_size: '',
                street: '',
                postal_code: '',
                city: '',
                activity: '',
                education: '',
                weekly_hours: '',
                tax_id: '',
                pension_number: '',
                health_insurance: '',
                pension_exemption: false,
                has_main_job: false,
                has_other_minijob: false,
                other_minijob_details: '',
                bank_name: '',
                iban: '',
                bic: '',
                is_active: true
            });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedEmployee(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const cleanedData = {
            ...formData,
            hourly_rate: formData.hourly_rate !== '' ? parseFloat(formData.hourly_rate) : undefined,
            vacation_days_per_year: formData.vacation_days_per_year !== '' ? parseInt(formData.vacation_days_per_year) : undefined,
            weekly_hours: formData.weekly_hours !== '' ? parseFloat(formData.weekly_hours) : undefined
        };
        
        if (selectedEmployee) {
            const isOwnProfile = currentUser?.email === selectedEmployee.email;
            updateMutation.mutate({ 
                id: selectedEmployee.id, 
                data: cleanedData, 
                isOwnProfile,
                oldEmployee: selectedEmployee 
            });
        } else {
            createMutation.mutate(cleanedData);
        }
    };

    const handleDelete = (employee) => {
        setDeleteDialogEmployee(employee);
    };

    const handleInvite = async (employee) => {
        if (!employee.email) {
            alert('Mitarbeiter hat keine E-Mail-Adresse hinterlegt.');
            return;
        }

        try {
            const roleMapping = {
                'Manager': 'admin',
                'Vollzeit': 'user',
                'Aushilfe': 'user'
            };
            
            await base44.users.inviteUser(employee.email, roleMapping[employee.role] || 'user');
            alert(`✅ Einladung an ${employee.email} wurde versendet!`);
        } catch (error) {
            alert('❌ Fehler beim Versenden der Einladung: ' + error.message);
        }
    };

    const handlePermissionsSave = async (employeeId, newPermissions) => {
        try {
            await base44.entities.Employee.update(employeeId, { permissions: newPermissions });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Berechtigungen aktualisiert!');
        } catch (error) {
            toast.error('Fehler beim Speichern der Berechtigungen: ' + error.message);
        }
    };

    const isOwnProfile = (employee) => {
        return currentUser?.email === employee.email;
    };

    const canViewDetails = (employee) => {
        return permissions.isManager || isOwnProfile(employee);
    };

    const canEdit = (employee) => {
        // Jeder Mitarbeiter kann seine eigenen Daten bearbeiten, Manager können alle bearbeiten
        return permissions.isManager || isOwnProfile(employee);
    };

    const handleOrderItem = (itemType, size, employeeName) => {
        if (!size) {
            toast.error(`Bitte zuerst ${itemType === 'tshirt' ? 'T-Shirt' : 'Pullover'}-Größe auswählen`);
            return;
        }
        
        const title = itemType === 'tshirt' 
            ? `T-Shirt bestellen: ${employeeName} (${size})`
            : `Pullover bestellen: ${employeeName} (${size})`;
        
        base44.entities.TodoItem.create({
            title: title,
            category: 'Einkauf',
            priority: 'mittel',
            status: 'offen'
        }).then(() => {
            toast.success('Bestellung zur Aufgabenliste hinzugefügt!');
        });
    };

    const filteredActiveEmployees = useMemo(() => 
        employees.filter(e => {
            if (e.is_active === false) return false;
            if (skillsFilter.length === 0) return true;
            return skillsFilter.every(skill => e.skills?.includes(skill));
        }),
        [employees, skillsFilter]
    );
    
    const inactiveEmployees = useMemo(() => 
        employees.filter(e => e.is_active === false),
        [employees]
    );
    
    const employeesWithoutEmail = useMemo(() => 
        filteredActiveEmployees.filter(e => !e.email),
        [filteredActiveEmployees]
    );

    const handleSkillsFilterChange = (skill) => {
        setSkillsFilter(prev => 
            prev.includes(skill) 
                ? prev.filter(s => s !== skill)
                : [...prev, skill]
        );
    };

    if (!permissions.isLoading && !permissions.canViewEmployees) {
        return <PermissionDenied message="Du hast keine Berechtigung, die Mitarbeiterliste zu sehen." />;
    }

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-5 sm:mb-6">
                    <div>
                        <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">Mitarbeiter</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {filteredActiveEmployees.length} aktive Mitarbeiter
                        </p>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-wrap">
                         {permissions.isManager && (
                             <>
                                 <WorkTimeModelsManager />
                                 <PersonalFormDigital onSuccess={() => queryClient.invalidateQueries({ queryKey: ['employees'] })} />
                                 <PersonalFormUploader onSuccess={() => queryClient.invalidateQueries({ queryKey: ['employees'] })} />
                                 <EmployeesCSVExport employees={filteredActiveEmployees} />
                                <PDFExportButton
                                    data={filteredActiveEmployees}
                                    filename="mitarbeiter"
                                    title="Mitarbeiterliste"
                                    columns={[
                                        { label: 'Name', field: 'name' },
                                        { label: 'Rolle', field: 'role' },
                                        { label: 'Vertrag', field: 'contract_type' },
                                        { label: 'Stundensatz', render: (e) => e.hourly_rate ? `${e.hourly_rate} €` : '-' },
                                        { label: 'Email', field: 'email' }
                                    ]}
                                    variant="outline"
                                    className="border-border text-foreground hover:bg-card"
                                />
                            </>
                        )}
                        <a
                            href={whatsappGroupLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition-all shadow-lg shadow-green-500/20"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Team-Gruppe
                        </a>
                        {permissions.isManager && (
                            <Button 
                                onClick={() => openModal()}
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-background shadow-lg shadow-amber-500/20"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Mitarbeiter hinzufügen
                            </Button>
                        )}
                    </div>
                    </div>

                    {/* Skills Filter - nur für Manager */}
                    {permissions.isManager && (
                        <Card className="p-4 bg-card border-border mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <Filter className="w-5 h-5 text-amber-400" />
                                <h3 className="font-semibold text-foreground">Nach Fähigkeiten filtern</h3>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {['Barkeeper', 'Service', 'Sonderaufgaben'].map(skill => (
                                    <label key={skill} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={skillsFilter.includes(skill)}
                                            onCheckedChange={() => handleSkillsFilterChange(skill)}
                                        />
                                        <span className="text-sm text-foreground">{skill}</span>
                                    </label>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Missing Email Alert */}
                    {employeesWithoutEmail.length > 0 && (
                    <Alert className="bg-amber-900/20 border-amber-700 mb-6">
                        <AlertDescription className="text-amber-300">
                            <p className="font-semibold mb-2">⚠️ {employeesWithoutEmail.length} Mitarbeiter ohne E-Mail-Adresse:</p>
                            <p className="text-sm">
                                {employeesWithoutEmail.map(e => e.name).join(', ')}
                            </p>
                            <p className="text-xs text-amber-400 mt-2">
                                Bitte in der Team-WhatsApp-Gruppe persönlich ansprechen, damit diese ihre E-Mail-Adresse hinterlegen.
                            </p>
                        </AlertDescription>
                    </Alert>
                    )}

                    {/* Employee Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredActiveEmployees.map(employee => (
                        <Card 
                            key={employee.id}
                            className="p-4 sm:p-5 bg-card border-border shadow-sm"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <EmployeeAvatar employee={employee} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-foreground truncate">{employee.name}</h3>
                                    {(canViewDetails(employee) || permissions.isManager) && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            <Badge className={cn("text-xs", roleColors[employee.role] || 'bg-muted text-muted-foreground')}>
                                                {employee.role}
                                            </Badge>
                                        </div>
                                    )}
                                    {permissions.isManager && employee.skills?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {employee.skills.map(skill => (
                                                <Badge key={skill} variant="skill" className="text-xs">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact Info - nur bei eigenem Profil oder Manager */}
                            {canViewDetails(employee) && employee.email && (
                                <div className="mb-3 pb-3 border-b border-border">
                                    <p className="text-xs text-muted-foreground mb-1">E-Mail</p>
                                    <p className="text-xs text-foreground truncate">{employee.email}</p>
                                </div>
                            )}

                            {/* vCard Download - für alle sichtbar wenn Telefon vorhanden */}
                            {(employee.phone || employee.email) && (
                                <button
                                    onClick={() => {
                                        const bday = employee.birthday ? employee.birthday.replace(/-/g, '') : '';
                                        const nameParts = employee.name.trim().split(' ');
                                        const lastName = nameParts.slice(-1)[0] || '';
                                        const firstName = nameParts.slice(0, -1).join(' ') || employee.name;
                                        const vcard = [
                                            'BEGIN:VCARD',
                                            'VERSION:3.0',
                                            `FN:${employee.name}`,
                                            `N:${lastName};${firstName};;;`,
                                            employee.phone ? `TEL;TYPE=CELL:${employee.phone}` : '',
                                            employee.email ? `EMAIL:${employee.email}` : '',
                                            bday ? `BDAY:${bday}` : '',
                                            `ORG:Bar Team`,
                                            `TITLE:${employee.role || ''}`,
                                            'END:VCARD'
                                        ].filter(Boolean).join('\r\n');
                                        const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
                                        const a = document.createElement('a');
                                        a.href = URL.createObjectURL(blob);
                                        a.download = `${employee.name.replace(/\s+/g, '_')}.vcf`;
                                        a.click();
                                    }}
                                    className="w-full flex items-center justify-center gap-2 mb-2 p-2 rounded-lg bg-secondary/40 border border-border/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all text-xs"
                                    title="Kontakt als vCard herunterladen"
                                >
                                    <ContactRound className="w-3.5 h-3.5" />
                                    Kontakt speichern (.vcf)
                                </button>
                            )}

                            {/* Contact Icons - visible to all */}
                            <div className="flex gap-2 mb-3">
                                {employee.phone && (
                                    <>
                                        <a
                                            href={`tel:${employee.phone}`}
                                            className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted text-foreground hover:text-foreground transition-all text-sm"
                                            title="Anrufen"
                                        >
                                            <Phone className="w-4 h-4" />
                                            <span className="hidden sm:inline">Anrufen</span>
                                        </a>
                                        <a
                                            href={`https://wa.me/${employee.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all text-sm shadow-lg shadow-green-500/10"
                                            title="WhatsApp"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            <span className="hidden sm:inline">WhatsApp</span>
                                            </a>
                                    </>
                                )}
                                {employee.email && !employee.phone && (
                                    <a
                                    href={`mailto:${employee.email}`}
                                    className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted text-foreground hover:text-foreground transition-all text-sm"
                                    title="E-Mail"
                                    >
                                    <Mail className="w-4 h-4" />
                                    <span className="hidden sm:inline">E-Mail</span>
                                    </a>
                                )}
                            </div>

                            {/* Additional Details - nur bei eigenem Profil */}
                            {canViewDetails(employee) && (
                                <div className="space-y-2 pt-3 border-t border-border text-sm">
                                    {employee.birthday && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Geburtstag</p>
                                            <p className="text-foreground text-xs">
                                                {format(new Date(employee.birthday), 'dd.MM.yyyy', { locale: de })}
                                            </p>
                                        </div>
                                    )}
                                    {employee.contract_type && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Vertragsart</p>
                                            <p className="text-foreground text-xs">{employee.contract_type}</p>
                                        </div>
                                    )}
                                    {employee.tshirt_size && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">T-Shirt Größe</p>
                                            <p className="text-foreground text-xs">{employee.tshirt_size}</p>
                                        </div>
                                    )}
                                    {employee.pullover_size && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Pullover Größe</p>
                                            <p className="text-foreground text-xs">{employee.pullover_size}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Order Buttons - für alle Mitarbeiter */}
                            {(canViewDetails(employee) || permissions.isManager) && (employee.tshirt_size || employee.pullover_size) && (
                                <div className="flex gap-2 pt-3 border-t border-border">
                                    {employee.tshirt_size && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOrderItem('tshirt', employee.tshirt_size, employee.name)}
                                            className="flex-1 border-border/50 text-foreground hover:bg-muted/50 text-xs"
                                        >
                                            <ShoppingBag className="w-3 h-3 mr-1" />
                                            T-Shirt
                                        </Button>
                                    )}
                                    {employee.pullover_size && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOrderItem('pullover', employee.pullover_size, employee.name)}
                                            className="flex-1 border-border/50 text-foreground hover:bg-muted/50 text-xs"
                                        >
                                            <ShoppingBag className="w-3 h-3 mr-1" />
                                            Pullover
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="space-y-2 mt-4 pt-3 border-t border-border">
                                {permissions.isManager && (
                                    <>
                                        <div className="flex gap-2">
                                            <SalaryHistoryModal employee={employee} />
                                        </div>
                                        <div className="flex gap-2">
                                            <PermissionsManager 
                                                employee={employee}
                                                onSave={(perms) => handlePermissionsSave(employee.id, perms)}
                                            />
                                            {employee.email && (
                                                <Button
                                                   variant="outline"
                                                   size="sm"
                                                   onClick={() => handleInvite(employee)}
                                                   className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-lg shadow-green-500/10"
                                                >
                                                   <UserPlus className="w-4 h-4 mr-1" />
                                                   Einladen
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}
                                {permissions.isManager && (
                                    <div className="flex gap-2">
                                        <EmployeePersonalFormExport
                                            employee={employee}
                                            onEmployeeUpdate={(updated) => queryClient.setQueryData(['employees'], prev => prev.map(e => e.id === updated.id ? updated : e))}
                                        />
                                        <RVBefreiungExport
                                            employee={employee}
                                            onEmployeeUpdate={(updated) => queryClient.setQueryData(['employees'], prev => prev.map(e => e.id === updated.id ? updated : e))}
                                        />
                                    </div>
                                )}
                                {canEdit(employee) && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openModal(employee)}
                                            className="flex-1 border-border/50 text-foreground hover:bg-muted/50"
                                        >
                                            <Pencil className="w-4 h-4 mr-1" />
                                            Bearbeiten
                                        </Button>
                                        {permissions.isManager && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(employee)}
                                                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Ehemalige Button + Section */}
                {permissions.isManager && inactiveEmployees.length > 0 && (
                    <div className="mt-8">
                        <button
                            onClick={() => setShowInactive(v => !v)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-card transition-all text-sm font-medium mb-4"
                        >
                            <Archive className="w-4 h-4" />
                            Ehemalige ({inactiveEmployees.length})
                            <span className="text-xs text-muted-foreground">{showInactive ? '▲' : '▼'}</span>
                        </button>
                        {showInactive && (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {inactiveEmployees.map(employee => (
                                    <Card 
                                        key={employee.id}
                                        className="p-4 bg-card/50 border-border opacity-60"
                                    >
                                        <div className="flex items-center gap-3">
                                            <EmployeeAvatar employee={employee} size="sm" />
                                            <div className="flex-1">
                                                <p className="font-medium text-foreground">{employee.name}</p>
                                                    <p className="text-xs text-muted-foreground">{employee.role}</p>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => openModal(employee)}
                                                className="text-slate-400"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Delete Dialog */}
                {deleteDialogEmployee && (
                    <EmployeeDeleteDialog
                        employee={deleteDialogEmployee}
                        currentUser={currentUser}
                        onClose={() => setDeleteDialogEmployee(null)}
                    />
                )}

                {/* Modal */}
                <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedEmployee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            {/* Profilfoto Upload */}
                            <div className="flex flex-col items-center gap-2 pb-4 border-b border-border">
                                <EmployeeAvatar
                                    employee={{ ...selectedEmployee, ...formData }}
                                    size="lg"
                                    upload={true}
                                    onUploaded={(url) => {
                                        setFormData(f => ({ ...f, profile_image_url: url }));
                                        if (selectedEmployee) {
                                            base44.entities.Employee.update(selectedEmployee.id, { profile_image_url: url })
                                                .then(() => queryClient.invalidateQueries({ queryKey: ['employees'] }));
                                        }
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">Klicken zum Foto hochladen</p>
                            </div>

                            {/* Basis-Felder */}
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Name eingeben"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Position</Label>
                                {permissions.isManager ? (
                                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Aushilfe">Aushilfe</SelectItem>
                                            <SelectItem value="Vollzeit">Vollzeit</SelectItem>
                                            <SelectItem value="Manager">Manager</SelectItem>
                                            <SelectItem value="Orga">Orga</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input value={formData.role} disabled className="bg-muted text-muted-foreground" />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Farbe für Kalender</Label>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={cn(
                                                "w-8 h-8 rounded-full transition-transform",
                                                formData.color === color && "ring-2 ring-offset-2 ring-border scale-110"
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Telefon</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+49 123 456789"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>E-Mail</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="name@beispiel.de"
                                />
                            </div>

                            {permissions.isManager && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Vertragsart</Label>
                                            <Select
                                                value={formData.contract_type}
                                                onValueChange={(v) => {
                                                    const model = workTimeModels.find(m =>
                                                        m.name.toLowerCase().includes(v.toLowerCase()) && m.is_active !== false
                                                    );
                                                    setFormData({
                                                        ...formData,
                                                        contract_type: v,
                                                        hourly_rate: model?.default_hourly_rate || (v === 'Minijob' ? HOURLY_RATES.MINIJOB : HOURLY_RATES.FULLTIME),
                                                    });
                                                }}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Vollzeit">Vollzeit</SelectItem>
                                                    <SelectItem value="Teilzeit">Teilzeit</SelectItem>
                                                    <SelectItem value="Minijob">Minijob</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Stundensatz (€)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={formData.hourly_rate}
                                                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                                                placeholder="z.B. 13.50"
                                            />
                                        </div>
                                    </div>

                                    {selectedEmployee && permissions.isManager && (
                                        <div className="flex items-center justify-between py-2">
                                            <Label>Aktiv</Label>
                                            <Switch
                                                checked={formData.is_active}
                                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Vollständiges Profil Link */}
                            {selectedEmployee && (
                                <div className="pt-2 border-t border-border">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full gap-2 text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                                        onClick={() => { closeModal(); navigate(`/EmployeeProfile/${selectedEmployee.id}`); }}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Vollständiges Profil öffnen
                                    </Button>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button type="submit" className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-background">
                                    {selectedEmployee ? 'Speichern' : 'Hinzufügen'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}