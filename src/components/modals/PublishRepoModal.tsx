import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';
import { useUIStore } from '../../stores/ui.store';

interface PublishRepoModalProps {
    isOpen: boolean;
    onClose: () => void;
    repoPath: string;
    repoName: string;
}

export function PublishRepoModal({ isOpen, onClose, repoPath, repoName }: PublishRepoModalProps) {
    const [name, setName] = useState(repoName);
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);

    const publishRepo = useRepoStore((s) => s.publishRepo);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const accounts = useAccountStore((s) => s.accounts);

    const activeAccount = accounts.find((a) => a.username === activeAccountId);

    const handlePublish = async () => {
        if (!activeAccount?.token) {
            useUIStore.getState().showNotification('error', 'No GitHub account connected');
            return;
        }

        if (!name.trim()) {
            useUIStore.getState().showNotification('error', 'Repository name is required');
            return;
        }

        setIsPublishing(true);
        try {
            await publishRepo(repoPath, {
                name: name.trim(),
                description: description.trim() || undefined,
                private: isPrivate,
                token: activeAccount.token,
            });

            useUIStore.getState().showNotification('success', `Published "${name}" to GitHub`);
            onClose();
        } catch (error: any) {
            useUIStore.getState().showNotification(
                'error',
                error.message || 'Failed to publish repository'
            );
        } finally {
            setIsPublishing(false);
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
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-surface-1 rounded-xl border border-border max-w-lg w-full p-6"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold">Publish to GitHub</h2>
                        <button onClick={onClose} className="btn-ghost p-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mb-6 p-4 rounded-lg bg-surface-2 border border-border">
                        <div className="flex items-center gap-2 text-sm mb-1">
                            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span className="font-medium">Local Repository</span>
                        </div>
                        <p className="text-xs text-text-tertiary truncate pl-6">{repoPath}</p>
                    </div>

                    {/* Name */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Repository Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="my-repository"
                            className="input-field w-full"
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="A brief description..."
                            className="input-field w-full resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Visibility */}
                    <div className="mb-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="w-4 h-4 rounded border-border bg-surface-2 text-accent focus:ring-accent focus:ring-offset-0"
                            />
                            <span className="text-sm">Make this repository private</span>
                        </label>
                    </div>

                    {/* Info */}
                    <div className="mb-6 p-3 rounded-lg bg-accent/10 border border-accent/30 text-xs text-text-secondary">
                        <p className="mb-1 font-medium">This will:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-text-tertiary">
                            <li>Create a new repository on GitHub</li>
                            <li>Add GitHub as the remote "origin"</li>
                            <li>Push all your local commits</li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button onClick={onClose} className="btn-ghost px-4 py-2" disabled={isPublishing}>
                            Cancel
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={isPublishing || !name.trim() || !activeAccount}
                            className="btn-primary px-6 py-2"
                        >
                            {isPublishing ? (
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Publishing...
                                </span>
                            ) : (
                                '🚀 Publish to GitHub'
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
