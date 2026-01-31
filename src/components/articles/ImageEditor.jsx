import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Crop, RotateCw, ZoomIn, ZoomOut, Check, X } from 'lucide-react';

export default function ImageEditor({ open, onClose, imageUrl, onSave }) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (open && imageUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                imageRef.current = img;
                drawCanvas();
            };
            img.src = imageUrl;
        }
    }, [open, imageUrl]);

    useEffect(() => {
        if (imageRef.current) {
            drawCanvas();
        }
    }, [scale, rotation, position]);

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        const canvasSize = 400;
        canvas.width = canvasSize;
        canvas.height = canvasSize;

        ctx.clearRect(0, 0, canvasSize, canvasSize);
        ctx.save();

        // Center and apply transformations
        ctx.translate(canvasSize / 2, canvasSize / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        ctx.translate(position.x, position.y);

        // Draw image centered
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        ctx.restore();
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        const rect = canvasRef.current.getBoundingClientRect();
        setDragStart({
            x: e.clientX - rect.left - position.x * scale,
            y: e.clientY - rect.top - position.y * scale
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        setPosition({
            x: (e.clientX - rect.left - dragStart.x) / scale,
            y: (e.clientY - rect.top - dragStart.y) / scale
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        setIsDragging(true);
        const rect = canvasRef.current.getBoundingClientRect();
        setDragStart({
            x: touch.clientX - rect.left - position.x * scale,
            y: touch.clientY - rect.top - position.y * scale
        });
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = canvasRef.current.getBoundingClientRect();
        setPosition({
            x: (touch.clientX - rect.left - dragStart.x) / scale,
            y: (touch.clientY - rect.top - position.y) / scale
        });
    };

    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            
            const file = new File([blob], 'edited-image.jpg', { type: 'image/jpeg' });
            onSave(file);
        }, 'image/jpeg', 0.9);
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    const handleReset = () => {
        setScale(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Bild bearbeiten</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Canvas */}
                    <div className="flex justify-center">
                        <div 
                            ref={containerRef}
                            className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50"
                            style={{ width: 400, height: 400 }}
                        >
                            <canvas
                                ref={canvasRef}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleMouseUp}
                                className="cursor-move"
                                style={{ touchAction: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <ZoomIn className="w-4 h-4" />
                                    Zoom
                                </Label>
                                <span className="text-sm text-slate-600">{Math.round(scale * 100)}%</span>
                            </div>
                            <Slider
                                value={[scale]}
                                onValueChange={([v]) => setScale(v)}
                                min={0.5}
                                max={3}
                                step={0.1}
                                className="w-full"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRotate}
                                className="flex-1"
                            >
                                <RotateCw className="w-4 h-4 mr-2" />
                                Drehen
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleReset}
                                className="flex-1"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Zurücksetzen
                            </Button>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 text-center">
                        Ziehe das Bild zum Verschieben
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onClose}
                            className="flex-1"
                        >
                            Abbrechen
                        </Button>
                        <Button 
                            type="button" 
                            onClick={handleSave}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Speichern
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}