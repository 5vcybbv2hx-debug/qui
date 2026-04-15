import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Loader2, Zap, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
    'Was ist heute wichtig?',
    'Räum die App auf',
    'Zeige kritische Verknüpfungen',
    'Welche Aktionen empfiehlst du?',
];

function getPageName(pathname) {
    return pathname.replace('/', '').split('/')[0] || 'Dashboard';
}

// Confirmation card for destructive actions
function ConfirmActionCard({ action, onConfirm, onDismiss, loading }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 space-y-2"
        >
            <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-foreground leading-relaxed flex-1">{action.confirm_label || action.type}</p>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onConfirm(action)}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/80 transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Bestätigen
                </button>
                <button
                    onClick={() => onDismiss(action)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:bg-secondary/80 transition-all"
                >
                    Abbrechen
                </button>
            </div>
        </motion.div>
    );
}

export default function BarAssistant({ isManager }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [proactiveHint, setProactiveHint] = useState(null);
    const [hintDismissed, setHintDismissed] = useState(false);
    const [confirmingAction, setConfirmingAction] = useState(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const location = useLocation();
    const currentPage = getPageName(location.pathname);

    // Determine which assistant to use
    const isEmployeeMode = !isManager;
    const assistantFunction = isManager ? 'barAssistant' : 'employeeAssistant';
    const assistantLabel = isManager ? 'BarAssist' : 'Hilfe';

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 300);
    }, [open]);

    // Proactive hint on page change (only for managers)
    useEffect(() => {
        if (!isManager) return;
        setProactiveHint(null);
        setHintDismissed(false);

        const timer = setTimeout(async () => {
            try {
                const res = await base44.functions.invoke('barAssistant', {
                    messages: [{ role: 'user', content: `Gib mir einen kurzen proaktiven Hinweis (max 1-2 Sätze) für die aktuelle Seite "${currentPage}". Nur wenn etwas wirklich wichtig ist, sonst antworte nur mit dem Wort "OK".` }],
                    currentPage,
                });
                const hint = res?.data?.reply || '';
                if (hint && hint.trim() !== 'OK' && !hint.toLowerCase().startsWith('ok') && hint.length > 20) {
                    setProactiveHint(hint);
                }
            } catch (e) { /* silent */ }
        }, 2500);

        return () => clearTimeout(timer);
    }, [location.pathname, isManager]);

    const sendMessage = async (text) => {
        const userMsg = text || input.trim();
        if (!userMsg) return;

        const newMessages = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const res = await base44.functions.invoke(assistantFunction, {
                messages: newMessages,
                currentPage,
            });
            const data = res?.data;
            const reply = data?.reply || 'Entschuldigung, ich konnte keine Antwort generieren.';
            const confirmActions = data?.confirmActions || [];

            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: reply,
                    confirmActions,
                }
            ]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Verbindungsfehler. Bitte versuche es erneut.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmAction = async (action) => {
        setConfirmingAction(action);
        setConfirmLoading(true);
        try {
            const res = await base44.functions.invoke('barAssistant', {
                messages: [],
                currentPage,
                executeAction: action,
            });
            const data = res?.data;
            const resultMsg = data?.success
                ? `✅ ${data.label}`
                : `❌ Fehler: ${data?.label || 'Unbekannter Fehler'}`;

            // Remove the confirm action from the message and add result
            setMessages(prev => prev.map(msg => ({
                ...msg,
                confirmActions: msg.confirmActions?.filter(a => a !== action),
            })).concat([{ role: 'assistant', content: resultMsg }]));
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Aktion konnte nicht ausgeführt werden.' }]);
        } finally {
            setConfirmingAction(null);
            setConfirmLoading(false);
        }
    };

    const handleDismissAction = (action) => {
        setMessages(prev => prev.map(msg => ({
            ...msg,
            confirmActions: msg.confirmActions?.filter(a => a !== action),
        })));
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
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60 }}
                        className="fixed bottom-[5.5rem] md:bottom-6 right-[4.5rem] z-40 max-w-[240px]"
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
                        : isManager
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-900'
                            : 'bg-gradient-to-br from-blue-500 to-cyan-600 text-slate-900'
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isManager ? 'Manager-Assistent' : 'Mitarbeiter-Hilfe'}
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
                        className="fixed bottom-[5.5rem] md:bottom-24 right-4 z-50 w-[340px] md:w-[380px] max-h-[72vh] flex flex-col bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className={cn(
                            'flex items-center gap-3 px-4 py-3 border-b border-border/50 shrink-0',
                            isManager
                                ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/5'
                                : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/5'
                        )}>
                            <div className={cn(
                                'w-8 h-8 rounded-xl flex items-center justify-center',
                                isManager
                                    ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                                    : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                            )}>
                                <Bot className="w-4 h-4 text-slate-900" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-foreground">{assistantLabel}</p>
                                <p className="text-[10px] text-muted-foreground">
                                    {isManager ? 'Manager-Assistent' : 'Mitarbeiter-Hilfe'} · {currentPage}
                                </p>
                            </div>
                            <button
                                onClick={() => setMessages([])}
                                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-accent/50 transition-all"
                            >
                                Leeren
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                            {messages.length === 0 && (
                                <div className="space-y-3">
                                    <div className="text-center py-2">
                                        <Sparkles className={cn('w-8 h-8 mx-auto mb-2', isManager ? 'text-amber-400/50' : 'text-blue-400/50')} />
                                        <p className="text-sm text-muted-foreground">Wie kann ich helfen?</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">
                                            {isManager 
                                                ? 'Ich kenne den aktuellen Betriebsstatus' 
                                                : 'Ich helfe dir bei Fragen zur App'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {(isManager ? QUICK_PROMPTS : ['Was ist meine Aufgabe?', 'Zeige meine Schicht', 'Putzliste erklären', 'Hilf mir mit der App']).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => sendMessage(p)}
                                                className={cn(
                                                    'text-left px-2.5 py-2 rounded-xl bg-secondary/50 hover:bg-secondary text-xs text-foreground transition-all border border-border/50 leading-tight',
                                                    isManager
                                                        ? 'hover:border-amber-500/30'
                                                        : 'hover:border-blue-500/30'
                                                )}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div key={i} className="space-y-2">
                                    <div className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                        {msg.role === 'assistant' && (
                                            <div className={cn(
                                                'w-6 h-6 rounded-lg flex items-center justify-center mr-2 mt-0.5 shrink-0',
                                                isManager
                                                    ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                                                    : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                                            )}>
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
                                                <div className="prose prose-sm max-w-none text-foreground [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:text-amber-400 [&_a]:text-amber-400">
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <p>{msg.content}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Confirmation cards for destructive actions */}
                                    {msg.confirmActions?.length > 0 && (
                                        <div className="ml-8 space-y-2">
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                                Bestätigung erforderlich:
                                            </p>
                                            <AnimatePresence>
                                                {msg.confirmActions.map((action, ai) => (
                                                    <ConfirmActionCard
                                                        key={ai}
                                                        action={action}
                                                        onConfirm={handleConfirmAction}
                                                        onDismiss={handleDismissAction}
                                                        loading={confirmingAction === action && confirmLoading}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {loading && (
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        'w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
                                        isManager
                                            ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                                            : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                                    )}>
                                        <Bot className="w-3 h-3 text-slate-900" />
                                    </div>
                                    <div className="bg-secondary px-3 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2">
                                        <Loader2 className={cn('w-3.5 h-3.5 animate-spin', isManager ? 'text-amber-400' : 'text-blue-400')} />
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
                                    className={cn(
                                        'flex-1 bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none max-h-24 leading-relaxed',
                                        isManager
                                            ? 'focus:border-amber-500/50'
                                            : 'focus:border-blue-500/50'
                                    )}
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={!input.trim() || loading}
                                    className={cn(
                                        'w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all shrink-0',
                                        isManager
                                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-amber-500/20'
                                            : 'bg-gradient-to-br from-blue-500 to-cyan-600 hover:shadow-lg hover:shadow-blue-500/20'
                                    )}
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