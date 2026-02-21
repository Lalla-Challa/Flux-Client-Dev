import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitFork, X } from 'lucide-react';

interface BranchData {
    condition: string; // e.g. "github.ref == 'refs/heads/main'"
    trueLabel?: string;
    falseLabel?: string;
    onDelete?: () => void;
}

export const BranchNode = memo(({ data, selected }: NodeProps<BranchData>) => {
    const { condition = '', trueLabel = 'True', falseLabel = 'False', onDelete } = data;

    return (
        <div className="relative group">
            {/* Exec input - top center */}
            <Handle
                type="target"
                position={Position.Top}
                id="exec-in"
                className="!w-4 !h-4 !bg-cyan-500 !border-2 !border-cyan-300 hover:!w-5 hover:!h-5 hover:!bg-cyan-400 !transition-all !cursor-pointer !shadow-lg !shadow-cyan-500/50"
                style={{ top: -8 }}
            />

            {/* Data input - left side (condition data wire) */}
            <Handle
                type="target"
                position={Position.Left}
                id="data-in-condition"
                className="!w-3 !h-3 !bg-orange-500 !border !border-orange-300 !rounded-full !left-[-6px] hover:!bg-orange-400 !transition-all !cursor-crosshair !shadow-md !shadow-orange-500/40"
                style={{ top: '50%' }}
            />

            <div className={`bg-zinc-900/80 backdrop-blur-md border rounded-xl min-w-[220px] shadow-lg transition-all ${
                selected
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
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

                {/* Header */}
                <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-4 py-2.5 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-cyan-500/25 flex items-center justify-center">
                        <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                        Branch
                    </span>
                </div>

                {/* Condition display */}
                <div className="px-4 py-2.5">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Condition</div>
                    <div className="text-[11px] font-mono text-cyan-200/80 bg-zinc-800/60 rounded px-2 py-1 truncate min-h-[24px]">
                        {condition || <span className="text-zinc-600 italic">Click to set condition</span>}
                    </div>
                </div>

                {/* Output labels */}
                <div className="flex justify-between px-4 pb-2.5">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-semibold text-emerald-400">{trueLabel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold text-red-400">{falseLabel}</span>
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                    </div>
                </div>
            </div>

            {/* True output - bottom left */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="exec-out-true"
                className="!w-4 !h-4 !bg-emerald-500 !border-2 !border-emerald-300 hover:!w-5 hover:!h-5 hover:!bg-emerald-400 !transition-all !cursor-pointer !shadow-lg !shadow-emerald-500/50"
                style={{ bottom: -8, left: '30%' }}
            />

            {/* False output - bottom right */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="exec-out-false"
                className="!w-4 !h-4 !bg-red-500 !border-2 !border-red-300 hover:!w-5 hover:!h-5 hover:!bg-red-400 !transition-all !cursor-pointer !shadow-lg !shadow-red-500/50"
                style={{ bottom: -8, left: '70%' }}
            />
        </div>
    );
});

BranchNode.displayName = 'BranchNode';
