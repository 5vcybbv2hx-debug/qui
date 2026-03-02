import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { loadCategories } from './TodoCategoryManager';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { haptics } from "@/components/utils/haptics";

export default function TodoModal({ open, onClose, todo, employees, onSave }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'mittel',
        status: 'offen',
        due_date: '',
        assigned_to: '',
        category: 'Sonstiges'
    });

    useEffect(() => {
        if (todo) {
            setFormData({
                title: todo.title || '',
                description: todo.description || '',
                priority: todo.priority || 'mittel',
                status: todo.status || 'offen',
                due_date: todo.due_date || '',
                assigned_to: todo.assigned_to || '',
                category: todo.category || 'Sonstiges'
            });
        } else {
            setFormData({
                title: '',
                description: '',
                priority: 'mittel',
                status: 'offen',
                due_date: '',
                assigned_to: '',
                category: 'Sonstiges'
            });
        }
    }, [todo, open]);

    const handleSubmit = (e) => {
        e.preventDefault();
        haptics.light();
        onSave(formData, todo?.id);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        {todo ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Titel *</Label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Aufgabe eingeben..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Beschreibung</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Details zur Aufgabe..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Kategorie</Label>
                            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadCategories().map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Priorität</Label>
                            <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="niedrig">Niedrig</SelectItem>
                                    <SelectItem value="mittel">Mittel</SelectItem>
                                    <SelectItem value="hoch">Hoch</SelectItem>
                                    <SelectItem value="dringend">Dringend</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Fällig am</Label>
                            <Input
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Zugewiesen an</Label>
                            <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Auswählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>Niemand</SelectItem>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Abbrechen
                        </Button>
                        <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900">
                            {todo ? 'Speichern' : 'Hinzufügen'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}