import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';
import { useUIStore } from '../../stores/ui.store';

interface NewRepoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NewRepoModal({ isOpen, onClose }: NewRepoModalProps) {
    const [type, setType] = useState<'local' | 'github' | 'both'>('both');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [autoInit, setAutoInit] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const createRepo = useRepoStore((s) => s.createRepo);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const accounts = useAccountStore((s) => s.accounts);

    const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0];

    const handleCreate = async () => {
        if (!name.trim()) {
            useUIStore.getState().showNotification('error', 'Repository name is required');
            return;
        }

        setIsCreating(true);
        try {
            await createRepo({
                type,
                name: name.trim(),
                description: description.trim() || undefined,
                private: isPrivate,
                auto_init: autoInit,
                token: activeAccount?.token,
            });

            useUIStore.getState().showNotification('success', `Created repository "${name}"`);
            onClose();
            // Reset form
            setName('');
            setDescription('');
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message || 'Failed to create repository');
        } finally {
            setIsCreating(false);
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
                        <h2 className="text-xl font-bold">Create New Repository</h2>
                        <button onClick={onClose} className="btn-ghost p-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Type Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Repository Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'local', label: 'Local Only', icon: '💻' },
                                { value: 'github', label: 'GitHub Only', icon: '☁️' },
                                { value: 'both', label: 'Local + GitHub', icon: '🔗' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setType(option.value as any)}
                                    className={`p-3 rounded-lg border text-center transition-all ${type === option.value
                                        ? 'border-accent bg-accent/10 text-accent'
                                        : 'border-border bg-surface-2 hover:border-accent/50'
                                        }`}
                                >
                                    <div className="text-2xl mb-1">{option.icon}</div>
                                    <div className="text-xs font-medium">{option.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Name */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Repository Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="my-awesome-project"
                            className="input-field w-full"
                            autoFocus
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

                    {/* Settings */}
                    {(type === 'github' || type === 'both') && (
                        <>
                            <div className="mb-4">
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
                            {type === 'github' && (
                                <div className="mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoInit}
                                            onChange={(e) => setAutoInit(e.target.checked)}
                                            className="w-4 h-4 rounded border-border bg-surface-2 text-accent focus:ring-accent focus:ring-offset-0"
                                        />
                                        <span className="text-sm">Initialize with README</span>
                                    </label>
                                </div>
                            )}
                        </>
                    )}

                    {/* Info */}
                    {!activeAccount && (type === 'github' || type === 'both') && (
                        <div className="mb-4 p-3 rounded-lg bg-status-warning/10 border border-status-warning/30 text-xs text-status-warning">
                            ⚠️ No GitHub account connected. Please connect an account to create GitHub repositories.
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button onClick={onClose} className="btn-ghost px-4 py-2" disabled={isCreating}>
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !name.trim() || (!activeAccount && type !== 'local')}
                            className="btn-primary px-6 py-2"
                        >
                            {isCreating ? (
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Creating...
                                </span>
                            ) : (
                                'Create Repository'
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
