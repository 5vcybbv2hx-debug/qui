import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function BarcodeScanner({ onScan, open, onClose }) {
    const scannerRef = useRef(null);
    const scannerInstanceRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!open) {
            // Cleanup when closing
            if (scannerInstanceRef.current) {
                scannerInstanceRef.current.clear()
                    .then(() => {
                        scannerInstanceRef.current = null;
                        setIsInitialized(false);
                    })
                    .catch(console.error);
            }
            return;
        }

        // Initialize scanner when opening
        if (open && !isInitialized) {
            const timer = setTimeout(() => {
                try {
                    const html5QrcodeScanner = new Html5QrcodeScanner(
                        "barcode-scanner",
                        { 
                            fps: 10, 
                            qrbox: { width: 250, height: 150 },
                            aspectRatio: 1.0,
                            showTorchButtonIfSupported: true,
                            rememberLastUsedCamera: true,
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
                            // Cleanup before closing
                            if (scannerInstanceRef.current) {
                                scannerInstanceRef.current.clear()
                                    .then(() => {
                                        scannerInstanceRef.current = null;
                                        setIsInitialized(false);
                                        onClose();
                                    })
                                    .catch(() => {
                                        scannerInstanceRef.current = null;
                                        setIsInitialized(false);
                                        onClose();
                                    });
                            } else {
                                onClose();
                            }
                        },
                        (error) => {
                            // Ignore scanning errors (they happen frequently)
                        }
                    );

                    scannerInstanceRef.current = html5QrcodeScanner;
                    setIsInitialized(true);
                } catch (error) {
                    console.error('Scanner initialization error:', error);
                }
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [open, isInitialized, onScan, onClose]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
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
                        className="rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-900 min-h-[400px]"
                    />
                    <div className="mt-4 p-3 bg-slate-100 rounded-lg border border-slate-300">
                        <p className="text-sm text-slate-700 text-center font-medium">
                            📱 Halte den Barcode vor die Kamera
                        </p>
                        <p className="text-xs text-slate-500 text-center mt-1">
                            Stelle sicher, dass der Barcode gut beleuchtet und lesbar ist
                        </p>
                    </div>
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