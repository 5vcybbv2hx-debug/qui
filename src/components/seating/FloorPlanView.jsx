import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TABLE_SIZES = {
    square: { w: 60, h: 60 },
    rectangle_horizontal: { w: 90, h: 55 },
    rectangle_vertical: { w: 55, h: 90 },
    round: { w: 60, h: 60 }
};

function TableShape({ table, isReserved, isSelected, onClick, onDragStart }) {
    const size = TABLE_SIZES[table.shape] || TABLE_SIZES.square;
    const isRound = table.shape === 'round';

    return (
        <div
            style={{
                position: 'absolute',
                left: (table.position_x || 80),
                top: (table.position_y || 80),
                width: size.w,
                height: size.h,
                transform: 'translate(-50%, -50%)',
                cursor: 'grab',
                zIndex: isSelected ? 20 : 10
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onDragStart(e, table);
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClick(table);
            }}
        >
            <div className={cn(
                'w-full h-full flex flex-col items-center justify-center border-2 select-none shadow-md transition-shadow hover:shadow-lg',
                isRound ? 'rounded-full' : 'rounded-lg',
                isSelected ? 'border-amber-400 ring-2 ring-amber-400/50' : '',
                isReserved
                    ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                    : 'bg-blue-500/20 border-blue-400 text-blue-100'
            )}>
                <span className="text-xs font-bold leading-tight text-center px-1">
                    {table.table_number}
                </span>
                <span className="text-[10px] opacity-70">{table.capacity}P</span>
            </div>
            {isReserved && (
                <div className="absolute -top-2 -right-2 w-3 h-3 bg-rose-500 rounded-full border border-background" />
            )}
        </div>
    );
}

export default function FloorPlanView({ tables, reservations, getTableReservation, onTableClick }) {
    const queryClient = useQueryClient();
    const canvasRef = useRef(null);
    const [selectedTableId, setSelectedTableId] = useState(null);
    const dragging = useRef(null);
    const [localPositions, setLocalPositions] = useState({});

    const updateMutation = useMutation({
        mutationFn: ({ id, position_x, position_y }) =>
            base44.entities.Table.update(id, { position_x, position_y }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] })
    });

    const handleDragStart = useCallback((e, table) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        const startX = e.clientX - rect.left;
        const startY = e.clientY - rect.top;
        const origX = localPositions[table.id]?.x ?? table.position_x ?? 80;
        const origY = localPositions[table.id]?.y ?? table.position_y ?? 80;

        dragging.current = { table, startX, startY, origX, origY };

        const handleMove = (moveEvent) => {
            if (!dragging.current) return;
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (!canvasRect) return;
            const dx = moveEvent.clientX - canvasRect.left - dragging.current.startX;
            const dy = moveEvent.clientY - canvasRect.top - dragging.current.startY;
            const newX = Math.max(30, Math.min(canvasRect.width - 30, dragging.current.origX + dx));
            const newY = Math.max(30, Math.min(canvasRect.height - 30, dragging.current.origY + dy));

            setLocalPositions(prev => ({
                ...prev,
                [table.id]: { x: newX, y: newY }
            }));
        };

        const handleUp = () => {
            if (dragging.current) {
                const pos = localPositions[dragging.current.table.id];
                if (pos) {
                    updateMutation.mutate({
                        id: dragging.current.table.id,
                        position_x: Math.round(pos.x),
                        position_y: Math.round(pos.y)
                    });
                }
            }
            dragging.current = null;
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    }, [localPositions, updateMutation]);

    const getPosition = (table) => ({
        position_x: localPositions[table.id]?.x ?? table.position_x ?? 80,
        position_y: localPositions[table.id]?.y ?? table.position_y ?? 80
    });

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Tische per Drag & Drop positionieren – Positionen werden automatisch gespeichert</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-blue-400/60 border border-blue-400 inline-block" />
                        Frei
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-rose-400/60 border border-rose-400 inline-block" />
                        Reserviert
                    </span>
                </div>
            </div>
            <div
                ref={canvasRef}
                className="relative w-full bg-card border border-border rounded-xl overflow-hidden"
                style={{ height: '520px' }}
                onClick={() => setSelectedTableId(null)}
            >
                {/* Grid pattern */}
                <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {tables.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                        Keine Tische in diesem Raum. Bitte zuerst Tische anlegen.
                    </div>
                )}

                {tables.map(table => {
                    const pos = getPosition(table);
                    const reservation = getTableReservation(table.id);
                    return (
                        <TableShape
                            key={table.id}
                            table={{ ...table, ...pos }}
                            isReserved={!!reservation}
                            isSelected={selectedTableId === table.id}
                            onClick={(t) => {
                                setSelectedTableId(t.id);
                                onTableClick(t);
                            }}
                            onDragStart={handleDragStart}
                        />
                    );
                })}
            </div>
        </div>
    );
}