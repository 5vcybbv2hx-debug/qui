import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Zap, BookTemplate, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';

const wastageTypes = [
    { value: 'Bruch', label: 'Bruch', icon: '💥', color: 'bg-red-100 text-red-700' },
    { value: 'Nachtwächter', label: 'Nachtwächter', icon: '🍺', color: 'bg-amber-100 text-amber-700' },
    { value: 'Verderb', label: 'Verderb', icon: '🦠', color: 'bg-purple-100 text-purple-700' },
    { value: 'Sonstiges', label: 'Sonstiges', icon: '📋', color: 'bg-slate-100 text-slate-700' }
];

const emptyForm = { name: '', article_name: '', barcode: '', article_image_url: '', quantity: '1', unit: 'Stück', type: 'Bruch', notes: '' };

export default function WastageTemplates({ articles, currentUser, onApply }) {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [articleSearch, setArticleSearch] = useState('');

    const { data: templates = [] } = useQuery({
        queryKey: ['wastage-templates'],
        queryFn: () => base44.entities.WastageTemplate.list('name')
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.WastageTemplate.create(data),
        onSuccess: () => { queryClient.invalidateQueries(['wastage-templates']); setDialogOpen(false); }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.WastageTemplate.update(id, data),
        onSuccess: () => { queryClient.invalidateQueries(['wastage-templates']); setDialogOpen(false); }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.WastageTemplate.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['wastage-templates'])
    });

    const applyMutation = useMutation({
        mutationFn: (template) => base44.entities.Wastage.create({
            barcode: template.barcode || '',
            article_name: template.article_name,
            article_image_url: template.article_image_url || null,
            quantity: template.quantity,
            unit: template.unit || (template.type === 'Nachtwächter' ? 'Liter' : 'Stück'),
            type: template.type,
            date: format(new Date(), 'yyyy-MM-dd'),
            time: format(new Date(), 'HH:mm'),
            noted_by: currentUser?.full_name || currentUser?.email || 'Unbekannt',
            notes: template.notes || null
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['wastage-items']);
            onApply?.();
        }
    });

    const filteredArticles = articles.filter(a =>
        a.name?.toLowerCase().includes(articleSearch.toLowerCase()) ||
        a.barcode?.includes(articleSearch)
    ).slice(0, 6);

    const openCreate = () => {
        setEditingTemplate(null);
        setForm(emptyForm);
        setArticleSearch('');
        setDialogOpen(true);
    };

    const openEdit = (template) => {
        setEditingTemplate(template);
        setForm({
            name: template.name || '',
            article_name: template.article_name || '',
            barcode: template.barcode || '',
            article_image_url: template.article_image_url || '',
            quantity: String(template.quantity || '1'),
            unit: template.unit || 'Stück',
            type: template.type || 'Bruch',
            notes: template.notes || ''
        });
        setArticleSearch(template.article_name || '');
        setDialogOpen(true);
    };

    const selectArticle = (article) => {
        setForm(f => ({
            ...f,
            article_name: article.name,
            barcode: article.barcode || '',
            article_image_url: article.image_url || ''
        }));
        setArticleSearch(article.name);
    };

    const handleSave = () => {
        const data = {
            name: form.name,
            article_name: form.article_name,
            barcode: form.barcode,
            article_image_url: form.article_image_url,
            quantity: parseFloat(form.quantity) || 1,
            unit: form.unit,
            type: form.type,
            notes: form.notes || null
        };
        if (editingTemplate) {
            updateMutation.mutate({ id: editingTemplate.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Vorlage löschen?')) deleteMutation.mutate(id);
    };

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Vorlagen</h2>
                </div>
                <Button size="sm" variant="outline" onClick={openCreate} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Vorlage
                </Button>
            </div>

            {templates.length === 0 ? (
                <Card className="p-4 bg-slate-800 border-slate-700 border-dashed text-center">
                    <p className="text-slate-500 text-sm">Noch keine Vorlagen. Erstelle Vorlagen für häufige Schwund-Einträge.</p>
                </Card>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {templates.map(template => {
                        const typeConfig = wastageTypes.find(t => t.value === template.type);
                        return (
                            <Card key={template.id} className="bg-slate-800 border-slate-700 flex items-center gap-2 px-3 py-2 hover:border-amber-500/50 transition-colors group">
                                {template.article_image_url && (
                                    <img src={template.article_image_url} alt="" className="w-8 h-8 rounded object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{template.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{template.quantity} {template.unit} · {typeConfig?.icon}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(template)} className="p-1 text-slate-500 hover:text-slate-300">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(template.id)} className="p-1 text-slate-500 hover:text-red-400">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => applyMutation.mutate(template)}
                                    disabled={applyMutation.isPending}
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2 h-7"
                                >
                                    Eintragen
                                </Button>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Vorlagenname</Label>
                            <Input
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="z.B. Heineken Bruch"
                                className="bg-slate-900 border-slate-600 text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Artikel suchen</Label>
                            <Input
                                value={articleSearch}
                                onChange={e => setArticleSearch(e.target.value)}
                                placeholder="Artikel suchen..."
                                className="bg-slate-900 border-slate-600 text-white"
                            />
                            {articleSearch && filteredArticles.length > 0 && form.article_name !== articleSearch && (
                                <div className="border border-slate-600 rounded-lg overflow-hidden">
                                    {filteredArticles.map(a => (
                                        <button
                                            key={a.id}
                                            type="button"
                                            onClick={() => selectArticle(a)}
                                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left"
                                        >
                                            {a.image_url && <img src={a.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                                            <div>
                                                <p className="text-sm text-white">{a.name}</p>
                                                <p className="text-xs text-slate-400">{a.barcode}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {form.article_name && (
                                <p className="text-xs text-amber-400">✓ {form.article_name}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Art</Label>
                                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v, unit: v === 'Nachtwächter' ? 'Liter' : 'Stück' }))}>
                                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {wastageTypes.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Menge</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={form.quantity}
                                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                    className="bg-slate-900 border-slate-600 text-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Notiz (optional)</Label>
                            <Input
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="z.B. Regelmäßiger Bruch beim Auffüllen"
                                className="bg-slate-900 border-slate-600 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-600 text-slate-300">
                            Abbrechen
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!form.name || !form.article_name}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            Speichern
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}