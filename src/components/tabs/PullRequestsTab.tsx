import React, { useEffect } from 'react';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';
import { motion } from 'framer-motion';

export function PullRequestsTab() {
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const repos = useRepoStore((s) => s.repos);
    const cloudRepos = useRepoStore((s) => s.cloudRepos);
    const pullRequests = useRepoStore((s) => s.pullRequests);
    const isLoadingPRs = useRepoStore((s) => s.isLoadingPRs);
    const loadPullRequests = useRepoStore((s) => s.loadPullRequests);
    const checkoutPR = useRepoStore((s) => s.checkoutPR);

    const accounts = useAccountStore((s) => s.accounts);

    const activeRepo = repos.find((r) => r.path === activeRepoPath);
    const remoteUrl = activeRepo?.remoteUrl;

    const cloudRepo = cloudRepos.find((r) =>
        r.clone_url === remoteUrl ||
        r.ssh_url === remoteUrl ||
        (remoteUrl && r.html_url === remoteUrl.replace('.git', ''))
    );

    const activeAccount = accounts.find(a => cloudRepo?.owner.login === a.username);
    const token = activeAccount?.token;

    useEffect(() => {
        if (cloudRepo && token) {
            loadPullRequests(token, cloudRepo);
        }
    }, [cloudRepo?.id, token, loadPullRequests]);

    if (!activeRepo) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                <p>Select a repository to view Pull Requests</p>
            </div>
        );
    }

    if (!cloudRepo || !token) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary p-4">
                <p className="text-center">
                    This repository is not linked to GitHub or you don't have access.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-surface-1">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-sm">Pull Requests</h2>
                <button
                    onClick={() => loadPullRequests(token, cloudRepo)}
                    disabled={isLoadingPRs}
                    className="btn-ghost p-1.5"
                    title="Refresh"
                >
                    <svg className={`w-4 h-4 ${isLoadingPRs ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
                {isLoadingPRs && pullRequests.length === 0 ? (
                    <div className="flex justify-center p-4">
                        <span className="loading-spinner" />
                    </div>
                ) : pullRequests.length === 0 ? (
                    <div className="text-center text-text-tertiary p-8 text-sm">
                        No open pull requests found.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {pullRequests.map((pr) => (
                            <PRCard key={pr.id} pr={pr} onCheckout={() => checkoutPR(pr)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function PRCard({ pr, onCheckout }: { pr: any; onCheckout: () => void }) {
    const [isCheckingOut, setIsCheckingOut] = React.useState(false);

    const handleCheckout = async () => {
        setIsCheckingOut(true);
        try {
            await onCheckout();
        } catch (error) {
            console.error(error);
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-surface-2 rounded-lg border border-border hover:border-accent/30 transition-colors group"
        >
            <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    {/* Actually PR icon... */}
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate" title={pr.title}>{pr.title}</h3>
                        <span className="text-xs text-text-tertiary shrink-0">#{pr.number}</span>
                    </div>
                    <p className="text-xs text-text-secondary truncate mb-2">
                        by <span className="font-medium text-text-primary">{pr.user.login}</span> • {new Date(pr.created_at).toLocaleDateString()}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                            {/* Labels could go here */}
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={isCheckingOut}
                            className="btn-secondary text-xs py-1 px-2 h-7"
                        >
                            {isCheckingOut ? 'Checking out...' : 'Checkout'}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
