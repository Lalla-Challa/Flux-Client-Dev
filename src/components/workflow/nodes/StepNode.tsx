import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Terminal, Box, ShieldCheck, X } from 'lucide-react';

interface StepData {
    label: string;
    stepType: 'uses' | 'run';
    uses?: string;
    run?: string;
    condition?: string;
    stepIndex: number;
    parentJobId: string;
    onDelete?: () => void;
}

export const StepNode = memo(({ data, selected }: NodeProps<StepData>) => {
    const { label, stepType, uses, condition, stepIndex, onDelete } = data;

    const isAction = stepType === 'uses';

    return (
        <div className="relative group">
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3.5 !h-3.5 !bg-zinc-500 !border-2 !border-zinc-300 hover:!w-4 hover:!h-4 hover:!bg-zinc-400 !transition-all !cursor-pointer !shadow-lg !shadow-zinc-500/50"
                style={{ top: -7 }}
            />

            <div className={`bg-zinc-800/80 border rounded-lg min-w-[220px] shadow-md transition-all ${
                selected ? 'border-zinc-500 ring-2 ring-zinc-500/20' : 'border-zinc-700/60 hover:border-zinc-600/80'
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

                <div className="px-3 py-2 flex items-center gap-2.5">
                    {/* Step number */}
                    <span className="text-[9px] font-bold text-zinc-600 bg-zinc-700/50 rounded w-4 h-4 flex items-center justify-center shrink-0">
                        {stepIndex + 1}
                    </span>

                    {/* Icon */}
                    <div
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                            isAction
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                        }`}
                    >
                        {isAction ? (
                            <Box className="w-3 h-3" />
                        ) : (
                            <Terminal className="w-3 h-3" />
                        )}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-zinc-300 truncate">
                            {label}
                        </div>
                        {uses && (
                            <div className="text-[9px] font-mono text-zinc-500 truncate">
                                {uses}
                            </div>
                        )}
                    </div>
                </div>

                {/* Condition badge */}
                {condition && (
                    <div className="px-3 pb-2 -mt-0.5">
                        <div className="flex items-center gap-1 text-[9px] text-amber-400/60">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span className="font-mono truncate">if: {condition}</span>
                        </div>
                    </div>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3.5 !h-3.5 !bg-zinc-500 !border-2 !border-zinc-300 hover:!w-4 hover:!h-4 hover:!bg-zinc-400 !transition-all !cursor-pointer !shadow-lg !shadow-zinc-500/50"
                style={{ bottom: -7 }}
            />
        </div>
    );
});

StepNode.displayName = 'StepNode';
