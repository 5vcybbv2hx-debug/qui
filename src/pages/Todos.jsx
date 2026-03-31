import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckSquare, Tag, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { queueMutation, syncMutations } from '@/components/utils/offlineSync';
import TodoCategoryManager, { loadCategories } from '@/components/todos/TodoCategoryManager';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TodoCard from '@/components/todos/TodoCard';
import TodoModal from '@/components/todos/TodoModal';
import { cn } from '@/lib/utils';

const PRIORITY_ORDER = { dringend: 0, hoch: 1, mittel: 2, niedrig: 3 };

export default function Todos() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();

    useEffect(() => {
        const handleOnline = () => syncMutations(base44).catch(console.error);
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTodo, setSelectedTodo] = useState(null);
    const [statusFilter, setStatusFilter] = useState('offen');
    const [categoryFilter, setCategoryFilter] = useState('alle');
    const [priorityFilter, setPriorityFilter] = useState('alle');
    const [personFilter, setPersonFilter] = useState('alle');
    const [showArchived, setShowArchived] = useState(false);
    const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
    const [categories, setCategories] = useState(() => loadCategories());
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('priority'); // 'priority' | 'date' | 'manual'

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
    });

    const { data: user } = useQuery({
        queryKey: ['current-user'],
        queryFn: () => base44.auth.me()
    });

    const { data: todos = [], isLoading } = useQuery({
        queryKey: ['todos'],
        queryFn: () => base44.entities.TodoItem.list('-created_date', 200)
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            if (!navigator.onLine) {
                await queueMutation({ entityName: 'TodoItem', type: 'create', data });
                return { ...data, id: `offline-${Date.now()}`, _offline: true };
            }
            return base44.entities.TodoItem.create(data);
        },
        onSuccess: (newTodo) => {
            queryClient.setQueryData(['todos'], (old) => old ? [newTodo, ...old] : [newTodo]);
            if (!newTodo._offline) queryClient.invalidateQueries(['todos']);
            setModalOpen(false);
            setSelectedTodo(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            if (!navigator.onLine) {
                await queueMutation({ entityName: 'TodoItem', type: 'update', id, data });
                return { queued: true };
            }
            return base44.entities.TodoItem.update(id, data);
        },
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries(['todos']);
            const previous = queryClient.getQueryData(['todos']);
            queryClient.setQueryData(['todos'], (old) =>
                old.map(todo => todo.id === id ? { ...todo, ...data } : todo)
            );
            return { previous };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['todos'], context.previous);
        },
        onSuccess: (result) => {
            if (!result?.queued) queryClient.invalidateQueries(['todos']);
            setModalOpen(false);
            setSelectedTodo(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            if (!navigator.onLine) {
                await queueMutation({ entityName: 'TodoItem', type: 'delete', id });
                return { queued: true };
            }
            return base44.entities.TodoItem.delete(id);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries(['todos']);
            const previous = queryClient.getQueryData(['todos']);
            queryClient.setQueryData(['todos'], (old) => old.filter(todo => todo.id !== id));
            return { previous };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['todos'], context.previous);
        },
        onSuccess: (result) => {
            if (!result?.queued) queryClient.invalidateQueries(['todos']);
        }
    });

    const handleSave = (data, id) => {
        if (id) updateMutation.mutate({ id, data });
        else createMutation.mutate(data);
    };

    const handleQuickUpdate = (todo, changes) => {
        updateMutation.mutate({ id: todo.id, data: { ...todo, ...changes } });
    };

    const handleStatusChange = (todo, newStatus) => {
        const updates = { ...todo, status: newStatus };
        if (newStatus === 'erledigt' && todo.status !== 'erledigt') {
            updates.completed_by = user?.full_name || user?.email;
            updates.completed_at = new Date().toISOString();
        }
        updateMutation.mutate({ id: todo.id, data: updates });
    };

    const handleArchive = (id) => {
        if (confirm('Aufgabe archivieren?')) {
            updateMutation.mutate({ id, data: { is_archived: true } });
        }
    };

    const handleEdit = (todo) => {
        setSelectedTodo(todo);
        setModalOpen(true);
    };

    const handleDelete = (id) => {
        if (confirm('Aufgabe wirklich löschen?')) deleteMutation.mutate(id);
    };

    // Permission filter: if task is assigned, only show to that person or admin
    const currentUserName = user?.full_name || user?.email || '';
    const isAdmin = permissions.isAdmin || permissions.isManager;

    const visibleTodos = useMemo(() => todos.filter(todo => {
        const assignees = todo.assigned_to_names?.length > 0
            ? todo.assigned_to_names
            : todo.assigned_to ? [todo.assigned_to] : [];
        if (assignees.length === 0) return true;
        if (isAdmin) return true;
        return assignees.includes(currentUserName);
    }), [todos, currentUserName, isAdmin]);

    const activeTodos = visibleTodos.filter(t => !t.is_archived);
    const archivedTodos = visibleTodos.filter(t => t.is_archived);

    const allCategories = Array.from(new Set([
        ...categories,
        ...todos.map(t => t.category).filter(Boolean)
    ])).sort();

    const allAssignees = Array.from(new Set(
        todos.flatMap(t => t.assigned_to_names?.length > 0 ? t.assigned_to_names : t.assigned_to ? [t.assigned_to] : [])
    )).sort();

    const displayTodos = showArchived ? archivedTodos : activeTodos;

    const filteredTodos = useMemo(() => {
        let result = displayTodos.filter(todo => {
            const statusMatch = statusFilter === 'alle' ||
                (statusFilter === 'offen' && todo.status !== 'erledigt') ||
                todo.status === statusFilter;
            const categoryMatch = categoryFilter === 'alle' || todo.category === categoryFilter;
            const priorityMatch = priorityFilter === 'alle' || todo.priority === priorityFilter;
            const personMatch = personFilter === 'alle' || (() => {
                const assignees = todo.assigned_to_names?.length > 0 ? todo.assigned_to_names : todo.assigned_to ? [todo.assigned_to] : [];
                return assignees.includes(personFilter);
            })();
            const searchMatch = !searchQuery.trim() || (() => {
                const q = searchQuery.toLowerCase();
                const assignees = todo.assigned_to_names?.join(' ') || todo.assigned_to || '';
                return (
                    todo.title?.toLowerCase().includes(q) ||
                    todo.description?.toLowerCase().includes(q) ||
                    assignees.toLowerCase().includes(q)
                );
            })();
            return statusMatch && categoryMatch && priorityMatch && personMatch && searchMatch;
        });

        // Sort
        if (sortBy === 'priority') {
            result = [...result].sort((a, b) => {
                const pa = PRIORITY_ORDER[a.priority] ?? 2;
                const pb = PRIORITY_ORDER[b.priority] ?? 2;
                if (pa !== pb) return pa - pb;
                if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
                if (a.due_date) return -1;
                if (b.due_date) return 1;
                return 0;
            });
        } else if (sortBy === 'date') {
            result = [...result].sort((a, b) => {
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return a.due_date.localeCompare(b.due_date);
            });
        } else if (sortBy === 'manual') {
            result = [...result].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
        }

        return result;
    }, [displayTodos, statusFilter, categoryFilter, priorityFilter, personFilter, searchQuery, sortBy]);

    const openCount = activeTodos.filter(t => t.status === 'offen').length;
    const inProgressCount = activeTodos.filter(t => t.status === 'in_bearbeitung').length;
    const doneCount = activeTodos.filter(t => t.status === 'erledigt').length;

    const hasActiveFilters = searchQuery || categoryFilter !== 'alle' || priorityFilter !== 'alle' || personFilter !== 'alle' || statusFilter !== 'offen';

    const resetFilters = () => {
        setSearchQuery('');
        setCategoryFilter('alle');
        setPriorityFilter('alle');
        setPersonFilter('alle');
        setStatusFilter('offen');
    };

    if (!permissions.canViewTodos) {
        return <PermissionDenied message="Du hast keine Berechtigung, Aufgaben zu sehen." />;
    }

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Aufgaben</h1>
                        <p className="text-muted-foreground text-xs mt-0.5">
                            {openCount} offen · {inProgressCount} aktiv · {doneCount} erledigt
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {permissions.canEditTodos && (
                            <Button size="sm" variant="outline" onClick={() => setCategoryManagerOpen(true)}
                                className="h-9 border-border/50 text-muted-foreground">
                                <Tag className="w-4 h-4" />
                            </Button>
                        )}
                        <Button size="sm" onClick={() => { setSelectedTodo(null); setModalOpen(true); }}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 shadow-lg shadow-amber-500/20 h-9">
                            <Plus className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Neue Aufgabe</span>
                            <span className="sm:hidden">Neu</span>
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Suche nach Titel, Beschreibung, Person..."
                        className="pl-9 pr-9 h-10"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Tabs + Filters */}
                <div className="flex flex-col gap-2 mb-4">
                    <div className="flex gap-2 items-center">
                        <Tabs value={showArchived ? 'archiv' : 'aktiv'} onValueChange={(v) => setShowArchived(v === 'archiv')} className="flex-1">
                            <TabsList className="bg-card border border-border w-full grid grid-cols-2">
                                <TabsTrigger value="aktiv">Aktiv ({activeTodos.length})</TabsTrigger>
                                <TabsTrigger value="archiv">Archiv ({archivedTodos.length})</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        {/* Sort toggle */}
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="h-9 text-xs px-2 rounded-md border border-border bg-card text-foreground shrink-0"
                        >
                            <option value="priority">Priorität</option>
                            <option value="date">Datum</option>
                            <option value="manual">Manuell</option>
                        </select>
                    </div>

                    {!showArchived && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-wrap">
                            {/* Status */}
                            {['offen', 'in_bearbeitung', 'erledigt', 'alle'].map(s => (
                                <button key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap',
                                        statusFilter === s
                                            ? 'bg-amber-500 text-slate-900 border-amber-500'
                                            : 'border-border text-muted-foreground hover:text-foreground'
                                    )}>
                                    {s === 'offen' ? 'Offen' : s === 'in_bearbeitung' ? 'Aktiv' : s === 'erledigt' ? 'Erledigt' : 'Alle'}
                                </button>
                            ))}
                            <div className="w-px bg-border mx-1" />
                            {/* Priority */}
                            {[['alle', ''], ['dringend', '🔴'], ['hoch', '🟠'], ['mittel', '🔵'], ['niedrig', '⚪']].map(([p, icon]) => (
                                <button key={p}
                                    onClick={() => setPriorityFilter(p)}
                                    className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap',
                                        priorityFilter === p
                                            ? 'bg-amber-500 text-slate-900 border-amber-500'
                                            : 'border-border text-muted-foreground hover:text-foreground'
                                    )}>
                                    {icon} {p === 'alle' ? 'Alle Prio' : p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}

                    {!showArchived && (allCategories.length > 0 || allAssignees.length > 0) && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {/* Category */}
                            {['alle', ...allCategories].map(cat => (
                                <button key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap',
                                        categoryFilter === cat
                                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                            : 'border-border text-muted-foreground hover:text-foreground'
                                    )}>
                                    {cat === 'alle' ? 'Alle Kat.' : cat}
                                </button>
                            ))}
                            {allAssignees.length > 0 && <div className="w-px bg-border mx-1" />}
                            {allAssignees.map(p => (
                                <button key={p}
                                    onClick={() => setPersonFilter(personFilter === p ? 'alle' : p)}
                                    className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap',
                                        personFilter === p
                                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                                            : 'border-border text-muted-foreground hover:text-foreground'
                                    )}>
                                    👤 {p.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    )}

                    {hasActiveFilters && (
                        <button onClick={resetFilters} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 self-start">
                            <X className="w-3 h-3" /> Filter zurücksetzen
                        </button>
                    )}
                </div>

                {/* Todo List */}
                {!showArchived ? (
                    <div className="space-y-6">
                        {['offen', 'in_bearbeitung', 'erledigt'].map(status => {
                            const statusTodos = filteredTodos.filter(t => t.status === status);
                            if (statusTodos.length === 0) return null;
                            const statusLabels = {
                                'offen': '📋 Offen',
                                'in_bearbeitung': '⚡ In Bearbeitung',
                                'erledigt': '✅ Erledigt'
                            };
                            return (
                                <div key={status}>
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                                        {statusLabels[status]} ({statusTodos.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {statusTodos.map((todo, idx) => (
                                            <TodoCard
                                                key={todo.id}
                                                todo={todo}
                                                employees={employees}
                                                onStatusChange={handleStatusChange}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                onArchive={handleArchive}
                                                onQuickUpdate={handleQuickUpdate}
                                                showArchiveButton={todo.status === 'erledigt'}
                                                sortBy={sortBy}
                                                allTodos={filteredTodos.filter(t => t.status === status)}
                                                idx={idx}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredTodos.map(todo => (
                            <TodoCard
                                key={todo.id}
                                todo={todo}
                                employees={employees}
                                onStatusChange={handleStatusChange}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onArchive={handleArchive}
                                onQuickUpdate={handleQuickUpdate}
                                showArchiveButton={false}
                            />
                        ))}
                    </div>
                )}

                {filteredTodos.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">Keine Aufgaben</p>
                        <p className="text-sm mt-1">
                            {hasActiveFilters ? 'Keine Aufgaben entsprechen den Filtern' : 'Alle Aufgaben erledigt!'}
                        </p>
                    </div>
                )}

                <TodoCategoryManager
                    open={categoryManagerOpen}
                    onClose={() => { setCategoryManagerOpen(false); setCategories(loadCategories()); }}
                />

                <TodoModal
                    open={modalOpen}
                    onClose={() => { setModalOpen(false); setSelectedTodo(null); }}
                    todo={selectedTodo}
                    employees={employees}
                    onSave={handleSave}
                    currentUser={user}
                />
            </div>
        </div>
    );
}