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

const TABS: { id: TabId; label: string; icon: JSX.Element }[] = [
    {
        id: 'changes',
        label: 'Changes',
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

    // Determine if current tab needs a repo selected
    const needsRepo = activeTab !== 'cloud';
    const showEmptyContent = needsRepo && !activeRepoPath;

    return (
        <div className="flex flex-col h-full bg-surface-0">
            {/* Titlebar */}
            <div className="h-10 flex items-center justify-between px-4 bg-surface-1 border-b border-border titlebar-drag select-none">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" className="w-5 h-5 object-contain" alt="Logo" />
                        <span className="font-bold text-brand-500">Flux Client</span>
                    </div>
                    <div className="flex items-center gap-1 titlebar-no-drag">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            >
                                <span className="flex items-center gap-2">
                                    {tab.icon}
                                    {tab.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="titlebar-no-drag">
                    <ThemeToggle />
                </div>
            </div>

            {/* Tab Bar + Action Bar - ALWAYS visible */}
            <div className="flex items-center border-b border-border bg-surface-1 px-2 shrink-0">
                {/* Tabs */}
                <div className="flex items-center">
                    {/* The tabs are now in the titlebar, so this section is removed or repurposed */}
                </div>

                <div className="flex-1" />

                {/* Repo name & branch badge */}
                {activeRepo && activeTab !== 'cloud' && (
                    <div className="flex items-center gap-2 mr-3">
                        <span className="text-xs text-text-secondary font-medium">
                            {activeRepo.name}
                        </span>
                        <span className="badge-branch">{activeRepo.branch}</span>
                    </div>
                )}

                {/* New Repo Button (Cloud tab only) */}
                {activeTab === 'cloud' && (
                    <button
                        onClick={() => setShowNewRepoModal(true)}
                        className="btn-primary text-xs px-3 py-1.5 rounded-lg mr-3 flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Repository
                    </button>
                )}

                {/* Action Bar - hide when no repo and not on cloud tab */}
                {!showEmptyContent && <ActionBar />}
            </div>

            {/* Tab Content */}
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

            {/* Modals */}
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
            <div className="w-24 h-24 mb-4 flex items-center justify-center">
                <img src="/logo.png" className="w-full h-full object-contain filter drop-shadow-2xl" alt="Flux Client" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">Welcome to Flux Client</h2>
            <p className="text-sm text-text-secondary mb-4">Select a repository to get started</p>
            <div className="flex flex-col items-center gap-2 text-xs text-text-tertiary">
                <div className="flex items-center gap-2">
                    <span className="kbd">Ctrl+P</span>
                    <span>Search repos</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="kbd">Ctrl+B</span>
                    <span>New branch</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="kbd">Ctrl+`</span>
                    <span>Toggle terminal</span>
                </div>
            </div>
        </div>
    );
}
