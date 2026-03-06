import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Save } from 'lucide-react';
import VisualFloorPlanEditor from './VisualFloorPlanEditor';

export default function LayoutEditor({ roomId, roomName, open, onClose }) {
    const [layoutName, setLayoutName] = useState('Standard');
    const [tablePositions, setTablePositions] = useState([]);
    const queryClient = useQueryClient();

    const { data: layout } = useQuery({
        queryKey: ['seating-layout', roomId],
        queryFn: async () => {
            const layouts = await base44.entities.SeatingLayout.filter({ room_id: roomId });
            return layouts[0] || null;
        },
        enabled: !!roomId
    });

    useEffect(() => {
        if (layout) {
            setLayoutName(layout.layout_name);
            setTablePositions(layout.tables || []);
        }
    }, [layout]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const layoutData = {
                room_id: roomId,
                room_name: roomName,
                layout_name: layoutName,
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
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tischplan: {roomName}</DialogTitle>
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

                    {/* Visual Floor Plan Editor */}
                    <VisualFloorPlanEditor
                        roomId={roomId}
                        roomName={roomName}
                        onTablePositionsChange={setTablePositions}
                    />

                    {/* Aktionen */}
                    <div className="flex gap-2 pt-4 border-t border-border">
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