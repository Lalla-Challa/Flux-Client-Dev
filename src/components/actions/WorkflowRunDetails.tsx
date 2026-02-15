import React, { useEffect } from 'react';
import { useActionsStore } from '../../stores/actions.store';
import { FiClock, FiCheckCircle, FiXCircle, FiPlay, FiStopCircle, FiRotateCw } from 'react-icons/fi';
import { GitHubJob } from '../../lib/github-types';

export const WorkflowRunDetails: React.FC = () => {
    const { activeRun, jobs, fetchJobs, isLoading, cancelRun, rerunWorkflow } = useActionsStore();
    const { workflows } = useActionsStore();

    useEffect(() => {
        if (activeRun) {
            // We need token, owner, repo to fetch jobs.
            // But fetchJobs signature is (token, owner, repo, runId).
            // activeRun has url: https://api.github.com/repos/owner/repo/actions/runs/id
            // We can parse it or get from somewhere else.

            // Actually, we can pass token/owner/repo from parent or store context.
            // But store doesn't keep token/owner/repo.
            // We might need to store "currentContext" in actions store.

            // For now, let's assume we can't easily fetch jobs without context.
            // We should add `currentContext` to `ActionsStore`.
        }
    }, [activeRun]);

    if (!activeRun) return null;

    const workflow = workflows.find(w => w.id === activeRun.workflow_id);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium text-zinc-200">{activeRun.display_title || activeRun.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                        <span>{workflow?.name}</span>
                        <span>#{activeRun.run_attempt}</span>
                        <span>•</span>
                        <span>{activeRun.event}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {activeRun.status === 'in_progress' || activeRun.status === 'queued' ? (
                        <button className="btn-secondary text-red-400 hover:text-red-300">
                            <FiStopCircle className="w-4 h-4 mr-2" />
                            Cancel
                        </button>
                    ) : (
                        <button className="btn-secondary">
                            <FiRotateCw className="w-4 h-4 mr-2" />
                            Re-run
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    {jobs.map(job => (
                        <div key={job.id} className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                            <div className="px-4 py-3 flex items-center justify-between bg-zinc-800/50">
                                <div className="flex items-center gap-3">
                                    <StatusIcon status={job.status} conclusion={job.conclusion} />
                                    <span className="font-medium text-zinc-200">{job.name}</span>
                                </div>
                                <span className="text-xs text-zinc-500">
                                    {job.completed_at ? new Date(job.completed_at).toLocaleTimeString() : 'Running...'}
                                </span>
                            </div>
                            <div className="divide-y divide-zinc-800/50">
                                {job.steps.map(step => (
                                    <div key={step.number} className="px-4 py-2 flex items-center gap-3 text-sm">
                                        <StatusIcon status={step.status} conclusion={step.conclusion} />
                                        <span className="text-zinc-400">{step.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {jobs.length === 0 && !isLoading && (
                        <div className="text-center text-zinc-500 py-8">No specific job details available.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatusIcon = ({ status, conclusion }: { status: string; conclusion: string | null }) => {
    if (status === 'queued' || status === 'in_progress') {
        return <div className="w-4 h-4 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />;
    }
    if (conclusion === 'success') return <FiCheckCircle className="w-4 h-4 text-green-500" />;
    if (conclusion === 'failure') return <FiXCircle className="w-4 h-4 text-red-500" />;
    if (conclusion === 'cancelled') return <FiXCircle className="w-4 h-4 text-zinc-500" />;
    if (conclusion === 'skipped') return <div className="w-4 h-4 rounded-full border-2 border-zinc-600" />;
    return <div className="w-4 h-4 rounded-full bg-zinc-600" />;
};
