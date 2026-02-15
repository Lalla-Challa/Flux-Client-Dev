import React, { useState, useEffect } from 'react';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';
import { useUIStore } from '../../stores/ui.store';
import { findCloudRepo, findAccountForRepo } from '../../lib/repo-utils';

export function CreatePRModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const repos = useRepoStore((s) => s.repos);
    const cloudRepos = useRepoStore((s) => s.cloudRepos);
    const branches = useRepoStore((s) => s.branches);
    const createPullRequest = useRepoStore((s) => s.createPullRequest);
    const accounts = useAccountStore((s) => s.accounts);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [head, setHead] = useState('');
    const [base, setBase] = useState('main');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Context — use robust matching from repo-utils
    const activeRepo = repos.find((r) => r.path === activeRepoPath);
    const currentCloudRepo = findCloudRepo(activeRepo, cloudRepos);
    const account = findAccountForRepo(currentCloudRepo, accounts, activeAccountId);
    const token = account?.token;

    useEffect(() => {
        if (isOpen) {
            // Set default head to current branch
            const current = branches.find(b => b.current);
            if (current) setHead(current.name);

            // Try to guess base (usually 'main' or 'master')
            const hasMaster = branches.some(b => b.name === 'master' || b.name === 'origin/master');
            if (hasMaster && base === 'main') setBase('master');
        }
    }, [isOpen, branches]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !currentCloudRepo) return;

        setIsSubmitting(true);
        try {
            await createPullRequest(token, currentCloudRepo, title, body, head, base);
            onClose();
            setTitle('');
            setBody('');
        } catch (error) {
            // Error handled in store
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!currentCloudRepo || !token) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-surface-0 rounded-lg shadow-xl w-[500px] p-6 border border-border">
                    <h2 className="text-lg font-semibold text-text-primary mb-4">Create Pull Request</h2>
                    <p className="text-text-tertiary mb-6">
                        This repository is not linked to GitHub or you are not signed in.
                    </p>
                    <div className="flex justify-end">
                        <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-md">Close</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-surface-0 rounded-lg shadow-xl w-[600px] border border-border flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-text-primary">Create Pull Request</h2>
                    <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-text-secondary">Base Branch</label>
                            <select
                                value={base}
                                onChange={(e) => setBase(e.target.value)}
                                className="input-field w-full"
                            >
                                {branches.filter(b => b.remote).map(b => (
                                    <option key={b.name} value={b.name.replace('origin/', '')}>
                                        {b.name.replace('origin/', '')}
                                    </option>
                                ))}
                                {/* Fallback options if no remote branches found yet */}
                                <option value="main">main</option>
                                <option value="master">master</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-text-secondary">Compare Branch (Head)</label>
                            <select
                                value={head}
                                onChange={(e) => setHead(e.target.value)}
                                className="input-field w-full"
                            >
                                {branches.filter(b => !b.remote).map(b => (
                                    <option key={b.name} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-secondary">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Fx: update authentication flow"
                            className="input-field w-full"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-secondary">Description</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Describe your changes..."
                            className="input-field w-full h-32 resize-none py-2"
                        />
                    </div>
                </form>

                <div className="p-4 border-t border-border flex justify-end gap-2 bg-surface-1/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary px-4 py-2 rounded-md"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="btn-primary px-4 py-2 rounded-md flex items-center gap-2"
                        disabled={isSubmitting || !title}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Pull Request'}
                    </button>
                </div>
            </div>
        </div>
    );
}
