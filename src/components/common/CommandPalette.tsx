import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommandPaletteStore } from '../../stores/command-palette.store';
import { commandRegistry, Command } from '../../lib/command-registry';

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
    const result: Record<string, T[]> = {};
    for (const item of items) {
        const k = key(item);
        (result[k] ||= []).push(item);
    }
    return result;
}

export function CommandPalette() {
    const { isOpen, query, selectedIndex, close, setQuery, setSelectedIndex, macros, executeMacro, openMacroEditor } =
        useCommandPaletteStore();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Build combined list: commands + macros
    const results = useMemo(() => {
        const commands = commandRegistry.search(query);
        const macroCommands: Command[] = macros
            .filter(
                (m) =>
                    !query ||
                    m.name.toLowerCase().includes(query.toLowerCase()) ||
                    m.description.toLowerCase().includes(query.toLowerCase())
            )
            .map((m) => ({
                id: `macro:${m.id}`,
                label: m.name,
                category: 'macro',
                keywords: [m.description],
                handler: () => executeMacro(m),
            }));
        return [...macroCommands, ...commands];
    }, [query, macros, executeMacro]);

    const grouped = useMemo(() => groupBy(results, (r) => r.category), [results]);
    const flatList = results;

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Scroll selected into view
    useEffect(() => {
        if (!listRef.current) return;
        const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(Math.min(selectedIndex + 1, flatList.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(Math.max(selectedIndex - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = flatList[selectedIndex];
            if (cmd) {
                close();
                cmd.handler();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }
    };

    if (!isOpen) return null;

    let flatIndex = -1;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
                onClick={close}
            >
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => e.stopPropagation()}
                    className="mx-auto mt-[20vh] w-[520px] max-h-[60vh] flex flex-col rounded-xl bg-surface-1 border border-border shadow-2xl overflow-hidden"
                >
                    {/* Search input */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                        <svg className="w-4 h-4 text-text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a command..."
                            className="flex-1 text-sm bg-transparent text-text-primary placeholder:text-text-tertiary focus:outline-none"
                        />
                        <span className="text-2xs text-text-tertiary border border-border rounded px-1.5 py-0.5">ESC</span>
                    </div>

                    {/* Results */}
                    <div ref={listRef} className="flex-1 overflow-y-auto py-1">
                        {flatList.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-text-tertiary">
                                No commands found
                            </div>
                        ) : (
                            Object.entries(grouped).map(([category, cmds]) => (
                                <div key={category}>
                                    <div className="px-4 py-1.5">
                                        <span className="text-2xs font-medium text-text-tertiary uppercase tracking-wider">
                                            {category}
                                        </span>
                                    </div>
                                    {cmds.map((cmd) => {
                                        flatIndex++;
                                        const idx = flatIndex;
                                        const isSelected = idx === selectedIndex;
                                        return (
                                            <button
                                                key={cmd.id}
                                                data-index={idx}
                                                onClick={() => {
                                                    close();
                                                    cmd.handler();
                                                }}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors ${
                                                    isSelected ? 'bg-brand-500/10 text-brand-400' : 'text-text-primary hover:bg-surface-2'
                                                }`}
                                            >
                                                <span className="text-sm">{cmd.label}</span>
                                                {cmd.shortcut && (
                                                    <span className="text-2xs text-text-tertiary border border-border rounded px-1.5 py-0.5 font-mono">
                                                        {cmd.shortcut}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}

                        {/* Create Macro entry */}
                        {!query && (
                            <div className="border-t border-border mt-1 pt-1">
                                <button
                                    onClick={() => {
                                        close();
                                        openMacroEditor();
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-text-secondary hover:bg-surface-2 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Macro...
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
