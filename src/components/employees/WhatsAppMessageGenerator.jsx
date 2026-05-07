import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, Sparkles, Copy, ExternalLink, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/FrOmvmQFvvBJvqo4CJaBPA';

const QUICK_TOPICS = [
    'Schichtplan geändert',
    'Dringende Info',
    'Meeting / Besprechung',
    'Lob / Danke',
    'Erinnerung',
    'Krankmeldung',
    'Einladung',
];

export default function WhatsAppMessageGenerator({ employees = [] }) {
    const [open, setOpen] = useState(false);
    const [keywords, setKeywords] = useState('');
    const [recipient, setRecipient] = useState('group'); // 'group' | employee.id
    const [generatedMessage, setGeneratedMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [tone, setTone] = useState('freundlich');

    const activeEmployees = employees.filter(e => e.is_active !== false && e.phone);

    const selectedEmployee = recipient !== 'group'
        ? employees.find(e => e.id === recipient)
        : null;

    const handleGenerate = async () => {
        if (!keywords.trim()) return;
        setIsLoading(true);
        setGeneratedMessage('');
        try {
            const recipientDesc = selectedEmployee
                ? `an ${selectedEmployee.name}`
                : 'an die gesamte Team-WhatsApp-Gruppe';

            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Erstelle eine WhatsApp-Nachricht für ein Bar-Team.
Empfänger: ${recipientDesc}
Ton: ${tone}
Stichwörter / Anlass: ${keywords}

Regeln:
- WhatsApp-Formatierung verwenden (*fett*, _kursiv_)
- Kurz und prägnant (max. 5-8 Sätze)
- Passende Emojis einsetzen
- Auf Deutsch
- Keine Betreffzeile, direkt die Nachricht
- Am Ende eine kurze Handlungsaufforderung wenn sinnvoll`
            });

            setGeneratedMessage(result);
        } catch (e) {
            toast.error('Fehler beim Generieren der Nachricht');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedMessage);
        toast.success('Nachricht kopiert!');
    };

    const handleOpenWhatsApp = () => {
        const encoded = encodeURIComponent(generatedMessage);
        if (selectedEmployee?.phone) {
            const phone = selectedEmployee.phone.replace(/\D/g, '');
            window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
        } else {
            // Gruppe: erst kopieren, dann Gruppe öffnen
            navigator.clipboard.writeText(generatedMessage);
            toast.success('Nachricht kopiert! WhatsApp-Gruppe wird geöffnet...');
            setTimeout(() => window.open(WHATSAPP_GROUP_LINK, '_blank'), 800);
        }
    };

    const handleReset = () => {
        setKeywords('');
        setGeneratedMessage('');
        setRecipient('group');
        setTone('freundlich');
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset(); }}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2 border-green-500/40 text-green-400 hover:bg-green-500/10"
                >
                    <MessageCircle className="w-4 h-4" />
                    Nachricht erstellen
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-green-400" />
                        WhatsApp-Nachricht Generator
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* Empfänger */}
                    <div className="space-y-2">
                        <Label>Empfänger</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setRecipient('group')}
                                className={cn(
                                    'p-3 rounded-xl border text-sm font-medium transition-all text-left',
                                    recipient === 'group'
                                        ? 'border-green-500/60 bg-green-500/10 text-green-400'
                                        : 'border-border bg-card text-muted-foreground hover:bg-accent/30'
                                )}
                            >
                                👥 Team-Gruppe
                            </button>
                            <div className="relative">
                                <select
                                    value={recipient === 'group' ? '' : recipient}
                                    onChange={(e) => setRecipient(e.target.value || 'group')}
                                    className={cn(
                                        'w-full h-full p-3 rounded-xl border text-sm font-medium transition-all appearance-none bg-card',
                                        recipient !== 'group'
                                            ? 'border-green-500/60 bg-green-500/10 text-green-400'
                                            : 'border-border text-muted-foreground'
                                    )}
                                >
                                    <option value="">👤 Einzelperson...</option>
                                    {activeEmployees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Ton */}
                    <div className="space-y-2">
                        <Label>Ton</Label>
                        <div className="flex gap-2 flex-wrap">
                            {['freundlich', 'professionell', 'dringend', 'locker'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTone(t)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                                        tone === t
                                            ? 'border-amber-500/60 bg-amber-500/15 text-amber-400'
                                            : 'border-border text-muted-foreground hover:bg-accent/30'
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Schnell-Themen */}
                    <div className="space-y-2">
                        <Label>Thema / Stichwörter</Label>
                        <div className="flex gap-1.5 flex-wrap mb-2">
                            {QUICK_TOPICS.map(topic => (
                                <button
                                    key={topic}
                                    onClick={() => setKeywords(prev => prev ? `${prev}, ${topic}` : topic)}
                                    className="px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-all"
                                >
                                    + {topic}
                                </button>
                            ))}
                        </div>
                        <Textarea
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder="z.B. Schichttausch Samstag, jemand krank, dringend Ersatz gesucht..."
                            className="min-h-20 text-sm"
                        />
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={!keywords.trim() || isLoading}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                    >
                        {isLoading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generiere...</>
                        ) : (
                            <><Sparkles className="w-4 h-4 mr-2" />Nachricht generieren</>
                        )}
                    </Button>

                    {/* Generierte Nachricht */}
                    {generatedMessage && (
                        <div className="space-y-3">
                            <div className="relative">
                                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                        {generatedMessage}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleGenerate}
                                    disabled={isLoading}
                                    className="flex-1 text-xs"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Neu generieren
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCopy}
                                    className="flex-1 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                                >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Kopieren
                                </Button>
                                <Button
                                    onClick={handleOpenWhatsApp}
                                    className="flex-1 text-xs bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    {selectedEmployee ? 'Senden' : 'Zur Gruppe'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}