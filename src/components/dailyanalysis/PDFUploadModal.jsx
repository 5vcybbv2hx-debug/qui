import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Upload, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PDFUploadModal({ open, onOpenChange, selectedDate, onSuccess }) {
    const [file, setFile] = useState(null);
    const [revenue, setRevenue] = useState('');
    const [revenueCash, setRevenueCash] = useState('');
    const [revenueEC, setRevenueEC] = useState('');
    const [vat, setVat] = useState('');
    const [ownConsumption, setOwnConsumption] = useState('');
    const [notes, setNotes] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);
    const [activeTab, setActiveTab] = useState('manual');

    const mutation = useMutation({
        mutationFn: async () => {
            let pdfUrl = null;
            
            if (file) {
                const uploadResponse = await base44.integrations.Core.UploadFile({ file });
                pdfUrl = uploadResponse.file_url;
            }

            await base44.entities.DailyRevenue.create({
                date: selectedDate,
                revenue: parseFloat(revenue),
                revenue_cash: revenueCash ? parseFloat(revenueCash) : undefined,
                revenue_ec: revenueEC ? parseFloat(revenueEC) : undefined,
                vat: vat ? parseFloat(vat) : undefined,
                own_consumption: ownConsumption ? parseFloat(ownConsumption) : undefined,
                pdf_url: pdfUrl,
                notes: notes || undefined
            });
        },
        onSuccess: () => {
            setFile(null);
            setRevenue('');
            setRevenueCash('');
            setRevenueEC('');
            setVat('');
            setOwnConsumption('');
            setNotes('');
            onOpenChange(false);
            onSuccess?.();
        }
    });

    const handleAnalyzePDF = async () => {
        if (!file) {
            setAnalysisError('Bitte wählen Sie eine PDF-Datei aus.');
            return;
        }

        setAnalyzing(true);
        setAnalysisError(null);

        try {
            const uploadResponse = await base44.integrations.Core.UploadFile({ file });
            const analysisResponse = await base44.integrations.Core.InvokeLLM({
                prompt: `Analysiere diese Z-Abschlag PDF von einer Bar/Lokal. Extrahiere die folgenden Informationen:
                - Gesamtumsatz / Tagesumsatz (in Euro, Brutto)
                - Umsatz Bar (Bargeld-Umsatz)
                - Umsatz EC / Kartenzahlung
                - Umsatzsteuer (MwSt.)
                - Eigenbedarf / Eigenverbrauch
                - Besondere Notizen

                Gib die Antwort als JSON zurück.`,
                file_urls: [uploadResponse.file_url],
                response_json_schema: {
                    type: 'object',
                    properties: {
                        revenue: { type: 'number', description: 'Gesamtumsatz in Euro' },
                        revenue_cash: { type: 'number', description: 'Umsatz Bar (Bargeld) in Euro' },
                        revenue_ec: { type: 'number', description: 'Umsatz EC/Karte in Euro' },
                        vat: { type: 'number', description: 'Umsatzsteuer in Euro' },
                        own_consumption: { type: 'number', description: 'Eigenbedarf/Eigenverbrauch in Euro' },
                        notes: { type: 'string', description: 'Zusätzliche Notizen' }
                    },
                    required: ['revenue']
                }
            });

            if (analysisResponse.revenue) {
                setRevenue(analysisResponse.revenue.toString());
                if (analysisResponse.revenue_cash) setRevenueCash(analysisResponse.revenue_cash.toString());
                if (analysisResponse.revenue_ec) setRevenueEC(analysisResponse.revenue_ec.toString());
                if (analysisResponse.vat) setVat(analysisResponse.vat.toString());
                if (analysisResponse.own_consumption) setOwnConsumption(analysisResponse.own_consumption.toString());
                if (analysisResponse.notes) {
                    setNotes(analysisResponse.notes);
                }
                setActiveTab('review');
            } else {
                setAnalysisError('Konnte keinen Umsatz in der PDF finden. Bitte manuell eingeben.');
            }
        } catch (error) {
            setAnalysisError(`Analyse fehlgeschlagen: ${error.message}`);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!revenue || parseFloat(revenue) <= 0) {
            alert('Bitte geben Sie einen gültigen Umsatz ein.');
            return;
        }
        mutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-white">Z-Abschlag hochladen</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                        <TabsTrigger value="manual" className="text-slate-300">Manuell</TabsTrigger>
                        <TabsTrigger value="ai" className="text-slate-300">KI-Analyse</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="mt-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="date" className="text-slate-300">Datum</Label>
                        <Input 
                            id="date"
                            type="date" 
                            value={selectedDate}
                            disabled
                            className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="revenue" className="text-slate-300">Gesamtumsatz (€)</Label>
                        <Input 
                            id="revenue"
                            type="number" 
                            step="0.01"
                            placeholder="z.B. 1500,50"
                            value={revenue}
                            onChange={(e) => setRevenue(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white mt-1"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="revenue_cash" className="text-slate-300 text-sm">Umsatz Bar (€)</Label>
                            <Input id="revenue_cash" type="number" step="0.01" placeholder="optional" value={revenueCash} onChange={(e) => setRevenueCash(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="revenue_ec" className="text-slate-300 text-sm">Umsatz EC (€)</Label>
                            <Input id="revenue_ec" type="number" step="0.01" placeholder="optional" value={revenueEC} onChange={(e) => setRevenueEC(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="vat" className="text-slate-300 text-sm">Umsatzsteuer (€)</Label>
                            <Input id="vat" type="number" step="0.01" placeholder="optional" value={vat} onChange={(e) => setVat(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="own_consumption" className="text-slate-300 text-sm">Eigenbedarf (€)</Label>
                            <Input id="own_consumption" type="number" step="0.01" placeholder="optional" value={ownConsumption} onChange={(e) => setOwnConsumption(e.target.value)} className="bg-slate-700 border-slate-600 text-white mt-1" />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="pdf" className="text-slate-300">PDF hochladen (optional)</Label>
                        <div className="mt-1 border-2 border-dashed border-slate-600 rounded-lg p-4">
                            <input 
                                id="pdf"
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="text-sm text-slate-400"
                            />
                            {file && (
                                <p className="text-sm text-green-400 mt-2">✓ {file.name}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="notes" className="text-slate-300">Notizen (optional)</Label>
                        <Input 
                            id="notes"
                            type="text" 
                            placeholder="z.B. Besonderheiten des Tages"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                    </div>

                            <div className="flex gap-2 pt-4">
                                <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    className="flex-1"
                                >
                                    Abbrechen
                                </Button>
                                <Button 
                                    type="submit"
                                    disabled={mutation.isPending}
                                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                                >
                                    {mutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
                                </Button>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="ai" className="mt-4 space-y-4">
                        <div>
                            <Label htmlFor="ai-pdf" className="text-slate-300">PDF-Datei</Label>
                            <div className="mt-1 border-2 border-dashed border-slate-600 rounded-lg p-4">
                                <input 
                                    id="ai-pdf"
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => {
                                        setFile(e.target.files?.[0] || null);
                                        setAnalysisError(null);
                                    }}
                                    className="text-sm text-slate-400"
                                />
                                {file && (
                                    <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {file.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        {analysisError && (
                            <Alert className="bg-red-900/20 border-red-800">
                                <AlertCircle className="h-4 w-4 text-red-400" />
                                <AlertDescription className="text-red-300">{analysisError}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-3">
                            <Label className="text-slate-300">Analysierte Daten</Label>
                            <div className="bg-slate-700 rounded-lg p-4 space-y-3">
                                <div>
                                    <Label htmlFor="ai-revenue" className="text-xs text-slate-400">Tagesumsatz (€)</Label>
                                    <Input 
                                        id="ai-revenue"
                                        type="number" 
                                        step="0.01"
                                        placeholder="Wird automatisch gefüllt"
                                        value={revenue}
                                        onChange={(e) => setRevenue(e.target.value)}
                                        className="bg-slate-800 border-slate-600 text-white mt-1"
                                        disabled={analyzing}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="ai-notes" className="text-xs text-slate-400">Notizen</Label>
                                    <Input 
                                        id="ai-notes"
                                        type="text" 
                                        placeholder="Zusätzliche Notizen"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="bg-slate-800 border-slate-600 text-white mt-1"
                                        disabled={analyzing}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => {
                                    setActiveTab('manual');
                                    setAnalysisError(null);
                                }}
                                className="flex-1"
                                disabled={analyzing}
                            >
                                Zurück
                            </Button>
                            <Button 
                                type="button"
                                onClick={handleAnalyzePDF}
                                disabled={analyzing || !file}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analysiert...
                                    </>
                                ) : (
                                    'PDF analysieren'
                                )}
                            </Button>
                        </div>

                        {revenue && (
                            <div className="bg-slate-700 rounded-lg p-4 space-y-3 border border-green-600/30">
                                <h3 className="font-semibold text-green-400 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Vorschau
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Datum:</span>
                                        <span className="text-white font-medium">{selectedDate}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Tagesumsatz:</span>
                                        <span className="text-green-400 font-bold text-lg">{parseFloat(revenue).toFixed(2)} €</span>
                                    </div>
                                    {notes && (
                                        <div className="flex justify-between pt-2 border-t border-slate-600">
                                            <span className="text-slate-400">Notizen:</span>
                                            <span className="text-slate-300 text-right">{notes}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {revenue && (
                            <Button 
                                type="button"
                                onClick={handleSubmit}
                                disabled={mutation.isPending}
                                className="w-full bg-amber-600 hover:bg-amber-700"
                            >
                                {mutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
                            </Button>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}