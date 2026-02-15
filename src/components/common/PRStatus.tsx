import React, { useEffect, useState } from 'react';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';

export function PRStatus({ pr }: { pr: any }) {
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const cloudRepos = useRepoStore((s) => s.cloudRepos);
    const listCheckRuns = useRepoStore((s) => s.listCheckRuns);
    const accounts = useAccountStore((s) => s.accounts);

    const [checks, setChecks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'success' | 'failure' | 'pending' | null>(null);

    // Context
    const currentCloudRepo = cloudRepos.find(r =>
        activeRepoPath?.toLowerCase().endsWith(r.name.toLowerCase())
    );
    const account = accounts.find(a => a.username === currentCloudRepo?.owner.login);
    const token = account?.token;

    useEffect(() => {
        if (token && currentCloudRepo && pr.head.sha) {
            loadChecks();
        }
    }, [token, currentCloudRepo, pr.head.sha]);

    const loadChecks = async () => {
        if (!token || !currentCloudRepo) return;
        setIsLoading(true);
        try {
            const runs = await listCheckRuns(token, currentCloudRepo, pr.head.sha);
            setChecks(runs);

            // Determine overall status
            if (runs.length === 0) {
                setStatus(null);
            } else if (runs.some((run: any) => run.conclusion === 'failure')) {
                setStatus('failure');
            } else if (runs.some((run: any) => run.status === 'in_progress' || run.status === 'queued')) {
                setStatus('pending');
            } else {
                setStatus('success');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <span className="loading-spinner w-3 h-3" />;
    }

    if (!status) return null;

    return (
        <div className="flex items-center gap-1" title={`${checks.length} checks`}>
            {status === 'success' && (
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            )}
            {status === 'failure' && (
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            )}
            {status === 'pending' && (
                <svg className="w-4 h-4 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="30 60" />
                </svg>
            )}
        </div>
    );
}
