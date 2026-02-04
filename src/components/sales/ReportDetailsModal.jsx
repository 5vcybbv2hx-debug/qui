import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, FileText, CreditCard, Banknote } from 'lucide-react';

export default function ReportDetailsModal({ report, open, onClose }) {
    if (!report) return null;

    const data = report.extracted_data || {};
    const confidenceScore = data.confidence_score || 100;
    const isLowConfidence = confidenceScore < 80;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-3">
                        <FileText className="w-6 h-6 text-amber-500" />
                        {report.report_type} - {new Date(report.report_date).toLocaleDateString('de-DE')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Confidence Score */}
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {isLowConfidence ? (
                                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                )}
                                <span className="text-white font-medium">Datenqualität</span>
                            </div>
                            <Badge className={isLowConfidence ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                                {confidenceScore}% Genauigkeit
                            </Badge>
                        </div>
                        {isLowConfidence && (
                            <p className="text-sm text-yellow-300 mt-2">
                                ⚠️ Niedrige Erkennungsgenauigkeit - bitte manuell überprüfen
                            </p>
                        )}
                    </Card>

                    {/* Summary */}
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <h3 className="text-white font-semibold mb-3">Zusammenfassung</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-slate-400">Gesamtumsatz</p>
                                <p className="text-lg font-bold text-white">
                                    {(data.total_revenue || report.total_revenue || 0).toFixed(2)} €
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Transaktionen</p>
                                <p className="text-lg font-bold text-white">
                                    {data.total_transactions || report.total_transactions || 0}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Ø Bonwert</p>
                                <p className="text-lg font-bold text-white">
                                    {report.average_transaction?.toFixed(2) || 0} €
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Datum</p>
                                <p className="text-lg font-bold text-white">
                                    {data.date || new Date(report.report_date).toLocaleDateString('de-DE')}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Payment Methods */}
                    {data.payment_methods && (
                        <Card className="p-4 bg-slate-800 border-slate-700">
                            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-amber-500" />
                                Zahlungsarten
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {data.payment_methods.cash > 0 && (
                                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Banknote className="w-4 h-4 text-green-400" />
                                            <span className="text-sm text-slate-400">Bargeld</span>
                                        </div>
                                        <p className="text-lg font-bold text-white">
                                            {data.payment_methods.cash.toFixed(2)} €
                                        </p>
                                    </div>
                                )}
                                {data.payment_methods.card > 0 && (
                                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CreditCard className="w-4 h-4 text-blue-400" />
                                            <span className="text-sm text-slate-400">Karte</span>
                                        </div>
                                        <p className="text-lg font-bold text-white">
                                            {data.payment_methods.card.toFixed(2)} €
                                        </p>
                                    </div>
                                )}
                                {data.payment_methods.ec > 0 && (
                                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CreditCard className="w-4 h-4 text-purple-400" />
                                            <span className="text-sm text-slate-400">EC-Karte</span>
                                        </div>
                                        <p className="text-lg font-bold text-white">
                                            {data.payment_methods.ec.toFixed(2)} €
                                        </p>
                                    </div>
                                )}
                                {data.payment_methods.credit_card > 0 && (
                                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CreditCard className="w-4 h-4 text-yellow-400" />
                                            <span className="text-sm text-slate-400">Kreditkarte</span>
                                        </div>
                                        <p className="text-lg font-bold text-white">
                                            {data.payment_methods.credit_card.toFixed(2)} €
                                        </p>
                                    </div>
                                )}
                                {data.payment_methods.other > 0 && (
                                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm text-slate-400">Sonstiges</span>
                                        </div>
                                        <p className="text-lg font-bold text-white">
                                            {data.payment_methods.other.toFixed(2)} €
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Items */}
                    {data.items && data.items.length > 0 && (
                        <Card className="p-4 bg-slate-800 border-slate-700">
                            <h3 className="text-white font-semibold mb-3">Verkaufte Artikel</h3>
                            <div className="space-y-2">
                                {data.items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700"
                                    >
                                        <div>
                                            <p className="text-white font-medium">{item.name}</p>
                                            {item.category && (
                                                <p className="text-xs text-slate-400">{item.category}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-medium">{item.revenue?.toFixed(2)} €</p>
                                            <p className="text-xs text-slate-400">{item.quantity}x</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Raw Data (für Debugging) */}
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <h3 className="text-white font-semibold mb-3">Rohdaten (JSON)</h3>
                        <pre className="text-xs text-slate-300 bg-slate-900 p-3 rounded overflow-x-auto">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}