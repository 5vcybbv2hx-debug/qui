import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TableGridEditor from './TableGridEditor';

export default function LayoutEditor({ roomId, roomName, open, onClose }) {
    const [layoutName, setLayoutName] = useState('Standard');
    const [floorPlanUrl, setFloorPlanUrl] = useState('');
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
            setFloorPlanUrl(layout.floor_plan_url || '');
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

    const saveMutation = useMutation({
        mutationFn: async () => {
            const layoutData = {
                room_id: roomId,
                room_name: roomName,
                layout_name: layoutName,
                floor_plan_url: floorPlanUrl
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
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tischplan konfigurieren: {roomName}</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="grid" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="grid">Tische platzieren</TabsTrigger>
                        <TabsTrigger value="settings">Einstellungen</TabsTrigger>
                    </TabsList>

                    {/* Grid Editor Tab */}
                    <TabsContent value="grid" className="space-y-4 mt-4">
                        <TableGridEditor roomId={roomId} roomName={roomName} />
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-4 mt-4">
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
                            <Label>Grundriss als Referenz (optional)</Label>
                            <p className="text-xs text-muted-foreground">
                                Lade einen Grundriss hoch, um die Tischplatzierung zu unterstützen.
                            </p>
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
                            {floorPlanUrl && (
                                <div className="mt-3 border border-border rounded-lg overflow-hidden">
                                    <img
                                        src={floorPlanUrl}
                                        alt="Grundriss"
                                        className="w-full h-auto max-h-48 object-contain"
                                    />
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Aktionen */}
                <div className="flex gap-2 mt-6">
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
            </DialogContent>
        </Dialog>
    );
}