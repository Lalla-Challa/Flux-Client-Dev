import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';
import { useUIStore } from '../../stores/ui.store';
import 'xterm/css/xterm.css';

const TERMINAL_ID = 'main-terminal';

export function BottomTerminal() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<any>(null);
    const fitAddonRef = useRef<any>(null);
    const resizeRef = useRef<HTMLDivElement>(null);
    const initStarted = useRef(false);
    const ptyReady = useRef(false);
    const [isReady, setIsReady] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const repos = useRepoStore((s) => s.repos);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const accounts = useAccountStore((s) => s.accounts);
    const terminalExpanded = useUIStore((s) => s.terminalExpanded);
    const terminalHeight = useUIStore((s) => s.terminalHeight);
    const setTerminalHeight = useUIStore((s) => s.setTerminalHeight);

    const activeRepo = repos.find((r) => r.path === activeRepoPath);
    const activeAccount = accounts.find((a) => a.id === activeAccountId);

    const fitTerminal = useCallback(() => {
        try {
            fitAddonRef.current?.fit();
            const xterm = xtermRef.current;
            if (xterm && window.electronAPI?.terminal) {
                window.electronAPI.terminal.resize(TERMINAL_ID, xterm.cols, xterm.rows);
            }
        } catch (e) {
            // Ignore fit errors
        }
    }, []);

    // ── Trigger init on first expand ──
    // This effect only fires the init; cleanup is handled separately.
    useEffect(() => {
        if (!terminalExpanded || initStarted.current) return;
        initStarted.current = true;

        // Wait for the expand animation (200ms) to finish so the
        // container has real dimensions when xterm.open() runs.
        const timer = setTimeout(async () => {
            try {
                if (!window.electronAPI?.terminal) {
                    console.error('Terminal API not available');
                    return;
                }
                if (!terminalRef.current) {
                    console.error('Terminal container not available');
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
                });

                const fitAddon = new FitAddon();
                terminal.loadAddon(fitAddon);

                // Open xterm in the now-visible container
                terminal.open(terminalRef.current!);
                xtermRef.current = terminal;
                fitAddonRef.current = fitAddon;

                // Initial fit
                fitAddon.fit();

                // Register PTY output listener BEFORE creating PTY
                // so we capture the initial shell prompt.
                const api = window.electronAPI.terminal;

                api.onData((msg: { id: string; data: string }) => {
                    if (msg.id === TERMINAL_ID && xtermRef.current) {
                        xtermRef.current.write(msg.data);
                    }
                });

                api.onExit((msg: { id: string; exitCode: number }) => {
                    if (msg.id === TERMINAL_ID && xtermRef.current) {
                        xtermRef.current.writeln('');
                        xtermRef.current.writeln(
                            `\x1b[2mProcess exited with code ${msg.exitCode}\x1b[0m`
                        );
                    }
                });

                // Build context from current app state
                const repoState = useRepoStore.getState();
                const accState = useAccountStore.getState();
                const acc = accState.accounts.find((a) => a.id === accState.activeAccountId);

                // Spawn PTY with full identity context
                const ptyResult = await api.create(TERMINAL_ID, {
                    cwd: repoState.activeRepoPath || '',
                    username: acc?.username,
                    displayName: acc?.displayName,
                    email: acc?.email,
                    token: acc?.token,
                });

                ptyReady.current = true;
                setIsReady(true);

                // Sync xterm size → PTY
                if (ptyResult?.cols && ptyResult?.rows) {
                    terminal.resize(ptyResult.cols, ptyResult.rows);
                }
                fitAddon.fit();
                api.resize(TERMINAL_ID, terminal.cols, terminal.rows);

                // Forward keystrokes to PTY
                terminal.onData((data: string) => {
                    if (ptyReady.current) {
                        window.electronAPI?.terminal.write(TERMINAL_ID, data);
                    }
                });

                // Auto-focus
                terminal.focus();

                // Watch container resizes
                const ro = new ResizeObserver(() => {
                    if (!ptyReady.current) return;
                    try {
                        fitAddon.fit();
                        window.electronAPI?.terminal.resize(
                            TERMINAL_ID,
                            terminal.cols,
                            terminal.rows
                        );
                    } catch (e) { /* ignore */ }
                });
                ro.observe(terminalRef.current!);
            } catch (error) {
                console.error('Failed to initialize terminal:', error);
            }
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminalExpanded]);

    // ── Cleanup only on component unmount (app close) ──
    useEffect(() => {
        return () => {
            ptyReady.current = false;
            const api = window.electronAPI?.terminal;
            if (api) {
                api.removeDataListener();
                api.removeExitListener();
                api.destroy(TERMINAL_ID);
            }
            xtermRef.current?.dispose();
            xtermRef.current = null;
            fitAddonRef.current = null;
            initStarted.current = false;
        };
    }, []);

    // ── Focus + fit on subsequent expands ──
    useEffect(() => {
        if (!isReady || !terminalExpanded) return;

        const timer = setTimeout(() => {
            fitTerminal();
            xtermRef.current?.focus();
        }, 250);

        return () => clearTimeout(timer);
    }, [terminalExpanded, isReady, fitTerminal]);

    // ── Re-fit on height change (drag resize) ──
    useEffect(() => {
        if (!isReady || !terminalExpanded) return;
        const timer = setTimeout(fitTerminal, 50);
        return () => clearTimeout(timer);
    }, [terminalHeight, isReady, terminalExpanded, fitTerminal]);

    // ── Sync context when repo or account changes ──
    useEffect(() => {
        if (!isReady) return;
        const api = window.electronAPI?.terminal;
        if (!api) return;

        api.setContext(TERMINAL_ID, {
            cwd: activeRepoPath || '',
            username: activeAccount?.username,
            displayName: activeAccount?.displayName,
            email: activeAccount?.email,
            token: activeAccount?.token,
        });
    }, [activeRepoPath, activeAccount?.username, activeAccount?.displayName, activeAccount?.email, activeAccount?.token, isReady]);

    // ── Resize drag ──
    useEffect(() => {
        if (!isResizing) return;

        const onMove = (e: MouseEvent) => {
            const clamped = Math.max(
                150,
                Math.min(window.innerHeight - 200, window.innerHeight - e.clientY)
            );
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
        <div
            className="h-full bg-surface-1 flex flex-col relative"
            onMouseDown={() => xtermRef.current?.focus()}
        >
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

            {/* Header */}
            <div className="flex items-center px-3 py-1 border-b border-border bg-surface-2 shrink-0 mt-1">
                <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-text-secondary font-medium">Terminal</span>
                </div>
                {activeRepo && (
                    <span className="text-xs text-text-tertiary ml-3 truncate max-w-[200px]">
                        {activeRepo.name}
                        {activeRepo.branch && (
                            <span className="text-brand-400 ml-1.5">({activeRepo.branch})</span>
                        )}
                    </span>
                )}
                {activeAccount && (
                    <span className="text-xs text-brand-400 ml-auto shrink-0">
                        @{activeAccount.username}
                    </span>
                )}
            </div>

            {/* Terminal canvas */}
            <div ref={terminalRef} className="flex-1 overflow-hidden px-1" />
        </div>
    );
}
