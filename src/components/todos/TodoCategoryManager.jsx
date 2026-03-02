import React, { useState } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DEFAULT_CATEGORIES = ['Einkauf', 'Reparatur', 'Event', 'Sonstiges'];
const STORAGE_KEY = 'todo_categories';

export function loadCategories() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [...DEFAULT_CATEGORIES];
    } catch {
        return [...DEFAULT_CATEGORIES];
    }
}

function saveCategories(cats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
}

export default function TodoCategoryManager({ open, onClose }) {
    const [categories, setCategories] = useState(() => loadCategories());
    const [newCategory, setNewCategory] = useState('');

    const handleAdd = () => {
        const trimmed = newCategory.trim();
        if (!trimmed || categories.includes(trimmed)) return;
        const updated = [...categories, trimmed];
        setCategories(updated);
        saveCategories(updated);
        setNewCategory('');
    };

    const handleDelete = (cat) => {
        if (DEFAULT_CATEGORIES.includes(cat)) return; // Standardkategorien schützen
        const updated = categories.filter(c => c !== cat);
        setCategories(updated);
        saveCategories(updated);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        Kategorien verwalten
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* Add new */}
                    <div className="flex gap-2">
                        <Input
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Neue Kategorie..."
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
                        />
                        <Button onClick={handleAdd} size="icon" className="shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-900">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* List */}
                    <div className="space-y-1">
                        {categories.map(cat => (
                            <div key={cat} className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border/50">
                                <span className="text-sm text-foreground">{cat}</span>
                                {DEFAULT_CATEGORIES.includes(cat) ? (
                                    <span className="text-[10px] text-muted-foreground">Standard</span>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(cat)}
                                        className="h-7 w-7 text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    <Button variant="outline" onClick={onClose} className="w-full">
                        Fertig
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}