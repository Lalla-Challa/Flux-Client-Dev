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

import {
    TriggerNode, JobNode, StepNode,
    ContextGetterNode, SecretGetterNode,
    BranchNode, SwitchNode, MatrixNode, SubWorkflowNode,
} from './nodes';
import { DataWireEdge } from './edges/DataWireEdge';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { getLayoutedElements } from '../../lib/workflow.layout';
import {
    Zap,
    Layers,
    Terminal,
    LayoutGrid,
    Workflow,
    Globe,
    Lock,
    GitFork,
    ArrowDownRight,
    Repeat,
    FolderClosed,
    Combine,
    ChevronDown,
} from 'lucide-react';

// ── Node types registry ─────────────────────────────────────────

const nodeTypes = {
    trigger: TriggerNode,
    job: JobNode,
    step: StepNode,
    contextGetter: ContextGetterNode,
    secretGetter: SecretGetterNode,
    branch: BranchNode,
    switch: SwitchNode,
    matrix: MatrixNode,
    subWorkflow: SubWorkflowNode,
};

// ── Edge types registry ─────────────────────────────────────────

const edgeTypes = {
    dataWire: DataWireEdge,
};

// ── Data node types (no flow handles, only data pins) ───────────

const DATA_ONLY_NODES = new Set(['contextGetter', 'secretGetter']);
const FLOW_NODES = new Set(['trigger', 'job', 'step', 'branch', 'switch', 'matrix', 'subWorkflow']);

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
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [workflowName, setWorkflowName] = useState(initialName);
    const [showAdvancedToolbar, setShowAdvancedToolbar] = useState(false);
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

    // ── Edge style helper ────────────────────────────────────────
    const getEdgeStyle = useCallback((sourceNode: Node | undefined, targetNode: Node | undefined, isSelected: boolean) => {
        if (isSelected) {
            return {
                style: { stroke: '#ffffff', strokeWidth: 2 },
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff' } as any,
            };
        }

        if (sourceNode?.type === 'trigger' && targetNode?.type === 'job') {
            return {
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } as any,
            };
        }

        if (
            targetNode?.type === 'job' &&
            (sourceNode?.type === 'job' || sourceNode?.type === 'step')
        ) {
            return {
                style: { stroke: '#6366f1', strokeWidth: 2 },
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' } as any,
            };
        }

        // Branch true/false edges
        if (sourceNode?.type === 'branch') {
            return {
                style: { stroke: '#06b6d4', strokeWidth: 2 },
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' } as any,
            };
        }

        // Switch edges
        if (sourceNode?.type === 'switch') {
            return {
                style: { stroke: '#eab308', strokeWidth: 2 },
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#eab308' } as any,
            };
        }

        // Matrix edges
        if (sourceNode?.type === 'matrix' || targetNode?.type === 'matrix') {
            return {
                style: { stroke: '#ec4899', strokeWidth: 2 },
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#ec4899' } as any,
            };
        }

        return {
            style: { stroke: '#27272a', strokeWidth: 1.5 },
            animated: false,
            markerEnd: undefined,
        };
    }, []);

    // ── Determine if a connection is a data wire ─────────────────
    const isDataConnection = useCallback((sourceHandleId: string | null | undefined, targetHandleId: string | null | undefined) => {
        return (sourceHandleId?.startsWith('data-out') || targetHandleId?.startsWith('data-in'));
    }, []);

    // ── Connection validation ────────────────────────────────────
    const isValidConnection = useCallback((connection: Connection) => {
        const { source, target, sourceHandle, targetHandle } = connection;
        if (!source || !target) return false;
        if (source === target) return false;

        // Prevent duplicate connections (same source+target+handles)
        const isDuplicate = edges.some(
            (e) => e.source === source && e.target === target
                && e.sourceHandle === sourceHandle && e.targetHandle === targetHandle
        );
        if (isDuplicate) return false;

        const sourceNode = nodes.find((n) => n.id === source);
        const targetNode = nodes.find((n) => n.id === target);
        if (!sourceNode || !targetNode) return false;

        const isData = isDataConnection(sourceHandle, targetHandle);

        if (isData) {
            // Data wires: source must have data-out handle, target must have data-in handle
            if (!sourceHandle?.startsWith('data-out')) return false;
            if (!targetHandle?.startsWith('data-in')) return false;
            return true;
        }

        // Flow connections:
        // Nothing can connect TO a trigger
        if (targetNode.type === 'trigger') return false;
        // Nothing can connect TO data-only nodes
        if (DATA_ONLY_NODES.has(targetNode.type || '')) return false;

        // Trigger can only connect to Job
        if (sourceNode.type === 'trigger' && targetNode.type !== 'job') return false;

        // Branch can connect to Job or Step
        if (sourceNode.type === 'branch') {
            return targetNode.type === 'job' || targetNode.type === 'step';
        }

        // Switch can connect to Job or Step
        if (sourceNode.type === 'switch') {
            return targetNode.type === 'job' || targetNode.type === 'step';
        }

        // Job can connect to Job (dependency), Step, Branch, Switch, Matrix
        if (sourceNode.type === 'job') {
            return ['job', 'step', 'branch', 'switch', 'matrix', 'subWorkflow'].includes(targetNode.type || '');
        }

        // Step can connect to Step, Job, Branch, Switch
        if (sourceNode.type === 'step') {
            return ['step', 'job', 'branch', 'switch', 'subWorkflow'].includes(targetNode.type || '');
        }

        // Matrix can connect to Job, Step
        if (sourceNode.type === 'matrix') {
            return ['job', 'step'].includes(targetNode.type || '');
        }

        // SubWorkflow can connect to Job, Step, Branch, Switch
        if (sourceNode.type === 'subWorkflow') {
            return ['job', 'step', 'branch', 'switch', 'subWorkflow'].includes(targetNode.type || '');
        }

        return true;
    }, [nodes, edges, isDataConnection]);

    // ── Connection handling ─────────────────────────────────────
    const onConnect = useCallback(
        (connection: Connection) => {
            const sourceNode = nodes.find((n) => n.id === connection.source);
            const targetNode = nodes.find((n) => n.id === connection.target);
            const isData = isDataConnection(connection.sourceHandle, connection.targetHandle);

            if (isData) {
                // Data wire edge
                const wireType = sourceNode?.type === 'secretGetter' ? 'secret'
                    : sourceNode?.type === 'contextGetter' ? 'context'
                    : 'output';

                const newEdge: Edge = {
                    ...connection,
                    id: `dw-${connection.source}-${connection.sourceHandle}-to-${connection.target}-${connection.targetHandle}`,
                    type: 'dataWire',
                    data: { wireType },
                } as Edge;

                setEdges((eds) => {
                    const updated = addEdge(newEdge, eds);
                    setNodes((nds) => {
                        emitChange(nds, updated, workflowName);
                        return nds;
                    });
                    return updated;
                });
                return;
            }

            // Flow edge
            const edgeId = `e-${connection.source}-${connection.sourceHandle || 'out'}-to-${connection.target}`;
            const { style, animated, markerEnd } = getEdgeStyle(sourceNode, targetNode, false);

            const newEdge: Edge = {
                ...connection,
                id: edgeId,
                type: 'smoothstep',
                animated,
                style,
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
        [nodes, setEdges, setNodes, emitChange, workflowName, getEdgeStyle, isDataConnection]
    );

    // ── Edge click / selection ───────────────────────────────────
    const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        setSelectedEdgeId((prev) => prev === edge.id ? null : edge.id);
        setSelectedNodeId(null);
    }, []);

    // Apply selected styling to edges
    const styledEdges = edges.map((edge) => {
        const isSelected = edge.id === selectedEdgeId;
        if (isSelected && edge.type !== 'dataWire') {
            const { style, animated, markerEnd } = getEdgeStyle(undefined, undefined, true);
            return { ...edge, style, animated, markerEnd };
        }
        if (isSelected && edge.type === 'dataWire') {
            return { ...edge, selected: true };
        }
        return edge;
    });

    // ── Node selection ──────────────────────────────────────────
    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
        setSelectedEdgeId(null);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
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
            setEdges((eds) => { emitChange(updated, eds, workflowName); return eds; });
            return updated;
        });
    }, [nodes, setNodes, setEdges, emitChange, workflowName]);

    const addJob = useCallback((sourceNodeId?: string) => {
        const pos = getCenter();
        const jobNum = nodes.filter((n) => n.type === 'job').length + 1;
        const jobId = `job${jobNum}`;
        const newNodeId = `job-${jobId}`;

        const sourceNode = sourceNodeId ? nodes.find((n) => n.id === sourceNodeId) : null;
        const nodePos = sourceNode
            ? { x: sourceNode.position.x, y: sourceNode.position.y + 200 }
            : { x: pos.x - 130, y: pos.y };

        const newNode: Node = {
            id: newNodeId,
            type: 'job',
            position: nodePos,
            data: {
                jobId,
                name: `Job ${jobNum}`,
                runsOn: 'ubuntu-latest',
                stepCount: 0,
                condition: undefined,
                hasMatrix: false,
                dataInputs: [],
                onDelete: undefined,
            },
        };

        const newEdges: Edge[] = [];
        if (sourceNodeId) {
            const srcNode = nodes.find((n) => n.id === sourceNodeId);
            const { style, animated, markerEnd } = getEdgeStyle(srcNode, newNode, false);
            newEdges.push({
                id: `e-${sourceNodeId}-to-${newNodeId}`,
                source: sourceNodeId,
                target: newNodeId,
                type: 'smoothstep',
                animated,
                style,
                markerEnd,
            });
        }

        setNodes((nds) => {
            const updated = [...nds, newNode];
            setEdges((eds) => {
                const updatedEdges = [...eds, ...newEdges];
                emitChange(updated, updatedEdges, workflowName);
                return updatedEdges;
            });
            return updated;
        });
    }, [nodes, setNodes, setEdges, emitChange, workflowName, getEdgeStyle]);

    const addStep = useCallback((sourceNodeId?: string) => {
        let parentJobId: string | null = null;
        const sourceNode = sourceNodeId ? nodes.find((n) => n.id === sourceNodeId) : null;

        if (sourceNode?.type === 'job') {
            parentJobId = sourceNode.data.jobId;
        } else if (sourceNode?.type === 'step') {
            parentJobId = sourceNode.data.parentJobId;
        } else {
            const selectedNode = nodes.find((n) => n.id === selectedNodeId);
            if (selectedNode?.type === 'job') parentJobId = selectedNode.data.jobId;
            else if (selectedNode?.type === 'step') parentJobId = selectedNode.data.parentJobId;
            else {
                const firstJob = nodes.find((n) => n.type === 'job');
                if (firstJob) parentJobId = firstJob.data.jobId;
            }
        }

        if (!parentJobId) return;

        const jobSteps = nodes
            .filter((n) => n.type === 'step' && n.data.parentJobId === parentJobId)
            .sort((a, b) => (a.data.stepIndex ?? 0) - (b.data.stepIndex ?? 0));

        const stepIndex = jobSteps.length;
        const stepId = `step-${parentJobId}-${stepIndex}`;

        const srcNode = sourceNodeId ? nodes.find((n) => n.id === sourceNodeId) : null;
        const pos = srcNode
            ? { x: srcNode.position.x, y: srcNode.position.y + 120 }
            : { x: getCenter().x - 120, y: getCenter().y + 100 };

        const newStepNode: Node = {
            id: stepId,
            type: 'step',
            position: pos,
            data: {
                label: `Step ${stepIndex + 1}`,
                stepType: 'run',
                uses: undefined,
                run: 'echo "Hello"',
                condition: undefined,
                stepIndex,
                parentJobId,
                dataInputs: [],
                onDelete: undefined,
            },
        };

        const edgeSourceId = sourceNodeId
            || (jobSteps.length > 0 ? jobSteps[jobSteps.length - 1].id : `job-${parentJobId}`);

        const newEdge: Edge = {
            id: `e-${edgeSourceId}-to-${stepId}`,
            source: edgeSourceId,
            target: stepId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#27272a', strokeWidth: 1.5 },
        };

        setNodes((nds) => {
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

    // ── Add advanced nodes ───────────────────────────────────────

    const addContextGetter = useCallback(() => {
        const pos = getCenter();
        const newNode: Node = {
            id: nextId('ctx'),
            type: 'contextGetter',
            position: { x: pos.x - 250, y: pos.y - 50 },
            data: {
                fields: ['actor', 'ref', 'sha'],
                onDelete: undefined,
            },
        };
        setNodes((nds) => {
            const updated = [...nds, newNode];
            setEdges((eds) => { emitChange(updated, eds, workflowName); return eds; });
            return updated;
        });
    }, [setNodes, setEdges, emitChange, workflowName]);

    const addSecretGetter = useCallback(() => {
        const pos = getCenter();
        const newNode: Node = {
            id: nextId('secret'),
            type: 'secretGetter',
            position: { x: pos.x - 250, y: pos.y + 50 },
            data: {
                secrets: ['API_KEY'],
                onDelete: undefined,
            },
        };
        setNodes((nds) => {
            const updated = [...nds, newNode];
            setEdges((eds) => { emitChange(updated, eds, workflowName); return eds; });
            return updated;
        });
    }, [setNodes, setEdges, emitChange, workflowName]);

    const addBranch = useCallback(() => {
        const pos = getCenter();
        const newNode: Node = {
            id: nextId('branch'),
            type: 'branch',
            position: { x: pos.x - 110, y: pos.y },
            data: {
                condition: '',
                trueLabel: 'True',
                falseLabel: 'False',
                onDelete: undefined,
            },
        };
        setNodes((nds) => {
            const updated = [...nds, newNode];
            setEdges((eds) => { emitChange(updated, eds, workflowName); return eds; });
            return updated;
        });
    }, [setNodes, setEdges, emitChange, workflowName]);

    const addSwitch = useCallback(() => {
        const pos = getCenter();
        const newNode: Node = {
            id: nextId('switch'),
            type: 'switch',
            position: { x: pos.x - 130, y: pos.y },
            data: {
                variable: 'github.event_name',
                cases: [
                    { label: 'Push', value: 'push' },
                    { label: 'Pull Request', value: 'pull_request' },
                ],
                hasDefault: true,
                onDelete: undefined,
            },
        };
        setNodes((nds) => {
            const updated = [...nds, newNode];
            setEdges((eds) => { emitChange(updated, eds, workflowName); return eds; });
            return updated;
        });
    }, [setNodes, setEdges, emitChange, workflowName]);

    const addMatrix = useCallback(() => {
        const pos = getCenter();
        const newNode: Node = {
            id: nextId('matrix'),
            type: 'matrix',
            position: { x: pos.x - 150, y: pos.y },
            data: {
                dimensions: [
                    { key: 'os', values: ['ubuntu-latest', 'windows-latest'] },
                    { key: 'node-version', values: ['18', '20'] },
                ],
                failFast: true,
                onDelete: undefined,
            },
        };
        setNodes((nds) => {
            const updated = [...nds, newNode];
            setEdges((eds) => { emitChange(updated, eds, workflowName); return eds; });
            return updated;
        });
    }, [setNodes, setEdges, emitChange, workflowName]);

    const addSubWorkflow = useCallback(() => {
        const pos = getCenter();
        const newNode: Node = {
            id: nextId('subwf'),
            type: 'subWorkflow',
            position: { x: pos.x - 120, y: pos.y },
            data: {
                name: 'Sub-Workflow',
                collapsed: true,
                childNodeCount: 0,
                childNodeIds: [],
                inputs: [],
                outputs: [],
                onDelete: undefined,
            },
        };
        setNodes((nds) => {
            const updated = [...nds, newNode];
            setEdges((eds) => { emitChange(updated, eds, workflowName); return eds; });
            return updated;
        });
    }, [setNodes, setEdges, emitChange, workflowName]);

    // ── Collapse selected nodes to Sub-Workflow ──────────────────
    const collapseToSubWorkflow = useCallback(() => {
        // Find all selected nodes (excluding trigger and existing subWorkflows)
        const selectedNodes = nodes.filter(
            (n) => n.selected && n.type !== 'trigger' && n.type !== 'subWorkflow'
        );
        if (selectedNodes.length < 2) return;

        const selectedIds = new Set(selectedNodes.map((n) => n.id));

        // Calculate center position of selected nodes
        const avgX = selectedNodes.reduce((s, n) => s + n.position.x, 0) / selectedNodes.length;
        const avgY = selectedNodes.reduce((s, n) => s + n.position.y, 0) / selectedNodes.length;

        // Find edges that cross the boundary (inputs/outputs of the sub-workflow)
        const incomingEdges = edges.filter((e) => !selectedIds.has(e.source) && selectedIds.has(e.target));
        const outgoingEdges = edges.filter((e) => selectedIds.has(e.source) && !selectedIds.has(e.target));
        const internalEdges = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target));

        // Build input/output pins
        const inputs = incomingEdges.map((e, i) => ({
            name: `in_${i}`,
            type: 'input' as const,
        }));
        const outputs = outgoingEdges.map((e, i) => ({
            name: `out_${i}`,
            type: 'output' as const,
        }));

        const subWfId = nextId('subwf');
        const subWfNode: Node = {
            id: subWfId,
            type: 'subWorkflow',
            position: { x: avgX, y: avgY },
            data: {
                name: 'Collapsed Group',
                collapsed: true,
                childNodeCount: selectedNodes.length,
                childNodeIds: Array.from(selectedIds),
                inputs,
                outputs,
                onDelete: undefined,
                onToggleExpand: undefined,
            },
        };

        // Rewire incoming edges to sub-workflow's input handles
        const newIncomingEdges = incomingEdges.map((e, i) => ({
            ...e,
            id: `e-${e.source}-to-${subWfId}-in-${i}`,
            target: subWfId,
            targetHandle: `data-in-in_${i}`,
        }));

        // Rewire outgoing edges from sub-workflow's output handles
        const newOutgoingEdges = outgoingEdges.map((e, i) => ({
            ...e,
            id: `e-${subWfId}-out-${i}-to-${e.target}`,
            source: subWfId,
            sourceHandle: `data-out-out_${i}`,
        }));

        // Remove collapsed nodes and their internal edges
        setNodes((nds) => {
            const remaining = nds.filter((n) => !selectedIds.has(n.id));
            const updated = [...remaining, subWfNode];
            setEdges((eds) => {
                const remainingEdges = eds.filter(
                    (e) => !selectedIds.has(e.source) && !selectedIds.has(e.target)
                );
                const updatedEdges = [...remainingEdges, ...newIncomingEdges, ...newOutgoingEdges];
                emitChange(updated, updatedEdges, workflowName);
                return updatedEdges;
            });
            return updated;
        });
    }, [nodes, edges, setNodes, setEdges, emitChange, workflowName]);

    // ── onAddNode callback for nodes ─────────────────────────────
    const handleAddNode = useCallback((sourceNodeId: string, type: 'job' | 'step') => {
        if (type === 'job') addJob(sourceNodeId);
        else addStep(sourceNodeId);
    }, [addJob, addStep]);

    // ── Delete selected node ────────────────────────────────────
    const deleteNode = useCallback(
        (nodeId: string) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) return;

            let nodesToRemove = [nodeId];

            if (node.type === 'job') {
                const jobId = node.data.jobId;
                const jobStepIds = nodes
                    .filter((n) => n.type === 'step' && n.data.parentJobId === jobId)
                    .map((n) => n.id);
                nodesToRemove = [...nodesToRemove, ...jobStepIds];
            }

            // If expanding a sub-workflow, also remove contained nodes
            if (node.type === 'subWorkflow' && node.data.childNodeIds) {
                // Don't remove children - they might be restored on expand
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

            if (selectedNodeId === nodeId) setSelectedNodeId(null);
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
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nds, eds);
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

    // ── Inject callbacks into node data ──────────────────────────
    const nodesWithCallbacks = nodes.map((n) => ({
        ...n,
        data: {
            ...n.data,
            onDelete: () => deleteNode(n.id),
            onAddNode: (type: 'job' | 'step') => handleAddNode(n.id, type),
            ...(n.type === 'subWorkflow' ? {
                onToggleExpand: () => {
                    // Toggle expand/collapse visual state
                    updateNodeData(n.id, { ...n.data, collapsed: !n.data.collapsed });
                },
            } : {}),
        },
    }));

    // MiniMap color
    const nodeColor = useCallback((node: Node) => {
        switch (node.type) {
            case 'trigger': return '#3b82f6';
            case 'job': return '#8b5cf6';
            case 'step': return '#52525b';
            case 'contextGetter': return '#f97316';
            case 'secretGetter': return '#22c55e';
            case 'branch': return '#06b6d4';
            case 'switch': return '#eab308';
            case 'matrix': return '#ec4899';
            case 'subWorkflow': return '#14b8a6';
            default: return '#3f3f46';
        }
    }, []);

    const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
    const hasTrigger = nodes.some((n) => n.type === 'trigger');
    const hasJobs = nodes.some((n) => n.type === 'job');
    const hasMultipleSelected = nodes.filter((n) => n.selected).length >= 2;

    return (
        <div className="h-full w-full flex bg-zinc-950">
            {/* Main canvas */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodesWithCallbacks}
                    edges={styledEdges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={handleEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onEdgeClick={onEdgeClick}
                    onPaneClick={onPaneClick}
                    isValidConnection={isValidConnection}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
                    minZoom={0.1}
                    maxZoom={2.5}
                    proOptions={{ hideAttribution: true }}
                    nodesDraggable
                    nodesConnectable
                    elementsSelectable
                    multiSelectionKeyCode="Shift"
                    snapToGrid
                    snapGrid={[15, 15]}
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: false,
                        style: { stroke: '#27272a', strokeWidth: 1.5 },
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

                            {/* Core node buttons */}
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
                                    onClick={() => addJob()}
                                    color="violet"
                                />
                                <ToolbarButton
                                    icon={<Terminal className="w-3.5 h-3.5" />}
                                    label="Step"
                                    onClick={() => addStep()}
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

                            {/* Advanced nodes toggle */}
                            <button
                                onClick={() => setShowAdvancedToolbar(!showAdvancedToolbar)}
                                className="flex items-center justify-between gap-2 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg px-3 py-1.5 shadow-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <span>Advanced Nodes</span>
                                <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedToolbar ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Advanced nodes panel */}
                            {showAdvancedToolbar && (
                                <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-1.5 shadow-lg space-y-1">
                                    {/* Data nodes row */}
                                    <div className="flex gap-1.5">
                                        <ToolbarButton
                                            icon={<Globe className="w-3.5 h-3.5" />}
                                            label="Context"
                                            onClick={addContextGetter}
                                            color="amber"
                                        />
                                        <ToolbarButton
                                            icon={<Lock className="w-3.5 h-3.5" />}
                                            label="Secret"
                                            onClick={addSecretGetter}
                                            color="blue"
                                        />
                                    </div>
                                    {/* Logic nodes row */}
                                    <div className="flex gap-1.5">
                                        <ToolbarButton
                                            icon={<GitFork className="w-3.5 h-3.5" />}
                                            label="Branch"
                                            onClick={addBranch}
                                            color="blue"
                                        />
                                        <ToolbarButton
                                            icon={<ArrowDownRight className="w-3.5 h-3.5" />}
                                            label="Switch"
                                            onClick={addSwitch}
                                            color="amber"
                                        />
                                    </div>
                                    {/* Container nodes row */}
                                    <div className="flex gap-1.5">
                                        <ToolbarButton
                                            icon={<Repeat className="w-3.5 h-3.5" />}
                                            label="Matrix"
                                            onClick={addMatrix}
                                            color="violet"
                                        />
                                        <ToolbarButton
                                            icon={<FolderClosed className="w-3.5 h-3.5" />}
                                            label="Sub-WF"
                                            onClick={addSubWorkflow}
                                            color="zinc"
                                        />
                                    </div>
                                    {/* Collapse action */}
                                    {hasMultipleSelected && (
                                        <>
                                            <div className="h-px bg-zinc-700 my-1" />
                                            <ToolbarButton
                                                icon={<Combine className="w-3.5 h-3.5" />}
                                                label="Collapse"
                                                onClick={collapseToSubWorkflow}
                                                color="zinc"
                                            />
                                        </>
                                    )}
                                </div>
                            )}
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

                    {/* Help panel */}
                    {nodes.length > 0 && nodes.length < 4 && (
                        <Panel position="bottom-right" className="!m-3">
                            <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-lg px-3 py-2.5 shadow-xl max-w-[280px]">
                                <h4 className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                                    Quick Tips
                                </h4>
                                <ul className="space-y-1.5 text-[11px] text-zinc-500">
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-400 mt-0.5">*</span>
                                        <span><strong className="text-zinc-400">Flow wires:</strong> Drag from bottom dot to top dot to connect execution flow</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-400 mt-0.5">*</span>
                                        <span><strong className="text-zinc-400">Data wires:</strong> Drag from colored circles on Context/Secret nodes to data inputs on the left of Job/Step nodes</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-teal-400 mt-0.5">*</span>
                                        <span><strong className="text-zinc-400">Collapse:</strong> Shift+click to multi-select nodes, then use "Collapse" to create a sub-workflow</span>
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
