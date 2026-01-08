import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Phone, MessageCircle, Mail, UserPlus, ShoppingBag } from 'lucide-react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
    '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e', '#64748b'
];

const roleColors = {
    'Barkeeper': 'bg-amber-100 text-amber-700',
    'Servicekraft': 'bg-blue-100 text-blue-700',
    'Manager': 'bg-purple-100 text-purple-700',
    'Aushilfe': 'bg-slate-100 text-slate-700'
};

export default function Employees() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [formData, setFormData] = useState({
        employee_number: '',
        name: '',
        role: 'Barkeeper',
        contract_type: '',
        hourly_rate: '',
        vacation_days_per_year: '',
        color: COLORS[0],
        phone: '',
        email: '',
        birthday: '',
        entry_date: '',
        tshirt_size: '',
        pullover_size: '',
        street: '',
        postal_code: '',
        city: '',
        is_active: true
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list('name')
    });

    const { data: currentUser } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Employee.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data, isOwnProfile }) => {
            await base44.entities.Employee.update(id, data);
            
            // Benachrichtigung für Manager erstellen, wenn Mitarbeiter eigene Daten bearbeitet
            if (isOwnProfile && !permissions.isManager) {
                await base44.entities.Notification.create({
                    type: 'employee_update',
                    title: 'Mitarbeiterdaten geändert',
                    message: `${data.name} hat seine/ihre Profildaten aktualisiert.`,
                    related_id: id,
                    target_roles: ['admin', 'Manager'],
                    read_by: []
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Employee.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
        }
    });

    const openModal = (employee = null) => {
        if (employee) {
            setSelectedEmployee(employee);
            setFormData({
                employee_number: employee.employee_number || '',
                name: employee.name,
                role: employee.role,
                contract_type: employee.contract_type || '',
                hourly_rate: employee.hourly_rate || '',
                vacation_days_per_year: employee.vacation_days_per_year || '',
                color: employee.color || COLORS[0],
                phone: employee.phone || '',
                email: employee.email || '',
                birthday: employee.birthday || '',
                entry_date: employee.entry_date || '',
                tshirt_size: employee.tshirt_size || '',
                pullover_size: employee.pullover_size || '',
                street: employee.street || '',
                postal_code: employee.postal_code || '',
                city: employee.city || '',
                is_active: employee.is_active !== false
            });
        } else {
            setSelectedEmployee(null);
            setFormData({
                employee_number: '',
                name: '',
                role: 'Barkeeper',
                contract_type: '',
                hourly_rate: '',
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                phone: '',
                email: '',
                birthday: '',
                entry_date: '',
                tshirt_size: '',
                pullover_size: '',
                street: '',
                postal_code: '',
                city: '',
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
        if (selectedEmployee) {
            const isOwnProfile = currentUser?.email === selectedEmployee.email;
            updateMutation.mutate({ id: selectedEmployee.id, data: formData, isOwnProfile });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Mitarbeiter wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleInvite = async (employee) => {
        if (!employee.email) {
            alert('Mitarbeiter hat keine E-Mail-Adresse hinterlegt.');
            return;
        }

        try {
            const roleMapping = {
                'Manager': 'admin',
                'Barkeeper': 'user',
                'Servicekraft': 'user',
                'Aushilfe': 'user'
            };
            
            await base44.users.inviteUser(employee.email, roleMapping[employee.role] || 'user');
            alert(`✅ Einladung an ${employee.email} wurde versendet!`);
        } catch (error) {
            alert('❌ Fehler beim Versenden der Einladung: ' + error.message);
        }
    };

    const isOwnProfile = (employee) => {
        return currentUser?.email === employee.email;
    };

    const canViewDetails = (employee) => {
        return permissions.isManager || isOwnProfile(employee);
    };

    const canEdit = (employee) => {
        return permissions.isManager || isOwnProfile(employee);
    };

    const handleOrderItem = (itemType, size, employeeName) => {
        if (!size) {
            alert(`Bitte zuerst ${itemType === 'tshirt' ? 'T-Shirt' : 'Pullover'}-Größe auswählen`);
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
            alert(`Bestellung zur Aufgabenliste hinzugefügt!`);
        });
    };

    const activeEmployees = employees.filter(e => e.is_active !== false);
    const inactiveEmployees = employees.filter(e => e.is_active === false);

    if (!permissions.canViewEmployees) {
        return <PermissionDenied message="Du hast keine Berechtigung, die Mitarbeiterliste zu sehen." />;
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Team</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {activeEmployees.length} aktive Mitarbeiter
                        </p>
                    </div>
                    {permissions.isManager && (
                        <Button 
                            onClick={() => openModal()}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Mitarbeiter hinzufügen
                        </Button>
                    )}
                </div>

                {/* Employee Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeEmployees.map(employee => (
                        <Card 
                            key={employee.id}
                            className="p-4 sm:p-5 bg-slate-800 border-slate-700 shadow-sm"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
                                    style={{ backgroundColor: employee.color || '#64748b' }}
                                >
                                    {employee.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-white truncate">{employee.name}</h3>
                                    <Badge className={cn("mt-1 text-xs", roleColors[employee.role] || 'bg-slate-100 text-slate-700')}>
                                        {employee.role}
                                    </Badge>
                                </div>
                            </div>

                            {/* Contact Info */}
                            {canViewDetails(employee) && employee.email && (
                                <div className="mb-3 pb-3 border-b border-slate-700">
                                    <p className="text-xs text-slate-500 mb-1">E-Mail</p>
                                    <p className="text-xs text-slate-300 truncate">{employee.email}</p>
                                </div>
                            )}

                            {/* Contact Icons - visible to all */}
                            <div className="flex gap-2 mb-3">
                                {employee.phone && (
                                    <>
                                        <a
                                            href={`tel:${employee.phone}`}
                                            className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors text-sm"
                                            title="Anrufen"
                                        >
                                            <Phone className="w-4 h-4" />
                                            <span className="hidden sm:inline">Anrufen</span>
                                        </a>
                                        <a
                                            href={`https://wa.me/${employee.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors text-sm"
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
                                        className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors text-sm"
                                        title="E-Mail"
                                    >
                                        <Mail className="w-4 h-4" />
                                        <span className="hidden sm:inline">E-Mail</span>
                                    </a>
                                )}
                            </div>

                            {/* Additional Details - only for Manager or own profile */}
                            {canViewDetails(employee) && (
                                <div className="space-y-2 pt-3 border-t border-slate-700 text-sm">
                                    {employee.birthday && (
                                        <div>
                                            <p className="text-xs text-slate-500">Geburtstag</p>
                                            <p className="text-slate-300 text-xs">
                                                {format(new Date(employee.birthday), 'dd.MM.yyyy', { locale: de })}
                                            </p>
                                        </div>
                                    )}
                                    {permissions.isManager && employee.contract_type && (
                                        <div>
                                            <p className="text-xs text-slate-500">Vertragsart</p>
                                            <p className="text-slate-300 text-xs">{employee.contract_type}</p>
                                        </div>
                                    )}

                                    {/* Order Buttons */}
                                    {permissions.isManager && (employee.tshirt_size || employee.pullover_size) && (
                                        <div className="flex gap-2 pt-2">
                                            {employee.tshirt_size && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOrderItem('tshirt', employee.tshirt_size, employee.name)}
                                                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"
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
                                                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"
                                                >
                                                    <ShoppingBag className="w-3 h-3 mr-1" />
                                                    Pullover
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            {canEdit(employee) && (
                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700">
                                    {permissions.isManager && employee.email && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInvite(employee)}
                                            className="flex-1 border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                                        >
                                            <UserPlus className="w-4 h-4 mr-1" />
                                            Einladen
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openModal(employee)}
                                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                                    >
                                        <Pencil className="w-4 h-4 mr-1" />
                                        Bearbeiten
                                    </Button>
                                    {permissions.isManager && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(employee.id)}
                                            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                {/* Inactive Employees */}
                {permissions.isManager && inactiveEmployees.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
                            Inaktive Mitarbeiter
                        </h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inactiveEmployees.map(employee => (
                                <Card 
                                    key={employee.id}
                                    className="p-4 bg-slate-800/50 border-slate-700 opacity-60"
                                >
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                                            style={{ backgroundColor: employee.color || '#64748b' }}
                                        >
                                            {employee.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-300">{employee.name}</p>
                                            <p className="text-xs text-slate-500">{employee.role}</p>
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
                    </div>
                )}

                {/* Modal */}
                <Dialog open={modalOpen} onOpenChange={closeModal}>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedEmployee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Mitarbeiternummer</Label>
                                <Input
                                    value={formData.employee_number}
                                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                                    placeholder="z.B. MA-001"
                                />
                            </div>

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
                                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Barkeeper">Barkeeper</SelectItem>
                                        <SelectItem value="Servicekraft">Servicekraft</SelectItem>
                                        <SelectItem value="Manager">Manager</SelectItem>
                                        <SelectItem value="Aushilfe">Aushilfe</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Vertragsart</Label>
                                    <Select value={formData.contract_type} onValueChange={(v) => setFormData({ ...formData, contract_type: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Wählen..." />
                                        </SelectTrigger>
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

                                {formData.contract_type === 'Vollzeit' && (
                                <div className="space-y-2">
                                    <Label>Urlaubstage pro Jahr</Label>
                                    <Input
                                        type="number"
                                        value={formData.vacation_days_per_year}
                                        onChange={(e) => setFormData({ ...formData, vacation_days_per_year: e.target.value })}
                                        placeholder="z.B. 30"
                                    />
                                </div>
                                )}

                            <div className="space-y-2">
                                <Label>E-Mail (für Einladung)</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="name@beispiel.de"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Mobilfunknummer</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+49 123 456789"
                                />
                                <p className="text-xs text-slate-500">
                                    Wird für Anrufe und WhatsApp verwendet
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Geburtsdatum</Label>
                                <Input
                                    type="date"
                                    value={formData.birthday}
                                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                                />
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
                                                formData.color === color && "ring-2 ring-offset-2 ring-slate-400 scale-110"
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t space-y-4">
                                <h4 className="font-semibold text-slate-800">Weitere Daten</h4>
                                
                                <div className="space-y-2">
                                    <Label>Eintrittsdatum</Label>
                                    <Input
                                        type="date"
                                        value={formData.entry_date}
                                        onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>T-Shirt</Label>
                                        <Select value={formData.tshirt_size} onValueChange={(v) => setFormData({ ...formData, tshirt_size: v })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Größe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="XS">XS</SelectItem>
                                                <SelectItem value="S">S</SelectItem>
                                                <SelectItem value="M">M</SelectItem>
                                                <SelectItem value="L">L</SelectItem>
                                                <SelectItem value="XL">XL</SelectItem>
                                                <SelectItem value="XXL">XXL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Pullover</Label>
                                        <Select value={formData.pullover_size} onValueChange={(v) => setFormData({ ...formData, pullover_size: v })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Größe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="XS">XS</SelectItem>
                                                <SelectItem value="S">S</SelectItem>
                                                <SelectItem value="M">M</SelectItem>
                                                <SelectItem value="L">L</SelectItem>
                                                <SelectItem value="XL">XL</SelectItem>
                                                <SelectItem value="XXL">XXL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Straße und Hausnummer</Label>
                                    <Input
                                        value={formData.street}
                                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                        placeholder="Musterstraße 123"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>PLZ</Label>
                                        <Input
                                            value={formData.postal_code}
                                            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                            placeholder="12345"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Wohnort</Label>
                                        <Input
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="Berlin"
                                        />
                                    </div>
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

                            <div className="flex gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
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