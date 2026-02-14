import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRepoStore, CommitInfo } from '../../stores/repo.store';
import { useUIStore } from '../../stores/ui.store';

export function HistoryTab() {
    const commits = useRepoStore((s) => s.commits);
    const refreshLog = useRepoStore((s) => s.refreshLog);
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const openModal = useUIStore((s) => s.openModal);

    useEffect(() => {
        if (activeRepoPath) {
            refreshLog();
        }
    }, [activeRepoPath, refreshLog]);

    if (commits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                <svg className="w-8 h-8 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs">No commit history</span>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Graph + List */}
            <div className="flex">
                {/* Commit Graph Rail */}
                <div className="w-10 shrink-0 flex flex-col items-center pt-4">
                    {commits.map((commit, i) => (
                        <div key={commit.hash} className="flex flex-col items-center">
                            {/* Node */}
                            <div
                                className={`w-3 h-3 rounded-full border-2 shrink-0 ${i === 0
                                    ? 'bg-brand-500 border-brand-500'
                                    : 'bg-surface-0 border-surface-5'
                                    }`}
                            />
                            {/* Line */}
                            {i < commits.length - 1 && (
                                <div className="w-0.5 h-[52px] bg-surface-5" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Commit List */}
                <div className="flex-1 py-2 pr-4">
                    {commits.map((commit, i) => (
                        <CommitItem
                            key={commit.hash}
                            commit={commit}
                            isLatest={i === 0}
                            onClick={() => openModal('commit-details', commit.hash)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function CommitItem({
    commit,
    isLatest,
    onClick,
}: {
    commit: CommitInfo;
    isLatest: boolean;
    onClick: () => void;
}) {
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

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
                    <span className="font-mono">{commit.shortHash}</span>
                    <span>{commit.author}</span>
                    <span>{formatDate(commit.date)}</span>
                </div>
            </div>

            {/* Copy hash button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(commit.hash);
                }}
                className="opacity-0 group-hover:opacity-100 btn-ghost p-1 transition-opacity"
                title="Copy hash"
            >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            </button>
        </motion.div>
    );
}
