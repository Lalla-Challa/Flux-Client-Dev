import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../stores/ui.store';
import { useRepoStore } from '../../stores/repo.store';
import { formatDistanceToNow } from 'date-fns';

const ACTION_COLORS: Record<string, string> = {
    commit: 'bg-green-500/20 text-green-400 border-green-500/30',
    checkout: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    reset: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    merge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    rebase: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    pull: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    clone: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

function getActionColor(action: string): string {
    return ACTION_COLORS[action] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
}

export function TimeMachineModal() {
    const { modalState, closeModal } = useUIStore();
    const isOpen = modalState.type === 'time-machine';
    const { reflogEntries, isLoadingReflog, loadReflog, restoreToReflog } = useRepoStore();
    const [filter, setFilter] = useState('');
    const [confirmHash, setConfirmHash] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadReflog();
            setFilter('');
            setConfirmHash(null);
        }
    }, [isOpen, loadReflog]);

    const filtered = filter
        ? reflogEntries.filter(
            (e) =>
                e.description.toLowerCase().includes(filter.toLowerCase()) ||
                e.action.toLowerCase().includes(filter.toLowerCase()) ||
                e.shortHash.includes(filter)
        )
        : reflogEntries;

    const handleRestore = (hash: string) => {
        if (confirmHash === hash) {
            restoreToReflog(hash);
            setConfirmHash(null);
        } else {
            setConfirmHash(hash);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={closeModal}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl bg-surface-1 border border-border shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h2 className="text-base font-semibold text-text-primary">Time Machine</h2>
                            <span className="text-2xs text-text-tertiary">git reflog</span>
                        </div>
                        <button
                            onClick={closeModal}
                            className="p-1 rounded-md hover:bg-surface-2 text-text-tertiary hover:text-text-primary transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-5 py-3 border-b border-border">
                        <input
                            type="text"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Filter entries..."
                            className="w-full px-3 py-1.5 text-sm bg-surface-0 border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-500/50"
                            autoFocus
                        />
                    </div>

                    {/* Entries */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {isLoadingReflog ? (
                            <div className="flex items-center justify-center py-12">
                                <svg className="w-5 h-5 animate-spin text-text-tertiary" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
                                <span className="text-sm">No reflog entries found</span>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {filtered.map((entry) => (
                                    <div
                                        key={`${entry.hash}-${entry.index}`}
                                        className="group flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50 transition-colors"
                                    >
                                        {/* Timeline dot */}
                                        <div className="flex flex-col items-center shrink-0">
                                            <div className="w-2 h-2 rounded-full bg-text-tertiary group-hover:bg-brand-400 transition-colors" />
                                        </div>

                                        {/* Action badge */}
                                        <span className={`text-2xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${getActionColor(entry.action)}`}>
                                            {entry.action}
                                        </span>

                                        {/* Description */}
                                        <span className="text-xs text-text-primary truncate flex-1">
                                            {entry.description}
                                        </span>

                                        {/* Timestamp */}
                                        <span className="text-2xs text-text-tertiary shrink-0">
                                            {(() => {
                                                try {
                                                    return formatDistanceToNow(new Date(entry.date), { addSuffix: true });
                                                } catch {
                                                    return entry.date;
                                                }
                                            })()}
                                        </span>

                                        {/* Short hash */}
                                        <span className="font-mono text-2xs text-text-tertiary shrink-0">
                                            {entry.shortHash}
                                        </span>

                                        {/* Restore button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRestore(entry.hash);
                                            }}
                                            className={`text-2xs px-2 py-0.5 rounded transition-all shrink-0 ${
                                                confirmHash === entry.hash
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    : 'opacity-0 group-hover:opacity-100 bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30'
                                            }`}
                                        >
                                            {confirmHash === entry.hash ? 'Confirm?' : 'Restore'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-border bg-surface-0/50">
                        <p className="text-2xs text-text-tertiary">
                            Restore resets your branch to the selected point. Uncommitted changes will be lost.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
