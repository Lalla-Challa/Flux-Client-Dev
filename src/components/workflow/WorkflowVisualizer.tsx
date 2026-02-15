import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    Node,
    Edge,
    Connection,
    addEdge,
    MarkerType,
    useReactFlow,
    NodeChange,
    EdgeChange,
    Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { TriggerNode, JobNode, StepNode } from './nodes';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { getLayoutedElements } from '../../lib/workflow.layout';
import {
    Zap,
    Layers,
    Terminal,
    LayoutGrid,
    Workflow,
    Trash2,
} from 'lucide-react';

// ── Node types registry ─────────────────────────────────────────

const nodeTypes = {
    trigger: TriggerNode,
    job: JobNode,
    step: StepNode,
};

// ── ID generators ───────────────────────────────────────────────

let nodeIdCounter = 0;
function nextId(prefix: string) {
    nodeIdCounter++;
    return `${prefix}-${Date.now()}-${nodeIdCounter}`;
}

// ── Props ───────────────────────────────────────────────────────

interface WorkflowVisualizerProps {
    initialNodes?: Node[];
    initialEdges?: Edge[];
    workflowName?: string;
    onChange?: (nodes: Node[], edges: Edge[], name: string) => void;
}

// ── Component ───────────────────────────────────────────────────

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
    initialNodes = [],
    initialEdges = [],
    workflowName: initialName = 'Untitled Workflow',
    onChange,
}) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [workflowName, setWorkflowName] = useState(initialName);
    const reactFlowInstance = useReactFlow();
    const suppressSync = useRef(false);

    // Sync from parent when initialNodes/initialEdges change
    useEffect(() => {
        if (suppressSync.current) {
            suppressSync.current = false;
            return;
        }
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    useEffect(() => {
        setWorkflowName(initialName);
    }, [initialName]);

    // Notify parent of changes
    const emitChange = useCallback(
        (n: Node[], e: Edge[], name: string) => {
            if (onChange) {
                suppressSync.current = true;
                onChange(n, e, name);
            }
        },
        [onChange]
    );

    // Wrap onNodesChange to emit
    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            onNodesChange(changes);
            // We emit in a microtask so state has settled
            setTimeout(() => {
                setNodes((currentNodes) => {
                    setEdges((currentEdges) => {
                        emitChange(currentNodes, currentEdges, workflowName);
                        return currentEdges;
                    });
                    return currentNodes;
                });
            }, 0);
        },
        [onNodesChange, emitChange, workflowName, setNodes, setEdges]
    );

    const handleEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            onEdgesChange(changes);
            setTimeout(() => {
                setNodes((currentNodes) => {
                    setEdges((currentEdges) => {
                        emitChange(currentNodes, currentEdges, workflowName);
                        return currentEdges;
                    });
                    return currentNodes;
                });
            }, 0);
        },
        [onEdgesChange, emitChange, workflowName, setNodes, setEdges]
    );

    // ── Connection handling ─────────────────────────────────────
    const onConnect = useCallback(
        (connection: Connection) => {
            const sourceNode = nodes.find((n) => n.id === connection.source);
            const targetNode = nodes.find((n) => n.id === connection.target);

            // Determine edge style based on connection types
            let edgeStyle = { stroke: '#3f3f46', strokeWidth: 1.5 };
            let animated = false;
            let edgeId = `e-${connection.source}-to-${connection.target}`;
            let markerEnd: any = undefined;

            // Job→Job or Step→Job = dependency edge
            if (
                targetNode?.type === 'job' &&
                (sourceNode?.type === 'job' || sourceNode?.type === 'step')
            ) {
                edgeId = `e-dep-${connection.source}-to-${connection.target}`;
                edgeStyle = { stroke: '#6366f1', strokeWidth: 2 };
                animated = true;
                markerEnd = { type: MarkerType.ArrowClosed, color: '#6366f1' };
            }
            // Trigger→Job
            if (sourceNode?.type === 'trigger' && targetNode?.type === 'job') {
                edgeStyle = { stroke: '#3b82f6', strokeWidth: 2 };
                animated = true;
                markerEnd = { type: MarkerType.ArrowClosed, color: '#3b82f6' };
            }

            const newEdge: Edge = {
                ...connection,
                id: edgeId,
                type: 'smoothstep',
                animated,
                style: edgeStyle,
                markerEnd,
            } as Edge;

            setEdges((eds) => {
                const updated = addEdge(newEdge, eds);
                setNodes((nds) => {
                    emitChange(nds, updated, workflowName);
                    return nds;
                });
                return updated;
            });
        },
        [nodes, setEdges, setNodes, emitChange, workflowName]
    );

    // ── Node selection ──────────────────────────────────────────
    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    // ── Add nodes ───────────────────────────────────────────────
    const getCenter = () => {
        const viewport = reactFlowInstance.getViewport();
        const bounds = document.querySelector('.react-flow')?.getBoundingClientRect();
        if (!bounds) return { x: 250, y: 250 };
        const x = (bounds.width / 2 - viewport.x) / viewport.zoom;
        const y = (bounds.height / 2 - viewport.y) / viewport.zoom;
        return { x, y };
    };

    const addTrigger = useCallback(() => {
        // Only one trigger node allowed
        if (nodes.some((n) => n.type === 'trigger')) return;
        const pos = getCenter();
        const newNode: Node = {
            id: '__trigger__',
            type: 'trigger',
            position: { x: pos.x - 110, y: pos.y - 200 },
            data: { triggers: [], onDelete: undefined },
        };
        setNodes((nds) => {
            const updated = [...nds, newNode];
            setEdges((eds) => {
                emitChange(updated, eds, workflowName);
                return eds;
            });
            return updated;
        });
    }, [nodes, setNodes, setEdges, emitChange, workflowName]);

    const addJob = useCallback(() => {
        const pos = getCenter();
        const id = nextId('job');
        const jobNum = nodes.filter((n) => n.type === 'job').length + 1;
        const jobId = `job${jobNum}`;
        const newNode: Node = {
            id: `job-${jobId}`,
            type: 'job',
            position: { x: pos.x - 130, y: pos.y },
            data: {
                jobId,
                name: `Job ${jobNum}`,
                runsOn: 'ubuntu-latest',
                stepCount: 0,
                condition: undefined,
                hasMatrix: false,
                onDelete: undefined,
            },
        };
        setNodes((nds) => {
            const updated = [...nds, newNode];
            setEdges((eds) => {
                emitChange(updated, eds, workflowName);
                return eds;
            });
            return updated;
        });
    }, [nodes, setNodes, setEdges, emitChange, workflowName]);

    const addStep = useCallback(() => {
        // Find the selected job, or the first job
        const selectedNode = nodes.find((n) => n.id === selectedNodeId);
        let parentJobId: string | null = null;

        if (selectedNode?.type === 'job') {
            parentJobId = selectedNode.data.jobId;
        } else if (selectedNode?.type === 'step') {
            parentJobId = selectedNode.data.parentJobId;
        } else {
            // Just pick the first job
            const firstJob = nodes.find((n) => n.type === 'job');
            if (firstJob) parentJobId = firstJob.data.jobId;
        }

        if (!parentJobId) return; // No job to attach to

        // Find existing steps for this job to determine index
        const jobSteps = nodes
            .filter((n) => n.type === 'step' && n.data.parentJobId === parentJobId)
            .sort((a, b) => (a.data.stepIndex ?? 0) - (b.data.stepIndex ?? 0));

        const stepIndex = jobSteps.length;
        const stepId = `step-${parentJobId}-${stepIndex}`;
        const pos = getCenter();

        const newStepNode: Node = {
            id: stepId,
            type: 'step',
            position: { x: pos.x - 120, y: pos.y + 100 },
            data: {
                label: `Step ${stepIndex + 1}`,
                stepType: 'run',
                uses: undefined,
                run: 'echo "Hello"',
                condition: undefined,
                stepIndex,
                parentJobId,
                onDelete: undefined,
            },
        };

        // Create edge from previous step or from job
        const sourceId =
            jobSteps.length > 0 ? jobSteps[jobSteps.length - 1].id : `job-${parentJobId}`;

        const newEdge: Edge = {
            id: `e-${sourceId}-to-${stepId}`,
            source: sourceId,
            target: stepId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#3f3f46', strokeWidth: 1.5 },
        };

        setNodes((nds) => {
            // Update the parent job's step count
            const updated = [...nds, newStepNode].map((n) =>
                n.type === 'job' && n.data.jobId === parentJobId
                    ? { ...n, data: { ...n.data, stepCount: (n.data.stepCount || 0) + 1 } }
                    : n
            );
            setEdges((eds) => {
                const updatedEdges = [...eds, newEdge];
                emitChange(updated, updatedEdges, workflowName);
                return updatedEdges;
            });
            return updated;
        });
    }, [nodes, selectedNodeId, setNodes, setEdges, emitChange, workflowName]);

    // ── Delete selected node ────────────────────────────────────
    const deleteNode = useCallback(
        (nodeId: string) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) return;

            let nodesToRemove = [nodeId];

            // If deleting a job, also delete its steps
            if (node.type === 'job') {
                const jobId = node.data.jobId;
                const jobStepIds = nodes
                    .filter((n) => n.type === 'step' && n.data.parentJobId === jobId)
                    .map((n) => n.id);
                nodesToRemove = [...nodesToRemove, ...jobStepIds];
            }

            const removeSet = new Set(nodesToRemove);

            setNodes((nds) => {
                const updated = nds.filter((n) => !removeSet.has(n.id));
                setEdges((eds) => {
                    const updatedEdges = eds.filter(
                        (e) => !removeSet.has(e.source) && !removeSet.has(e.target)
                    );
                    emitChange(updated, updatedEdges, workflowName);
                    return updatedEdges;
                });
                return updated;
            });

            if (selectedNodeId === nodeId) {
                setSelectedNodeId(null);
            }
        },
        [nodes, selectedNodeId, setNodes, setEdges, emitChange, workflowName]
    );

    // ── Update node data (from properties panel) ────────────────
    const updateNodeData = useCallback(
        (nodeId: string, newData: any) => {
            setNodes((nds) => {
                const updated = nds.map((n) =>
                    n.id === nodeId ? { ...n, data: { ...newData } } : n
                );
                setEdges((eds) => {
                    emitChange(updated, eds, workflowName);
                    return eds;
                });
                return updated;
            });
        },
        [setNodes, setEdges, emitChange, workflowName]
    );

    // ── Auto-layout ─────────────────────────────────────────────
    const autoLayout = useCallback(() => {
        setNodes((nds) => {
            setEdges((eds) => {
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                    nds,
                    eds
                );
                emitChange(layoutedNodes, layoutedEdges, workflowName);
                setNodes(layoutedNodes);
                return layoutedEdges;
            });
            return nds;
        });
        setTimeout(() => reactFlowInstance.fitView({ padding: 0.3, maxZoom: 1.2 }), 100);
    }, [setNodes, setEdges, emitChange, workflowName, reactFlowInstance]);

    // ── Workflow name update ────────────────────────────────────
    const handleNameChange = useCallback(
        (name: string) => {
            setWorkflowName(name);
            emitChange(nodes, edges, name);
        },
        [nodes, edges, emitChange]
    );

    // ── Inject onDelete into node data ──────────────────────────
    const nodesWithCallbacks = nodes.map((n) => ({
        ...n,
        data: {
            ...n.data,
            onDelete: () => deleteNode(n.id),
        },
    }));

    // MiniMap color
    const nodeColor = useCallback((node: Node) => {
        switch (node.type) {
            case 'trigger':
                return '#3b82f6';
            case 'job':
                return '#8b5cf6';
            case 'step':
                return '#52525b';
            default:
                return '#3f3f46';
        }
    }, []);

    const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
    const hasTrigger = nodes.some((n) => n.type === 'trigger');
    const hasJobs = nodes.some((n) => n.type === 'job');

    return (
        <div className="h-full w-full flex bg-zinc-950">
            {/* Main canvas */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodesWithCallbacks}
                    edges={edges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={handleEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
                    minZoom={0.1}
                    maxZoom={2.5}
                    proOptions={{ hideAttribution: true }}
                    nodesDraggable
                    nodesConnectable
                    elementsSelectable
                    snapToGrid
                    snapGrid={[15, 15]}
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: false,
                    }}
                    deleteKeyCode="Delete"
                >
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={20}
                        size={1}
                        color="#27272a"
                    />
                    <Controls
                        showInteractive={false}
                        className="!bg-zinc-800 !border-zinc-700 !rounded-lg !shadow-xl [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-700"
                    />
                    <MiniMap
                        nodeColor={nodeColor}
                        maskColor="rgba(0, 0, 0, 0.7)"
                        className="!bg-zinc-900 !border-zinc-800 !rounded-lg"
                        pannable
                        zoomable
                    />

                    {/* ── Toolbar Panel ────────────────────────── */}
                    <Panel position="top-left" className="!m-3">
                        <div className="flex flex-col gap-2">
                            {/* Workflow name */}
                            <div className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg px-3 py-1.5 shadow-lg">
                                <Workflow className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                <input
                                    type="text"
                                    className="bg-transparent text-xs font-semibold text-zinc-300 outline-none w-40"
                                    value={workflowName}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="Workflow Name"
                                />
                            </div>

                            {/* Add buttons */}
                            <div className="flex gap-1.5 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-1.5 shadow-lg">
                                <ToolbarButton
                                    icon={<Zap className="w-3.5 h-3.5" />}
                                    label="Trigger"
                                    onClick={addTrigger}
                                    disabled={hasTrigger}
                                    color="blue"
                                />
                                <ToolbarButton
                                    icon={<Layers className="w-3.5 h-3.5" />}
                                    label="Job"
                                    onClick={addJob}
                                    color="violet"
                                />
                                <ToolbarButton
                                    icon={<Terminal className="w-3.5 h-3.5" />}
                                    label="Step"
                                    onClick={addStep}
                                    disabled={!hasJobs}
                                    color="amber"
                                />
                                <div className="w-px bg-zinc-700 mx-0.5" />
                                <ToolbarButton
                                    icon={<LayoutGrid className="w-3.5 h-3.5" />}
                                    label="Layout"
                                    onClick={autoLayout}
                                    color="zinc"
                                />
                            </div>
                        </div>
                    </Panel>

                    {/* Empty state */}
                    {nodes.length === 0 && (
                        <Panel position="top-center" className="!mt-32">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center">
                                    <Workflow className="w-7 h-7 text-zinc-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-400 mb-1">
                                        Start building your workflow
                                    </h3>
                                    <p className="text-xs text-zinc-600 max-w-[260px]">
                                        Add a Trigger to define when the workflow runs, then add Jobs
                                        and Steps to define what it does.
                                    </p>
                                </div>
                                <button
                                    onClick={addTrigger}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-xs font-medium text-blue-300 hover:bg-blue-600/30 transition-colors"
                                >
                                    <Zap className="w-3.5 h-3.5" />
                                    Add Trigger
                                </button>
                            </div>
                        </Panel>
                    )}

                    {/* Help panel - Connection Instructions */}
                    {nodes.length > 0 && nodes.length < 4 && (
                        <Panel position="bottom-right" className="!m-3">
                            <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-lg px-3 py-2.5 shadow-xl max-w-[280px]">
                                <h4 className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                                    💡 Quick Tips
                                </h4>
                                <ul className="space-y-1.5 text-[11px] text-zinc-500">
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-400 mt-0.5">•</span>
                                        <span><strong className="text-zinc-400">Connect nodes:</strong> Drag from the colored dot at the bottom of a node to the dot at the top of another node</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-violet-400 mt-0.5">•</span>
                                        <span><strong className="text-zinc-400">Edit properties:</strong> Click a node to open the properties panel</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-400 mt-0.5">•</span>
                                        <span><strong className="text-zinc-400">Delete:</strong> Select a node and press Delete key or hover and click the red × button</span>
                                    </li>
                                </ul>
                            </div>
                        </Panel>
                    )}
                </ReactFlow>
            </div>

            {/* Properties panel */}
            {selectedNode && (
                <NodePropertiesPanel
                    selectedNode={selectedNode}
                    onUpdateNode={updateNodeData}
                    onClose={() => setSelectedNodeId(null)}
                />
            )}
        </div>
    );
};

// ── Toolbar button ──────────────────────────────────────────────

function ToolbarButton({
    icon,
    label,
    onClick,
    disabled,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    color: 'blue' | 'violet' | 'amber' | 'zinc';
}) {
    const colorClasses = {
        blue: 'hover:bg-blue-500/15 hover:text-blue-300',
        violet: 'hover:bg-violet-500/15 hover:text-violet-300',
        amber: 'hover:bg-amber-500/15 hover:text-amber-300',
        zinc: 'hover:bg-zinc-700/50 hover:text-zinc-300',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-zinc-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${colorClasses[color]}`}
            title={label}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
