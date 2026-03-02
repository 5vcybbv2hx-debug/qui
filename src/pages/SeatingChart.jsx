import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Grid2x2, List } from 'lucide-react';
import TableGrid from '@/components/seating/TableGrid';
import TableList from '@/components/seating/TableList';
import TableModal from '@/components/seating/TableModal';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';

export default function SeatingChartPage() {
    const permissions = usePermissions();
    const [view, setView] = useState('grid');
    const [showModal, setShowModal] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);

    const { data: tables = [] } = useQuery({
        queryKey: ['tables'],
        queryFn: () => base44.entities.Table.list()
    });

    const { data: reservations = [] } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list()
    });

    if (!permissions.isManager) return <PermissionDenied />;

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

                <div className="flex gap-2">
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
                </div>

                {view === 'grid' ? (
                    <TableGrid 
                        tables={tables} 
                        reservations={reservations}
                        getTableReservation={getTableReservation}
                        onTableClick={(table) => {
                            setSelectedTable(table);
                            setShowModal(true);
                        }}
                    />
                ) : (
                    <TableList 
                        tables={tables} 
                        reservations={reservations}
                        getTableReservation={getTableReservation}
                        onTableClick={(table) => {
                            setSelectedTable(table);
                            setShowModal(true);
                        }}
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