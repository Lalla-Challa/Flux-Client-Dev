import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Server, Layers, ShieldCheck, X } from 'lucide-react';

interface JobData {
    jobId: string;
    name: string;
    runsOn: string;
    stepCount: number;
    condition?: string;
    hasMatrix?: boolean;
    onDelete?: () => void;
}

export const JobNode = memo(({ data, selected }: NodeProps<JobData>) => {
    const { name, runsOn, stepCount, condition, hasMatrix, onDelete } = data;

    return (
        <div className="relative group">
            <Handle
                type="target"
                position={Position.Top}
                className="!w-4 !h-4 !bg-violet-500 !border-2 !border-violet-300 hover:!w-5 hover:!h-5 hover:!bg-violet-400 !transition-all !cursor-pointer !shadow-lg !shadow-violet-500/50"
                style={{ top: -8 }}
            />

            <div className={`bg-gradient-to-br from-violet-600/15 to-purple-600/15 border rounded-xl min-w-[260px] shadow-lg shadow-violet-500/5 overflow-hidden transition-all ${
                selected ? 'border-violet-400 ring-2 ring-violet-400/20' : 'border-violet-500/30'
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
        </div>
    );
});

JobNode.displayName = 'JobNode';
