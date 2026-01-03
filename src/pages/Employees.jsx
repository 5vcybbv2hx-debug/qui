import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Phone, Users, ShoppingCart } from 'lucide-react';
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

const COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
    '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e', '#64748b'
];

const roleLabels = {
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
        name: '',
        role: 'Barkeeper',
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

    const { data: employees = [], isLoading } = useQuery({
        queryKey: ['employees-all'],
        queryFn: () => base44.entities.Employee.list('name')
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Employee.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['employees-all']);
            queryClient.invalidateQueries(['employees']);
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['employees-all']);
            queryClient.invalidateQueries(['employees']);
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Employee.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['employees-all']);
            queryClient.invalidateQueries(['employees']);
        }
    });

    const openModal = (employee = null) => {
        if (employee) {
            setSelectedEmployee(employee);
            setFormData({
                name: employee.name,
                role: employee.role,
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
                name: '',
                role: 'Barkeeper',
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                phone: '',
                email: '',
                birthday: '',
                birth_name: '',
                birth_place: '',
                entry_date: '',
                education: '',
                tax_id: '',
                pension_insurance_number: '',
                health_insurance: '',
                tshirt_size: '',
                pullover_size: '',
                street: '',
                postal_code: '',
                city: '',
                nationality: '',
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
            updateMutation.mutate({ id: selectedEmployee.id, data: formData });
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
        try {
            const roleMapping = {
                'Manager': 'admin',
                'Barkeeper': 'user',
                'Servicekraft': 'user',
                'Aushilfe': 'user'
            };
            
            await base44.users.inviteUser(employee.email, roleMapping[employee.role] || 'user');
            alert(`Einladung an ${employee.email} wurde versendet!`);
        } catch (error) {
            alert('Fehler beim Versenden der Einladung: ' + error.message);
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
        return <PermissionDenied message="Nur Manager können die Mitarbeiterliste einsehen." />;
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Team</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {activeEmployees.length} aktive Mitarbeiter
                        </p>
                    </div>
                    <Button 
                        onClick={() => openModal()}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Mitarbeiter hinzufügen
                    </Button>
                </div>

                {/* Employee Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeEmployees.map(employee => (
                        <Card 
                            key={employee.id}
                            className="p-5 bg-slate-800 border-slate-700 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start gap-4">
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
                                    style={{ backgroundColor: employee.color || '#64748b' }}
                                >
                                    {employee.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-white truncate">{employee.name}</h3>
                                    <Badge className={cn("mt-1 text-xs", roleLabels[employee.role] || 'bg-slate-100 text-slate-700')}>
                                        {employee.role}
                                    </Badge>
                                    {employee.phone && (
                                        <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
                                            <Phone className="w-3 h-3" />
                                            {employee.phone}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700">
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="flex-1 text-slate-300 hover:bg-slate-700"
                                    onClick={() => openModal(employee)}
                                >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Bearbeiten
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(employee.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Inactive Employees */}
                {inactiveEmployees.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
                            Inaktive Mitarbeiter
                        </h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inactiveEmployees.map(employee => (
                                <Card 
                                    key={employee.id}
                                    className="p-5 bg-slate-800/50 border-slate-700 opacity-60"
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
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {employees.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Noch keine Mitarbeiter</p>
                        <p className="text-sm mt-1">Füge dein Team hinzu, um loszulegen</p>
                    </div>
                )}

                {/* Modal */}
                <Dialog open={modalOpen} onOpenChange={closeModal}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedEmployee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
                                <h4 className="font-semibold text-slate-800">Personalakte</h4>
                                
                                <div className="space-y-2">
                                    <Label>Eintrittsdatum</Label>
                                    <Input
                                        type="date"
                                        value={formData.entry_date}
                                        onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>T-Shirt Größe</Label>
                                        <div className="flex gap-2">
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
                                                    <SelectItem value="XXXL">XXXL</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleOrderItem('tshirt', formData.tshirt_size, formData.name)}
                                                className="shrink-0"
                                            >
                                                <ShoppingCart className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Pullovergröße</Label>
                                        <div className="flex gap-2">
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
                                                    <SelectItem value="XXXL">XXXL</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleOrderItem('pullover', formData.pullover_size, formData.name)}
                                                className="shrink-0"
                                            >
                                                <ShoppingCart className="w-4 h-4" />
                                            </Button>
                                        </div>
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
                                        <Label>Postleitzahl</Label>
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

                            {selectedEmployee && (
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
                                <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900">
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