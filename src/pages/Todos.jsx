import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Filter, CheckSquare } from 'lucide-react';
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

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.filter({ is_active: true })
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
        updateMutation.mutate({
            id: todo.id,
            data: { ...todo, status: newStatus }
        });
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

    const filteredTodos = todos.filter(todo => {
        if (filter === 'alle') return true;
        if (filter === 'offen') return todo.status !== 'erledigt';
        return todo.status === filter;
    });

    const openCount = todos.filter(t => t.status === 'offen').length;
    const inProgressCount = todos.filter(t => t.status === 'in_bearbeitung').length;
    const doneCount = todos.filter(t => t.status === 'erledigt').length;

    if (!permissions.canViewTodos) {
        return <PermissionDenied message="Du hast keine Berechtigung, Aufgaben zu sehen." />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Aufgaben</h1>
                        <p className="text-slate-500 text-sm mt-1">
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

                {/* Filter Tabs */}
                <Tabs value={filter} onValueChange={setFilter} className="mb-6">
                    <TabsList className="bg-white shadow-sm">
                        <TabsTrigger value="offen">Offen ({openCount})</TabsTrigger>
                        <TabsTrigger value="in_bearbeitung">In Bearbeitung ({inProgressCount})</TabsTrigger>
                        <TabsTrigger value="erledigt">Erledigt ({doneCount})</TabsTrigger>
                        <TabsTrigger value="alle">Alle</TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Todo List */}
                <div className="space-y-3">
                    {filteredTodos.map(todo => (
                        <TodoCard
                            key={todo.id}
                            todo={todo}
                            onStatusChange={handleStatusChange}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
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