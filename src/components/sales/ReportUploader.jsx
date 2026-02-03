import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportUploader({ onUploadComplete }) {
    const [file, setFile] = useState(null);
    const [reportType, setReportType] = useState('');
    const [reportDate, setReportDate] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
        } else {
            toast.error('Bitte nur PDF-Dateien hochladen');
        }
    };

    const handleUpload = async () => {
        if (!file || !reportType || !reportDate) {
            toast.error('Bitte alle Felder ausfüllen');
            return;
        }

        setUploading(true);
        try {
            // 1. Upload file
            const { file_url } = await base44.integrations.Core.UploadFile({ file });

            // 2. Create report record
            const report = await base44.entities.SalesReport.create({
                report_type: reportType,
                report_date: reportDate,
                file_url: file_url,
                processing_status: 'processing'
            });

            // 3. Extract data from PDF
            const extractionSchema = getExtractionSchema(reportType);
            const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url: file_url,
                json_schema: extractionSchema
            });

            if (extractionResult.status === 'success') {
                // 4. Process extracted data
                await processExtractedData(report.id, extractionResult.output, reportType);

                // 5. Update report with extracted summary
                await base44.entities.SalesReport.update(report.id, {
                    extracted_data: extractionResult.output,
                    processing_status: 'completed',
                    ...calculateSummary(extractionResult.output, reportType)
                });

                toast.success('Bericht erfolgreich hochgeladen und verarbeitet!');
                setFile(null);
                setReportType('');
                setReportDate('');
                if (onUploadComplete) onUploadComplete();
            } else {
                throw new Error(extractionResult.details || 'Fehler beim Extrahieren der Daten');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Fehler beim Hochladen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const getExtractionSchema = (type) => {
        const schemas = {
            'Z-Abschlag': {
                type: 'object',
                properties: {
                    date: { type: 'string' },
                    total_revenue: { type: 'number' },
                    total_transactions: { type: 'number' },
                    cash_revenue: { type: 'number' },
                    card_revenue: { type: 'number' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                quantity: { type: 'number' },
                                revenue: { type: 'number' }
                            }
                        }
                    }
                }
            },
            'Artikelverkäufe': {
                type: 'object',
                properties: {
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                category: { type: 'string' },
                                quantity: { type: 'number' },
                                price: { type: 'number' },
                                revenue: { type: 'number' }
                            }
                        }
                    }
                }
            },
            'Warengruppen': {
                type: 'object',
                properties: {
                    categories: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                revenue: { type: 'number' },
                                quantity: { type: 'number' }
                            }
                        }
                    }
                }
            },
            'Stundenauswertung': {
                type: 'object',
                properties: {
                    hourly_data: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                hour: { type: 'number' },
                                revenue: { type: 'number' },
                                transactions: { type: 'number' }
                            }
                        }
                    }
                }
            }
        };
        return schemas[type] || schemas['Artikelverkäufe'];
    };

    const processExtractedData = async (reportId, data, reportType) => {
        const items = [];

        if (reportType === 'Z-Abschlag' && data.items) {
            data.items.forEach(item => {
                items.push({
                    report_id: reportId,
                    date: reportDate,
                    item_name: item.name,
                    quantity_sold: item.quantity,
                    revenue: item.revenue,
                    price: item.quantity > 0 ? item.revenue / item.quantity : 0
                });
            });
        } else if (reportType === 'Artikelverkäufe' && data.items) {
            data.items.forEach(item => {
                items.push({
                    report_id: reportId,
                    date: reportDate,
                    item_name: item.name,
                    category: item.category,
                    quantity_sold: item.quantity,
                    revenue: item.revenue,
                    price: item.price
                });
            });
        } else if (reportType === 'Stundenauswertung' && data.hourly_data) {
            data.hourly_data.forEach(hourData => {
                items.push({
                    report_id: reportId,
                    date: reportDate,
                    hour: hourData.hour,
                    revenue: hourData.revenue,
                    quantity_sold: hourData.transactions
                });
            });
        }

        if (items.length > 0) {
            await base44.entities.SalesDataItem.bulkCreate(items);
        }
    };

    const calculateSummary = (data, reportType) => {
        const summary = {};

        if (reportType === 'Z-Abschlag') {
            summary.total_revenue = data.total_revenue || 0;
            summary.total_transactions = data.total_transactions || 0;
            summary.average_transaction = data.total_transactions > 0 
                ? data.total_revenue / data.total_transactions 
                : 0;
        } else if (reportType === 'Artikelverkäufe' && data.items) {
            summary.total_revenue = data.items.reduce((sum, item) => sum + (item.revenue || 0), 0);
            summary.total_transactions = data.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }

        return summary;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-amber-600" />
                    PDF-Bericht hochladen
                </CardTitle>
                <CardDescription>
                    Laden Sie Berichte von Ihrem Kassensystem hoch für automatische Analyse
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Berichtstyp</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Typ auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Z-Abschlag">Z-Abschlag / Tagesabschluss</SelectItem>
                            <SelectItem value="Artikelverkäufe">Artikelverkäufe</SelectItem>
                            <SelectItem value="Warengruppen">Warengruppen</SelectItem>
                            <SelectItem value="Stundenauswertung">Stundenauswertung</SelectItem>
                            <SelectItem value="Wochenauswertung">Wochenauswertung</SelectItem>
                            <SelectItem value="Zahlungsarten">Zahlungsarten</SelectItem>
                            <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label>Berichtsdatum</Label>
                    <Input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                    />
                </div>

                <div>
                    <Label>PDF-Datei</Label>
                    <Input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="cursor-pointer"
                    />
                    {file && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                            <FileText className="w-4 h-4" />
                            {file.name}
                        </div>
                    )}
                </div>

                <Button
                    onClick={handleUpload}
                    disabled={!file || !reportType || !reportDate || uploading}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Wird verarbeitet...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 mr-2" />
                            Hochladen & Analysieren
                        </>
                    )}
                </Button>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                            <strong>Tipp:</strong> Die KI extrahiert automatisch relevante Daten aus Ihrem PDF.
                            Je strukturierter Ihr Bericht, desto besser die Analyse.
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}