import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { loadCategories } from './TodoCategoryManager';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { haptics } from "@/components/utils/haptics";

const PRIORITIES = [
    { value: 'niedrig', label: 'Niedrig', color: 'bg-slate-500' },
    { value: 'mittel',  label: 'Mittel',  color: 'bg-blue-500' },
    { value: 'hoch',    label: 'Hoch',    color: 'bg-orange-500' },
    { value: 'dringend',label: 'Dringend',color: 'bg-red-500' },
];

const STATUSES = [
    { value: 'offen',          label: 'Offen' },
    { value: 'in_bearbeitung', label: 'Aktiv' },
    { value: 'erledigt',       label: 'Erledigt' },
];

function generateId() {
    return Math.random().toString(36).slice(2, 10);
}

export default function TodoModal({ open, onClose, todo, employees, onSave, currentUser }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'mittel',
        status: 'offen',
        due_date: '',
        assigned_to: '',
        assigned_to_names: [],
        category: 'Sonstiges',
        subtasks: [],
    });
    const [newSubtask, setNewSubtask] = useState('');
    const categories = loadCategories();

    useEffect(() => {
        if (todo) {
            setFormData({
                title: todo.title || '',
                description: todo.description || '',
                priority: todo.priority || 'mittel',
                status: todo.status || 'offen',
                due_date: todo.due_date || '',
                assigned_to: todo.assigned_to || '',
                assigned_to_names: todo.assigned_to_names || (todo.assigned_to ? [todo.assigned_to] : []),
                category: todo.category || 'Sonstiges',
                subtasks: todo.subtasks || [],
            });
        } else {
            const defaultAssignee = currentUser?.full_name || currentUser?.email || '';
            setFormData({
                title: '',
                description: '',
                priority: 'mittel',
                status: 'offen',
                due_date: '',
                assigned_to: defaultAssignee,
                assigned_to_names: defaultAssignee ? [defaultAssignee] : [],
                category: 'Sonstiges',
                subtasks: [],
            });
        }
        setNewSubtask('');
    }, [todo, open, currentUser]);

    const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const toggleAssignee = (name) => {
        const current = formData.assigned_to_names || [];
        const updated = current.includes(name)
            ? current.filter(n => n !== name)
            : [...current, name];
        setFormData(prev => ({
            ...prev,
            assigned_to_names: updated,
            assigned_to: updated[0] || ''
        }));
    };

    const addSubtask = () => {
        if (!newSubtask.trim()) return;
        set('subtasks', [...formData.subtasks, { id: generateId(), title: newSubtask.trim(), done: false }]);
        setNewSubtask('');
    };

    const removeSubtask = (id) => {
        set('subtasks', formData.subtasks.filter(s => s.id !== id));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        haptics.light();
        onSave(formData, todo?.id);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg max-h-[95dvh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        {todo ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label className="text-base font-semibold">Titel *</Label>
                        <Input
                            value={formData.title}
                            onChange={e => set('title', e.target.value)}
                            placeholder="Aufgabe eingeben..."
                            required
                            className="h-12 text-base"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">Beschreibung</Label>
                        <Textarea
                            value={formData.description}
                            onChange={e => set('description', e.target.value)}
                            placeholder="Details zur Aufgabe..."
                            rows={5}
                            className="text-sm"
                        />
                    </div>

                    {/* Priority - visual chips */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">Priorität</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {PRIORITIES.map(p => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => set('priority', p.value)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all active:scale-95",
                                        formData.priority === p.value
                                            ? "border-foreground text-foreground bg-accent"
                                            : "border-border text-muted-foreground"
                                    )}
                                >
                                    <span className={cn("w-3 h-3 rounded-full shrink-0", p.color)} />
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category + Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold">Kategorie</Label>
                            <select
                                value={formData.category}
                                onChange={e => set('category', e.target.value)}
                                className="w-full h-12 rounded-xl border border-input bg-background px-3 text-base text-foreground"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold">Status</Label>
                            <select
                                value={formData.status}
                                onChange={e => set('status', e.target.value)}
                                className="w-full h-12 rounded-xl border border-input bg-background px-3 text-base text-foreground"
                            >
                                {STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Due date */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">Fällig am</Label>
                        <Input
                            type="date"
                            value={formData.due_date}
                            onChange={e => set('due_date', e.target.value)}
                            className="h-12 text-base"
                        />
                    </div>

                    {/* Assignees - multi-select checkboxes */}
                    {employees?.length > 0 && (
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold">Zugewiesen an</Label>
                            <div className="flex flex-wrap gap-2">
                                {employees.map(emp => {
                                    const selected = formData.assigned_to_names?.includes(emp.name);
                                    return (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            onClick={() => toggleAssignee(emp.name)}
                                            className={cn(
                                                "px-3 py-2.5 rounded-xl border text-sm transition-all active:scale-95",
                                                selected
                                                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold"
                                                    : "border-border text-muted-foreground"
                                            )}
                                        >
                                            {selected ? '✓ ' : ''}{emp.name}
                                        </button>
                                    );
                                })}
                                {formData.assigned_to_names?.length > 0 && (
                                    <button type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, assigned_to_names: [], assigned_to: '' }))}
                                        className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground">
                                        Alle entfernen
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Subtasks */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">Unteraufgaben</Label>
                        {formData.subtasks.length > 0 && (
                            <div className="space-y-1 mb-2">
                                {formData.subtasks.map(sub => (
                                    <div key={sub.id} className="flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-lg">
                                        <span className="text-xs flex-1 text-foreground">{sub.title}</span>
                                        <button type="button" onClick={() => removeSubtask(sub.id)}
                                            className="text-muted-foreground hover:text-red-400 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Input
                                value={newSubtask}
                                onChange={e => setNewSubtask(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                                placeholder="Unteraufgabe hinzufügen..."
                                className="h-11 text-base flex-1"
                            />
                            <Button type="button" variant="outline" onClick={addSubtask} disabled={!newSubtask.trim()} className="h-11 px-4">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 text-base">
                            Abbrechen
                        </Button>
                        <Button type="submit" className="flex-1 h-12 text-base bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-semibold">
                            {todo ? 'Speichern' : 'Hinzufügen'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}