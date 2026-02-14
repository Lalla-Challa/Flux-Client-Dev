import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccountSidebar } from './components/layout/AccountSidebar';
import { RepoSidebar } from './components/layout/RepoSidebar';
import { MainView } from './components/layout/MainView';
import { BottomTerminal } from './components/layout/BottomTerminal';
import { ConflictPanel } from './components/conflicts/ConflictPanel';
import { useAccountStore } from './stores/account.store';
import { useUIStore } from './stores/ui.store';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
    const loadAccounts = useAccountStore((s) => s.loadAccounts);
    const notification = useUIStore((s) => s.notification);
    const showConflictPanel = useUIStore((s) => s.showConflictPanel);
    const repoSidebarCollapsed = useUIStore((s) => s.repoSidebarCollapsed);
    const terminalExpanded = useUIStore((s) => s.terminalExpanded);
    const terminalHeight = useUIStore((s) => s.terminalHeight);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '`') {
                e.preventDefault();
                useUIStore.getState().toggleTerminal();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
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

                        {/* Bottom Terminal */}
                        <AnimatePresence>
                            {terminalExpanded && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: terminalHeight }}
                                    exit={{ height: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="border-t border-border overflow-hidden shrink-0"
                                >
                                    <BottomTerminal />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Terminal Toggle Bar */}
                        <div
                            className="flex items-center h-8 px-3 bg-surface-1 border-t border-border cursor-pointer hover:bg-surface-2 transition-colors shrink-0"
                            onClick={() => useUIStore.getState().toggleTerminal()}
                        >
                            <div className="flex items-center gap-2">
                                <svg
                                    className={`w-3 h-3 text-text-tertiary transition-transform ${terminalExpanded ? 'rotate-180' : ''
                                        }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                <span className="text-xs text-text-tertiary font-mono">Terminal</span>
                            </div>
                            <div className="flex-1" />
                            <span className="kbd">Ctrl+`</span>
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

                {/* ── Conflict Panel Overlay ── */}
                <AnimatePresence>
                    {showConflictPanel && <ConflictPanel />}
                </AnimatePresence>
            </div>
        </ErrorBoundary>
    );
}
