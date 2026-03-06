import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Grid2x2, List, Settings, Move, CalendarDays, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TableGrid from '@/components/seating/TableGrid';
import TableGridWithLayout from '@/components/seating/TableGridWithLayout';
import TableList from '@/components/seating/TableList';
import FloorPlanView from '@/components/seating/FloorPlanView';
import TableCalendarView from '@/components/seating/TableCalendarView';
import TableModal from '@/components/seating/TableModal';
import RoomManager from '@/components/seating/RoomManager';
import LayoutEditor from '@/components/seating/LayoutEditor';
import MultiRoomFloorPlanEditor from '@/components/seating/MultiRoomFloorPlanEditor';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';

export default function SeatingChartPage() {
    const permissions = usePermissions();
    const [view, setView] = useState('grid');
    const [showModal, setShowModal] = useState(false);
    const [showLayoutEditor, setShowLayoutEditor] = useState(false);
    const [showMultiRoomEditor, setShowMultiRoomEditor] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);

    const { data: tables = [] } = useQuery({
        queryKey: ['tables'],
        queryFn: () => base44.entities.Table.list()
    });

    const { data: rooms = [] } = useQuery({
        queryKey: ['rooms'],
        queryFn: () => base44.entities.Room.list()
    });

    const { data: reservations = [] } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list()
    });

    if (!permissions.isManager) return <PermissionDenied />;

    const activeRoom = selectedRoom || (rooms.length > 0 ? rooms[0].name : null);
    const filteredTables = activeRoom ? tables.filter(t => t.room === activeRoom) : tables;

    const getTableReservation = (tableId) => {
        const today = new Date().toISOString().split('T')[0];
        return reservations.find(r => 
            r.table === tableId && 
            r.date === today && 
            r.status !== 'storniert'
        );
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Tischplan</h1>
                        <p className="text-muted-foreground mt-1">Verwaltung und Reservierungen</p>
                    </div>
                    <div className="flex gap-2">
                        {activeRoom && (
                            <LayoutEditor 
                                roomId={activeRoom}
                                roomName={activeRoom}
                                open={showLayoutEditor}
                                onClose={() => setShowLayoutEditor(false)}
                            />
                        )}
                        <Button 
                            variant="outline" 
                            className="border-primary text-primary hover:bg-primary/10"
                            onClick={() => setShowLayoutEditor(true)}
                        >
                            <Layers className="h-4 w-4 mr-2" />
                            Layout
                        </Button>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Räume
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Räume verwalten</DialogTitle>
                                </DialogHeader>
                                <RoomManager rooms={rooms} />
                            </DialogContent>
                        </Dialog>
                        {permissions.isManager && (
                            <Button 
                                onClick={() => {
                                    setSelectedTable(null);
                                    setShowModal(true);
                                }}
                                className="bg-primary hover:bg-primary/90"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Neuer Tisch
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {rooms.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {rooms.map(room => (
                                <Button
                                    key={room.id}
                                    variant={activeRoom === room.name ? 'default' : 'outline'}
                                    onClick={() => setSelectedRoom(room.name)}
                                    size="sm"
                                    className={activeRoom === room.name ? 'bg-primary hover:bg-primary/90' : ''}
                                >
                                    {room.name}
                                </Button>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button
                            variant={view === 'floorplan' ? 'default' : 'outline'}
                            onClick={() => setView('floorplan')}
                            size="sm"
                            className={view === 'floorplan' ? 'bg-primary hover:bg-primary/90' : ''}
                        >
                            <Move className="h-4 w-4 mr-2" />
                            Draufsicht
                        </Button>
                        <Button
                            variant={view === 'grid' ? 'default' : 'outline'}
                            onClick={() => setView('grid')}
                            size="sm"
                            className={view === 'grid' ? 'bg-primary hover:bg-primary/90' : ''}
                        >
                            <Grid2x2 className="h-4 w-4 mr-2" />
                            Grafisch
                        </Button>
                        <Button
                            variant={view === 'list' ? 'default' : 'outline'}
                            onClick={() => setView('list')}
                            size="sm"
                            className={view === 'list' ? 'bg-primary hover:bg-primary/90' : ''}
                        >
                            <List className="h-4 w-4 mr-2" />
                            Liste
                        </Button>
                        <Button
                            variant={view === 'calendar' ? 'default' : 'outline'}
                            onClick={() => setView('calendar')}
                            size="sm"
                            className={view === 'calendar' ? 'bg-primary hover:bg-primary/90' : ''}
                        >
                            <CalendarDays className="h-4 w-4 mr-2" />
                            Kalender
                        </Button>
                    </div>
                </div>

                {view === 'floorplan' ? (
                    <FloorPlanView
                        tables={filteredTables}
                        reservations={reservations}
                        getTableReservation={getTableReservation}
                        onTableClick={(table) => {
                            setSelectedTable(table);
                            setShowModal(true);
                        }}
                    />
                ) : view === 'grid' ? (
                    <TableGridWithLayout 
                        tables={filteredTables} 
                        reservations={reservations}
                        getTableReservation={getTableReservation}
                        onTableClick={(table) => {
                            setSelectedTable(table);
                            setShowModal(true);
                        }}
                        roomName={activeRoom}
                    />
                ) : view === 'list' ? (
                    <TableList 
                        tables={filteredTables} 
                        reservations={reservations}
                        getTableReservation={getTableReservation}
                        onTableClick={(table) => {
                            setSelectedTable(table);
                            setShowModal(true);
                        }}
                    />
                ) : (
                    <TableCalendarView
                        tables={filteredTables}
                        reservations={reservations}
                    />
                )}

                {showModal && (
                    <TableModal
                        table={selectedTable}
                        open={showModal}
                        onClose={() => {
                            setShowModal(false);
                            setSelectedTable(null);
                        }}
                        reservation={selectedTable ? getTableReservation(selectedTable.id) : null}
                    />
                )}
            </div>
        </div>
    );
}