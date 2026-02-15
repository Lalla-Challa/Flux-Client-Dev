import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GitHubRepo } from '../../lib/github-types';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore, Account } from '../../stores/account.store';
import { useUIStore } from '../../stores/ui.store';

export function CloudReposTab() {
    const cloudRepos = useRepoStore((s) => s.cloudRepos);
    const isLoadingCloud = useRepoStore((s) => s.isLoadingCloud);
    const loadCloudRepos = useRepoStore((s) => s.loadCloudRepos);
    const cloneProgress = useRepoStore((s) => s.cloneProgress);
    const setShowNewRepoModal = useUIStore((s) => s.setShowNewRepoModal);
    const openModal = useUIStore((s) => s.openModal);

    const accounts = useAccountStore((s) => s.accounts);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);

    const [activeAccount, setActiveAccount] = useState<Account | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'private'>('all');
    const [filterLang, setFilterLang] = useState<string>('all');

    useEffect(() => {
        setActiveAccount(accounts.find((a) => a.id === activeAccountId) || null);
    }, [accounts, activeAccountId]);

    useEffect(() => {
        if (activeAccount?.token) {
            loadCloudRepos(activeAccount.token).catch(console.error);
        }
    }, [activeAccount?.token, loadCloudRepos]);

    const filteredRepos = cloudRepos.filter((repo) => {
        if (filterVisibility === 'public' && repo.private) return false;
        if (filterVisibility === 'private' && !repo.private) return false;
        if (searchQuery && !repo.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        return true;
    });

    const handleClone = async (repo: GitHubRepo) => {
        openModal('clone', { url: repo.clone_url });
    };

    if (!activeAccount) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                <svg className="w-16 h-16 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <p className="text-sm mb-2">No GitHub account connected</p>
                <p className="text-xs text-text-tertiary">Connect a GitHub account to browse your repositories</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your GitHub Repositories</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => useUIStore.getState().setShowNewRepoModal(true)}
                        className="btn-primary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New
                    </button>
                    <button
                        onClick={() => loadCloudRepos(activeAccount.token!)}
                        disabled={isLoadingCloud}
                        className="btn-ghost p-2"
                        title="Refresh"
                    >
                        {isLoadingCloud ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search repositories..."
                    className="input-field flex-1"
                />
                <div className="flex gap-1">
                    {(['all', 'public', 'private'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilterVisibility(f)}
                            className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${filterVisibility === f
                                ? 'bg-accent text-white'
                                : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Clone Progress */}
            {cloneProgress && (
                <div className="mb-4 p-3 rounded-lg bg-surface-2 border border-accent/30">
                    <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-text-secondary">{cloneProgress}</span>
                    </div>
                </div>
            )}

            {/* Repo Grid */}
            <div className="flex-1 overflow-y-auto">
                {isLoadingCloud && cloudRepos.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-text-tertiary">
                        <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : filteredRepos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                        <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <p className="text-sm">No repositories found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {filteredRepos.map((repo) => (
                            <RepoCard key={repo.id} repo={repo} onClone={() => handleClone(repo)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-border text-xs text-text-tertiary">
                {filteredRepos.length} repo{filteredRepos.length !== 1 ? 's' : ''}
            </div>
        </div>
    );
}

function RepoCard({ repo, onClone }: { repo: GitHubRepo; onClone: () => void }) {
    const updatedDate = new Date(repo.updated_at).toLocaleDateString();

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="group p-4 rounded-lg bg-surface-2 border border-border hover:border-accent/50 transition-all"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold truncate">{repo.name}</h3>
                        {repo.private ? (
                            <svg className="w-3.5 h-3.5 text-status-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        ) : (
                            <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </div>
                    {repo.description && (
                        <p className="text-xs text-text-tertiary line-clamp-2 mb-2">{repo.description}</p>
                    )}
                </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-3 mb-3 text-2xs text-text-tertiary">
                {repo.language && (
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <span>{repo.language}</span>
                    </div>
                )}
                <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
                    </svg>
                    <span>{repo.stargazers_count}</span>
                </div>
                <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878z" />
                    </svg>
                    <span>{repo.forks_count}</span>
                </div>
                <span className="ml-auto">Updated {updatedDate}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button onClick={onClone} className="btn-primary flex-1 text-xs py-2">
                    📦 Clone Repository
                </button>
                {repo.fork && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            useRepoStore.getState().syncFork(useAccountStore.getState().accounts.find(a => a.username === repo.owner.login)?.token!, repo);
                        }}
                        className="btn-secondary px-3 py-2 text-xs"
                        title="Sync with Upstream"
                    >
                        🔄 Sync
                    </button>
                )}
            </div>
        </motion.div>
    );
}
