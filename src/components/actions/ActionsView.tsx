import React, { useEffect } from 'react';
import { useActionsStore } from '../../stores/actions.store';
import { useRepoStore } from '../../stores/repo.store';
import { WorkflowSidebar } from './WorkflowSidebar';
import { WorkflowRunsList } from './WorkflowRunsList';
import { WorkflowRunDetails } from './WorkflowRunDetails';
import { WorkflowEditor } from './WorkflowEditor';
import { FiPlay, FiEdit2 } from 'react-icons/fi';

interface ActionsContext {
    token: string;
    owner: string;
    repo: string;
}

interface ActionsViewProps {
    repoPath: string;
    context: ActionsContext;
}

export const ActionsView: React.FC<ActionsViewProps> = ({ repoPath, context }) => {
    const {
        fetchRuns,
        activeWorkflow,
        activeRun,
        triggerWorkflow,
        editorMode,
        workflows,
        openWorkflowEditor
    } = useActionsStore();
    const activeRepoPath = useRepoStore(s => s.activeRepoPath);

    // Fetch runs when context or activeWorkflow changes
    useEffect(() => {
        if (context) {
            fetchRuns(context.token, context.owner, context.repo, activeWorkflow || undefined);
        }
    }, [context, activeWorkflow, fetchRuns]);

    const handleTrigger = async () => {
        if (activeWorkflow && context) {
            const branch = 'main';
            if (confirm(`Trigger workflow on '${branch}' branch?`)) {
                await triggerWorkflow(context.token, context.owner, context.repo, activeWorkflow, branch);
                setTimeout(() => {
                    fetchRuns(context.token, context.owner, context.repo, activeWorkflow);
                }, 2000);
            }
        }
    };

    const handleEdit = () => {
        const workflow = workflows.find(w => w.id === activeWorkflow);
        if (workflow && activeRepoPath) {
            // workflow.path is relative, e.g. ".github/workflows/main.yml"
            // We need full path for fs.readFile
            // Note: workflow.path from GitHub API is usually just the filename or partial path?
            // Actually it is ".github/workflows/filename.yml"
            const fullPath = `${activeRepoPath}/${workflow.path}`;
            openWorkflowEditor(fullPath);
        }
    };

    return (
        <div className="flex h-full bg-zinc-900 text-zinc-200">
            <WorkflowSidebar />
            <div className="flex-1 flex flex-col min-w-0">
                {editorMode === 'edit' || editorMode === 'create' ? (
                    <WorkflowEditor />
                ) : activeRun ? (
                    <WorkflowRunDetails />
                ) : (
                    <>
                        {activeWorkflow ? (
                            <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
                                <span className="text-sm font-medium text-zinc-400">Workflow Runs</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleEdit}
                                        className="btn-secondary text-xs px-3 py-1.5 rounded flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
                                    >
                                        <FiEdit2 className="w-3 h-3" />
                                        Edit Workflow
                                    </button>
                                    <button
                                        onClick={handleTrigger}
                                        className="btn-primary text-xs px-3 py-1.5 rounded flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors"
                                    >
                                        <FiPlay className="w-3 h-3" />
                                        Run Workflow
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-12 border-b border-zinc-800 flex items-center px-4 shrink-0">
                                <span className="text-sm font-medium text-zinc-400">All Workflow Runs</span>
                            </div>
                        )}
                        <WorkflowRunsList />
                    </>
                )}
            </div>
        </div>
    );
};
