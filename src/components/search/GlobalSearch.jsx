import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Search, Wine, Users, Package, Calendar, CheckSquare, 
    Sparkles, BookOpen, Clock, FileText, Command, MapPin, Warehouse
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GlobalSearch({ open, onClose }) {
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const { data: articles = [] } = useQuery({
        queryKey: ['articles'],
        queryFn: () => base44.entities.Article.list(),
        enabled: open
    });

    const { data: recipes = [] } = useQuery({
        queryKey: ['recipes'],
        queryFn: () => base44.entities.Recipe.list(),
        enabled: open
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true }),
        enabled: open
    });

    const { data: menuItems = [] } = useQuery({
        queryKey: ['menu-items'],
        queryFn: () => base44.entities.MenuItem.list(),
        enabled: open
    });

    const { data: todos = [] } = useQuery({
        queryKey: ['todos'],
        queryFn: () => base44.entities.TodoItem.filter({ is_archived: false }),
        enabled: open
    });

    const { data: storageItems = [] } = useQuery({
        queryKey: ['storage-items'],
        queryFn: () => base44.entities.StorageItem.filter({ is_active: true }),
        enabled: open
    });

    // Keyboard shortcut (Ctrl/Cmd + K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                // This will be triggered from the parent
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const pages = [
        { name: 'Kalender', page: 'Calendar', icon: Calendar, keywords: ['schichten', 'termine'] },
        { name: 'Mitarbeiter', page: 'Employees', icon: Users, keywords: ['team', 'personal'] },
        { name: 'Lager', page: 'Warehouse', icon: Package, keywords: ['artikel', 'bestand', 'inventory'] },
        { name: 'Getränkekarte', page: 'DrinkMenu', icon: Wine, keywords: ['drinks', 'cocktails', 'menu'] },
        { name: 'Rezepte', page: 'Recipes', icon: BookOpen, keywords: ['cocktails', 'zutaten'] },
        { name: 'Aufgaben', page: 'Todos', icon: CheckSquare, keywords: ['todos', 'tasks'] },
        { name: 'Putzen', page: 'Cleaning', icon: Sparkles, keywords: ['reinigung', 'cleaning'] },
        { name: 'Zeiterfassung', page: 'TimeManagement', icon: Clock, keywords: ['stunden', 'time'] },
        { name: 'Berichte', page: 'Reports', icon: FileText, keywords: ['analytics', 'reports'] },
    ];

    const searchResults = searchTerm.length >= 2 ? {
        pages: pages.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.keywords.some(k => k.includes(searchTerm.toLowerCase()))
        ),
        articles: articles.filter(a => 
            a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.barcode?.includes(searchTerm) ||
            a.shelf_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.storage_location?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 6),
        storageItems: storageItems.filter(s =>
            s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.location_label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.category?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 6),
        recipes: recipes.filter(r => 
            r.name?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5),
        employees: employees.filter(e => 
            e.name?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5),
        menuItems: menuItems.filter(m => 
            m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.description?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5),
        todos: todos.filter(t => 
            t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5)
    } : { pages: [], articles: [], recipes: [], employees: [], menuItems: [], todos: [], storageItems: [] };

    const hasResults = Object.values(searchResults).some(arr => arr.length > 0);

    const handleNavigate = (path) => {
        navigate(path);
        onClose();
        setSearchTerm('');
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
                <div className="border-b border-border p-4 flex items-center gap-3">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <Input
                        placeholder="Suche nach Artikeln, Rezepten, Mitarbeitern..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                        autoFocus
                    />
                    <Badge variant="outline" className="text-xs">
                        <Command className="w-3 h-3 mr-1" />K
                    </Badge>
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                    {searchTerm.length < 2 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Gib mindestens 2 Zeichen ein, um zu suchen</p>
                        </div>
                    ) : !hasResults ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Keine Ergebnisse für "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-4">
                            {searchResults.pages.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2">Seiten</p>
                                    <div className="space-y-1">
                                        {searchResults.pages.map(page => (
                                            <button
                                                key={page.page}
                                                onClick={() => handleNavigate(createPageUrl(page.page))}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                                            >
                                                <page.icon className="w-5 h-5 text-muted-foreground" />
                                                <span className="font-medium">{page.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.menuItems.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2">Getränke</p>
                                    <div className="space-y-1">
                                        {searchResults.menuItems.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleNavigate(createPageUrl('DrinkMenu'))}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                                            >
                                                <Wine className="w-5 h-5 text-amber-500" />
                                                <div className="flex-1">
                                                    <p className="font-medium">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                                </div>
                                                <Badge variant="outline">{item.price.toFixed(2)} €</Badge>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.articles.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2">Artikel (Inventar)</p>
                                    <div className="space-y-1">
                                        {searchResults.articles.map(article => (
                                            <button
                                                key={article.id}
                                                onClick={() => handleNavigate(createPageUrl('Warehouse'))}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                                            >
                                                <Package className="w-5 h-5 text-blue-500" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{article.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {(article.shelf_id || article.storage_location) && (
                                                            <span className="flex items-center gap-1 text-xs text-blue-400 font-medium">
                                                                <MapPin className="w-3 h-3" />
                                                                {article.shelf_id && <span className="font-mono bg-blue-500/20 px-1 rounded">{article.shelf_id}</span>}
                                                                {article.storage_location && <span>{article.storage_location}</span>}
                                                            </span>
                                                        )}
                                                        {article.category && <span className="text-xs text-muted-foreground">{article.category}</span>}
                                                    </div>
                                                </div>
                                                {article.current_stock !== undefined && (
                                                    <Badge variant={article.current_stock <= (article.min_stock || 0) ? "destructive" : "outline"}>
                                                        {article.current_stock}
                                                    </Badge>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.storageItems.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2">Lagerartikel</p>
                                    <div className="space-y-1">
                                        {searchResults.storageItems.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleNavigate(createPageUrl('Storage'))}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                                            >
                                                <Warehouse className="w-5 h-5 text-violet-500" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{item.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {item.location_label && (
                                                            <span className="flex items-center gap-1 text-xs text-violet-400 font-medium">
                                                                <MapPin className="w-3 h-3" />
                                                                {item.location_label}
                                                            </span>
                                                        )}
                                                        {item.category && <span className="text-xs text-muted-foreground">{item.category}</span>}
                                                    </div>
                                                </div>
                                                <Badge variant={item.condition === 'defekt' ? 'destructive' : 'outline'}>
                                                    {item.condition || 'gut'}
                                                </Badge>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.recipes.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2">Rezepte</p>
                                    <div className="space-y-1">
                                        {searchResults.recipes.map(recipe => (
                                            <button
                                                key={recipe.id}
                                                onClick={() => handleNavigate(createPageUrl('Recipes'))}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                                            >
                                                <BookOpen className="w-5 h-5 text-pink-500" />
                                                <div className="flex-1">
                                                    <p className="font-medium">{recipe.name}</p>
                                                    <p className="text-xs text-muted-foreground">{recipe.category}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.employees.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2">Mitarbeiter</p>
                                    <div className="space-y-1">
                                        {searchResults.employees.map(employee => (
                                            <button
                                                key={employee.id}
                                                onClick={() => handleNavigate(createPageUrl('Employees'))}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                                            >
                                                <Users className="w-5 h-5 text-green-500" />
                                                <div className="flex-1">
                                                    <p className="font-medium">{employee.name}</p>
                                                    <p className="text-xs text-muted-foreground">{employee.role}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.todos.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2">Aufgaben</p>
                                    <div className="space-y-1">
                                        {searchResults.todos.map(todo => (
                                            <button
                                                key={todo.id}
                                                onClick={() => handleNavigate(createPageUrl('Todos'))}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                                            >
                                                <CheckSquare className="w-5 h-5 text-orange-500" />
                                                <div className="flex-1">
                                                    <p className="font-medium">{todo.title}</p>
                                                    {todo.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">{todo.description}</p>
                                                    )}
                                                </div>
                                                <Badge variant={todo.priority === 'dringend' || todo.priority === 'hoch' ? 'destructive' : 'outline'}>
                                                    {todo.priority}
                                                </Badge>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-t border-border p-3 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">↓</kbd>
                            Navigation
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">Enter</kbd>
                            Öffnen
                        </span>
                    </div>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">Esc</kbd>
                        Schließen
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}