import React from 'react';
import { motion } from 'framer-motion';
import { useUIStore, TabId } from '../../stores/ui.store';
import { useRepoStore } from '../../stores/repo.store';
import { ActionBar } from './ActionBar';
import { ChangesTab } from '../tabs/ChangesTab';
import { HistoryTab } from '../tabs/HistoryTab';
import { BranchesTab } from '../tabs/BranchesTab';
import { CloudReposTab } from '../tabs/CloudReposTab';
import { SettingsTab } from '../tabs/SettingsTab';
import { PullRequestsTab } from '../tabs/PullRequestsTab';
import { NewRepoModal } from '../modals/NewRepoModal';
import { CommitDetailsModal } from '../modals/CommitDetailsModal';
import { CloneModal } from '../modals/CloneModal';
import { ThemeToggle } from '../common/ThemeToggle';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

const APP_VERSION = '1.0.0';

const TABS: { id: TabId; label: string; tooltip: string; icon: JSX.Element }[] = [
    {
        id: 'changes',
        label: 'Changes',
        tooltip: 'View & stage file changes',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    {
        id: 'history',
        label: 'History',
        tooltip: 'Browse commit history',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        id: 'branches',
        label: 'Branches',
        tooltip: 'Manage git branches',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
        ),
    },
    {
        id: 'cloud',
        label: 'Cloud',
        tooltip: 'GitHub repositories',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
        ),
    },
    {
        id: 'settings',
        label: 'Settings',
        tooltip: 'Repository settings',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.066 2.573c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        id: 'pull-requests',
        label: 'PRs',
        tooltip: 'Pull requests',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
        ),
    },
];

export function MainView() {
    useKeyboardShortcuts();

    const activeTab = useUIStore((s) => s.activeTab);
    const setActiveTab = useUIStore((s) => s.setActiveTab);
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const repos = useRepoStore((s) => s.repos);
    const activeRepo = repos.find((r) => r.path === activeRepoPath);

    const showNewRepoModal = useUIStore((s) => s.showNewRepoModal);
    const setShowNewRepoModal = useUIStore((s) => s.setShowNewRepoModal);

    const needsRepo = activeTab !== 'cloud' && activeTab !== 'settings';
    const showEmptyContent = needsRepo && !activeRepoPath;

    return (
        <div className="flex flex-col h-full bg-surface-0">
            <div className="h-11 flex items-center px-4 bg-surface-1 border-b border-border titlebar-drag select-none shrink-0">
                <div className="flex items-center gap-2 mr-6">
                    <img src="/logo.png" className="w-5 h-5 object-contain" alt="Logo" />
                    <span className="font-bold text-brand-500 text-sm tracking-tight">Flux Client</span>
                </div>

                <div className="flex items-center gap-0.5 titlebar-no-drag">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            title={tab.tooltip}
                            className={`
                                relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
                                transition-all duration-150 ease-in-out
                                ${activeTab === tab.id
                                    ? 'text-brand-500 bg-brand-500/10'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                                }
                            `}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="tab-indicator"
                                    className="absolute bottom-0 left-1 right-1 h-0.5 bg-brand-500 rounded-full"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-3 titlebar-no-drag">
                    <ThemeToggle />
                    <span className="text-[10px] font-mono text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded">
                        v{APP_VERSION}
                    </span>
                </div>
            </div>

            <div className="flex items-center h-9 border-b border-border bg-surface-1/50 px-3 shrink-0">
                <div className="flex items-center gap-2">
                    {activeTab === 'cloud' ? (
                        <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                            </svg>
                            <span className="text-xs font-medium text-text-secondary">GitHub</span>
                        </div>
                    ) : activeRepo ? (
                        <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span className="text-xs font-medium text-text-primary">
                                {activeRepo.name}
                            </span>
                            {activeRepo.branch && (
                                <span className="badge-branch">{activeRepo.branch}</span>
                            )}
                            {activeRepo.dirty && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Uncommitted changes" />
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-text-tertiary italic">No repository selected</span>
                    )}
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-2">
                    {activeTab === 'cloud' && (
                        <button
                            onClick={() => setShowNewRepoModal(true)}
                            className="btn-primary text-xs px-3 py-1 rounded-md flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Repository
                        </button>
                    )}
                    {!showEmptyContent && activeTab !== 'cloud' && <ActionBar />}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {showEmptyContent ? (
                    <EmptyState onNewRepo={() => {
                        setActiveTab('cloud');
                        setShowNewRepoModal(true);
                    }} />
                ) : (
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className="h-full"
                    >
                        {activeTab === 'changes' && <ChangesTab />}
                        {activeTab === 'history' && <HistoryTab />}
                        {activeTab === 'branches' && <BranchesTab />}
                        {activeTab === 'cloud' && <CloudReposTab />}
                        {activeTab === 'settings' && <SettingsTab />}
                        {activeTab === 'pull-requests' && <PullRequestsTab />}
                    </motion.div>
                )}
            </div>

            <NewRepoModal
                isOpen={showNewRepoModal}
                onClose={() => setShowNewRepoModal(false)}
            />
            <CommitDetailsModal />
            <CloneModal />
        </div>
    );
}

function EmptyState({ onNewRepo }: { onNewRepo: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-surface-0">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center max-w-md"
            >
                <div className="w-20 h-20 mb-6 flex items-center justify-center">
                    <img src="/logo.png" className="w-full h-full object-contain filter drop-shadow-2xl" alt="Flux Client" />
                </div>

                <h2 className="text-xl font-semibold text-text-primary mb-1">Welcome to Flux Client</h2>
                <p className="text-sm text-text-secondary mb-8">Get started in three simple steps</p>

                <div className="w-full space-y-4 mb-8">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-1 border border-border">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500/15 text-brand-500 font-bold text-sm shrink-0">
                            1
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary mb-0.5">Add your GitHub account</h3>
                            <p className="text-xs text-text-secondary leading-relaxed">
                                Connect your GitHub account to sync repositories, push changes, and manage pull requests.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-1 border border-border">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500/15 text-brand-500 font-bold text-sm shrink-0">
                            2
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary mb-0.5">Scan or create a repository</h3>
                            <p className="text-xs text-text-secondary leading-relaxed">
                                Scan a folder to find existing repos, clone from GitHub, or create a brand new project.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-1 border border-border">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500/15 text-brand-500 font-bold text-sm shrink-0">
                            3
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary mb-0.5">Start coding</h3>
                            <p className="text-xs text-text-secondary leading-relaxed">
                                Stage changes, commit with a message, and push to GitHub -- all from one place.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onNewRepo}
                    className="btn-primary px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Get Started
                </button>

                <div className="flex items-center gap-4 mt-6 text-xs text-text-tertiary">
                    <div className="flex items-center gap-1.5">
                        <span className="kbd">Ctrl+P</span>
                        <span>Search repos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="kbd">Ctrl+B</span>
                        <span>New branch</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="kbd">Ctrl+`</span>
                        <span>Terminal</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
