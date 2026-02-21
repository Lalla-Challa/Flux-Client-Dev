import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FolderClosed, FolderOpen, X, ChevronRight } from 'lucide-react';

interface SubWorkflowPin {
    name: string;
    type: 'input' | 'output';
}

interface SubWorkflowData {
    name: string;
    description?: string;
    collapsed: boolean;
    childNodeCount: number;
    childNodeIds?: string[]; // IDs of contained nodes (stored when collapsed)
    inputs: SubWorkflowPin[];
    outputs: SubWorkflowPin[];
    onDelete?: () => void;
    onToggleExpand?: () => void;
}

export const SubWorkflowNode = memo(({ data, selected }: NodeProps<SubWorkflowData>) => {
    const {
        name = 'Sub-Workflow',
        description,
        collapsed = true,
        childNodeCount = 0,
        inputs = [],
        outputs = [],
        onDelete,
        onToggleExpand,
    } = data;

    const pinSpacing = 28;
    const maxPins = Math.max(inputs.length, outputs.length, 1);
    const bodyHeight = Math.max(80, maxPins * pinSpacing + 20);

    return (
        <div className="relative group">
            {/* Exec input - top */}
            <Handle
                type="target"
                position={Position.Top}
                id="exec-in"
                className="!w-4 !h-4 !bg-teal-500 !border-2 !border-teal-300 hover:!w-5 hover:!h-5 hover:!bg-teal-400 !transition-all !cursor-pointer !shadow-lg !shadow-teal-500/50"
                style={{ top: -8 }}
            />

            {/* Input data pins - left side */}
            {inputs.map((pin, i) => (
                <Handle
                    key={`in-${i}`}
                    type="target"
                    position={Position.Left}
                    id={`data-in-${pin.name}`}
                    className="!w-3 !h-3 !bg-cyan-500 !border !border-cyan-300 !rounded-full !left-[-6px] hover:!bg-cyan-400 !transition-all !cursor-crosshair !shadow-md !shadow-cyan-500/40"
                    style={{ top: `${56 + i * pinSpacing}px` }}
                />
            ))}

            <div className={`bg-zinc-900/80 backdrop-blur-md border-2 border-dashed rounded-xl min-w-[240px] shadow-lg transition-all ${
                selected
                    ? 'border-teal-500 shadow-lg shadow-teal-500/20'
                    : 'border-teal-500/30 hover:border-teal-500/50'
            }`}>
                {/* Delete button */}
                {onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-400 z-10"
                    >
                        <X className="w-3 h-3 text-white" />
                    </button>
                )}

                {/* Header with expand/collapse toggle */}
                <div className="bg-teal-500/10 border-b border-teal-500/20 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-teal-500/25 flex items-center justify-center">
                            {collapsed ? (
                                <FolderClosed className="w-3.5 h-3.5 text-teal-400" />
                            ) : (
                                <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
                            )}
                        </div>
                        <span className="text-xs font-bold text-teal-300 truncate max-w-[140px]">
                            {name}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold bg-teal-500/15 text-teal-300/80 px-1.5 py-0.5 rounded">
                            {childNodeCount} nodes
                        </span>
                        {onToggleExpand && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                                className="p-0.5 rounded hover:bg-teal-500/15 text-teal-400 transition-colors"
                                title={collapsed ? 'Expand sub-workflow' : 'Collapse sub-workflow'}
                            >
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body with pin labels */}
                <div className="relative" style={{ minHeight: bodyHeight }}>
                    {/* Description */}
                    {description && (
                        <div className="px-4 pt-2 text-[10px] text-zinc-500 italic">
                            {description}
                        </div>
                    )}

                    {/* Input labels - left side */}
                    <div className="absolute left-3 top-2 space-y-1">
                        {inputs.map((pin, i) => (
                            <div
                                key={`in-label-${i}`}
                                className="flex items-center gap-1.5 h-[24px]"
                                style={{ marginTop: i === 0 ? 0 : `${pinSpacing - 24}px` }}
                            >
                                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                <span className="text-[10px] font-mono text-cyan-300/70">{pin.name}</span>
                            </div>
                        ))}
                    </div>

                    {/* Output labels - right side */}
                    <div className="absolute right-3 top-2 space-y-1">
                        {outputs.map((pin, i) => (
                            <div
                                key={`out-label-${i}`}
                                className="flex items-center gap-1.5 h-[24px] justify-end"
                                style={{ marginTop: i === 0 ? 0 : `${pinSpacing - 24}px` }}
                            >
                                <span className="text-[10px] font-mono text-teal-300/70">{pin.name}</span>
                                <div className="w-2 h-2 rounded-full bg-teal-500" />
                            </div>
                        ))}
                    </div>

                    {/* Collapsed indicator */}
                    {collapsed && inputs.length === 0 && outputs.length === 0 && (
                        <div className="flex items-center justify-center h-full min-h-[60px]">
                            <span className="text-[10px] text-teal-400/40 italic">
                                Collapsed composite action
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Output data pins - right side */}
            {outputs.map((pin, i) => (
                <Handle
                    key={`out-${i}`}
                    type="source"
                    position={Position.Right}
                    id={`data-out-${pin.name}`}
                    className="!w-3 !h-3 !bg-teal-500 !border !border-teal-300 !rounded-full !right-[-6px] hover:!bg-teal-400 !transition-all !cursor-crosshair !shadow-md !shadow-teal-500/40"
                    style={{ top: `${56 + i * pinSpacing}px` }}
                />
            ))}

            {/* Exec output - bottom */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="exec-out"
                className="!w-4 !h-4 !bg-teal-500 !border-2 !border-teal-300 hover:!w-5 hover:!h-5 hover:!bg-teal-400 !transition-all !cursor-pointer !shadow-lg !shadow-teal-500/50"
                style={{ bottom: -8 }}
            />
        </div>
    );
});

SubWorkflowNode.displayName = 'SubWorkflowNode';
