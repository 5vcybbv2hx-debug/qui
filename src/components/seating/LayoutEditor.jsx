import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Save, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LayoutEditor({ roomId, open, onClose }) {
    const [layoutName, setLayoutName] = useState('Standard');
    const [floorPlanUrl, setFloorPlanUrl] = useState('');
    const [tablePositions, setTablePositions] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const canvasRef = useRef(null);
    const queryClient = useQueryClient();

    const { data: tables = [] } = useQuery({
        queryKey: ['tables', roomId],
        queryFn: () => base44.entities.Table.filter({ room: roomId, is_active: true }),
        enabled: !!roomId
    });

    const { data: layout } = useQuery({
        queryKey: ['seating-layout', roomId],
        queryFn: async () => {
            const layouts = await base44.entities.SeatingLayout.filter({ room_id: roomId });
            return layouts[0] || null;
        },
        enabled: !!roomId
    });

    React.useEffect(() => {
        if (layout) {
            setLayoutName(layout.layout_name);
            setFloorPlanUrl(layout.floor_plan_url);
            setTablePositions(layout.tables || []);
        }
    }, [layout]);

    const handleFloorPlanUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setFloorPlanUrl(file_url);
        } catch (error) {
            console.error('Upload fehlgeschlagen:', error);
        }
    };

    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Prüfe ob ein Tisch in der Nähe geklickt wurde
        const clickedTable = tablePositions.find(tp => {
            const distance = Math.sqrt((tp.x - x) ** 2 + (tp.y - y) ** 2);
            return distance < 30; // 30px Radius
        });

        if (clickedTable) {
            setSelectedTable(clickedTable);
        }
    };

    const handleDragStart = (e, tableId) => {
        const table = tablePositions.find(t => t.table_id === tableId);
        if (table) {
            setSelectedTable(table);
        }
    };

    const addTableToLayout = (table) => {
        if (tablePositions.some(t => t.table_id === table.id)) return;
        
        setTablePositions(prev => [...prev, {
            table_id: table.id,
            table_number: table.table_number,
            x: 100 + prev.length * 30,
            y: 100 + prev.length * 30,
            rotation: 0
        }]);
    };

    const updateTablePosition = (tableId, x, y, rotation = 0) => {
        setTablePositions(prev => 
            prev.map(t => t.table_id === tableId ? { ...t, x, y, rotation } : t)
        );
    };

    const removeTableFromLayout = (tableId) => {
        setTablePositions(prev => prev.filter(t => t.table_id !== tableId));
        setSelectedTable(null);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const layoutData = {
                room_id: roomId,
                room_name: '', // wird vom Backend gesetzt
                layout_name: layoutName,
                floor_plan_url: floorPlanUrl,
                tables: tablePositions
            };

            if (layout?.id) {
                return base44.entities.SeatingLayout.update(layout.id, layoutData);
            } else {
                return base44.entities.SeatingLayout.create(layoutData);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seating-layout', roomId] });
            onClose();
        }
    });

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tischplan Editor</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Layout Name */}
                    <div className="space-y-2">
                        <Label>Layout-Name</Label>
                        <Input
                            value={layoutName}
                            onChange={(e) => setLayoutName(e.target.value)}
                            placeholder="z.B. Standard, Event-Setup"
                        />
                    </div>

                    {/* Floor Plan Upload */}
                    <div className="space-y-2">
                        <Label>Grundriss (PDF/Bild)</Label>
                        <div className="flex gap-2">
                            <label className="flex-1">
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFloorPlanUpload}
                                    className="hidden"
                                />
                                <Button variant="outline" className="w-full" asChild>
                                    <span><Upload className="w-4 h-4 mr-2" />Grundriss hochladen</span>
                                </Button>
                            </label>
                        </div>
                        {floorPlanUrl && <p className="text-xs text-green-600">✓ Grundriss hochgeladen</p>}
                    </div>

                    {/* Canvas mit Grundriss */}
                    {floorPlanUrl && (
                        <div className="space-y-2">
                            <Label>Tische platzieren</Label>
                            <div 
                                className="relative bg-slate-100 border-2 border-border rounded-lg overflow-hidden"
                                style={{ height: '400px' }}
                            >
                                <img
                                    src={floorPlanUrl}
                                    alt="Grundriss"
                                    className="w-full h-full object-contain"
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 cursor-crosshair"
                                    onClick={handleCanvasClick}
                                    width={600}
                                    height={400}
                                    style={{ mixBlendMode: 'multiply' }}
                                />
                                
                                {/* Tische anzeigen */}
                                {tablePositions.map(tp => (
                                    <div
                                        key={tp.table_id}
                                        className={cn(
                                            "absolute w-12 h-12 rounded flex items-center justify-center text-xs font-bold cursor-move transition-all",
                                            selectedTable?.table_id === tp.table_id
                                                ? "bg-amber-500 text-white ring-2 ring-offset-2 ring-amber-500"
                                                : "bg-blue-500 text-white hover:bg-blue-600"
                                        )}
                                        style={{
                                            left: `${tp.x}px`,
                                            top: `${tp.y}px`,
                                            transform: `translate(-50%, -50%) rotate(${tp.rotation}deg)`
                                        }}
                                        draggable
                                        onDragStart={() => handleDragStart(null, tp.table_id)}
                                    >
                                        {tp.table_number}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tischliste */}
                    <div className="space-y-2">
                        <Label>Verfügbare Tische</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                            {tables.map(table => (
                                <button
                                    key={table.id}
                                    type="button"
                                    onClick={() => addTableToLayout(table)}
                                    disabled={tablePositions.some(t => t.table_id === table.id)}
                                    className={cn(
                                        "p-2 rounded border text-sm transition-all",
                                        tablePositions.some(t => t.table_id === table.id)
                                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                            : "bg-white border-border hover:border-primary hover:bg-primary/5"
                                    )}
                                >
                                    <Plus className="w-3 h-3 inline mr-1" />
                                    Tisch {table.table_number} ({table.capacity}P)
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Aktionen */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Abbrechen
                        </Button>
                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                            className="flex-1"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Speichern
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}