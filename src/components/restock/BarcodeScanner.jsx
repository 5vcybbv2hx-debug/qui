import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function BarcodeScanner({ onScan, open, onClose }) {
    const scannerRef = useRef(null);
    const [scanner, setScanner] = useState(null);

    useEffect(() => {
        if (!open) {
            if (scanner) {
                scanner.clear().catch(console.error);
                setScanner(null);
            }
            return;
        }

        if (!scannerRef.current || scanner) return;

        const html5QrcodeScanner = new Html5QrcodeScanner(
            "barcode-scanner",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 150 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                formatsToSupport: [
                    0, // QR_CODE
                    8, // CODE_128
                    9, // CODE_39
                    10, // EAN_13
                    11, // EAN_8
                    12, // UPC_A
                    13  // UPC_E
                ]
            },
            false
        );

        html5QrcodeScanner.render(
            (decodedText) => {
                onScan(decodedText);
                html5QrcodeScanner.clear().catch(console.error);
                setScanner(null);
            },
            (error) => {
                // Ignore scanning errors (they happen frequently)
            }
        );

        setScanner(html5QrcodeScanner);

        return () => {
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear().catch(console.error);
            }
        };
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        Barcode scannen
                    </DialogTitle>
                </DialogHeader>
                
                <div className="mt-4">
                    <div 
                        id="barcode-scanner" 
                        ref={scannerRef}
                        className="rounded-lg overflow-hidden"
                    />
                    <p className="text-sm text-slate-500 mt-3 text-center">
                        Halte den Barcode vor die Kamera
                    </p>
                </div>

                <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="w-full mt-2"
                >
                    Abbrechen
                </Button>
            </DialogContent>
        </Dialog>
    );
}