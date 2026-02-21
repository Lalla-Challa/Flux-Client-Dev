import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ArrowDownRight, X } from 'lucide-react';

interface SwitchCase {
    label: string;  // e.g. "push", "pull_request", "schedule"
    value: string;  // The matching value
}

interface SwitchData {
    variable: string; // e.g. "github.event_name"
    cases: SwitchCase[];
    hasDefault?: boolean;
    onDelete?: () => void;
}

// Colors for different switch cases
const CASE_COLORS = [
    { bg: 'bg-blue-500', border: 'border-blue-300', shadow: 'shadow-blue-500/50', text: 'text-blue-300', dot: 'bg-blue-500' },
    { bg: 'bg-violet-500', border: 'border-violet-300', shadow: 'shadow-violet-500/50', text: 'text-violet-300', dot: 'bg-violet-500' },
    { bg: 'bg-amber-500', border: 'border-amber-300', shadow: 'shadow-amber-500/50', text: 'text-amber-300', dot: 'bg-amber-500' },
    { bg: 'bg-emerald-500', border: 'border-emerald-300', shadow: 'shadow-emerald-500/50', text: 'text-emerald-300', dot: 'bg-emerald-500' },
    { bg: 'bg-rose-500', border: 'border-rose-300', shadow: 'shadow-rose-500/50', text: 'text-rose-300', dot: 'bg-rose-500' },
    { bg: 'bg-cyan-500', border: 'border-cyan-300', shadow: 'shadow-cyan-500/50', text: 'text-cyan-300', dot: 'bg-cyan-500' },
];

export const SwitchNode = memo(({ data, selected }: NodeProps<SwitchData>) => {
    const {
        variable = 'github.event_name',
        cases = [
            { label: 'Push', value: 'push' },
            { label: 'Pull Request', value: 'pull_request' },
            { label: 'Schedule', value: 'schedule' },
        ],
        hasDefault = true,
        onDelete,
    } = data;

    const allOutputs = [...cases, ...(hasDefault ? [{ label: 'Default', value: '__default__' }] : [])];
    const totalOutputs = allOutputs.length;
    const nodeWidth = Math.max(260, totalOutputs * 70);

    return (
        <div className="relative group">
            {/* Exec input - top center */}
            <Handle
                type="target"
                position={Position.Top}
                id="exec-in"
                className="!w-4 !h-4 !bg-yellow-500 !border-2 !border-yellow-300 hover:!w-5 hover:!h-5 hover:!bg-yellow-400 !transition-all !cursor-pointer !shadow-lg !shadow-yellow-500/50"
                style={{ top: -8 }}
            />

            {/* Data input - left side (variable data wire) */}
            <Handle
                type="target"
                position={Position.Left}
                id="data-in-variable"
                className="!w-3 !h-3 !bg-orange-500 !border !border-orange-300 !rounded-full !left-[-6px] hover:!bg-orange-400 !transition-all !cursor-crosshair !shadow-md !shadow-orange-500/40"
                style={{ top: '40%' }}
            />

            <div
                className={`bg-zinc-900/80 backdrop-blur-md border rounded-xl shadow-lg transition-all ${
                    selected
                        ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                        : 'border-white/10 hover:border-white/20'
                }`}
                style={{ minWidth: nodeWidth }}
            >
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
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2.5 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-yellow-500/25 flex items-center justify-center">
                        <ArrowDownRight className="w-3.5 h-3.5 text-yellow-400" />
                    </div>
                    <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider">
                        Switch
                    </span>
                </div>

                {/* Variable display */}
                <div className="px-4 py-2">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Variable</div>
                    <div className="text-[11px] font-mono text-yellow-200/80 bg-zinc-800/60 rounded px-2 py-1 truncate">
                        {variable || <span className="text-zinc-600 italic">Set variable...</span>}
                    </div>
                </div>

                {/* Case labels row */}
                <div className="flex justify-around px-3 pb-3 gap-1">
                    {allOutputs.map((c, i) => {
                        const color = c.value === '__default__'
                            ? { text: 'text-zinc-400', dot: 'bg-zinc-500' }
                            : CASE_COLORS[i % CASE_COLORS.length];
                        return (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                                <span className={`text-[9px] font-semibold ${color.text}`}>
                                    {c.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Output handles - evenly distributed along bottom */}
            {allOutputs.map((c, i) => {
                const color = c.value === '__default__' ? CASE_COLORS[5] : CASE_COLORS[i % CASE_COLORS.length];
                const leftPercent = ((i + 1) / (totalOutputs + 1)) * 100;
                return (
                    <Handle
                        key={`case-${i}`}
                        type="source"
                        position={Position.Bottom}
                        id={`exec-out-case-${i}`}
                        className={`!w-3.5 !h-3.5 !${color.bg} !border-2 !${color.border} hover:!w-4 hover:!h-4 !transition-all !cursor-pointer !shadow-lg !${color.shadow}`}
                        style={{ bottom: -7, left: `${leftPercent}%` }}
                    />
                );
            })}
        </div>
    );
});

SwitchNode.displayName = 'SwitchNode';
