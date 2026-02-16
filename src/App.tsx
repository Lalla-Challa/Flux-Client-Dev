import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccountSidebar } from './components/layout/AccountSidebar';
import { RepoSidebar } from './components/layout/RepoSidebar';
import { MainView } from './components/layout/MainView';
import { BottomTerminal } from './components/layout/BottomTerminal';
import { ActivityPanel } from './components/layout/ActivityPanel';
import { ConflictPanel } from './components/conflicts/ConflictPanel';
import { CommandPalette } from './components/common/CommandPalette';
import { MacroEditorModal } from './components/modals/MacroEditorModal';
import { useAccountStore } from './stores/account.store';
import { useRepoStore } from './stores/repo.store';
import { useUIStore } from './stores/ui.store';
import { useActivityStore } from './stores/activity.store';
import { useCommandPaletteStore } from './stores/command-palette.store';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { UpdateToast } from './components/common/UpdateToast';
import { registerDefaultCommands } from './lib/default-commands';

export default function App() {
    const loadAccounts = useAccountStore((s) => s.loadAccounts);
    const loadSavedRepos = useRepoStore((s) => s.loadSavedRepos);
    const notification = useUIStore((s) => s.notification);
    const showConflictPanel = useUIStore((s) => s.showConflictPanel);
    const repoSidebarCollapsed = useUIStore((s) => s.repoSidebarCollapsed);
    const terminalExpanded = useUIStore((s) => s.terminalExpanded);
    const terminalHeight = useUIStore((s) => s.terminalHeight);
    const bottomPanel = useUIStore((s) => s.bottomPanel);

    useEffect(() => {
        loadAccounts();
        loadSavedRepos();
        registerDefaultCommands();
        useCommandPaletteStore.getState().loadMacros();
    }, [loadAccounts, loadSavedRepos]);

    // ── Activity log IPC listeners ──
    useEffect(() => {
        const api = (window as any).electronAPI;
        if (!api?.activity) return;

        api.activity.onCommandStart((data: any) => {
            useActivityStore.getState().addEntry({
                id: data.id,
                command: data.command,
                repoPath: data.repoPath,
                status: 'running',
                startedAt: data.startedAt,
            });
        });

        api.activity.onCommandComplete((data: any) => {
            useActivityStore.getState().updateEntry(data.id, {
                status: data.status,
                completedAt: data.completedAt,
                durationMs: data.durationMs,
                exitCode: data.exitCode,
                errorMessage: data.errorMessage,
            });
        });

        return () => {
            api.activity.removeActivityListeners();
        };
    }, []);

    // ── Centralized keyboard shortcuts ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInTerminal = !!target.closest('.xterm');
            const isCtrl = e.ctrlKey || e.metaKey;
            const isShift = e.shiftKey;
            const key = e.key.toLowerCase();

            // ── Always active (even inside terminal / inputs) ──

            // Ctrl+J → Toggle terminal
            if (isCtrl && !isShift && !e.altKey && key === 'j') {
                e.preventDefault();
                e.stopPropagation();
                useUIStore.getState().toggleTerminal();
                return;
            }

            // Ctrl+K → Command palette (always active)
            if (isCtrl && !isShift && !e.altKey && key === 'k') {
                e.preventDefault();
                e.stopPropagation();
                useCommandPaletteStore.getState().toggle();
                return;
            }

            // Let the terminal handle everything else
            if (isInTerminal) return;

            const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

            // In text inputs only allow Ctrl+Enter through
            if (isTextInput && !(isCtrl && e.key === 'Enter')) return;

            if (!isCtrl) {
                // F5 → Refresh status
                if (e.key === 'F5') {
                    e.preventDefault();
                    const repo = useRepoStore.getState();
                    if (repo.activeRepoPath) {
                        repo.refreshStatus();
                        repo.refreshBranches();
                        repo.refreshLog();
                    }
                    return;
                }
                return;
            }

            const ui = useUIStore.getState();
            const repo = useRepoStore.getState();
            const acc = useAccountStore.getState();
            const activeAccount = acc.accounts.find(a => a.id === acc.activeAccountId);

            // ── Tab navigation (Ctrl+1‑8, Ctrl+,) ──

            const tabMap: Record<string, Parameters<typeof ui.setActiveTab>[0]> = {
                '1': 'changes', '2': 'history', '3': 'branches', '4': 'cloud',
                '5': 'pull-requests', '6': 'actions', '7': 'issues', '8': 'files',
            };

            if (!isShift && tabMap[key]) {
                e.preventDefault();
                ui.setActiveTab(tabMap[key]);
                return;
            }
            if (!isShift && key === ',') {
                e.preventDefault();
                ui.setActiveTab('settings');
                return;
            }

            // ── Actions that don't need an active repo ──

            // Ctrl+Shift+N → New repo modal
            if (isShift && key === 'n') {
                e.preventDefault();
                ui.setShowNewRepoModal(true);
                return;
            }

            // Everything below requires an active repo
            if (!repo.activeRepoPath) return;

            // Ctrl+B → New branch (switch to branches tab + open create form)
            if (!isShift && key === 'b') {
                e.preventDefault();
                ui.setActiveTab('branches');
                ui.setBranchCreateRequested(true);
                return;
            }

            // Ctrl+Shift+S → Sync repo (pull + push)
            if (isShift && key === 's') {
                e.preventDefault();
                if (activeAccount) {
                    (async () => {
                        ui.setIsSyncing(true);
                        try {
                            const token = await (window as any).electronAPI.auth.getToken(activeAccount.username);
                            if (!token) { ui.showNotification('error', 'No auth token. Please re-login.'); return; }
                            const result = await repo.syncRepo(token);
                            if (result.success) {
                                ui.showNotification('success', 'Synced successfully!');
                            } else if (result.conflicts?.length) {
                                ui.showConflicts(result.conflicts);
                                ui.showNotification('error', `${result.conflicts.length} conflict(s) detected`);
                            } else {
                                ui.showNotification('error', result.error || 'Sync failed');
                            }
                        } catch (err: any) {
                            ui.showNotification('error', err.message || 'Sync failed');
                        } finally {
                            ui.setIsSyncing(false);
                        }
                    })();
                }
                return;
            }

            // Ctrl+Shift+P → Publish branch
            if (isShift && key === 'p') {
                e.preventDefault();
                if (activeAccount?.token) {
                    repo.publishBranch(activeAccount.token);
                }
                return;
            }

            // Ctrl+Shift+Z → Stash changes
            if (isShift && key === 'z') {
                e.preventDefault();
                repo.stashChanges();
                return;
            }

            // Ctrl+Shift+R → Revert last commit
            if (isShift && key === 'r') {
                e.preventDefault();
                repo.revertLastCommit();
                return;
            }

            // Ctrl+P → Sync (pull then push) — same as Ctrl+Shift+S but quicker
            if (!isShift && key === 'p') {
                e.preventDefault();
                if (activeAccount) {
                    (async () => {
                        ui.setIsSyncing(true);
                        try {
                            const token = await (window as any).electronAPI.auth.getToken(activeAccount.username);
                            if (!token) { ui.showNotification('error', 'No auth token. Please re-login.'); return; }
                            const result = await repo.syncRepo(token);
                            if (result.success) {
                                ui.showNotification('success', 'Synced successfully!');
                            } else if (result.conflicts?.length) {
                                ui.showConflicts(result.conflicts);
                                ui.showNotification('error', `${result.conflicts.length} conflict(s) detected`);
                            } else {
                                ui.showNotification('error', result.error || 'Sync failed');
                            }
                        } catch (err: any) {
                            ui.showNotification('error', err.message || 'Sync failed');
                        } finally {
                            ui.setIsSyncing(false);
                        }
                    })();
                }
                return;
            }
        };

        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, []);

    return (
        <ErrorBoundary>
            <div className="flex flex-col h-screen w-screen bg-surface-0 text-text-primary overflow-hidden">
                {/* ── Main Content Area ── */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Account Sidebar (Slim) */}
                    <AccountSidebar />

                    {/* Repo Sidebar (Collapsible) */}
                    <AnimatePresence mode="wait">
                        {!repoSidebarCollapsed && (
                            <motion.div
                                key="repo-sidebar"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 240, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden shrink-0"
                            >
                                <RepoSidebar />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main View + Terminal */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-hidden">
                            <MainView />
                        </div>

                        {/* Bottom Panel - Terminal or Activity Log */}
                        <motion.div
                            animate={{ height: terminalExpanded ? terminalHeight : 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className={`border-t border-border overflow-hidden shrink-0 ${
                                !terminalExpanded ? 'border-t-0' : ''
                            }`}
                        >
                            <div style={{ height: terminalHeight }} className="h-full">
                                {bottomPanel === 'terminal' ? (
                                    <BottomTerminal />
                                ) : (
                                    <ActivityPanel />
                                )}
                            </div>
                        </motion.div>

                        {/* Bottom Panel Toggle Bar */}
                        <div
                            className="flex items-center h-8 px-3 bg-surface-1 border-t border-border shrink-0"
                        >
                            <div className="flex items-center gap-1">
                                <svg
                                    className={`w-3 h-3 text-text-tertiary transition-transform cursor-pointer ${terminalExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    onClick={() => useUIStore.getState().toggleTerminal()}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                <button
                                    onClick={() => {
                                        useUIStore.getState().setBottomPanel('terminal');
                                        if (!terminalExpanded) useUIStore.getState().toggleTerminal();
                                    }}
                                    className={`text-xs font-mono px-2 py-0.5 rounded transition-colors ${
                                        bottomPanel === 'terminal'
                                            ? 'text-text-primary bg-surface-2'
                                            : 'text-text-tertiary hover:text-text-secondary'
                                    }`}
                                >
                                    Terminal
                                </button>
                                <button
                                    onClick={() => {
                                        useUIStore.getState().setBottomPanel('activity');
                                        if (!terminalExpanded) useUIStore.getState().toggleTerminal();
                                    }}
                                    className={`text-xs font-mono px-2 py-0.5 rounded transition-colors ${
                                        bottomPanel === 'activity'
                                            ? 'text-text-primary bg-surface-2'
                                            : 'text-text-tertiary hover:text-text-secondary'
                                    }`}
                                >
                                    Activity Log
                                </button>
                            </div>
                            <div className="flex-1" />
                            <span className="text-2xs text-text-tertiary">Ctrl+J</span>
                        </div>
                    </div>
                </div>

                {/* ── Floating Notifications ── */}
                <AnimatePresence>
                    {notification && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className={`fixed bottom-12 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-2xl border ${notification.type === 'success'
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : notification.type === 'error'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                                }`}
                        >
                            {notification.message}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Update Toast ── */}
                <UpdateToast />

                {/* ── Conflict Panel Overlay ── */}
                <AnimatePresence>
                    {showConflictPanel && <ConflictPanel />}
                </AnimatePresence>

                {/* ── Command Palette ── */}
                <CommandPalette />

                {/* ── Macro Editor ── */}
                <MacroEditorModal />
            </div>
        </ErrorBoundary>
    );
}
