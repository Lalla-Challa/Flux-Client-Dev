import React from 'react';
import { useUIStore } from '../../stores/ui.store';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';

export function ActionBar() {
    const isCommitting = useUIStore((s) => s.isCommitting);
    const isSyncing = useUIStore((s) => s.isSyncing);
    const commitMessage = useUIStore((s) => s.commitMessage);
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const fileStatuses = useRepoStore((s) => s.fileStatuses);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const accounts = useAccountStore((s) => s.accounts);
    const activeAccount = accounts.find((a) => a.id === activeAccountId);

    const stagedFiles = fileStatuses.filter((f) => f.staged);
    const hasStaged = stagedFiles.length > 0;
    const hasCommitMessage = commitMessage.trim().length > 0;

    const handleSync = async () => {
        if (!activeRepoPath || !activeAccount) return;

        useUIStore.getState().setIsSyncing(true);
        try {
            const api = (window as any).electronAPI;
            const token = await api.auth.getToken(activeAccount.username);
            if (!token) {
                useUIStore.getState().showNotification('error', 'No auth token found. Please re-login.');
                return;
            }

            const result = await useRepoStore.getState().syncRepo(token);

            if (result.success) {
                useUIStore.getState().showNotification('success', 'Synced successfully!');
            } else if (result.conflicts && result.conflicts.length > 0) {
                useUIStore.getState().showConflicts(result.conflicts);
                useUIStore.getState().showNotification('error', `${result.conflicts.length} conflict(s) detected`);
            } else {
                useUIStore.getState().showNotification('error', result.error || 'Sync failed');
            }
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message || 'Sync failed');
        } finally {
            useUIStore.getState().setIsSyncing(false);
        }
    };

    const handleCommitAndPush = async () => {
        if (!hasStaged || !hasCommitMessage || !activeRepoPath) return;
        await useRepoStore.getState().commitAndPush(commitMessage);
    };

    return (
        <div className="flex items-center gap-2">
            {/* Stash button */}
            <button
                onClick={() => useRepoStore.getState().stashChanges()}
                className="btn-ghost text-xs"
                title="Stash changes"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                </svg>
            </button>

            {/* Undo button */}
            <button
                onClick={() => useRepoStore.getState().undoLastCommit()}
                className="btn-ghost text-xs"
                title="Undo last commit (Soft Reset)"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            {/* Delete Last Commit (Hard Reset) */}
            <button
                onClick={() => useRepoStore.getState().deleteLastCommit()}
                className="btn-ghost text-xs hover:text-red-500"
                title="Delete last commit & Force Push (Hard Reset)"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>

            {/* Revert button */}
            <button
                onClick={() => useRepoStore.getState().revertLastCommit()}
                className="btn-ghost text-xs"
                title="Revert last commit"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-border" />

            {/* Sync Button */}
            <button
                onClick={handleSync}
                disabled={isSyncing || !activeRepoPath}
                className="btn-secondary text-xs"
                title="Pull Rebase + Push (Ctrl+Shift+S)"
            >
                {isSyncing ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                )}
                Sync
            </button>

            {/* Commit & Push Button */}
            <button
                onClick={handleCommitAndPush}
                disabled={isCommitting || !hasStaged || !hasCommitMessage}
                className="btn-primary text-xs"
                title="Commit & Push (Ctrl+Enter)"
            >
                {isCommitting ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                )}
                Commit & Push
            </button>
        </div>
    );
}
