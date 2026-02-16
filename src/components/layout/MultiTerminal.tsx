import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';
import { useUIStore } from '../../stores/ui.store';
import { motion } from 'framer-motion';
import 'xterm/css/xterm.css';

interface TerminalTabProps {
    id: string;
    title: string;
    isActive: boolean;
    onSelect: () => void;
    onClose: () => void;
}

function TerminalTab({ id, title, isActive, onSelect, onClose }: TerminalTabProps) {
    return (
        <div
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer border-r border-border ${isActive
                ? 'bg-surface-1 text-text-primary'
                : 'bg-surface-0 text-text-tertiary hover:text-text-secondary hover:bg-surface-0.5'
                }`}
            onClick={onSelect}
        >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
            </svg>
            <span>{title}</span>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="ml-1 hover:text-status-error transition-colors"
                title="Close terminal"
            >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

interface SingleTerminalProps {
    id: string;
    isActive: boolean;
}

function SingleTerminal({ id, isActive }: SingleTerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<any>(null);
    const fitAddonRef = useRef<any>(null);
    const ptyReady = useRef(false);
    const [isReady, setIsReady] = useState(false);
    const hasInitialized = useRef(false);
    const cleanupRefs = useRef<(() => void)[]>([]);

    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const repos = useRepoStore((s) => s.repos);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const accounts = useAccountStore((s) => s.accounts);

    const activeRepo = repos.find((r) => r.path === activeRepoPath);
    const activeAccount = accounts.find((a) => a.id === activeAccountId);

    const fitTerminal = useCallback(() => {
        try {
            if (!terminalRef.current) return;
            const { width, height } = terminalRef.current.getBoundingClientRect();

            if (width === 0 || height === 0) return;

            fitAddonRef.current?.fit();
            const xterm = xtermRef.current;
            if (xterm) {
                if (window.electronAPI?.terminal) {
                    window.electronAPI.terminal.resize(id, xterm.cols, xterm.rows);
                }
            }
        } catch (e) {
            console.error('Fit error:', e);
        }
    }, [id]);

    // Initialize terminal when it becomes active for the first time
    useEffect(() => {
        if (!isActive) return;

        // NOTE: Do NOT set hasInitialized.current = true here.
        // In React StrictMode, this effect runs twice. If we set it here,
        // the first run sets it to true, then cleanup cancels the timer.
        // The second run sees it's true and returns early -> Terminal never inits.

        const initializeTerminal = async () => {
            if (hasInitialized.current) return; // Double check inside timer
            hasInitialized.current = true;

            try {
                if (!window.electronAPI?.terminal || !terminalRef.current) {
                    console.error('Terminal API or ref not available');
                    return;
                }

                const { Terminal } = await import('xterm');
                const { FitAddon } = await import('xterm-addon-fit');

                const terminal = new Terminal({
                    theme: {
                        background: '#0f0f12',
                        foreground: '#fafafa',
                        cursor: '#6366f1',
                        cursorAccent: '#0f0f12',
                        selectionBackground: '#6366f140',
                        black: '#09090b',
                        red: '#ef4444',
                        green: '#22c55e',
                        yellow: '#f59e0b',
                        blue: '#6366f1',
                        magenta: '#a855f7',
                        cyan: '#06b6d4',
                        white: '#fafafa',
                        brightBlack: '#71717a',
                        brightRed: '#f87171',
                        brightGreen: '#4ade80',
                        brightYellow: '#fbbf24',
                        brightBlue: '#818cf8',
                        brightMagenta: '#c084fc',
                        brightCyan: '#22d3ee',
                        brightWhite: '#ffffff',
                    },
                    fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
                    fontSize: 14,
                    lineHeight: 1.2,
                    cursorBlink: true,
                    cursorStyle: 'block',
                    scrollback: 5000,
                    convertEol: true,
                    allowProposedApi: true,
                });

                // Copy/Paste support
                terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
                    // Ctrl+C: copy if there's a selection, otherwise send SIGINT
                    if (e.ctrlKey && e.key === 'c' && e.type === 'keydown') {
                        const selection = terminal.getSelection();
                        if (selection) {
                            navigator.clipboard.writeText(selection);
                            terminal.clearSelection();
                            return false; // Prevent xterm from handling it
                        }
                    }
                    // Ctrl+V: paste from clipboard
                    if (e.ctrlKey && e.key === 'v' && e.type === 'keydown') {
                        navigator.clipboard.readText().then((text) => {
                            if (text && ptyReady.current) {
                                window.electronAPI?.terminal.write(id, text);
                            }
                        });
                        return false;
                    }
                    // Ctrl+Shift+C: always copy
                    if (e.ctrlKey && e.shiftKey && e.key === 'C' && e.type === 'keydown') {
                        const selection = terminal.getSelection();
                        if (selection) {
                            navigator.clipboard.writeText(selection);
                            terminal.clearSelection();
                        }
                        return false;
                    }
                    return true;
                });

                const fitAddon = new FitAddon();
                terminal.loadAddon(fitAddon);
                terminal.open(terminalRef.current!);
                xtermRef.current = terminal;
                fitAddonRef.current = fitAddon;

                fitAddon.fit();

                const api = window.electronAPI.terminal;

                const cleanupData = api.onData((msg: { id: string; data: string }) => {
                    if (msg.id === id && xtermRef.current) {
                        xtermRef.current.write(msg.data);
                    }
                });
                if (typeof cleanupData === 'function') {
                    cleanupRefs.current.push(cleanupData);
                } else {
                    console.warn('api.onData did not return a cleanup function. Preload might be outdated.');
                }

                const cleanupExit = api.onExit((msg: { id: string; exitCode: number }) => {
                    if (msg.id === id && xtermRef.current) {
                        xtermRef.current.writeln('');
                        xtermRef.current.writeln(`\x1b[2mProcess exited with code ${msg.exitCode}\x1b[0m`);
                    }
                });
                if (typeof cleanupExit === 'function') {
                    cleanupRefs.current.push(cleanupExit);
                }

                const repoState = useRepoStore.getState();
                const accState = useAccountStore.getState();
                const acc = accState.accounts.find((a) => a.id === accState.activeAccountId);

                // Spawn PTY with full identity context
                const ptyResult = await api.create(id, {
                    cwd: repoState.activeRepoPath || '',
                    username: acc?.username,
                    displayName: acc?.displayName,
                    email: acc?.email,
                    token: acc?.token,
                });

                ptyReady.current = true;
                setIsReady(true);

                if (ptyResult?.cols && ptyResult?.rows) {
                    terminal.resize(ptyResult.cols, ptyResult.rows);
                }
                fitAddon.fit();
                api.resize(id, terminal.cols, terminal.rows);

                terminal.onData((data: string) => {
                    if (ptyReady.current) {
                        window.electronAPI?.terminal.write(id, data);
                    }
                });

                terminal.focus();

                const ro = new ResizeObserver(() => {
                    if (!ptyReady.current) return;
                    try {
                        fitAddon.fit();
                        window.electronAPI?.terminal.resize(id, terminal.cols, terminal.rows);
                    } catch (e) {
                        /* ignore */
                    }
                });
                ro.observe(terminalRef.current!);
            } catch (error) {
                console.error('Failed to initialize terminal:', error);
                hasInitialized.current = false; // Allow retry
            }
        };

        // Increased delay to ensure DOM layout is stable (especially with framer-motion parents)
        const timer = setTimeout(initializeTerminal, 300);
        return () => clearTimeout(timer);
    }, [id, isActive]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            ptyReady.current = false;
            const api = window.electronAPI?.terminal;
            if (api) {
                api.destroy(id).catch(() => {
                    /* ignore */
                });
            }
            xtermRef.current?.dispose();
            xtermRef.current = null;
            xtermRef.current = null;
            fitAddonRef.current = null;

            // Execute all cleanup functions
            cleanupRefs.current.forEach(fn => {
                if (typeof fn === 'function') fn();
            });
            cleanupRefs.current = [];
        };
    }, [id]);

    // Focus and fit when becoming active
    useEffect(() => {
        if (!isReady || !isActive) return;

        const timer = setTimeout(() => {
            fitTerminal();
            xtermRef.current?.focus();
        }, 50);

        return () => clearTimeout(timer);
    }, [isActive, isReady, fitTerminal]);

    // Sync context when repo or account changes
    useEffect(() => {
        if (!isReady) return;
        const api = window.electronAPI?.terminal;
        if (!api) return;

        api.setContext(id, {
            cwd: activeRepoPath || '',
            username: activeAccount?.username,
            displayName: activeAccount?.displayName,
            email: activeAccount?.email,
            token: activeAccount?.token,
        });
    }, [id, activeRepoPath, activeAccount?.username, activeAccount?.displayName, activeAccount?.email, activeAccount?.token, isReady]);

    return (
        <div
            ref={terminalRef}
            className="overflow-hidden"
            style={{
                position: 'absolute',
                inset: 0,
                visibility: isActive ? 'visible' : 'hidden',
                zIndex: isActive ? 1 : 0,
            }}
            onContextMenu={(e) => {
                // Right-click paste
                e.preventDefault();
                navigator.clipboard.readText().then((text) => {
                    if (text && ptyReady.current) {
                        window.electronAPI?.terminal.write(id, text);
                    }
                });
            }}
        />
    );
}

export function MultiTerminal() {
    const resizeRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);

    const terminals = useUIStore((s) => s.terminals);
    const activeTerminalId = useUIStore((s) => s.activeTerminalId);
    const terminalHeight = useUIStore((s) => s.terminalHeight);
    const setTerminalHeight = useUIStore((s) => s.setTerminalHeight);
    const addTerminal = useUIStore((s) => s.addTerminal);
    const removeTerminal = useUIStore((s) => s.removeTerminal);
    const setActiveTerminal = useUIStore((s) => s.setActiveTerminal);

    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const repos = useRepoStore((s) => s.repos);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const accounts = useAccountStore((s) => s.accounts);

    const activeRepo = repos.find((r) => r.path === activeRepoPath);
    const activeAccount = accounts.find((a) => a.id === activeAccountId);

    // Create first terminal on mount if none exist
    useEffect(() => {
        if (terminals.length === 0) {
            addTerminal();
        }
    }, [terminals.length, addTerminal]);

    // Resize drag
    useEffect(() => {
        if (!isResizing) return;

        const onMove = (e: MouseEvent) => {
            const clamped = Math.max(150, Math.min(window.innerHeight - 200, window.innerHeight - e.clientY));
            setTerminalHeight(clamped);
        };
        const onUp = () => setIsResizing(false);

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';

        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, setTerminalHeight]);

    return (
        <div className="h-full bg-surface-1 flex flex-col relative">
            {/* Resize Handle */}
            <div
                ref={resizeRef}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsResizing(true);
                }}
                className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-brand-500/40 transition-colors z-10 group"
                title="Drag to resize"
            >
                <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-surface-5 group-hover:bg-brand-500 rounded-full transition-colors" />
            </div>

            {/* Terminal Tabs + New Button */}
            <div className="flex items-center border-b border-border bg-surface-0 shrink-0 mt-1 overflow-x-auto">
                {terminals.map((terminal) => (
                    <TerminalTab
                        key={terminal.id}
                        id={terminal.id}
                        title={terminal.title}
                        isActive={terminal.id === activeTerminalId}
                        onSelect={() => setActiveTerminal(terminal.id)}
                        onClose={() => removeTerminal(terminal.id)}
                    />
                ))}
                <button
                    onClick={addTerminal}
                    className="px-2 py-1 text-text-tertiary hover:text-text-primary hover:bg-surface-1 transition-colors ml-auto"
                    title="New terminal"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Active Account + Repo Info */}
            <div className="flex items-center px-3 py-1 border-b border-border bg-surface-2 shrink-0">
                <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    <span className="text-xs text-text-secondary font-medium">Terminal</span>
                </div>
                {activeRepo && (
                    <span className="text-xs text-text-tertiary ml-3 truncate max-w-[200px]">
                        {activeRepo.name}
                        {activeRepo.branch && <span className="text-brand-400 ml-1.5">({activeRepo.branch})</span>}
                    </span>
                )}
                {activeAccount && (
                    <span className="text-xs text-brand-400 ml-auto shrink-0">@{activeAccount.username}</span>
                )}
            </div>

            {/* Terminal Canvas Area */}
            <div className="flex-1 overflow-hidden relative">
                {terminals.map((terminal) => (
                    <SingleTerminal key={terminal.id} id={terminal.id} isActive={terminal.id === activeTerminalId} />
                ))}
            </div>
        </div>
    );
}
