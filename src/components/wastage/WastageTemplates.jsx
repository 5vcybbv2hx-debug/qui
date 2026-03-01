import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Zap, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';

const wastageTypes = [
    { value: 'Bruch', label: 'Bruch', icon: '💥', color: 'bg-red-100 text-red-700' },
    { value: 'Nachtwächter', label: 'Nachtwächter', icon: '🍺', color: 'bg-amber-100 text-amber-700' },
    { value: 'Verderb', label: 'Verderb', icon: '🦠', color: 'bg-purple-100 text-purple-700' },
    { value: 'Sonstiges', label: 'Sonstiges', icon: '📋', color: 'bg-slate-100 text-slate-700' }
];

const emptyItem = { barcode: '', article_name: '', article_image_url: '', quantity: '1', unit: 'Stück', type: 'Bruch', notes: '' };

export default function WastageTemplates({ articles, currentUser, onApply }) {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateName, setTemplateName] = useState('');
    const [items, setItems] = useState([{ ...emptyItem }]);
    const [articleSearches, setArticleSearches] = useState(['']);
    const [showSuggestions, setShowSuggestions] = useState([]);

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
        mutationFn: async (template) => {
            const templateItems = template.items?.length > 0 ? template.items : [];
            // Legacy support: single article templates
            if (templateItems.length === 0 && template.article_name) {
                templateItems.push({
                    barcode: template.barcode || '',
                    article_name: template.article_name,
                    article_image_url: template.article_image_url || null,
                    quantity: template.quantity,
                    unit: template.unit || 'Stück',
                    type: template.type,
                    notes: template.notes || null
                });
            }
            const now = { date: format(new Date(), 'yyyy-MM-dd'), time: format(new Date(), 'HH:mm') };
            const noted_by = currentUser?.full_name || currentUser?.email || 'Unbekannt';
            await Promise.all(templateItems.map(item =>
                base44.entities.Wastage.create({
                    barcode: item.barcode || '',
                    article_name: item.article_name,
                    article_image_url: item.article_image_url || null,
                    quantity: item.quantity,
                    unit: item.unit || 'Stück',
                    type: item.type,
                    ...now,
                    noted_by,
                    notes: item.notes || null
                })
            ));
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['wastage-items']);
            onApply?.();
        }
    });

    const openCreate = () => {
        setEditingTemplate(null);
        setTemplateName('');
        setItems([{ ...emptyItem }]);
        setArticleSearches(['']);
        setShowSuggestions([]);
        setDialogOpen(true);
    };

    const openEdit = (template) => {
        setEditingTemplate(template);
        setTemplateName(template.name || '');
        const existingItems = template.items?.length > 0
            ? template.items.map(i => ({ ...emptyItem, ...i, quantity: String(i.quantity || 1) }))
            : template.article_name
                ? [{ barcode: template.barcode || '', article_name: template.article_name, article_image_url: template.article_image_url || '', quantity: String(template.quantity || 1), unit: template.unit || 'Stück', type: template.type || 'Bruch', notes: template.notes || '' }]
                : [{ ...emptyItem }];
        setItems(existingItems);
        setArticleSearches(existingItems.map(i => i.article_name || ''));
        setShowSuggestions(existingItems.map(() => false));
        setDialogOpen(true);
    };

    const addItem = () => {
        setItems(prev => [...prev, { ...emptyItem }]);
        setArticleSearches(prev => [...prev, '']);
        setShowSuggestions(prev => [...prev, false]);
    };

    const removeItem = (idx) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
        setArticleSearches(prev => prev.filter((_, i) => i !== idx));
        setShowSuggestions(prev => prev.filter((_, i) => i !== idx));
    };

    const updateItem = (idx, field, value) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value, ...(field === 'type' ? { unit: value === 'Nachtwächter' ? 'Liter' : 'Stück' } : {}) } : item));
    };

    const selectArticle = (idx, article) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, article_name: article.name, barcode: article.barcode || '', article_image_url: article.image_url || '' } : item));
        setArticleSearches(prev => prev.map((s, i) => i === idx ? article.name : s));
        setShowSuggestions(prev => prev.map((s, i) => i === idx ? false : s));
    };

    const handleSave = () => {
        const validItems = items.filter(i => i.article_name).map(i => ({
            barcode: i.barcode || '',
            article_name: i.article_name,
            article_image_url: i.article_image_url || '',
            quantity: parseFloat(i.quantity) || 1,
            unit: i.unit || 'Stück',
            type: i.type || 'Bruch',
            notes: i.notes || ''
        }));
        const data = { name: templateName, items: validItems };
        if (editingTemplate) {
            updateMutation.mutate({ id: editingTemplate.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Vorlage löschen?')) deleteMutation.mutate(id);
    };

    const getTemplateItemCount = (template) => {
        if (template.items?.length > 0) return template.items.length;
        if (template.article_name) return 1;
        return 0;
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
                        const count = getTemplateItemCount(template);
                        return (
                            <Card key={template.id} className="bg-slate-800 border-slate-700 flex items-center gap-2 px-3 py-2 hover:border-amber-500/50 transition-colors group">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{template.name}</p>
                                    <p className="text-xs text-slate-400">{count} Artikel</p>
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
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Vorlagenname</Label>
                            <Input
                                value={templateName}
                                onChange={e => setTemplateName(e.target.value)}
                                placeholder="z.B. Abend-Routine"
                                className="bg-slate-900 border-slate-600 text-white"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-slate-300">Artikel</Label>
                                <Button size="sm" variant="ghost" onClick={addItem} className="text-amber-400 hover:text-amber-300 h-7 px-2">
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Artikel hinzufügen
                                </Button>
                            </div>

                            {items.map((item, idx) => {
                                const suggestions = articles.filter(a =>
                                    articleSearches[idx]?.trim() &&
                                    (a.name?.toLowerCase().includes(articleSearches[idx].toLowerCase()) ||
                                     a.barcode?.includes(articleSearches[idx]))
                                ).slice(0, 5);

                                return (
                                    <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-700 space-y-2 relative">
                                        {items.length > 1 && (
                                            <button onClick={() => removeItem(idx)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400">
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                        <div className="space-y-1.5">
                                            <Label className="text-slate-400 text-xs">Artikel {idx + 1}</Label>
                                            <div className="relative">
                                                <Input
                                                    value={articleSearches[idx] || ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setArticleSearches(prev => prev.map((s, i) => i === idx ? val : s));
                                                        updateItem(idx, 'article_name', '');
                                                        setShowSuggestions(prev => prev.map((s, i) => i === idx ? true : s));
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowSuggestions(prev => prev.map((s, i) => i === idx ? false : s)), 150)}
                                                    placeholder="Artikel suchen..."
                                                    className="bg-slate-800 border-slate-600 text-white text-sm"
                                                />
                                                {showSuggestions[idx] && suggestions.length > 0 && (
                                                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden">
                                                        {suggestions.map(a => (
                                                            <button key={a.id} type="button" onMouseDown={() => selectArticle(idx, a)}
                                                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left">
                                                                {a.image_url && <img src={a.image_url} alt="" className="w-6 h-6 rounded object-cover" />}
                                                                <span className="text-sm text-white truncate">{a.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {item.article_name && <p className="text-xs text-amber-400">✓ {item.article_name}</p>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-slate-400 text-xs">Art</Label>
                                                <Select value={item.type} onValueChange={v => updateItem(idx, 'type', v)}>
                                                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-8 text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {wastageTypes.map(t => (
                                                            <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-slate-400 text-xs">Menge</Label>
                                                <Input
                                                    type="number" step="0.1" min="0.1"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                    className="bg-slate-800 border-slate-600 text-white h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-slate-400 text-xs">Notiz (optional)</Label>
                                            <Input
                                                value={item.notes}
                                                onChange={e => updateItem(idx, 'notes', e.target.value)}
                                                placeholder="z.B. Regelmäßiger Bruch"
                                                className="bg-slate-800 border-slate-600 text-white h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-600 text-slate-300">
                            Abbrechen
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!templateName || items.every(i => !i.article_name)}
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