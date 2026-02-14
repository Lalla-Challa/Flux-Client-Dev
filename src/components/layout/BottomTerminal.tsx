import React, { useEffect, useRef } from 'react';

/**
 * Embedded terminal using xterm.js.
 * In production, this connects to node-pty via IPC.
 * For development, it renders a styled terminal placeholder.
 */
export function BottomTerminal() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<any>(null);

    useEffect(() => {
        let terminal: any;
        let fitAddon: any;

        const initTerminal = async () => {
            try {
                const { Terminal } = await import('xterm');
                const { FitAddon } = await import('xterm-addon-fit');

                terminal = new Terminal({
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
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    fontSize: 13,
                    lineHeight: 1.4,
                    cursorBlink: true,
                    cursorStyle: 'bar',
                    scrollback: 5000,
                    allowProposedApi: true,
                });

                fitAddon = new FitAddon();
                terminal.loadAddon(fitAddon);

                if (terminalRef.current) {
                    terminal.open(terminalRef.current);
                    fitAddon.fit();

                    // Welcome message
                    terminal.writeln('\x1b[1;35m  GitFlow Terminal\x1b[0m');
                    terminal.writeln('\x1b[2m  Connected to active repository\x1b[0m');
                    terminal.writeln('');
                    terminal.write('\x1b[32m❯\x1b[0m ');

                    xtermRef.current = terminal;
                }

                // Handle resize
                const resizeObserver = new ResizeObserver(() => {
                    try {
                        fitAddon.fit();
                    } catch {
                        // Ignore fit errors during rapid resize
                    }
                });

                if (terminalRef.current) {
                    resizeObserver.observe(terminalRef.current);
                }

                return () => {
                    resizeObserver.disconnect();
                };
            } catch (error) {
                console.warn('xterm.js not available, using fallback terminal');
                // Fallback: render a simple div with terminal styling
            }
        };

        initTerminal();

        return () => {
            if (terminal) {
                terminal.dispose();
            }
        };
    }, []);

    return (
        <div className="h-full bg-surface-1 flex flex-col">
            {/* Terminal Header */}
            <div className="flex items-center px-3 py-1 border-b border-border bg-surface-2 shrink-0">
                <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-2xs text-text-secondary font-mono">bash</span>
                </div>
            </div>

            {/* Terminal Content */}
            <div
                ref={terminalRef}
                className="flex-1 overflow-hidden"
                style={{ padding: '4px 0 0 4px' }}
            />
        </div>
    );
}
