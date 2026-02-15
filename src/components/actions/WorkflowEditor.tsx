import React, { useState, useEffect, useCallback } from 'react';
import { useActionsStore } from '../../stores/actions.store';
import { useRepoStore } from '../../stores/repo.store';
import { ReactFlowProvider, Node, Edge } from 'reactflow';
import { FiSave, FiX, FiAlertTriangle } from 'react-icons/fi';
import { Code, Workflow } from 'lucide-react';
import { CodeEditor } from '../common/CodeEditor';
import { WorkflowVisualizer } from '../workflow/WorkflowVisualizer';
import { yamlToGraph } from '../../lib/yamlToGraph';
import { graphToYaml } from '../../lib/graphToYaml';

type ViewMode = 'code' | 'visual';

export const WorkflowEditor: React.FC = () => {
    const {
        fileContent,
        selectedWorkflowPath,
        editorMode,
        saveWorkflowFile,
        createWorkflowFile,
        setEditorMode,
        isLoading,
        error
    } = useActionsStore();
    const activeRepoPath = useRepoStore(s => s.activeRepoPath);

    // Graph state - SOURCE OF TRUTH
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [workflowName, setWorkflowName] = useState('Untitled Workflow');

    // Local state for editing
    const [filename, setFilename] = useState(''); // For new files
    const [viewMode, setViewMode] = useState<ViewMode>('visual'); // Default to visual
    const [yamlContent, setYamlContent] = useState(''); // For code view
    const [hasUnsavedCodeChanges, setHasUnsavedCodeChanges] = useState(false);

    // Parse YAML to graph when file content loads
    useEffect(() => {
        if (fileContent) {
            const result = yamlToGraph(fileContent);
            setNodes(result.nodes);
            setEdges(result.edges);
            setWorkflowName(result.workflowName || 'Untitled Workflow');
            setYamlContent(fileContent);
            setHasUnsavedCodeChanges(false);
        } else {
            // New workflow - start with empty graph
            setNodes([]);
            setEdges([]);
            setWorkflowName('Untitled Workflow');
            setYamlContent('');
            setHasUnsavedCodeChanges(false);
        }
    }, [fileContent]);

    // Handle changes from visual editor
    const handleGraphChange = useCallback((newNodes: Node[], newEdges: Edge[], newName: string) => {
        setNodes(newNodes);
        setEdges(newEdges);
        setWorkflowName(newName);

        // Regenerate YAML from graph
        const generatedYaml = graphToYaml(newNodes, newEdges, newName);
        setYamlContent(generatedYaml);
        setHasUnsavedCodeChanges(false);
    }, []);

    // Handle changes in code editor
    const handleCodeChange = useCallback((newCode: string) => {
        setYamlContent(newCode);
        setHasUnsavedCodeChanges(true);
    }, []);

    // Switch to visual mode - parse YAML if there are unsaved code changes
    const handleSwitchToVisual = useCallback(() => {
        if (hasUnsavedCodeChanges) {
            if (confirm('You have unsaved YAML changes. Switching to Visual mode will parse your YAML. Continue?')) {
                const result = yamlToGraph(yamlContent);
                if (result.error) {
                    alert(`YAML Parse Error: ${result.error}\n\nPlease fix the YAML or discard changes.`);
                    return;
                }
                setNodes(result.nodes);
                setEdges(result.edges);
                setWorkflowName(result.workflowName || 'Untitled Workflow');
                setHasUnsavedCodeChanges(false);
                setViewMode('visual');
            }
        } else {
            setViewMode('visual');
        }
    }, [hasUnsavedCodeChanges, yamlContent]);

    const handleSave = async () => {
        if (!activeRepoPath) return;

        // Generate YAML from current graph state
        const contentToSave = graphToYaml(nodes, edges, workflowName);

        try {
            if (editorMode === 'create') {
                let name = filename;
                if (!name.endsWith('.yml') && !name.endsWith('.yaml')) {
                    name += '.yml';
                }
                const path = `${activeRepoPath}/.github/workflows/${name}`;
                await createWorkflowFile(path, contentToSave);
            } else if (selectedWorkflowPath) {
                await saveWorkflowFile(selectedWorkflowPath, contentToSave);
            }
        } catch (e) {
            // Error handling in store, displayed via error state
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
                <div className="flex items-center gap-4">
                    {editorMode === 'create' ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-400">.github/workflows/</span>
                            <input
                                type="text"
                                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 outline-none focus:border-blue-500 w-64"
                                placeholder="my-workflow.yml"
                                value={filename}
                                onChange={e => setFilename(e.target.value)}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Editing</span>
                            <span className="font-mono text-sm text-zinc-200">
                                {selectedWorkflowPath?.split('/').pop()}
                            </span>
                        </div>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-zinc-800 rounded-lg border border-zinc-700 p-0.5">
                        <button
                            onClick={() => setViewMode('code')}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                viewMode === 'code'
                                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Code className="w-3.5 h-3.5" />
                            Code
                            {hasUnsavedCodeChanges && (
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" title="Unsaved YAML changes" />
                            )}
                        </button>
                        <button
                            onClick={handleSwitchToVisual}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                viewMode === 'visual'
                                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Workflow className="w-3.5 h-3.5" />
                            Visual
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setEditorMode('runs')}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors flex items-center gap-1"
                    >
                        <FiX className="w-3 h-3" />
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading || (editorMode === 'create' && !filename)}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading ? (
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <FiSave className="w-3 h-3" />
                        )}
                        {isLoading ? 'Saving...' : 'Save Workflow'}
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <span className="font-bold">Error:</span> {error}
                </div>
            )}

            {/* Warning Banner for Code Changes */}
            {viewMode === 'code' && hasUnsavedCodeChanges && (
                <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-sm flex items-center gap-2">
                    <FiAlertTriangle className="w-4 h-4" />
                    <span>
                        <strong>Note:</strong> Changes in code view are not synchronized with the visual editor until you switch back to Visual mode or save.
                    </span>
                </div>
            )}

            {/* Editor / Visualizer Area */}
            <div className="flex-1 overflow-hidden relative bg-zinc-950">
                {viewMode === 'code' ? (
                    <CodeEditor
                        value={yamlContent}
                        language="yaml"
                        onChange={(val) => handleCodeChange(val || '')}
                        filename={selectedWorkflowPath || (filename ? `.github/workflows/${filename}` : undefined)}
                    />
                ) : (
                    <ReactFlowProvider>
                        <WorkflowVisualizer
                            initialNodes={nodes}
                            initialEdges={edges}
                            workflowName={workflowName}
                            onChange={handleGraphChange}
                        />
                    </ReactFlowProvider>
                )}
            </div>

            {editorMode === 'create' && viewMode === 'visual' && nodes.length === 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none text-center">
                    <p className="text-sm">Click the <strong>Add Trigger</strong> button to start building your workflow</p>
                </div>
            )}
        </div>
    );
};
