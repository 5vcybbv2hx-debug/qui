import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PinVerification({ open, onClose, onVerified, title = 'PIN eingeben' }) {
    const [pin, setPin] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!pin) return;
        onVerified(pin);
        setPin('');
    };

    const handleClose = () => {
        setPin('');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <Input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={pin}
                        onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="PIN eingeben"
                        autoFocus
                        className="text-center text-xl tracking-widest"
                    />
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={!pin} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                            Bestätigen
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}