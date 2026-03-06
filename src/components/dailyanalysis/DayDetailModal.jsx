import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { DollarSign, CreditCard, Banknote, Receipt, ShoppingBag, Users, Gift, FileText } from 'lucide-react';

export default function DayDetailModal({ open, onOpenChange, revenue, tipDistribution, laborCost, staffCount }) {
    if (!revenue) return null;

    const date = parseISO(revenue.date);

    const rows = [
        { label: 'Gesamtumsatz', value: revenue.revenue, color: 'text-green-400', icon: DollarSign },
        { label: 'Umsatz Bar', value: revenue.revenue_cash, color: 'text-yellow-400', icon: Banknote },
        { label: 'Umsatz EC', value: revenue.revenue_ec, color: 'text-blue-400', icon: CreditCard },
        { label: 'Umsatzsteuer', value: revenue.vat, color: 'text-slate-400', icon: Receipt },
        { label: 'Eigenbedarf', value: revenue.own_consumption, color: 'text-orange-400', icon: ShoppingBag },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white text-xl">
                        {format(date, 'EEEE, dd. MMMM yyyy', { locale: de })}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Linke Spalte: Daten */}
                    <div className="space-y-4">
                        {/* Umsatzdaten */}
                        <div className="bg-slate-800 rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Z-Abschlag
                            </h3>
                            {rows.map(({ label, value, color, icon: Icon }) => (
                                value != null && (
                                    <div key={label} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                                            <Icon className="w-4 h-4 text-slate-500" />
                                            {label}
                                        </div>
                                        <span className={`font-semibold ${color}`}>{value.toFixed(2)} €</span>
                                    </div>
                                )
                            ))}
                        </div>

                        {/* Personalkosten */}
                        <div className="bg-slate-800 rounded-xl p-4 space-y-2">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Users className="w-4 h-4" /> Personal
                            </h3>
                            <div className="flex justify-between">
                                <span className="text-slate-300 text-sm">Personalkosten</span>
                                <span className="text-amber-400 font-semibold">{laborCost.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-300 text-sm">Mitarbeiter</span>
                                <span className="text-slate-300 font-semibold">{staffCount}</span>
                            </div>
                            {revenue.revenue > 0 && laborCost > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-300 text-sm">Personalkostenquote</span>
                                    <Badge className="bg-amber-900/40 text-amber-400 border-amber-700">
                                        {((laborCost / revenue.revenue) * 100).toFixed(1)} %
                                    </Badge>
                                </div>
                            )}
                        </div>

                        {/* Trinkgeld */}
                        {tipDistribution && (
                            <div className="bg-slate-800 rounded-xl p-4 space-y-2">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Gift className="w-4 h-4" /> Trinkgeld
                                </h3>
                                <div className="flex justify-between">
                                    <span className="text-slate-300 text-sm">Gesamt</span>
                                    <span className="text-purple-400 font-semibold">{tipDistribution.total_tips.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-300 text-sm">Pro Person</span>
                                    <span className="text-purple-400 font-semibold">{tipDistribution.tip_per_person.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-300 text-sm">Quote</span>
                                    <span className="text-slate-400 text-sm">{tipDistribution.tip_percentage} %</span>
                                </div>
                            </div>
                        )}

                        {/* Notizen */}
                        {revenue.notes && (
                            <div className="bg-slate-800 rounded-xl p-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Notizen</h3>
                                <p className="text-slate-300 text-sm">{revenue.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Rechte Spalte: PDF Vorschau */}
                    <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Z-Abschlag PDF
                        </h3>
                        {revenue.pdf_url ? (
                            <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden" style={{ minHeight: '400px' }}>
                                <iframe
                                    src={revenue.pdf_url}
                                    className="w-full h-full rounded-xl"
                                    style={{ minHeight: '400px' }}
                                    title="Z-Abschlag PDF"
                                />
                            </div>
                        ) : (
                            <div className="flex-1 bg-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500 min-h-[200px]">
                                <FileText className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm">Kein PDF hochgeladen</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}