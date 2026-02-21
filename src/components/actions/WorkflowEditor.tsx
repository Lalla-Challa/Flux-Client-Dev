import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useActionsStore } from '../../stores/actions.store';
import { useRepoStore } from '../../stores/repo.store';
import { ReactFlowProvider, Node, Edge } from 'reactflow';
import { FiSave, FiX } from 'react-icons/fi';
import { AlertCircle, GripVertical, Code, Workflow, Columns2 } from 'lucide-react';
import { CodeEditor } from '../common/CodeEditor';
import { WorkflowVisualizer } from '../workflow/WorkflowVisualizer';
import { yamlToGraph } from '../../lib/yamlToGraph';
import { graphToYaml } from '../../lib/graphToYaml';

type ViewMode = 'visual' | 'code' | 'split';

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

    // Local state
    const [filename, setFilename] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('visual');
    const [yamlContent, setYamlContent] = useState('');
    const [yamlError, setYamlError] = useState<string | null>(null);

    // Split pane state
    const [splitRatio, setSplitRatio] = useState(0.55);
    const isDragging = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce timer for code→visual sync
    const codeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Flag to prevent feedback loops
    const syncSource = useRef<'graph' | 'code' | null>(null);

    // Parse YAML to graph when file content loads
    useEffect(() => {
        if (fileContent) {
            const result = yamlToGraph(fileContent);
            setNodes(result.nodes);
            setEdges(result.edges);
            setWorkflowName(result.workflowName || 'Untitled Workflow');
            setYamlContent(fileContent);
            setYamlError(null);
        } else {
            setNodes([]);
            setEdges([]);
            setWorkflowName('Untitled Workflow');
            setYamlContent('');
            setYamlError(null);
        }
    }, [fileContent]);

    // Handle changes from visual editor → update YAML
    const handleGraphChange = useCallback((newNodes: Node[], newEdges: Edge[], newName: string) => {
        if (syncSource.current === 'code') return;
        syncSource.current = 'graph';
        setNodes(newNodes);
        setEdges(newEdges);
        setWorkflowName(newName);
        const generatedYaml = graphToYaml(newNodes, newEdges, newName);
        setYamlContent(generatedYaml);
        setYamlError(null);
        setTimeout(() => { syncSource.current = null; }, 0);
    }, []);

    // Handle changes in code editor → debounced update to graph
    const handleCodeChange = useCallback((newCode: string) => {
        setYamlContent(newCode || '');
        if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current);
        codeDebounceRef.current = setTimeout(() => {
            if (!newCode || !newCode.trim()) { setYamlError(null); return; }
            const result = yamlToGraph(newCode);
            if (result.error) { setYamlError(result.error); return; }
            syncSource.current = 'code';
            setNodes(result.nodes);
            setEdges(result.edges);
            setWorkflowName(result.workflowName || 'Untitled Workflow');
            setYamlError(null);
            setTimeout(() => { syncSource.current = null; }, 0);
        }, 500);
    }, []);

    // When switching TO visual from code-only, do an immediate parse
    const handleSetViewMode = useCallback((mode: ViewMode) => {
        if ((viewMode === 'code') && (mode === 'visual' || mode === 'split')) {
            // Sync the latest YAML into graph state immediately
            if (yamlContent.trim()) {
                const result = yamlToGraph(yamlContent);
                if (!result.error) {
                    setNodes(result.nodes);
                    setEdges(result.edges);
                    setWorkflowName(result.workflowName || 'Untitled Workflow');
                    setYamlError(null);
                }
            }
        }
        setViewMode(mode);
    }, [viewMode, yamlContent]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => { if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current); };
    }, []);

    // ── Split pane drag handling ─────────────────────────────────
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setSplitRatio(Math.max(0.25, Math.min(0.75, (e.clientX - rect.left) / rect.width)));
        };
        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleSave = async () => {
        if (!activeRepoPath) return;
        const contentToSave = graphToYaml(nodes, edges, workflowName);
        try {
            if (editorMode === 'create') {
                let name = filename;
                if (!name.endsWith('.yml') && !name.endsWith('.yaml')) name += '.yml';
                await createWorkflowFile(`${activeRepoPath}/.github/workflows/${name}`, contentToSave);
            } else if (selectedWorkflowPath) {
                await saveWorkflowFile(selectedWorkflowPath, contentToSave);
            }
        } catch (_) {}
    };

    const showVisual = viewMode === 'visual' || viewMode === 'split';
    const showCode = viewMode === 'code' || viewMode === 'split';

    return (
        <div className="flex flex-col h-full bg-zinc-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
                <div className="flex items-center gap-4">
                    {editorMode === 'create' ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-400">.github/workflows/</span>
                            <input
                                type="text"
                                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 outline-none focus:border-blue-500 w-56"
                                placeholder="my-workflow.yml"
                                value={filename}
                                onChange={e => setFilename(e.target.value)}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Editing</span>
                            <span className="font-mono text-sm text-zinc-200">
                                {selectedWorkflowPath?.split('/').pop()}
                            </span>
                        </div>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-zinc-800 rounded-lg border border-zinc-700 p-0.5 gap-0.5">
                        <ViewToggleBtn
                            active={viewMode === 'visual'}
                            onClick={() => handleSetViewMode('visual')}
                            icon={<Workflow className="w-3.5 h-3.5" />}
                            label="Visual"
                            title="Visual editor only"
                        />
                        <ViewToggleBtn
                            active={viewMode === 'split'}
                            onClick={() => handleSetViewMode('split')}
                            icon={<Columns2 className="w-3.5 h-3.5" />}
                            label="Split"
                            title="Side-by-side split view"
                        />
                        <ViewToggleBtn
                            active={viewMode === 'code'}
                            onClick={() => handleSetViewMode('code')}
                            icon={<Code className="w-3.5 h-3.5" />}
                            label="Code"
                            title="YAML code editor only"
                        />
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
                        {isLoading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <span className="font-bold">Error:</span> {error}
                </div>
            )}

            {/* Editor Area */}
            <div ref={containerRef} className="flex-1 overflow-hidden relative bg-zinc-950 flex">

                {/* Visual pane */}
                {showVisual && (
                    <div
                        style={viewMode === 'split' ? { width: `${splitRatio * 100}%` } : undefined}
                        className={viewMode !== 'split' ? 'flex-1 h-full' : 'h-full'}
                    >
                        <ReactFlowProvider>
                            <WorkflowVisualizer
                                initialNodes={nodes}
                                initialEdges={edges}
                                workflowName={workflowName}
                                onChange={handleGraphChange}
                            />
                        </ReactFlowProvider>
                    </div>
                )}

                {/* Resize handle (split only) */}
                {viewMode === 'split' && (
                    <div
                        onMouseDown={handleMouseDown}
                        className="w-2 flex-shrink-0 bg-zinc-800 hover:bg-zinc-700 cursor-col-resize flex items-center justify-center border-x border-zinc-700/50 transition-colors group"
                    >
                        <GripVertical className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </div>
                )}

                {/* Code pane */}
                {showCode && (
                    <div
                        style={viewMode === 'split' ? { width: `${(1 - splitRatio) * 100}%` } : undefined}
                        className={`${viewMode !== 'split' ? 'flex-1' : ''} h-full flex flex-col`}
                    >
                        {yamlError && (
                            <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[11px] flex items-center gap-1.5 shrink-0">
                                <AlertCircle className="w-3 h-3" />
                                <span className="truncate">YAML Error: {yamlError}</span>
                            </div>
                        )}
                        <div className="flex-1">
                            <CodeEditor
                                value={yamlContent}
                                language="yaml"
                                onChange={(val) => handleCodeChange(val || '')}
                                filename={selectedWorkflowPath || (filename ? `.github/workflows/${filename}` : undefined)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── View toggle button ────────────────────────────────────────────

function ViewToggleBtn({
    active,
    onClick,
    icon,
    label,
    title,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    title: string;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                active
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
            {icon}
            {label}
        </button>
    );
}
