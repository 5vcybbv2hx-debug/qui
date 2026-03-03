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

function getDefaultPosition(index, total) {
    const cols = Math.ceil(Math.sqrt(Math.max(total, 1)));
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
        x: 70 + col * 110,
        y: 70 + row * 110
    };
}

function TableShape({ posX, posY, table, isReserved, isSelected, onMouseDown, onClick }) {
    const size = TABLE_SIZES[table.shape] || TABLE_SIZES.square;
    const isRound = table.shape === 'round';

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
                userSelect: 'none'
            }}
            onMouseDown={onMouseDown}
            onClick={onClick}
        >
            <div className={cn(
                'w-full h-full flex flex-col items-center justify-center border-2 select-none shadow-md transition-shadow hover:shadow-xl',
                isRound ? 'rounded-full' : 'rounded-xl',
                isSelected ? 'ring-2 ring-amber-400/70' : '',
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

export default function FloorPlanView({ tables, getTableReservation, onTableClick }) {
    const queryClient = useQueryClient();
    const canvasRef = useRef(null);
    const [selectedTableId, setSelectedTableId] = useState(null);
    const [positions, setPositions] = useState({});
    const positionsRef = useRef({});

    const tableIds = tables.map(t => t.id).join(',');

    // Initialize positions from table data whenever the table list changes
    useEffect(() => {
        const init = {};
        tables.forEach((t, i) => {
            init[t.id] = {
                x: t.position_x ?? getDefaultPosition(i, tables.length).x,
                y: t.position_y ?? getDefaultPosition(i, tables.length).y
            };
        });
        positionsRef.current = init;
        setPositions({ ...init });
        setSelectedTableId(null);
    }, [tableIds]);

    const updateMutation = useMutation({
        mutationFn: ({ id, position_x, position_y }) =>
            base44.entities.Table.update(id, { position_x, position_y }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] })
    });

    const handleMouseDown = (e, tableId) => {
        e.preventDefault();
        e.stopPropagation();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const startClientX = e.clientX;
        const startClientY = e.clientY;
        const origPos = { ...positionsRef.current[tableId] };
        let hasMoved = false;

        const onMouseMove = (mv) => {
            const dx = mv.clientX - startClientX;
            const dy = mv.clientY - startClientY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                hasMoved = true;
            }

            const canvasRect = canvas.getBoundingClientRect();
            const newX = Math.max(30, Math.min(canvasRect.width - 30, origPos.x + dx));
            const newY = Math.max(30, Math.min(canvasRect.height - 30, origPos.y + dy));

            positionsRef.current = { ...positionsRef.current, [tableId]: { x: newX, y: newY } };
            setPositions(prev => ({ ...prev, [tableId]: { x: newX, y: newY } }));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            if (hasMoved) {
                const pos = positionsRef.current[tableId];
                updateMutation.mutate({
                    id: tableId,
                    position_x: Math.round(pos.x),
                    position_y: Math.round(pos.y)
                });
            }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const today = format(new Date(), 'EEEE, d. MMMM', { locale: de });

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-muted-foreground">Tische per Drag & Drop positionieren – wird automatisch gespeichert</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">{today}</span>
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

                {tables.map((table) => {
                    const pos = positions[table.id];
                    if (!pos) return null;
                    const reservation = getTableReservation(table.id);
                    return (
                        <TableShape
                            key={table.id}
                            table={table}
                            posX={pos.x}
                            posY={pos.y}
                            isReserved={!!reservation}
                            isSelected={selectedTableId === table.id}
                            onMouseDown={(e) => handleMouseDown(e, table.id)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTableId(table.id);
                                onTableClick(table);
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}