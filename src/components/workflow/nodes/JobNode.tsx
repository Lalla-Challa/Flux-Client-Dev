import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Server, Layers, ShieldCheck, X, Plus, Terminal } from 'lucide-react';

interface DataInput {
    name: string;   // e.g. "secret", "context-ref"
    label: string;  // e.g. "API_KEY", "Branch"
    color: string;  // e.g. "green", "orange"
}

interface JobData {
    jobId: string;
    name: string;
    runsOn: string;
    stepCount: number;
    condition?: string;
    hasMatrix?: boolean;
    dataInputs?: DataInput[];
    onDelete?: () => void;
    onAddNode?: (type: 'step' | 'job') => void;
}

export const JobNode = memo(({ data, selected }: NodeProps<JobData>) => {
    const { name, runsOn, stepCount, condition, hasMatrix, dataInputs = [], onDelete, onAddNode } = data;
    const [showAddMenu, setShowAddMenu] = useState(false);

    return (
        <div className="relative group">
            <Handle
                type="target"
                position={Position.Top}
                className="!w-4 !h-4 !bg-violet-500 !border-2 !border-violet-300 hover:!w-5 hover:!h-5 hover:!bg-violet-400 !transition-all !cursor-pointer !shadow-lg !shadow-violet-500/50"
                style={{ top: -8 }}
            />

            {/* Data input pins - left side */}
            {dataInputs.map((pin, i) => {
                const colorMap: Record<string, string> = {
                    green: '!bg-green-500 !border-green-300 !shadow-green-500/40',
                    orange: '!bg-orange-500 !border-orange-300 !shadow-orange-500/40',
                    cyan: '!bg-cyan-500 !border-cyan-300 !shadow-cyan-500/40',
                };
                return (
                    <Handle
                        key={`data-in-${i}`}
                        type="target"
                        position={Position.Left}
                        id={`data-in-${pin.name}`}
                        className={`!w-3 !h-3 !border !rounded-full !left-[-6px] hover:!brightness-110 !transition-all !cursor-crosshair !shadow-md ${colorMap[pin.color] || colorMap.orange}`}
                        style={{ top: `${50 + i * 24}px` }}
                    />
                );
            })}

            <div className={`bg-zinc-900/80 backdrop-blur-md border rounded-xl min-w-[260px] shadow-lg overflow-hidden transition-all ${
                selected
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'border-white/10 hover:border-white/20'
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

                {/* Header bar */}
                <div className="bg-violet-500/10 border-b border-violet-500/20 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-violet-500/25 flex items-center justify-center">
                            <Layers className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <span className="text-sm font-semibold text-violet-200 truncate max-w-[180px]">
                            {name}
                        </span>
                    </div>
                    {hasMatrix && (
                        <span className="text-[9px] font-bold bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            matrix
                        </span>
                    )}
                </div>

                {/* Body */}
                <div className="px-4 py-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <Server className="w-3 h-3 text-zinc-500" />
                        <span className="font-mono">{runsOn}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <span>{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
                    </div>
                    {condition && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70 mt-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span className="font-mono truncate max-w-[200px]">
                                if: {condition}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-4 !h-4 !bg-violet-500 !border-2 !border-violet-300 hover:!w-5 hover:!h-5 hover:!bg-violet-400 !transition-all !cursor-pointer !shadow-lg !shadow-violet-500/50"
                style={{ bottom: -8 }}
            />

            {/* Add Node Button */}
            {onAddNode && (
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
                        className="w-5 h-5 rounded-full bg-violet-500 hover:bg-violet-400 flex items-center justify-center shadow-lg shadow-violet-500/30 transition-colors"
                    >
                        <Plus className="w-3 h-3 text-white" />
                    </button>
                    {showAddMenu && (
                        <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[150px] z-30">
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddNode('step'); setShowAddMenu(false); }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-amber-500/15 hover:text-amber-300 transition-colors"
                            >
                                <Terminal className="w-3 h-3" />
                                Add Step
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddNode('job'); setShowAddMenu(false); }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-violet-500/15 hover:text-violet-300 transition-colors"
                            >
                                <Layers className="w-3 h-3" />
                                Add Job (dependency)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

JobNode.displayName = 'JobNode';
