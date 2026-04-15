import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Loader2, ChevronDown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
    'Was ist heute wichtig?',
    'Zeige kritische Verknüpfungen',
    'Welche Aktionen empfiehlst du?',
    'Analysiere den aktuellen Status',
];

function getPageName(pathname) {
    const parts = pathname.replace('/', '').split('/');
    return parts[0] || 'Dashboard';
}

export default function BarAssistant({ isManager }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [proactiveHint, setProactiveHint] = useState(null);
    const [hintDismissed, setHintDismissed] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const location = useLocation();
    const currentPage = getPageName(location.pathname);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [open]);

    // Load proactive hint when page changes
    useEffect(() => {
        if (!isManager) return;
        setProactiveHint(null);
        setHintDismissed(false);

        const timer = setTimeout(async () => {
            try {
                const res = await base44.functions.invoke('barAssistant', {
                    messages: [{ role: 'user', content: `Gib mir einen kurzen proaktiven Hinweis (max 1-2 Sätze) für die aktuelle Seite "${currentPage}". Nur wenn etwas wirklich relevant ist, sonst antworte mit "OK".` }],
                    currentPage,
                });
                const hint = res?.data?.reply || '';
                if (hint && hint !== 'OK' && !hint.toLowerCase().includes('alles in ordnung') && hint.length > 20) {
                    setProactiveHint(hint);
                }
            } catch (e) {
                // silently fail
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [location.pathname, isManager]);

    if (!isManager) return null;

    const sendMessage = async (text) => {
        const userMsg = text || input.trim();
        if (!userMsg) return;

        const newMessages = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const res = await base44.functions.invoke('barAssistant', {
                messages: newMessages,
                currentPage,
            });
            const data = res?.data;
            const reply = data?.reply || 'Entschuldigung, ich konnte keine Antwort generieren.';
            setMessages(prev => [...prev, { role: 'assistant', content: reply, suggestions: data?.suggestions }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Verbindungsfehler. Bitte versuche es erneut.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Proactive hint pill */}
            <AnimatePresence>
                {proactiveHint && !hintDismissed && !open && (
                    <motion.div
                        initial={{ opacity: 0, x: 60, y: 0 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: 60 }}
                        className="fixed bottom-[5.5rem] md:bottom-6 right-4 z-40 max-w-[260px]"
                    >
                        <div
                            className="bg-card border border-amber-500/30 rounded-2xl p-3 shadow-xl cursor-pointer hover:border-amber-500/60 transition-all"
                            onClick={() => { setOpen(true); setHintDismissed(true); }}
                        >
                            <div className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-foreground leading-relaxed">{proactiveHint}</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setHintDismissed(true); }}
                                    className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Bubble Button */}
            <motion.button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'fixed bottom-[5rem] md:bottom-6 right-4 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all',
                    open
                        ? 'bg-foreground text-background'
                        : 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-900'
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <AnimatePresence mode="wait">
                    {open ? (
                        <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <X className="w-6 h-6" />
                        </motion.div>
                    ) : (
                        <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <Bot className="w-6 h-6" />
                        </motion.div>
                    )}
                </AnimatePresence>
                {proactiveHint && !hintDismissed && !open && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-background" />
                )}
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-[5.5rem] md:bottom-24 right-4 z-50 w-[340px] md:w-[380px] max-h-[70vh] flex flex-col bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-amber-500/10 to-orange-500/5 shrink-0">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-slate-900" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-foreground">BarAssist</p>
                                <p className="text-[10px] text-muted-foreground">KI-Assistent · {currentPage}</p>
                            </div>
                            <button onClick={() => setMessages([])} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-accent/50 transition-all">
                                Leeren
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                            {messages.length === 0 && (
                                <div className="space-y-3">
                                    <div className="text-center py-2">
                                        <Sparkles className="w-8 h-8 text-amber-400/50 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">Wie kann ich helfen?</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">Ich kenne den aktuellen Betriebsstatus</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {QUICK_PROMPTS.map(p => (
                                            <button
                                                key={p}
                                                onClick={() => sendMessage(p)}
                                                className="text-left px-2.5 py-2 rounded-xl bg-secondary/50 hover:bg-secondary text-xs text-foreground transition-all border border-border/50 hover:border-amber-500/30 leading-tight"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                                            <Bot className="w-3 h-3 text-slate-900" />
                                        </div>
                                    )}
                                    <div className={cn(
                                        'max-w-[85%] px-3 py-2.5 rounded-2xl text-sm',
                                        msg.role === 'user'
                                            ? 'bg-amber-500 text-slate-900 rounded-br-sm'
                                            : 'bg-secondary text-foreground rounded-bl-sm'
                                    )}>
                                        {msg.role === 'assistant' ? (
                                            <div className="prose prose-sm prose-invert max-w-none text-foreground [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:text-amber-400">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p>{msg.content}</p>
                                        )}
                                        {msg.suggestions?.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {msg.suggestions.map((s, si) => (
                                                    <button key={si} onClick={() => sendMessage(s)}
                                                        className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-500 transition-all">
                                                        <Zap className="w-3 h-3" /> {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                                        <Bot className="w-3 h-3 text-slate-900" />
                                    </div>
                                    <div className="bg-secondary px-3 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                        <span className="text-xs text-muted-foreground">Analysiere...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-border/50 shrink-0">
                            <div className="flex gap-2 items-end">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nachricht..."
                                    rows={1}
                                    className="flex-1 bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-amber-500/50 max-h-24 leading-relaxed"
                                    style={{ fieldSizing: 'content' }}
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={!input.trim() || loading}
                                    className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-amber-500/20 shrink-0"
                                >
                                    <Send className="w-4 h-4 text-slate-900" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}