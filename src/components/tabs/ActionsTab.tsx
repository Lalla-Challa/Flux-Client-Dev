import React, { useEffect } from 'react';
import { ActionsView } from '../actions/ActionsView';
import { useRepoStore } from '../../stores/repo.store';
import { useActionsStore } from '../../stores/actions.store';
import { useAccountStore } from '../../stores/account.store';
import { findCloudRepo, findAccountForRepo } from '../../lib/repo-utils';

export const ActionsTab: React.FC = () => {
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const repos = useRepoStore((s) => s.repos);
    const activeRepo = repos.find((r) => r.path === activeRepoPath);
    const { fetchWorkflows, startPolling, stopPolling, isPolling } = useActionsStore();
    const { accounts } = useAccountStore();

    // State for context
    const [context, setContext] = React.useState<{ token: string; owner: string; repo: string } | null>(null);

    useEffect(() => {
        const loadContext = () => {
            if (!activeRepo) return;

            // Use robust matching from repo-utils (assumes we have cloudRepos loaded)
            // But ActionsTab might need to work even if cloudRepos aren't fully loaded?
            // Actually, we should try to match using the utils first.
            const cloudRepos = useRepoStore.getState().cloudRepos;
            const cloudRepo = findCloudRepo(activeRepo, cloudRepos);

            let account = findAccountForRepo(cloudRepo, accounts, useAccountStore.getState().activeAccountId);

            if (cloudRepo && account?.token) {
                setContext({ token: account.token, owner: cloudRepo.owner.login, repo: cloudRepo.name });
                return;
            }

            // Fallback: Parsing remote URL directly if cloudRepo not found in store
            // (This keeps existing fallback behavior for better UX if store isn't populated)
            if (!activeRepo.remoteUrl) return;

            const remoteUrl = activeRepo.remoteUrl;
            let ownerStr = '';
            let repoStr = '';

            try {
                if (remoteUrl.startsWith('http')) {
                    const url = new URL(remoteUrl);
                    const parts = url.pathname.split('/').filter(Boolean);
                    if (parts.length >= 2) {
                        ownerStr = parts[0];
                        repoStr = parts[1].replace('.git', '');
                    }
                } else if (remoteUrl.startsWith('git@')) {
                    const parts = remoteUrl.split(':');
                    if (parts.length === 2) {
                        const path = parts[1].split('/');
                        if (path.length === 2) {
                            ownerStr = path[0];
                            repoStr = path[1].replace('.git', '');
                        }
                    }
                }

                if (ownerStr && repoStr) {
                    // Try to find account
                    account = accounts.find(a => a.username.toLowerCase() === ownerStr.toLowerCase());
                    if (!account) {
                        // Try active account
                        const activeId = useAccountStore.getState().activeAccountId;
                        if (activeId) account = accounts.find(a => a.id === activeId);
                    }
                    // Try any account
                    if (!account) account = accounts.find(a => !!a.token);

                    if (account?.token) {
                        setContext({ token: account.token, owner: ownerStr, repo: repoStr });
                    }
                }
            } catch (e) {
                console.error("Failed to parse remote URL", e);
            }
        };

        loadContext();

        return () => {
            stopPolling();
        };
    }, [activeRepo?.path, accounts, repos]);

    // Start live polling when context is available
    useEffect(() => {
        if (context) {
            startPolling(context.token, context.owner, context.repo);
        }
        return () => {
            stopPolling();
        };
    }, [context?.token, context?.owner, context?.repo]);

    if (!activeRepo) {
        return <div className="p-8 text-center text-zinc-500">No repository selected</div>;
    }

    if (!activeRepo.remoteUrl) {
        return <div className="p-8 text-center text-zinc-500">No remote configured</div>;
    }

    return (
        <div className="h-full flex flex-col">
            {context ? (
                <>
                    {isPolling && (
                        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500/10 border-b border-green-500/20">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs text-green-400 font-medium">Live</span>
                        </div>
                    )}
                    <ActionsView repoPath={activeRepoPath || ''} context={context} />
                </>
            ) : (
                <div className="p-8 text-center text-zinc-500">
                    <p className="mb-2">Loading Actions context...</p>
                    {activeRepo.remoteUrl && (
                        <p className="text-xs text-zinc-600">
                            Remote: {activeRepo.remoteUrl}<br />
                            Please ensure you have a GitHub account connected that has access to this repository.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
