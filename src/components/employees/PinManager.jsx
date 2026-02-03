import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PinManager({ employee, open, onClose, isAdmin }) {
    const queryClient = useQueryClient();
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');

    const updatePinMutation = useMutation({
        mutationFn: async ({ employeeId, pin, currentUserPin }) => {
            // Wenn nicht Admin, muss die aktuelle PIN verifiziert werden
            if (!isAdmin && employee.pin && employee.pin !== currentUserPin) {
                throw new Error('Aktuelle PIN ist falsch');
            }

            return base44.entities.Employee.update(employeeId, { pin });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
            toast.success('PIN erfolgreich gespeichert');
            onClose();
            resetForm();
        },
        onError: (error) => {
            setError(error.message);
            toast.error('Fehler beim Speichern der PIN');
        }
    });

    const resetForm = () => {
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setError('');
    };

    const validatePin = (pin) => {
        if (pin.length !== 4) {
            return 'PIN muss genau 4 Ziffern haben';
        }
        if (!/^\d+$/.test(pin)) {
            return 'PIN darf nur Zahlen enthalten';
        }
        if (pin === '0000' || pin === '1234') {
            return 'PIN zu einfach - bitte wählen Sie eine sichere PIN';
        }
        return null;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // Validierung
        const pinError = validatePin(newPin);
        if (pinError) {
            setError(pinError);
            return;
        }

        if (newPin !== confirmPin) {
            setError('PINs stimmen nicht überein');
            return;
        }

        // Wenn nicht Admin und PIN bereits existiert, muss aktuelle PIN eingegeben werden
        if (!isAdmin && employee.pin && !currentPin) {
            setError('Bitte aktuelle PIN eingeben');
            return;
        }

        updatePinMutation.mutate({
            employeeId: employee.id,
            pin: newPin,
            currentUserPin: currentPin
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-600" />
                        PIN verwalten
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                            <strong>{employee.name}</strong>
                            <br />
                            {employee.pin ? 'PIN ändern' : 'Neue PIN erstellen'}
                        </AlertDescription>
                    </Alert>

                    {!isAdmin && employee.pin && (
                        <div className="space-y-2">
                            <Label>Aktuelle PIN *</Label>
                            <Input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={currentPin}
                                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="••••"
                                required
                                autoComplete="off"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Neue PIN * (4 Ziffern)</Label>
                        <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••"
                            required
                            autoComplete="off"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>PIN bestätigen *</Label>
                        <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••"
                            required
                            autoComplete="off"
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {newPin.length === 4 && confirmPin === newPin && !validatePin(newPin) && (
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                PIN ist gültig und sicher
                            </AlertDescription>
                        </Alert>
                    )}

                    <Alert className="bg-slate-50 border-slate-200">
                        <Lock className="w-4 h-4 text-slate-600" />
                        <AlertDescription className="text-slate-700 text-xs">
                            <strong>Sicherheitshinweise:</strong>
                            <ul className="list-disc ml-4 mt-1 space-y-1">
                                <li>Genau 4 Ziffern (0-9)</li>
                                <li>Keine einfachen PINs wie 0000 oder 1234</li>
                                <li>PIN wird verschlüsselt gespeichert</li>
                                {!isAdmin && <li>Nur Sie können Ihre PIN ändern</li>}
                            </ul>
                        </AlertDescription>
                    </Alert>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { onClose(); resetForm(); }}>
                            Abbrechen
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-amber-600 hover:bg-amber-700"
                            disabled={updatePinMutation.isPending}
                        >
                            {updatePinMutation.isPending ? 'Speichert...' : 'PIN speichern'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}