import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, TrendingUp, Eye } from 'lucide-react';
import ReportUploader from '@/components/sales/ReportUploader';
import SalesAnalyticsDashboard from '@/components/sales/SalesAnalyticsDashboard';
import ReportDetailsModal from '@/components/sales/ReportDetailsModal';
import { Badge } from '@/components/ui/badge';

export default function SalesAnalysisPage() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedReport, setSelectedReport] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const { data: reports = [], refetch } = useQuery({
        queryKey: ['sales-reports'],
        queryFn: () => base44.entities.SalesReport.list('-report_date', 100),
        initialData: []
    });

    const handleDelete = async (id) => {
        if (confirm('Bericht wirklich löschen?')) {
            await base44.entities.SalesReport.delete(id);
            refetch();
        }
    };

    const getStatusBadge = (status) => {
        const variants = {
            pending: { label: 'Ausstehend', color: 'bg-yellow-100 text-yellow-800' },
            processing: { label: 'Verarbeitung...', color: 'bg-blue-100 text-blue-800' },
            completed: { label: 'Abgeschlossen', color: 'bg-green-100 text-green-800' },
            failed: { label: 'Fehler', color: 'bg-red-100 text-red-800' }
        };
        const { label, color } = variants[status] || variants.pending;
        return <Badge className={color}>{label}</Badge>;
    };

    // Gruppiere Berichte nach Monat
    const reportsByMonth = React.useMemo(() => {
        const grouped = {};
        reports.forEach(report => {
            const date = new Date(report.report_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long' });
            
            if (!grouped[monthKey]) {
                grouped[monthKey] = {
                    label: monthLabel,
                    reports: []
                };
            }
            grouped[monthKey].reports.push(report);
        });
        
        // Sortiere nach Monat (neueste zuerst)
        return Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([key, value]) => value);
    }, [reports]);

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Verkaufs-Analyse</h1>
                    <p className="text-slate-400">Auswertung Ihrer Kassensystem-Berichte</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-slate-800 border border-slate-700">
                        <TabsTrigger value="dashboard" className="data-[state=active]:bg-amber-600">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="data-[state=active]:bg-amber-600">
                            <FileText className="w-4 h-4 mr-2" />
                            Upload
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="data-[state=active]:bg-amber-600">
                            Berichte ({reports.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard">
                        {reports.length > 0 ? (
                            <SalesAnalyticsDashboard />
                        ) : (
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="py-12 text-center">
                                    <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">Keine Daten vorhanden</h3>
                                    <p className="text-slate-400 mb-6">
                                        Laden Sie zuerst PDF-Berichte hoch, um Analysen zu sehen
                                    </p>
                                    <Button
                                        onClick={() => setActiveTab('upload')}
                                        className="bg-amber-600 hover:bg-amber-700"
                                    >
                                        Ersten Bericht hochladen
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="upload">
                        <ReportUploader onUploadComplete={() => {
                            refetch();
                            setActiveTab('reports');
                        }} />
                    </TabsContent>

                    <TabsContent value="reports">
                        {reports.length === 0 ? (
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="text-center py-8 text-slate-400">
                                    Noch keine Berichte hochgeladen
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {reportsByMonth.map((month, idx) => (
                                    <Card key={idx} className="bg-slate-800/50 border-slate-700">
                                        <CardHeader>
                                            <CardTitle className="text-white flex items-center justify-between">
                                                <span>{month.label}</span>
                                                <Badge variant="outline" className="text-slate-300 border-slate-600">
                                                    {month.reports.length} {month.reports.length === 1 ? 'Bericht' : 'Berichte'}
                                                </Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {month.reports.map(report => (
                                                    <div
                                                        key={report.id}
                                                        className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-amber-600/50 transition-colors"
                                                    >
                                                        <div className="flex items-start gap-4 flex-1">
                                                            <FileText className="w-8 h-8 text-amber-500 flex-shrink-0 mt-1" />
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <h4 className="font-semibold text-white">{report.report_type}</h4>
                                                                    {getStatusBadge(report.processing_status)}
                                                                </div>
                                                                <div className="text-sm text-slate-400 space-y-1">
                                                                    <div>
                                                                        Datum: {new Date(report.report_date).toLocaleDateString('de-DE')}
                                                                    </div>
                                                                    {report.total_revenue > 0 && (
                                                                        <div>
                                                                            Umsatz: {report.total_revenue.toFixed(2)} € | 
                                                                            Transaktionen: {report.total_transactions || 0} | 
                                                                            Ø Bon: {report.average_transaction?.toFixed(2) || 0} €
                                                                        </div>
                                                                    )}
                                                                    {report.notes && (
                                                                        <div className="text-slate-500">{report.notes}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setSelectedReport(report);
                                                                    setDetailsOpen(true);
                                                                }}
                                                                className="text-amber-400 hover:text-amber-300"
                                                                title="Vorschau & Details"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(report.id)}
                                                                className="text-red-400 hover:text-red-300"
                                                                title="Löschen"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <ReportDetailsModal
                    report={selectedReport}
                    open={detailsOpen}
                    onClose={() => {
                        setDetailsOpen(false);
                        setSelectedReport(null);
                    }}
                />
            </div>
        </div>
    );
}