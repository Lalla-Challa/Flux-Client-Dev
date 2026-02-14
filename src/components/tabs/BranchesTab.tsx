import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepoStore, BranchInfo } from '../../stores/repo.store';
import { useUIStore } from '../../stores/ui.store';
import { useAccountStore } from '../../stores/account.store';

export function BranchesTab() {
    const branches = useRepoStore((s) => s.branches);
    const refreshBranches = useRepoStore((s) => s.refreshBranches);
    const checkoutBranch = useRepoStore((s) => s.checkoutBranch);
    const deleteBranch = useRepoStore((s) => s.deleteBranch);
    const deleteRemoteBranch = useRepoStore((s) => s.deleteRemoteBranch);
    const publishBranch = useRepoStore((s) => s.publishBranch);
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const accounts = useAccountStore((s) => s.accounts);

    const [showCreate, setShowCreate] = useState(false);
    const [newBranchName, setNewBranchName] = useState('');
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (activeRepoPath) {
            refreshBranches();
        }
    }, [activeRepoPath, refreshBranches]);

    const currentBranch = branches.find((b) => b.current);
    const localBranches = branches.filter((b) => !b.remote);
    const remoteBranches = branches.filter((b) => b.remote && b.name !== 'HEAD');

    const filteredLocal = filter
        ? localBranches.filter((b) => b.name.toLowerCase().includes(filter.toLowerCase()))
        : localBranches;

    const filteredRemote = filter
        ? remoteBranches.filter((b) => b.name.toLowerCase().includes(filter.toLowerCase()))
        : remoteBranches;

    const handleCreate = async () => {
        if (!newBranchName.trim()) return;
        try {
            await checkoutBranch(newBranchName.trim(), true);
            useUIStore.getState().showNotification('success', `Created & switched to ${newBranchName}`);
            setNewBranchName('');
            setShowCreate(false);
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        }
    };

    const handleCheckout = async (branch: string) => {
        try {
            await checkoutBranch(branch);
            useUIStore.getState().showNotification('success', `Switched to ${branch}`);
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        }
    };

    const handleDelete = async (branch: string) => {
        if (!confirm(`Delete local branch ${branch}?`)) return;

        try {
            await deleteBranch(branch);
            useUIStore.getState().showNotification('success', `Deleted ${branch}`);

            // Check if remote branch exists
            // GitService strips 'remotes/origin/' so we match name exact
            const hasRemote = branches.some((b) => b.name === branch && b.remote);

            if (hasRemote) {
                if (confirm(`Also delete remote branch 'origin/${branch}' from GitHub?`)) {
                    const account = accounts.find((a) => a.id === activeAccountId) || accounts[0];
                    if (!account?.token) {
                        useUIStore.getState().showNotification('error', 'No GitHub account connected');
                        return;
                    }
                    try {
                        await deleteRemoteBranch('origin', branch, account.token);
                        useUIStore.getState().showNotification('success', `Deleted remote branch origin/${branch}`);
                    } catch (e: any) {
                        useUIStore.getState().showNotification('error', `Failed to delete remote: ${e.message}`);
                    }
                }
            }
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        }
    };

    const handleDeleteRemote = async (branch: string) => {
        if (!confirm(`Delete remote branch 'origin/${branch}' from GitHub?`)) return;

        const account = accounts.find((a) => a.id === activeAccountId) || accounts[0];
        if (!account?.token) {
            useUIStore.getState().showNotification('error', 'No GitHub account connected');
            return;
        }

        try {
            await deleteRemoteBranch('origin', branch, account.token);
            useUIStore.getState().showNotification('success', `Deleted remote branch origin/${branch}`);
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        }
    };

    const handlePublish = async () => {
        const account = accounts.find((a) => a.id === activeAccountId) || accounts[0];
        if (!account?.token) {
            useUIStore.getState().showNotification('error', 'No GitHub account connected');
            return;
        }
        await publishBranch(account.token);
    };

    const handleMerge = async (branch: string) => {
        if (!confirm(`Merge ${branch} into ${currentBranch?.name}?`)) return;
        await useRepoStore.getState().mergeBranch(branch);
    };

    const handleRebase = async (branch: string) => {
        if (!confirm(`Rebase ${currentBranch?.name} onto ${branch}?`)) return;
        await useRepoStore.getState().rebaseBranch(branch);
    };

    return (
        <div className="h-full overflow-y-auto p-4">
            {/* Current Branch */}
            {currentBranch && (
                <div className="mb-6">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/20">
                        <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xs text-text-tertiary uppercase tracking-wider">Current Branch</span>
                            <div className="flex items-center gap-3">
                                <div className="text-lg font-semibold text-text-primary">{currentBranch.name}</div>
                                {!currentBranch.remote && (
                                    <button
                                        onClick={handlePublish}
                                        className="btn-primary text-xs px-2 py-0.5 rounded flex items-center gap-1"
                                        title="Publish branch to GitHub"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        Publish
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Visual Branch Graph */}
            <BranchGraphSection />

            {/* Search + Create */}
            <div className="flex items-center gap-2 mb-4">
                <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter branches..."
                    className="input-field text-xs flex-1"
                />
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="btn-primary text-xs"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New
                </button>
            </div>

            {/* Create Branch Input */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-4 overflow-hidden"
                    >
                        <div className="flex gap-2 p-3 rounded-lg bg-surface-2 border border-border">
                            <input
                                type="text"
                                value={newBranchName}
                                onChange={(e) => setNewBranchName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                placeholder="feature/my-branch"
                                className="input-field text-xs flex-1"
                                autoFocus
                            />
                            <button onClick={handleCreate} className="btn-primary text-xs">
                                Create
                            </button>
                            <button onClick={() => setShowCreate(false)} className="btn-ghost text-xs">
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Local Branches */}
            <div className="mb-6">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Local ({filteredLocal.length})
                </h3>
                <div className="space-y-1">
                    {filteredLocal.map((branch) => (
                        <BranchItem
                            key={branch.name}
                            branch={branch}
                            onCheckout={() => handleCheckout(branch.name)}
                            onDelete={!branch.current ? () => handleDelete(branch.name) : undefined}
                            onMerge={!branch.current ? () => handleMerge(branch.name) : undefined}
                            onRebase={!branch.current ? () => handleRebase(branch.name) : undefined}
                        />
                    ))}
                </div>
            </div>

            {/* Remote Branches */}
            {filteredRemote.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                        Remote ({filteredRemote.length})
                    </h3>
                    <div className="space-y-1">
                        {filteredRemote.map((branch) => (
                            <BranchItem
                                key={branch.name}
                                branch={branch}
                                onCheckout={() => handleCheckout(branch.name)}
                                onDelete={() => handleDeleteRemote(branch.name)}
                                // Can merge remote branches too? Yes.
                                onMerge={() => handleMerge(branch.name)}
                                // Rebase onto remote? Yes.
                                onRebase={() => handleRebase(branch.name)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ──── Branch Graph Section ────────────────────────────────────────

function BranchGraphSection() {
    const commits = useRepoStore((s) => s.commits);
    const branches = useRepoStore((s) => s.branches);
    const [expanded, setExpanded] = useState(false);

    // Simplified graph - show last 20 commits
    const displayCommits = commits.slice(0, 20);

    if (commits.length === 0) return null;

    return (
        <div className="mb-6 rounded-lg border border-border bg-surface-1 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-surface-2 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                    <span className="text-sm font-semibold">Branch Graph</span>
                    <span className="text-xs text-text-tertiary">({displayCommits.length} commits)</span>
                </div>
                <svg
                    className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 bg-surface-0 border-t border-border">
                            <div className="font-mono text-xs space-y-1">
                                {displayCommits.map((commit, idx) => {
                                    const isHead = idx === 0;
                                    const isMerge = commit.message.toLowerCase().includes('merge');

                                    return (
                                        <div key={commit.hash} className="flex items-start gap-2 group hover:bg-surface-2/50 rounded px-2 py-1">
                                            {/* Graph Column */}
                                            <div className="flex-shrink-0 w-12 flex items-center">
                                                <div className="flex flex-col items-center">
                                                    {idx > 0 && <div className="w-px h-2 bg-brand-500/30" />}
                                                    <div className={`w-2 h-2 rounded-full ${isHead ? 'bg-brand-500 ring-2 ring-brand-500/30' :
                                                            isMerge ? 'bg-purple-500' :
                                                                'bg-text-tertiary'
                                                        }`} />
                                                    {idx < displayCommits.length - 1 && <div className="w-px flex-1 bg-brand-500/30" />}
                                                </div>
                                                {isMerge && <span className="text-purple-500 ml-1">▼</span>}
                                            </div>

                                            {/* Commit Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-brand-400 font-semibold">
                                                        {commit.hash.slice(0, 7)}
                                                    </span>
                                                    {isHead && (
                                                        <span className="px-1.5 py-0.5 bg-brand-500/20 text-brand-400 rounded text-[10px] font-bold">
                                                            HEAD
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-text-primary truncate">{commit.message}</div>
                                                <div className="text-text-tertiary text-[10px]">
                                                    {commit.author} • {commit.date}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {commits.length > 20 && (
                                <div className="text-center text-xs text-text-tertiary mt-2 pt-2 border-t border-border">
                                    Showing 20 of {commits.length} commits
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function BranchItem({
    branch,
    onCheckout,
    onDelete,
    onMerge,
    onRebase,
}: {
    branch: BranchInfo;
    onCheckout: () => void;
    onDelete?: () => void;
    onMerge?: () => void;
    onRebase?: () => void;
}) {
    return (
        <motion.div
            whileHover={{ backgroundColor: 'rgba(39, 39, 42, 0.3)' }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer group ${branch.current ? 'bg-surface-3' : ''
                }`}
            onClick={onCheckout}
        >
            {/* Branch icon */}
            <svg
                className={`w-4 h-4 shrink-0 ${branch.current ? 'text-brand-400' : 'text-text-tertiary'
                    }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>

            {/* Branch name */}
            <span
                className={`flex-1 text-sm font-mono ${branch.current ? 'text-text-primary font-medium' : 'text-text-secondary'
                    }`}
            >
                {branch.name}
            </span>

            {/* Current indicator */}
            {branch.current && (
                <span className="badge bg-brand-500/20 text-brand-400">current</span>
            )}

            {/* Remote indicator */}
            {branch.remote && (
                <span className="text-2xs text-text-tertiary">remote</span>
            )}

            {/* Actions (visible on hover) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onMerge && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMerge();
                        }}
                        className="p-1 text-text-tertiary hover:text-blue-400 transition-all"
                        title="Merge into current"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </button>
                )}
                {onRebase && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRebase();
                        }}
                        className="p-1 text-text-tertiary hover:text-purple-400 transition-all"
                        title="Rebase current onto this"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1 text-text-tertiary hover:text-red-400 transition-all"
                        title="Delete branch"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>
        </motion.div>
    );
}
