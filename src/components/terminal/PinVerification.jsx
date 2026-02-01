import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from 'lucide-react';

export default function PinVerification({ open, onClose, onVerified, title = "PIN eingeben" }) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (pin.length !== 4) {
            setError('PIN muss 4-stellig sein');
            return;
        }
        onVerified(pin);
        setPin('');
        setError('');
    };

    const handleClose = () => {
        setPin('');
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-600" />
                        {title}
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Deine 4-stellige PIN</Label>
                        <Input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => {
                                setError('');
                                setPin(e.target.value.replace(/\D/g, ''));
                            }}
                            placeholder="••••"
                            className="text-center text-2xl tracking-widest"
                            autoFocus
                        />
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '←', 0, '✓'].map((num) => (
                            <Button
                                key={num}
                                type={num === '✓' ? 'submit' : 'button'}
                                variant={num === '✓' ? 'default' : 'outline'}
                                className={num === '✓' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                                onClick={() => {
                                    if (num === '←') {
                                        setPin(pin.slice(0, -1));
                                    } else if (num !== '✓' && pin.length < 4) {
                                        setPin(pin + num);
                                    }
                                }}
                            >
                                {num}
                            </Button>
                        ))}
                    </div>

                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={handleClose}
                        className="w-full"
                    >
                        Abbrechen
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}