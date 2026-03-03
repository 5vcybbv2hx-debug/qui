import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const TABLE_SIZES = {
    square: { w: 60, h: 60 },
    rectangle_horizontal: { w: 90, h: 55 },
    rectangle_vertical: { w: 55, h: 90 },
    round: { w: 60, h: 60 }
};

// Spread tables that have no saved position across the canvas
function getDefaultPosition(index, total, canvasW = 700, canvasH = 520) {
    const cols = Math.ceil(Math.sqrt(total));
    const col = index % cols;
    const row = Math.floor(index / cols);
    const spacingX = Math.min(110, (canvasW - 80) / Math.max(cols, 1));
    const spacingY = Math.min(110, (canvasH - 80) / Math.max(Math.ceil(total / cols), 1));
    return {
        x: 60 + col * spacingX,
        y: 60 + row * spacingY
    };
}

function TableShape({ table, defaultIndex, defaultTotal, isReserved, isSelected, onClick, onDragStart }) {
    const size = TABLE_SIZES[table.shape] || TABLE_SIZES.square;
    const isRound = table.shape === 'round';

    const posX = table.position_x ?? getDefaultPosition(defaultIndex, defaultTotal).x;
    const posY = table.position_y ?? getDefaultPosition(defaultIndex, defaultTotal).y;

    return (
        <div
            style={{
                position: 'absolute',
                left: posX,
                top: posY,
                width: size.w,
                height: size.h,
                transform: 'translate(-50%, -50%)',
                cursor: 'grab',
                zIndex: isSelected ? 20 : 10,
                touchAction: 'none'
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
                'w-full h-full flex flex-col items-center justify-center border-2 select-none shadow-md transition-all hover:shadow-xl hover:scale-105',
                isRound ? 'rounded-full' : 'rounded-xl',
                isSelected ? 'ring-2 ring-amber-400/70 ring-offset-1' : '',
                isReserved
                    ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                    : 'bg-blue-500/20 border-blue-400/80 text-blue-100'
            )}>
                <span className="text-xs font-bold leading-tight text-center px-1">
                    {table.table_number}
                </span>
                <span className="text-[10px] opacity-60">{table.capacity}P</span>
            </div>
            {isReserved && (
                <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-background" />
            )}
        </div>
    );
}

export default function FloorPlanView({ tables, reservations, getTableReservation, onTableClick }) {
    const queryClient = useQueryClient();
    const canvasRef = useRef(null);
    const [selectedTableId, setSelectedTableId] = useState(null);
    // Use a ref to always have the latest positions in event handlers
    const localPositionsRef = useRef({});
    const [localPositions, setLocalPositions] = useState({});
    const draggingRef = useRef(null);

    // Reset local positions when the table list changes (e.g. room switch)
    useEffect(() => {
        localPositionsRef.current = {};
        setLocalPositions({});
        setSelectedTableId(null);
    }, [tables.map(t => t.id).join(',')]);

    const updateMutation = useMutation({
        mutationFn: ({ id, position_x, position_y }) =>
            base44.entities.Table.update(id, { position_x, position_y }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] })
    });

    const handleDragStart = (e, table) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const startClientX = e.clientX;
        const startClientY = e.clientY;

        const currentPos = localPositionsRef.current[table.id];
        const origX = currentPos?.x ?? table.position_x ?? getDefaultPosition(tables.indexOf(table), tables.length).x;
        const origY = currentPos?.y ?? table.position_y ?? getDefaultPosition(tables.indexOf(table), tables.length).y;

        draggingRef.current = { tableId: table.id, origX, origY, startClientX, startClientY };
        let moved = false;

        const handleMove = (mv) => {
            if (!draggingRef.current) return;
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (!canvasRect) return;
            const dx = mv.clientX - draggingRef.current.startClientX;
            const dy = mv.clientY - draggingRef.current.startClientY;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
            const newX = Math.max(30, Math.min(canvasRect.width - 30, draggingRef.current.origX + dx));
            const newY = Math.max(30, Math.min(canvasRect.height - 30, draggingRef.current.origY + dy));
            const updated = { ...localPositionsRef.current, [table.id]: { x: newX, y: newY } };
            localPositionsRef.current = updated;
            setLocalPositions({ ...updated });
        };

        const handleUp = () => {
            if (draggingRef.current && moved) {
                const pos = localPositionsRef.current[draggingRef.current.tableId];
                if (pos) {
                    updateMutation.mutate({
                        id: draggingRef.current.tableId,
                        position_x: Math.round(pos.x),
                        position_y: Math.round(pos.y)
                    });
                }
            }
            draggingRef.current = null;
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    const getTableWithPosition = (table, index) => {
        const local = localPositions[table.id];
        return {
            ...table,
            position_x: local ? local.x : (table.position_x ?? getDefaultPosition(index, tables.length).x),
            position_y: local ? local.y : (table.position_y ?? getDefaultPosition(index, tables.length).y)
        };
    };

    const today = format(new Date(), 'EEEE, d. MMMM', { locale: de });

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-muted-foreground">Tische per Drag & Drop positionieren – wird automatisch gespeichert</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">Reservierungen: {today}</span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-blue-400/60 border border-blue-400 inline-block" />
                        Frei
                    </span>
                    <span className="flex items-center gap-1.5">
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

                {tables.map((table, index) => {
                    const tWithPos = getTableWithPosition(table, index);
                    const reservation = getTableReservation(table.id);
                    return (
                        <TableShape
                            key={table.id}
                            table={tWithPos}
                            defaultIndex={index}
                            defaultTotal={tables.length}
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