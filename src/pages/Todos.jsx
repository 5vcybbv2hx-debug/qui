import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Filter, CheckSquare, Archive } from 'lucide-react';
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
    const [filter, setFilter] = useState('offen');
    const [showArchived, setShowArchived] = useState(false);

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
        onSuccess: () => {
            queryClient.invalidateQueries(['todos']);
            setModalOpen(false);
            setSelectedTodo(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.TodoItem.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['todos']);
            setModalOpen(false);
            setSelectedTodo(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.TodoItem.delete(id),
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
        if (filter === 'alle') return true;
        if (filter === 'offen') return todo.status !== 'erledigt';
        return todo.status === filter;
    });

    const openCount = activeTodos.filter(t => t.status === 'offen').length;
    const inProgressCount = activeTodos.filter(t => t.status === 'in_bearbeitung').length;
    const doneCount = activeTodos.filter(t => t.status === 'erledigt').length;

    if (!permissions.canViewTodos) {
        return <PermissionDenied message="Du hast keine Berechtigung, Aufgaben zu sehen." />;
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Aufgaben</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {openCount} offen · {inProgressCount} in Bearbeitung · {doneCount} erledigt
                        </p>
                    </div>
                    {permissions.canEditTodos && (
                        <Button 
                            onClick={() => {
                                setSelectedTodo(null);
                                setModalOpen(true);
                            }}
                            className="bg-slate-800 hover:bg-slate-900"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Neue Aufgabe
                        </Button>
                    )}
                </div>

                {/* Archive Toggle */}
                <div className="flex gap-2 mb-6">
                    <Button
                        variant={!showArchived ? "secondary" : "outline"}
                        onClick={() => setShowArchived(false)}
                        className="flex-1 border-slate-700"
                    >
                        Aktiv ({activeTodos.length})
                    </Button>
                    <Button
                        variant={showArchived ? "secondary" : "outline"}
                        onClick={() => setShowArchived(true)}
                        className="flex-1 border-slate-700"
                    >
                        <Archive className="w-4 h-4 mr-2" />
                        Archiv ({archivedTodos.length})
                    </Button>
                </div>

                {/* Filter Tabs */}
                {!showArchived && (
                    <Tabs value={filter} onValueChange={setFilter} className="mb-6">
                        <TabsList className="bg-slate-800 shadow-sm w-full grid grid-cols-4 border border-slate-700">
                            <TabsTrigger value="offen" className="text-xs sm:text-sm">Offen ({openCount})</TabsTrigger>
                            <TabsTrigger value="in_bearbeitung" className="text-xs sm:text-sm">In Arb. ({inProgressCount})</TabsTrigger>
                            <TabsTrigger value="erledigt" className="text-xs sm:text-sm">Erledigt ({doneCount})</TabsTrigger>
                            <TabsTrigger value="alle" className="text-xs sm:text-sm">Alle</TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}

                {/* Todo List */}
                <div className="space-y-3">
                    {filteredTodos.map(todo => (
                        <TodoCard
                            key={todo.id}
                            todo={todo}
                            onStatusChange={handleStatusChange}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onArchive={handleArchive}
                            showArchiveButton={!showArchived && todo.status === 'erledigt'}
                        />
                    ))}
                    
                    {filteredTodos.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-lg font-medium">Keine Aufgaben</p>
                            <p className="text-sm mt-1">
                                {filter === 'offen' ? 'Alle Aufgaben sind erledigt!' : 'Keine Aufgaben in dieser Kategorie'}
                            </p>
                        </div>
                    )}
                </div>

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