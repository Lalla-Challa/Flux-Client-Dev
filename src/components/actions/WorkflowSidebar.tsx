import React from 'react';
import { useActionsStore } from '../../stores/actions.store';
import { motion } from 'framer-motion';
import { FiPlayCircle, FiList, FiPackage, FiActivity, FiPlus } from 'react-icons/fi';

export const WorkflowSidebar: React.FC = () => {
    const { workflows, activeWorkflow, setActiveWorkflow, isLoading } = useActionsStore();

    return (
        <div className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Workflows</h3>
                <button
                    onClick={() => useActionsStore.getState().setEditorMode('create')}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    title="New Workflow"
                >
                    <FiPlus className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {isLoading && workflows.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500 text-sm">Loading workflows...</div>
                ) : workflows.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500 text-sm">
                        No workflows found.<br />
                        Click + to create one.
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => setActiveWorkflow(null)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${activeWorkflow === null
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                }`}
                        >
                            <FiList className="w-4 h-4" />
                            <span>All Workflows</span>
                        </button>

                        {workflows.map(workflow => (
                            <button
                                key={workflow.id}
                                onClick={() => setActiveWorkflow(workflow.id)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${activeWorkflow === workflow.id
                                    ? 'bg-blue-500/10 text-blue-400'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                    }`}
                            >
                                <FiActivity className="w-4 h-4" />
                                <span className="truncate">{workflow.name}</span>
                            </button>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};
