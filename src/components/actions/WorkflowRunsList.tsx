import React from 'react';
import { useActionsStore } from '../../stores/actions.store';
import { GitHubWorkflowRun } from '../../lib/github-types';
import { FiCheckCircle, FiXCircle, FiClock, FiGitCommit, FiPlay } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns'; // Need to check if date-fns is installed. If not, use intl.
// We can use simple formatter if date-fns not available.

const StatusIcon = ({ status, conclusion }: { status: string; conclusion: string | null }) => {
    if (status === 'queued' || status === 'in_progress') {
        return <div className="w-4 h-4 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />;
    }
    if (conclusion === 'success') return <FiCheckCircle className="w-4 h-4 text-green-500" />;
    if (conclusion === 'failure') return <FiXCircle className="w-4 h-4 text-red-500" />;
    if (conclusion === 'cancelled') return <FiXCircle className="w-4 h-4 text-zinc-500" />;
    return <div className="w-4 h-4 rounded-full bg-zinc-600" />;
};

export const WorkflowRunsList: React.FC = () => {
    const { runs, isLoading, workflows } = useActionsStore();

    const getWorkflowName = (id: number) => workflows.find(w => w.id === id)?.name || 'Unknown';

    if (isLoading && runs.length === 0) {
        return <div className="p-8 text-center text-zinc-400">Loading runs...</div>;
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-900/50 text-zinc-400 text-xs uppercase sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                        <th className="px-4 py-3 font-medium w-12">Status</th>
                        <th className="px-4 py-3 font-medium">Workflow / Run</th>
                        <th className="px-4 py-3 font-medium">Commit</th>
                        <th className="px-4 py-3 font-medium">Trigger</th>
                        <th className="px-4 py-3 font-medium text-right">Duration</th>
                        <th className="px-4 py-3 font-medium text-right">Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {runs.map(run => (
                        <tr key={run.id} className="hover:bg-zinc-800/30 transition-colors group">
                            <td className="px-4 py-3">
                                <StatusIcon status={run.status} conclusion={run.conclusion} />
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex flex-col">
                                    <span className="text-zinc-200 font-medium text-sm truncate max-w-xs" title={run.name || run.display_title}>
                                        {run.display_title || run.name}
                                    </span>
                                    <span className="text-xs text-zinc-500">{getWorkflowName(run.workflow_id)} #{run.run_attempt}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <FiGitCommit className="w-3 h-3" />
                                    <span className="font-mono">{run.head_sha.substring(0, 7)}</span>
                                    <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 truncate max-w-[100px]">
                                        {run.head_branch}
                                    </span>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <img src={run.actor.avatar_url} className="w-4 h-4 rounded-full" />
                                    <span>{run.triggering_actor.login}</span>
                                    <span className="text-zinc-600">via {run.event}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-zinc-400">
                                {run.duration_ms ? `${Math.round(run.duration_ms / 1000)}s` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-zinc-400">
                                {new Date(run.created_at).toLocaleDateString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
