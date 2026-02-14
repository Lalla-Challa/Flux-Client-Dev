import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRepoStore, CommitInfo } from '../../stores/repo.store';
import { useUIStore } from '../../stores/ui.store';

export function HistoryTab() {
    const commits = useRepoStore((s) => s.commits);
    const refreshLog = useRepoStore((s) => s.refreshLog);
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const openModal = useUIStore((s) => s.openModal);
    const [copiedHash, setCopiedHash] = useState<string | null>(null);

    useEffect(() => {
        if (activeRepoPath) {
            refreshLog();
        }
    }, [activeRepoPath, refreshLog]);

    const handleCopy = (hash: string) => {
        navigator.clipboard.writeText(hash);
        setCopiedHash(hash);
        setTimeout(() => setCopiedHash(null), 2000);
    };

    if (commits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium mb-1">No commit history</span>
                <span className="text-xs">Make your first commit to see it here</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1 shrink-0">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold">Commit History</span>
                    <span className="text-xs text-text-tertiary bg-surface-3 px-2 py-0.5 rounded-full">
                        {commits.length} commits
                    </span>
                </div>
                <button
                    onClick={() => refreshLog()}
                    className="btn-ghost p-1.5"
                    title="Refresh history"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Commit List */}
            <div className="flex-1 overflow-y-auto">
                <div className="flex">
                    {/* Commit Graph Rail */}
                    <div className="w-10 shrink-0 flex flex-col items-center pt-4">
                        {commits.map((commit, i) => (
                            <div key={commit.hash} className="flex flex-col items-center">
                                <div
                                    className={`w-3 h-3 rounded-full border-2 shrink-0 transition-colors ${i === 0
                                        ? 'bg-brand-500 border-brand-500 shadow-sm shadow-brand-500/30'
                                        : 'bg-surface-0 border-surface-5'
                                        }`}
                                />
                                {i < commits.length - 1 && (
                                    <div className="w-0.5 h-[52px] bg-surface-5" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Commit Items */}
                    <div className="flex-1 py-2 pr-4">
                        {commits.map((commit, i) => (
                            <CommitItem
                                key={commit.hash}
                                commit={commit}
                                isLatest={i === 0}
                                isCopied={copiedHash === commit.hash}
                                onClick={() => openModal('commit-details', commit.hash)}
                                onCopy={() => handleCopy(commit.hash)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Tip */}
            <div className="px-4 py-2 border-t border-border bg-surface-1 shrink-0">
                <span className="text-2xs text-text-tertiary">
                    Click a commit to view changed files and diff
                </span>
            </div>
        </div>
    );
}

function CommitItem({
    commit,
    isLatest,
    isCopied,
    onClick,
    onCopy,
}: {
    commit: CommitInfo;
    isLatest: boolean;
    isCopied: boolean;
    onClick: () => void;
    onCopy: () => void;
}) {
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const refs = commit.refs
        ? commit.refs.split(',').map((r) => r.trim()).filter(Boolean)
        : [];

    return (
        <motion.div
            whileHover={{ backgroundColor: 'rgba(39, 39, 42, 0.3)' }}
            onClick={onClick}
            className="flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer group"
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    {isLatest && (
                        <span className="text-[10px] font-bold bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded shrink-0">
                            HEAD
                        </span>
                    )}
                    <span
                        className={`text-sm font-medium truncate ${isLatest ? 'text-text-primary' : 'text-text-secondary'
                            }`}
                    >
                        {commit.message}
                    </span>
                    {refs.map((ref) => (
                        <span key={ref} className="badge-branch shrink-0">
                            {ref.replace('HEAD -> ', '').replace('origin/', '')}
                        </span>
                    ))}
                </div>
                <div className="flex items-center gap-3 text-2xs text-text-tertiary">
                    <span className="font-mono bg-surface-2 px-1.5 py-0.5 rounded">{commit.shortHash}</span>
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {commit.author}
                    </span>
                    <span>{formatDate(commit.date)}</span>
                </div>
            </div>

            {/* Copy hash button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onCopy();
                }}
                className={`${isCopied ? 'opacity-100 text-green-400' : 'opacity-0 group-hover:opacity-100 text-text-tertiary'} btn-ghost p-1.5 transition-all`}
                title={isCopied ? 'Copied!' : 'Copy full hash'}
            >
                {isCopied ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                )}
            </button>
        </motion.div>
    );
}
