import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Lock, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';

export default function TerminalReservation({ employees = [] }) {
    const queryClient = useQueryClient();
    const [step, setStep] = useState('idle'); // idle | pin | form | done
    const [open, setOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [formData, setFormData] = useState({
        customer_name: '',
        phone: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '19:00',
        guests: 2,
        table: '',
        notes: '',
        status: 'vorgemerkt'
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Reservation.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['reservations']);
            setStep('done');
            setTimeout(() => handleClose(), 2500);
        }
    });

    const handleOpen = () => {
        setStep('pin');
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setStep('idle');
        setSelectedEmployee(null);
        setPin('');
        setPinError('');
        setFormData({
            customer_name: '',
            phone: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            time: '19:00',
            guests: 2,
            table: '',
            notes: '',
            status: 'vorgemerkt'
        });
    };

    const handlePinDigit = (digit) => {
        if (digit === '←') {
            setPin(p => p.slice(0, -1));
        } else if (pin.length < 4) {
            const newPin = pin + digit;
            setPin(newPin);
            if (newPin.length === 4) verifyPin(newPin);
        }
    };

    const verifyPin = (enteredPin) => {
        const emp = employees.find(e => e.pin === enteredPin);
        if (emp) {
            setSelectedEmployee(emp);
            setPinError('');
            setPin('');
            setStep('form');
        } else {
            setPinError('Falsche PIN – bitte erneut versuchen');
            setPin('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate({
            ...formData,
            guests: parseInt(formData.guests),
            source: 'intern',
            notes: formData.notes
                ? `${formData.notes} [Eingetragen von: ${selectedEmployee.name}]`
                : `[Eingetragen von: ${selectedEmployee.name}]`
        });
    };

    const employeesWithPin = employees.filter(e => e.pin && e.name !== 'Orga');

    return (
        <>
            <Button
                onClick={handleOpen}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
            >
                <Calendar className="w-4 h-4 mr-2" />
                Reservierung eintragen
            </Button>

            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <Calendar className="w-5 h-5 text-blue-400" />
                            Neue Reservierung
                        </DialogTitle>
                    </DialogHeader>

                    {/* Step 1: PIN */}
                    {step === 'pin' && (
                        <div className="space-y-4 mt-2">
                            <div className="text-center">
                                <Lock className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                                <p className="text-slate-300 text-sm">Gib deine persönliche PIN ein,<br />damit die Reservierung dir zugeordnet wird.</p>
                            </div>

                            <div className="text-center text-3xl tracking-[0.5em] font-bold text-white bg-slate-700 rounded-lg py-3 h-14">
                                {pin.replace(/./g, '•')}
                            </div>

                            {pinError && (
                                <p className="text-red-400 text-sm text-center">{pinError}</p>
                            )}

                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '←', 0].map((num) => (
                                    <Button
                                        key={num}
                                        type="button"
                                        variant="outline"
                                        className="h-14 text-xl border-slate-600 text-white hover:bg-slate-600 bg-slate-700"
                                        onClick={() => handlePinDigit(String(num))}
                                    >
                                        {num}
                                    </Button>
                                ))}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-14 text-slate-400 hover:bg-slate-700"
                                    onClick={handleClose}
                                >
                                    Abbrechen
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Form */}
                    {step === 'form' && (
                        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
                            <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                                <span className="text-slate-300">Eingetragen von: <strong className="text-white">{selectedEmployee?.name}</strong></span>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-slate-300">Name des Gastes *</Label>
                                <Input
                                    value={formData.customer_name}
                                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                    placeholder="Mustermann"
                                    required
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-slate-300">Telefon</Label>
                                <Input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+49..."
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-slate-300">Datum *</Label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        required
                                        className="bg-slate-700 border-slate-600 text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-300">Uhrzeit *</Label>
                                    <Input
                                        type="time"
                                        max="21:00"
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                        required
                                        className="bg-slate-700 border-slate-600 text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-slate-300">Personen *</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.guests}
                                        onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                                        required
                                        className="bg-slate-700 border-slate-600 text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-300">Tisch</Label>
                                    <Input
                                        value={formData.table}
                                        onChange={(e) => setFormData({ ...formData, table: e.target.value })}
                                        placeholder="z.B. T5"
                                        className="bg-slate-700 border-slate-600 text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-slate-300">Notizen</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Besondere Wünsche..."
                                    rows={2}
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={handleClose}
                                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                                    Abbrechen
                                </Button>
                                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'Wird eingetragen...' : 'Reservierung speichern'}
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Done */}
                    {step === 'done' && (
                        <div className="py-8 text-center space-y-3">
                            <CheckCircle className="w-16 h-16 mx-auto text-green-400" />
                            <p className="text-xl font-semibold text-white">Reservierung eingetragen!</p>
                            <p className="text-slate-400 text-sm">Eingetragen von {selectedEmployee?.name}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}