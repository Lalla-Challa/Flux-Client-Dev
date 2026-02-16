import React, { useState, useRef, useEffect } from 'react';
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

    const [showDangerMenu, setShowDangerMenu] = useState(false);
    const dangerMenuRef = useRef<HTMLDivElement>(null);

    // Close the danger dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dangerMenuRef.current && !dangerMenuRef.current.contains(event.target as Node)) {
                setShowDangerMenu(false);
            }
        }
        if (showDangerMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDangerMenu]);

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

    const handlePushOnly = async () => {
        if (!activeRepoPath) return;
        await useRepoStore.getState().pushOnly();
    };

    const handleDeleteLastCommit = () => {
        setShowDangerMenu(false);
        useRepoStore.getState().deleteLastCommit();
    };

    const noRepo = !activeRepoPath;

    return (
        <div className="flex items-center gap-3">
            {/* ── Quick Actions Group ── */}
            <div className="flex items-center gap-1">
                <span className="text-2xs font-medium text-text-tertiary uppercase tracking-wider mr-1 select-none">
                    Quick Actions
                </span>

                {/* Stash */}
                <button
                    onClick={() => useRepoStore.getState().stashChanges()}
                    disabled={noRepo}
                    className={`btn-ghost text-xs ${noRepo ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title="Stash all uncommitted changes (Ctrl+Shift+Z)"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                    </svg>
                    Stash
                </button>

                {/* Pop Stash */}
                <button
                    onClick={() => useRepoStore.getState().popStash()}
                    disabled={noRepo}
                    className={`btn-ghost text-xs ${noRepo ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title="Apply latest stash and drop it"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8 m-9 4h4" />
                    </svg>
                    Pop
                </button>

                {/* Undo last commit */}
                <button
                    onClick={() => useRepoStore.getState().undoLastCommit()}
                    disabled={noRepo}
                    className={`btn-ghost text-xs ${noRepo ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title="Undo last commit -- keeps changes staged (Soft Reset)"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Undo
                </button>

                {/* Revert last commit */}
                <button
                    onClick={() => useRepoStore.getState().revertLastCommit()}
                    disabled={noRepo}
                    className={`btn-ghost text-xs ${noRepo ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title="Create a new commit that undoes the last commit (Ctrl+Shift+R)"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Revert
                </button>

                {/* Time Machine */}
                <button
                    onClick={() => useUIStore.getState().openModal('time-machine', null)}
                    disabled={noRepo}
                    className={`btn-ghost text-xs ${noRepo ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title="Browse reflog history and restore to any point in time"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Time Machine
                </button>

                {/* Danger actions dropdown */}
                <div className="relative" ref={dangerMenuRef}>
                    <button
                        onClick={() => setShowDangerMenu((prev) => !prev)}
                        disabled={noRepo}
                        className={`btn-ghost text-xs text-red-400 hover:text-red-300 hover:bg-red-600/10 ${noRepo ? 'opacity-40 cursor-not-allowed' : ''}`}
                        title="Dangerous actions (hard reset, force push)"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <svg className="w-3 h-3 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showDangerMenu && (
                        <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-lg bg-surface-2 border border-red-600/30 shadow-xl shadow-black/40 animate-fade-in">
                            <div className="px-3 py-2 border-b border-border">
                                <p className="text-2xs font-medium text-red-400 uppercase tracking-wider">
                                    Destructive Actions
                                </p>
                                <p className="text-2xs text-text-tertiary mt-0.5">
                                    These actions cannot be easily undone.
                                </p>
                            </div>
                            <div className="p-1.5">
                                <button
                                    onClick={handleDeleteLastCommit}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-red-400 rounded-md
                                               hover:bg-red-600/15 transition-colors duration-150 text-left"
                                >
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <div>
                                        <div className="font-medium">Delete Last Commit</div>
                                        <div className="text-2xs text-text-tertiary mt-0.5">
                                            Hard reset + force push. Permanently removes the last commit.
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Divider ── */}
            <div className="w-px h-6 bg-border" />

            {/* ── Sync Group ── */}
            <div className="flex items-center gap-1">
                <span className="text-2xs font-medium text-text-tertiary uppercase tracking-wider mr-1 select-none">
                    Sync
                </span>

                <button
                    onClick={handleSync}
                    disabled={isSyncing || noRepo}
                    className={`btn-secondary text-xs ${isSyncing || noRepo ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Pull (rebase) then push to remote (Ctrl+Shift+S)"
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
                    {isSyncing ? 'Syncing...' : 'Sync'}
                </button>
            </div>

            {/* ── Divider ── */}
            <div className="w-px h-6 bg-border" />

            {/* ── Commit Group ── */}
            <div className="flex items-center gap-1">
                <span className="text-2xs font-medium text-text-tertiary uppercase tracking-wider mr-1 select-none">
                    Commit
                </span>

                <button
                    onClick={handleCommitAndPush}
                    disabled={isCommitting || !hasStaged || !hasCommitMessage}
                    className={`btn-primary text-xs ${isCommitting || !hasStaged || !hasCommitMessage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={
                        !hasStaged
                            ? 'Stage files first before committing'
                            : !hasCommitMessage
                                ? 'Enter a commit message first'
                                : 'Commit staged changes and push to remote (Ctrl+Enter)'
                    }
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
                    {isCommitting ? 'Pushing...' : 'Commit & Push'}
                </button>

                {/* Push Only button - for when commit succeeded but push failed */}
                <button
                    onClick={handlePushOnly}
                    disabled={isSyncing || hasStaged}
                    className={`btn-secondary text-xs ${isSyncing || hasStaged ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={
                        hasStaged
                            ? 'Stage area not empty - use Commit & Push instead'
                            : 'Push local commits to remote'
                    }
                >
                    {isSyncing ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M7 16l4 4m0 0l4-4m-4 4V4" />
                        </svg>
                    )}
                    {isSyncing ? 'Pushing...' : 'Push'}
                </button>
            </div>
        </div>
    );
}
