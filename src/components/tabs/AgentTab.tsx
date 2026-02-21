import React, { useState, useRef, useEffect } from 'react';
import { useAgent } from '../../hooks/useAgent';
import { Bot, Send, Trash2, AlertTriangle, CheckCircle, XCircle, Loader2, Key, Terminal, Wrench, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import type { AgentMessage } from '../../stores/agent.store';

export function AgentTab() {
    const {
        isRunning,
        isConfigured,
        messages,
        pendingConfirmation,
        currentTool,
        sendMessage,
        confirmAction,
        setApiKey,
        clearConversation,
    } = useAgent();

    const [apiKeyInput, setApiKeyInput] = useState('');
    const [showKeyForm, setShowKeyForm] = useState(!isConfigured);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<{ setInputText: (text: string) => void }>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Show key form when not configured
    useEffect(() => {
        if (!isConfigured) setShowKeyForm(true);
    }, [isConfigured]);

    const handleSaveKey = async () => {
        const key = apiKeyInput.trim();
        if (!key) return;
        await setApiKey(key);
        setApiKeyInput('');
        setShowKeyForm(false);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 shrink-0">
                <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-semibold text-zinc-100">Flux AI</span>
                    {isRunning && (
                        <span className="flex items-center gap-1 text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full border border-violet-500/20">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            {currentTool ? `Running ${currentTool}` : 'Thinking...'}
                        </span>
                    )}
                    {isConfigured && !isRunning && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                            Ready
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowKeyForm(!showKeyForm)}
                        title="Configure Groq API key"
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                    >
                        <Key className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={clearConversation}
                        title="Clear conversation"
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* API Key Form */}
            {showKeyForm && (
                <div className="mx-4 mt-3 p-3 bg-zinc-900 border border-zinc-700 rounded-lg shrink-0">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Key className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-xs font-semibold text-zinc-200">Groq API Key</span>
                        {isConfigured && <span className="text-[10px] text-emerald-400 ml-1">✓ Saved</span>}
                    </div>
                    <p className="text-[11px] text-zinc-500 mb-2">
                        Get your free key at{' '}
                        <span className="text-violet-400 font-mono">console.groq.com</span>
                        . Stored locally — never sent to anyone except Groq.
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="password"
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                            placeholder={isConfigured ? 'Enter new key to replace...' : 'gsk_...'}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500 font-mono"
                        />
                        <button
                            onClick={handleSaveKey}
                            disabled={!apiKeyInput.trim()}
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {messages.length === 0 && !showKeyForm && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <Bot className="w-10 h-10 text-zinc-700 mb-3" />
                        <p className="text-sm font-medium text-zinc-400 mb-1">Flux AI Agent</p>
                        <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                            I can run git operations, commit changes, switch branches, and build workflows — just ask.
                        </p>
                        <div className="mt-4 grid grid-cols-1 gap-2 w-full max-w-xs">
                            {SUGGESTIONS.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => chatInputRef.current?.setInputText(s)}
                                    className="text-left text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all"
                                >
                                    "{s}"
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                {/* Confirmation Dialog */}
                {pendingConfirmation && (
                    <div className="mx-auto max-w-sm bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-semibold text-amber-300">Confirm Action</span>
                        </div>
                        <p className="text-xs text-zinc-300 mb-1">The agent wants to run:</p>
                        <code className="block text-[11px] font-mono text-amber-200 bg-zinc-900/60 px-2 py-1.5 rounded mb-3 break-all">
                            {pendingConfirmation.description}
                        </code>
                        <div className="flex gap-2">
                            <button
                                onClick={() => confirmAction(true)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors"
                            >
                                <CheckCircle className="w-3 h-3" />
                                Allow
                            </button>
                            <button
                                onClick={() => confirmAction(false)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium rounded transition-colors"
                            >
                                <XCircle className="w-3 h-3" />
                                Deny
                            </button>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {isConfigured && (
                <ChatInput
                    ref={chatInputRef}
                    isRunning={isRunning}
                    onSend={sendMessage}
                />
            )}

            {!isConfigured && (
                <div className="px-4 pb-4 shrink-0">
                    <div className="flex items-center justify-center gap-2 py-2.5 border border-dashed border-zinc-800 rounded-lg text-xs text-zinc-600">
                        <Key className="w-3.5 h-3.5" />
                        Add your Groq API key above to start chatting
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Chat Input ────────────────────────────────────────────────────

const ChatInput = React.forwardRef<{ setInputText: (text: string) => void }, { isRunning: boolean; onSend: (msg: string) => Promise<void> }>(
    ({ isRunning, onSend }, ref) => {
        const [input, setInput] = useState('');
        const inputRef = useRef<HTMLTextAreaElement>(null);

        React.useImperativeHandle(ref, () => ({
            setInputText: (text: string) => {
                setInput(text);
                setTimeout(() => inputRef.current?.focus(), 0);
            }
        }));

        const handleSend = async () => {
            const msg = input.trim();
            if (!msg || isRunning) return;
            setInput('');
            await onSend(msg);
            inputRef.current?.focus();
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        };

        return (
            <div className="px-4 pb-4 shrink-0">
                <div className={`flex gap-2 items-end bg-zinc-900 border rounded-xl p-2 transition-colors ${isRunning ? 'border-violet-500/30' : 'border-zinc-800 focus-within:border-zinc-600'}`}>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isRunning}
                        placeholder="Ask Flux AI anything... (Enter to send, Shift+Enter for newline)"
                        rows={1}
                        className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none max-h-32 leading-5"
                        style={{ scrollbarWidth: 'none' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isRunning}
                        className="p-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
                <p className="text-[10px] text-zinc-700 mt-1 text-center">
                    Powered by Groq · llama-3.3-70b-versatile · Dangerous actions require confirmation
                </p>
            </div>
        );
    }
);

// ── Message bubble ────────────────────────────────────────────────

const MessageBubble = React.memo(function MessageBubble({ message }: { message: AgentMessage }) {
    const [expanded, setExpanded] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content).catch(() => { });
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (message.role === 'status') {
        return (
            <div className="flex items-center gap-1.5 px-1 text-[11px] text-zinc-600">
                <Loader2 className="w-3 h-3 animate-spin text-zinc-700" />
                {message.content}
            </div>
        );
    }

    if (message.role === 'tool') {
        return (
            <div className={`flex items-start gap-2 px-1 text-[11px] ${message.error ? 'text-red-400' : 'text-zinc-500'}`}>
                {message.error ? (
                    <XCircle className="w-3 h-3 mt-0.5 shrink-0 text-red-400" />
                ) : (
                    <Wrench className="w-3 h-3 mt-0.5 shrink-0 text-violet-500" />
                )}
                <div className="flex-1 min-w-0">
                    {message.toolName && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-mono mb-0.5 transition-colors"
                        >
                            {expanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                            {message.toolName}
                        </button>
                    )}
                    {expanded && (
                        <pre className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-1.5 rounded whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                            {message.content}
                        </pre>
                    )}
                    {!expanded && (
                        <span className="truncate block text-zinc-600">{message.content.slice(0, 80)}{message.content.length > 80 ? '...' : ''}</span>
                    )}
                </div>
            </div>
        );
    }

    if (message.role === 'user') {
        return (
            <div className="flex justify-end group">
                <div className="max-w-[80%] pl-3 pr-8 py-2 bg-violet-600 text-white text-sm rounded-2xl rounded-br-sm whitespace-pre-wrap leading-relaxed relative">
                    {message.content}
                    <button
                        onClick={handleCopy}
                        className="absolute right-1.5 top-1.5 p-1 text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        title="Copy message"
                    >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>
        );
    }

    // assistant
    return (
        <div className="flex gap-2 group">
            <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-violet-400" />
            </div>
            <div className={`max-w-[85%] pl-3 pr-8 py-2 text-sm rounded-2xl rounded-bl-sm whitespace-pre-wrap leading-relaxed relative ${message.error
                ? 'bg-red-900/20 border border-red-500/20 text-red-300'
                : 'bg-zinc-800 text-zinc-100'
                }`}>
                {message.content}
                <button
                    onClick={handleCopy}
                    className="absolute right-1.5 top-1.5 p-1 text-zinc-500 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
                    title="Copy message"
                >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>
    );
});

// ── Suggestion prompts ────────────────────────────────────────────

const SUGGESTIONS = [
    'Show me the current git status',
    'Stage all changes and commit with a good message',
    'Create a new branch called feature/my-feature',
    'Show me the last 5 commits',
];
