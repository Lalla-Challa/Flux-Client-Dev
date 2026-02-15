import React, { useEffect } from 'react';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';
import { findCloudRepo, findAccountForRepo } from '../../lib/repo-utils';

export function IssuesTab() {

    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const repos = useRepoStore((s) => s.repos); // Need repos to get remoteUrl
    const activeRepo = repos.find(r => r.path === activeRepoPath);

    const cloudRepos = useRepoStore((s) => s.cloudRepos);
    const issues = useRepoStore((s) => s.issues);
    const isLoading = useRepoStore((s) => s.isLoadingIssues);
    const listIssues = useRepoStore((s) => s.listIssues);
    const accounts = useAccountStore((s) => s.accounts);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);

    // Find the current cloud repo matching the active local repo
    const currentCloudRepo = findCloudRepo(activeRepo, cloudRepos);

    // Find token for this repo
    const account = findAccountForRepo(currentCloudRepo, accounts, activeAccountId);
    const token = account?.token;

    useEffect(() => {
        if (token && currentCloudRepo) {
            listIssues(token, currentCloudRepo);
        }
    }, [token, currentCloudRepo, listIssues]);

    if (!activeRepoPath) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                <p>Select a repository to view issues</p>
            </div>
        );
    }

    if (!currentCloudRepo || !token) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                <p>This repository is not linked to GitHub or no matching account found.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-surface-1">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-0">
                <h2 className="font-semibold text-text-primary">Issues</h2>
                <div className="text-xs text-text-tertiary">
                    {issues.length} Open
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                    <div className="text-center p-8 text-text-tertiary animate-pulse">Loading issues...</div>
                ) : issues.length === 0 ? (
                    <div className="text-center p-8 text-text-tertiary bg-surface-2 rounded-lg border border-border/50">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>No open issues found</p>
                    </div>
                ) : (
                    issues.map((issue) => (
                        <div key={issue.id} className="p-3 bg-surface-0 border border-border rounded-lg hover:border-brand-500/30 transition-all shadow-sm group">
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <h3 className="font-medium text-text-primary text-sm truncate" title={issue.title}>
                                            {issue.title}
                                        </h3>
                                        <span className="text-xs text-text-tertiary shrink-0">#{issue.number}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-text-tertiary pl-6">
                                        <span>opened by <span className="text-text-secondary">{issue.user.login}</span></span>
                                        <span>•</span>
                                        <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                                        {issue.comments > 0 && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1 hover:text-text-secondary">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                    </svg>
                                                    {issue.comments}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Labels */}
                                    {issue.labels.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2 pl-6">
                                            {issue.labels.map((label: any) => (
                                                <span
                                                    key={label.id}
                                                    className="px-1.5 py-0.5 rounded-full text-[10px] font-medium border"
                                                    style={{
                                                        backgroundColor: `#${label.color}15`,
                                                        borderColor: `#${label.color}40`,
                                                        color: `#${label.color}`
                                                    }}
                                                >
                                                    {label.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <a
                                    href={issue.html_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-text-tertiary hover:text-brand-500 hover:bg-surface-2 rounded opacity-0 group-hover:opacity-100 transition-all"
                                    title="Open on GitHub"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
