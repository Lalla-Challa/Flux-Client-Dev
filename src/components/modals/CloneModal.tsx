import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../stores/ui.store';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';

const api = () => (window as any).electronAPI;

export function CloneModal() {
    const { modalState, closeModal, showNotification } = useUIStore();
    const { cloneRepo, cloneProgress } = useRepoStore();
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const accounts = useAccountStore((s) => s.accounts);

    const isOpen = modalState.type === 'clone';
    const initialUrl = modalState.data?.url || '';

    const [repoUrl, setRepoUrl] = useState('');
    const [localPath, setLocalPath] = useState('');
    const [checkoutRef, setCheckoutRef] = useState('');
    const [isCloning, setIsCloning] = useState(false);

    useEffect(() => {
        if (isOpen && initialUrl) {
            setRepoUrl(initialUrl);
            setLocalPath('');
            setCheckoutRef('');
        }
    }, [isOpen, initialUrl]);

    const handleBrowse = async () => {
        const path = await api().dialog.openDirectory();
        if (path) {
            setLocalPath(path);
        }
    };

    const handleClone = async () => {
        if (!repoUrl) return;
        if (!localPath) {
            showNotification('error', 'Please select a destination folder');
            return;
        }

        setIsCloning(true);
        try {
            // Find token
            const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0];
            const token = activeAccount?.token || '';

            await cloneRepo(repoUrl, token, { localPath, checkoutRef });
            showNotification('success', 'Repository cloned successfully');
            closeModal();
        } catch (error: any) {
            showNotification('error', error.message || 'Clone failed');
        } finally {
            setIsCloning(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                onClick={closeModal}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-surface-1 rounded-xl border border-border w-[500px] shadow-2xl overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                        <h2 className="text-lg font-bold">Clone Repository</h2>
                        <button onClick={closeModal} className="text-text-tertiary hover:text-text-primary">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* URL */}
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">
                                Repository URL
                            </label>
                            <input
                                type="text"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                className="input-field w-full"
                                placeholder="https://github.com/username/repo.git"
                                disabled={Boolean(initialUrl)}
                            />
                        </div>

                        {/* Local Path */}
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">
                                Destination Folder
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={localPath}
                                    readOnly
                                    className="input-field flex-1"
                                    placeholder="Select folder..."
                                />
                                <button onClick={handleBrowse} className="btn-secondary whitespace-nowrap">
                                    Browse...
                                </button>
                            </div>
                        </div>

                        {/* Checkout Ref (Optional) */}
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">
                                Checkout specific version (Optional)
                            </label>
                            <input
                                type="text"
                                value={checkoutRef}
                                onChange={(e) => setCheckoutRef(e.target.value)}
                                className="input-field w-full font-mono text-sm"
                                placeholder="Commit Hash, Branch Name, or Tag"
                            />
                            <p className="text-2xs text-text-tertiary mt-1">
                                Leave empty to clone default branch. You can check out any commit later from History.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-border bg-surface-2 flex items-center justify-between">
                        <div className="text-xs text-text-tertiary">
                            {cloneProgress && (
                                <span className="flex items-center gap-2">
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    {cloneProgress}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={closeModal} className="btn-ghost" disabled={isCloning}>
                                Cancel
                            </button>
                            <button
                                onClick={handleClone}
                                disabled={isCloning || !localPath || !repoUrl}
                                className="btn-primary"
                            >
                                {isCloning ? 'Cloning...' : 'Clone'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
