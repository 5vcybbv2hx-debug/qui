import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function RoomManager({ rooms, onRoomCreated }) {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '', capacity: '' });

    const saveMutation = useMutation({
        mutationFn: (data) =>
            editingRoom
                ? base44.entities.Room.update(editingRoom.id, data)
                : base44.entities.Room.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            setShowModal(false);
            setEditingRoom(null);
            setFormData({ name: '', description: '', capacity: '' });
            onRoomCreated?.();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Room.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
        }
    });

    const handleEdit = (room) => {
        setEditingRoom(room);
        setFormData({ name: room.name, description: room.description || '', capacity: room.capacity || '' });
        setShowModal(true);
    };

    const handleNew = () => {
        setEditingRoom(null);
        setFormData({ name: '', description: '', capacity: '' });
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    return (
        <>
            <div className="grid gap-3 mb-6">
                {rooms.map(room => (
                    <Card key={room.id} className="bg-card border-border hover:border-primary/50 transition-all">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-foreground">{room.name}</h3>
                                    {room.description && (
                                        <p className="text-sm text-muted-foreground mt-1">{room.description}</p>
                                    )}
                                    {room.capacity && (
                                        <p className="text-sm text-muted-foreground">Kapazität: {room.capacity} Personen</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleEdit(room)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={() => deleteMutation.mutate(room.id)}
                                        variant="outline"
                                        size="sm"
                                        className="border-destructive text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Button
                    onClick={handleNew}
                    className="bg-primary hover:bg-primary/90 w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Neuer Raum
                </Button>
            </div>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingRoom ? `Raum bearbeiten: ${editingRoom.name}` : 'Neuer Raum'}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-foreground">Name</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="z.B. Innenraum, Terrasse, VIP-Bereich"
                                className="mt-1 bg-background border-border"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground">Beschreibung (optional)</label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="z.B. Klimatisierter Raum mit Fensterplätzen"
                                className="mt-1 bg-background border-border h-20"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground">Kapazität (optional)</label>
                            <Input
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                                placeholder="z.B. 50"
                                className="mt-1 bg-background border-border"
                            />
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button
                                type="button"
                                onClick={() => setShowModal(false)}
                                variant="outline"
                                className="flex-1"
                            >
                                Abbrechen
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-primary hover:bg-primary/90"
                            >
                                Speichern
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}