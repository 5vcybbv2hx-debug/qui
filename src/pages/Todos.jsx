import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckSquare, Tag } from 'lucide-react';
import TodoCategoryManager, { loadCategories } from '@/components/todos/TodoCategoryManager';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TodoCard from '@/components/todos/TodoCard';
import TodoModal from '@/components/todos/TodoModal';

export default function Todos() {
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTodo, setSelectedTodo] = useState(null);
    const [statusFilter, setStatusFilter] = useState('offen');
    const [categoryFilter, setCategoryFilter] = useState('alle');
    const [showArchived, setShowArchived] = useState(false);
    const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
    const [categories, setCategories] = useState(() => loadCategories());

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
        queryFn: () => base44.entities.TodoItem.list('-created_date', 100)
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.TodoItem.create(data),
        onSuccess: (newTodo) => {
            queryClient.setQueryData(['todos'], (old) => 
                old ? [newTodo, ...old] : [newTodo]
            );
            queryClient.invalidateQueries(['todos']);
            setModalOpen(false);
            setSelectedTodo(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.TodoItem.update(id, data),
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
        onSuccess: () => {
            queryClient.invalidateQueries(['todos']);
            setModalOpen(false);
            setSelectedTodo(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.TodoItem.delete(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries(['todos']);
            const previous = queryClient.getQueryData(['todos']);
            queryClient.setQueryData(['todos'], (old) => 
                old.filter(todo => todo.id !== id)
            );
            return { previous };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['todos'], context.previous);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['todos']);
        }
    });

    const handleSave = (data, id) => {
        if (id) {
            updateMutation.mutate({ id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleStatusChange = (todo, newStatus) => {
        const updates = { ...todo, status: newStatus };
        
        // Wenn Status auf "erledigt" gesetzt wird, speichere wer und wann
        if (newStatus === 'erledigt' && todo.status !== 'erledigt') {
            updates.completed_by = user?.full_name || user?.email;
            updates.completed_at = new Date().toISOString();
        }
        
        updateMutation.mutate({
            id: todo.id,
            data: updates
        });
    };

    const handleArchive = (id) => {
        if (confirm('Aufgabe archivieren?')) {
            updateMutation.mutate({
                id,
                data: { is_archived: true }
            });
        }
    };

    const handleEdit = (todo) => {
        setSelectedTodo(todo);
        setModalOpen(true);
    };

    const handleDelete = (id) => {
        if (confirm('Aufgabe wirklich löschen?')) {
            deleteMutation.mutate(id);
        }
    };

    const activeTodos = todos.filter(t => !t.is_archived);
    const archivedTodos = todos.filter(t => t.is_archived);

    const displayTodos = showArchived ? archivedTodos : activeTodos;

    const filteredTodos = displayTodos.filter(todo => {
        const statusMatch = statusFilter === 'alle' || 
                           (statusFilter === 'offen' && todo.status !== 'erledigt') ||
                           todo.status === statusFilter;
        const categoryMatch = categoryFilter === 'alle' || todo.category === categoryFilter;
        return statusMatch && categoryMatch;
    });

    const openCount = activeTodos.filter(t => t.status === 'offen').length;
    const inProgressCount = activeTodos.filter(t => t.status === 'in_bearbeitung').length;
    const doneCount = activeTodos.filter(t => t.status === 'erledigt').length;

    if (!permissions.canViewTodos) {
        return <PermissionDenied message="Du hast keine Berechtigung, Aufgaben zu sehen." />;
    }

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-0">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-5 sm:mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Aufgaben</h1>
                        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                             <span className="hidden sm:inline">{openCount} offen · {inProgressCount} in Bearbeitung · {doneCount} erledigt</span>
                             <span className="sm:hidden">{openCount}|{inProgressCount}|{doneCount}</span>
                         </p>
                    </div>
                    {permissions.canEditTodos && (
                         <Button 
                             size="sm"
                             onClick={() => {
                                 setSelectedTodo(null);
                                 setModalOpen(true);
                             }}
                             className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 shadow-lg shadow-amber-500/20 text-xs h-9"
                         >
                             <Plus className="w-4 h-4 mr-1" />
                             <span className="hidden sm:inline">Neue Aufgabe</span>
                             <span className="sm:hidden">Neu</span>
                         </Button>
                     )}
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-3 mb-6">
                    <Tabs value={showArchived ? 'archiv' : 'aktiv'} onValueChange={(v) => setShowArchived(v === 'archiv')}>
                        <TabsList className="bg-card border border-border w-full grid grid-cols-2">
                            <TabsTrigger value="aktiv">Aktiv ({activeTodos.length})</TabsTrigger>
                            <TabsTrigger value="archiv">Archiv ({archivedTodos.length})</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    
                    {!showArchived && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {['alle', 'Einkauf', 'Reparatur', 'Event', 'Sonstiges'].map(cat => {
                                const count = activeTodos.filter(t => cat === 'alle' || t.category === cat).length;
                                return (
                                    <Button
                                        key={cat}
                                        variant={categoryFilter === cat ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCategoryFilter(cat)}
                                        className={categoryFilter === cat ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 border-0 shadow-lg shadow-amber-500/20" : "border-slate-700/50 text-slate-300 hover:bg-slate-800/50"}
                                    >
                                        {cat === 'alle' ? 'Alle' : cat} ({count})
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Todo List - Grouped by Status */}
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
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                                        {statusLabels[status]} ({statusTodos.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {statusTodos.map(todo => (
                                            <TodoCard
                                                key={todo.id}
                                                todo={todo}
                                                onStatusChange={handleStatusChange}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                onArchive={handleArchive}
                                                showArchiveButton={todo.status === 'erledigt'}
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
                                onStatusChange={handleStatusChange}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onArchive={handleArchive}
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
                            {categoryFilter !== 'alle' ? 'Keine Aufgaben in dieser Kategorie' : 'Alle Aufgaben erledigt!'}
                        </p>
                    </div>
                )}

                {/* Modal */}
                <TodoModal
                    open={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedTodo(null);
                    }}
                    todo={selectedTodo}
                    employees={employees}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
}