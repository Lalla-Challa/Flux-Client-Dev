import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRepoStore, RepoInfo } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';
import { useUIStore } from '../../stores/ui.store';

export function RepoSidebar() {
    const repos = useRepoStore((s) => s.repos);
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const setActiveRepo = useRepoStore((s) => s.setActiveRepo);
    const removeRepo = useRepoStore((s) => s.removeRepo);
    const scanDirectory = useRepoStore((s) => s.scanDirectory);
    const isScanning = useRepoStore((s) => s.isScanning);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);

    const [search, setSearch] = useState('');

    // Filter repos by active account and search query
    const filteredRepos = useMemo(() => {
        let filtered = repos;

        if (activeAccountId) {
            filtered = filtered.filter(
                (r) => r.accountId === activeAccountId || !r.accountId
            );
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            filtered = filtered.filter((r) => r.name.toLowerCase().includes(q));
        }

        return filtered;
    }, [repos, activeAccountId, search]);

    const handleBrowseAndScan = async () => {
        try {
            const api = (window as any).electronAPI;
            if (api?.dialog) {
                const selectedPath = await api.dialog.openDirectory();
                if (selectedPath) {
                    await scanDirectory(selectedPath);
                }
            }
        } catch (error) {
            console.error('Scan failed:', error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface-1 border-r border-border w-[240px]">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-border">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Repositories
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleBrowseAndScan}
                        disabled={isScanning}
                        className="btn-ghost p-1"
                        title="Scan folder for repos"
                    >
                        {isScanning ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        )}
                    </button>
                    <button
                        onClick={() => {
                            const { activeRepoPath, refreshStatus } = useRepoStore.getState();
                            if (activeRepoPath) refreshStatus();
                        }}
                        className="btn-ghost p-1"
                        title="Refresh"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Search */}
            {repos.length > 0 && (
                <div className="px-3 py-2">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter repositories..."
                        className="input-field text-xs"
                    />
                </div>
            )}

            {/* Recent Repos */}
            {repos.filter(r => r.lastOpened).length > 0 && (
                <div className="px-3 py-2 border-b border-border">
                    <div className="text-xs font-semibold text-text-secondary mb-2">RECENT</div>
                    {repos
                        .filter(r => r.lastOpened)
                        .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))
                        .slice(0, 5)
                        .map((repo) => (
                            <button
                                key={repo.path}
                                onClick={() => setActiveRepo(repo.path)}
                                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors mb-0.5 ${activeRepoPath === repo.path
                                        ? 'bg-brand-500/20 text-brand-500'
                                        : 'hover:bg-surface-2 text-text-primary'
                                    }`}
                            >
                                <div className="font-medium truncate">{repo.name}</div>
                            </button>
                        ))}
                </div>
            )}

            {/* Repo List */}
            <div className="flex-1 overflow-y-auto px-2 py-1">
                {filteredRepos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                        <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="text-xs mb-1">No repositories found</span>
                        <span className="text-2xs text-text-tertiary mb-3 text-center px-4">
                            Scan a folder that contains your Git repositories
                        </span>
                        <button
                            onClick={handleBrowseAndScan}
                            disabled={isScanning}
                            className="btn-primary text-xs px-4 py-1.5 rounded-lg"
                        >
                            {isScanning ? 'Scanning...' : '📂 Browse Folder'}
                        </button>
                    </div>
                ) : (
                    filteredRepos.map((repo) => (
                        <RepoItem
                            key={repo.path}
                            repo={repo}
                            isActive={repo.path === activeRepoPath}
                            onClick={() => setActiveRepo(repo.path)}
                            onRemove={() => {
                                if (confirm(`Remove "${repo.name}" from the app?\n\nThis will only remove it from the list, not delete the folder.`)) {
                                    removeRepo(repo.path);
                                }
                            }}
                        />
                    ))
                )}
            </div>

            {/* Footer: Repo count */}
            <div className="px-3 py-2 border-t border-border">
                <span className="text-2xs text-text-tertiary">
                    {filteredRepos.length} repo{filteredRepos.length !== 1 ? 's' : ''}
                </span>
            </div>
        </div>
    );
}

function RepoItem({
    repo,
    isActive,
    onClick,
    onRemove,
}: {
    repo: RepoInfo;
    isActive: boolean;
    onClick: () => void;
    onRemove: () => void;
}) {
    return (
        <motion.div
            whileHover={{ x: 2 }}
            onClick={onClick}
            className={`sidebar-item mb-0.5 group relative ${isActive ? 'active' : ''}`}
        >
            {/* Repo icon */}
            <div className="shrink-0">
                <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
            </div>

            {/* Repo info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm truncate font-medium">{repo.name}</span>
                    {repo.dirty && (
                        <div className="w-1.5 h-1.5 rounded-full bg-status-modified shrink-0" title="Uncommitted changes" />
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="badge-branch">{repo.branch}</span>
                </div>
            </div>

            {/* Remove button (visible on hover) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="opacity-0 group-hover:opacity-100 shrink-0 p-1 hover:bg-surface-4 rounded text-text-tertiary hover:text-status-deleted transition-all"
                title="Remove from app"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </motion.div>
    );
}
