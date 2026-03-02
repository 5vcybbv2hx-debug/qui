import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Zap } from 'lucide-react';

export default function LayoutSuggestion({ room, tables, onClose, open }) {
    const queryClient = useQueryClient();
    const [positions, setPositions] = useState({});
    const [spacing, setSpacing] = useState(100);
    const [previewMode, setPreviewMode] = useState(true);

    const updateMutation = useMutation({
        mutationFn: (updates) =>
            Promise.all(
                updates.map(({ id, data }) =>
                    base44.entities.Table.update(id, data)
                )
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            onClose();
        }
    });

    const roomTables = useMemo(() => {
        return tables.filter(t => t.room === room.name);
    }, [tables, room]);

    const calculateLayout = useMemo(() => {
        if (roomTables.length === 0) return {};

        const cols = Math.ceil(Math.sqrt(roomTables.length));
        const rows = Math.ceil(roomTables.length / cols);
        const spacing_px = spacing;
        const startX = 50;
        const startY = 50;

        const layout = {};
        roomTables.forEach((table, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            layout[table.id] = {
                x: startX + col * spacing_px,
                y: startY + row * spacing_px
            };
        });

        return layout;
    }, [roomTables, spacing]);

    const handleApply = () => {
        const updates = roomTables.map(table => ({
            id: table.id,
            data: {
                position_x: calculateLayout[table.id].x,
                position_y: calculateLayout[table.id].y
            }
        }));
        updateMutation.mutate(updates);
    };

    const handlePositionChange = (tableId, x, y) => {
        setPositions(prev => ({
            ...prev,
            [tableId]: { x, y }
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-96 overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Layout-Vorschlag für {room.name}</DialogTitle>
                </DialogHeader>

                {roomTables.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <p className="text-sm text-yellow-700">Keine Tische in diesem Raum definiert</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                                <Zap className="h-4 w-4" />
                                Abstände anpassen ({spacing}px)
                            </label>
                            <Slider
                                value={[spacing]}
                                onValueChange={(val) => setSpacing(val[0])}
                                min={60}
                                max={200}
                                step={10}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Passen Sie den Abstand zwischen den Tischen an
                            </p>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6 overflow-auto max-h-64">
                            <div className="relative" style={{ width: '600px', height: '400px' }}>
                                <svg width="100%" height="100%" style={{ border: '1px solid hsl(var(--border))' }}>
                                    {roomTables.map(table => {
                                        const layout = calculateLayout[table.id];
                                        const pos = positions[table.id] || layout;

                                        let size = 40;
                                        if (table.shape === 'rectangle_horizontal') {
                                            size = 50;
                                        } else if (table.shape === 'rectangle_vertical') {
                                            size = 50;
                                        }

                                        return (
                                            <g
                                                key={table.id}
                                                onMouseDown={(e) => {
                                                    const svg = e.currentTarget.ownerSVGElement;
                                                    const rect = svg.getBoundingClientRect();
                                                    const startX = e.clientX - rect.left;
                                                    const startY = e.clientY - rect.top;
                                                    const prevPos = pos;

                                                    const handleMove = (moveEvent) => {
                                                        const newX = Math.max(0, prevPos.x + (moveEvent.clientX - e.clientX));
                                                        const newY = Math.max(0, prevPos.y + (moveEvent.clientY - e.clientY));
                                                        handlePositionChange(table.id, newX, newY);
                                                    };

                                                    const handleUp = () => {
                                                        document.removeEventListener('mousemove', handleMove);
                                                        document.removeEventListener('mouseup', handleUp);
                                                    };

                                                    document.addEventListener('mousemove', handleMove);
                                                    document.addEventListener('mouseup', handleUp);
                                                }}
                                                style={{ cursor: 'grab' }}
                                            >
                                                {table.shape === 'round' ? (
                                                    <circle
                                                        cx={pos.x}
                                                        cy={pos.y}
                                                        r={size / 2}
                                                        fill="rgb(59 130 246 / 0.2)"
                                                        stroke="rgb(59 130 246)"
                                                        strokeWidth="2"
                                                    />
                                                ) : table.shape === 'rectangle_horizontal' ? (
                                                    <rect
                                                        x={pos.x - 25}
                                                        y={pos.y - 15}
                                                        width={50}
                                                        height={30}
                                                        fill="rgb(59 130 246 / 0.2)"
                                                        stroke="rgb(59 130 246)"
                                                        strokeWidth="2"
                                                        rx="4"
                                                    />
                                                ) : table.shape === 'rectangle_vertical' ? (
                                                    <rect
                                                        x={pos.x - 15}
                                                        y={pos.y - 25}
                                                        width={30}
                                                        height={50}
                                                        fill="rgb(59 130 246 / 0.2)"
                                                        stroke="rgb(59 130 246)"
                                                        strokeWidth="2"
                                                        rx="4"
                                                    />
                                                ) : (
                                                    <rect
                                                        x={pos.x - size / 2}
                                                        y={pos.y - size / 2}
                                                        width={size}
                                                        height={size}
                                                        fill="rgb(59 130 246 / 0.2)"
                                                        stroke="rgb(59 130 246)"
                                                        strokeWidth="2"
                                                        rx="4"
                                                    />
                                                )}
                                                <text
                                                    x={pos.x}
                                                    y={pos.y}
                                                    textAnchor="middle"
                                                    dy="0.3em"
                                                    fontSize="12"
                                                    fill="rgb(30 41 59)"
                                                    fontWeight="bold"
                                                >
                                                    {table.table_number}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Tische können gezogen werden, um die Anordnung anzupassen
                            </p>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button
                                type="button"
                                onClick={onClose}
                                variant="outline"
                                className="flex-1"
                            >
                                Abbrechen
                            </Button>
                            <Button
                                onClick={handleApply}
                                className="flex-1 bg-primary hover:bg-primary/90"
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? 'Speichert...' : 'Layout speichern'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}