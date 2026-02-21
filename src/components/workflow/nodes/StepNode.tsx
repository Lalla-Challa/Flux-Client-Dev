import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
    Terminal, Box, ShieldCheck, X, Plus,
    GitBranch, Package, Code, Database,
    Upload, Download, Container, Cloud,
} from 'lucide-react';

interface DataInput {
    name: string;
    label: string;
    color: string;
}

interface StepData {
    label: string;
    stepType: 'uses' | 'run';
    uses?: string;
    run?: string;
    condition?: string;
    stepIndex: number;
    parentJobId: string;
    dataInputs?: DataInput[];
    onDelete?: () => void;
    onAddNode?: (type: 'step') => void;
}

function getSmartIcon(stepType: 'uses' | 'run', uses?: string, run?: string): React.ReactNode {
    const value = (uses || '') + (run || '');
    const lower = value.toLowerCase();

    if (uses) {
        if (lower.includes('actions/checkout')) return <GitBranch className="w-3 h-3" />;
        if (lower.includes('actions/setup-node') || lower.includes('npm')) return <Package className="w-3 h-3" />;
        if (lower.includes('actions/setup-python')) return <Code className="w-3 h-3" />;
        if (lower.includes('actions/cache')) return <Database className="w-3 h-3" />;
        if (lower.includes('actions/upload-artifact')) return <Upload className="w-3 h-3" />;
        if (lower.includes('actions/download-artifact')) return <Download className="w-3 h-3" />;
        if (lower.includes('docker')) return <Container className="w-3 h-3" />;
        if (lower.includes('aws')) return <Cloud className="w-3 h-3" />;
        return <Box className="w-3 h-3" />;
    }

    // run step
    if (lower.includes('npm') || lower.includes('yarn') || lower.includes('pnpm')) return <Package className="w-3 h-3" />;
    if (lower.includes('docker')) return <Container className="w-3 h-3" />;
    if (lower.includes('aws')) return <Cloud className="w-3 h-3" />;
    return <Terminal className="w-3 h-3" />;
}

export const StepNode = memo(({ data, selected }: NodeProps<StepData>) => {
    const { label, stepType, uses, run, condition, stepIndex, dataInputs = [], onDelete, onAddNode } = data;
    const [showAddMenu, setShowAddMenu] = useState(false);

    const isAction = stepType === 'uses';
    const icon = getSmartIcon(stepType, uses, run);

    return (
        <div className="relative group">
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3.5 !h-3.5 !bg-zinc-500 !border-2 !border-zinc-300 hover:!w-4 hover:!h-4 hover:!bg-zinc-400 !transition-all !cursor-pointer !shadow-lg !shadow-zinc-500/50"
                style={{ top: -7 }}
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
                        style={{ top: `${22 + i * 20}px` }}
                    />
                );
            })}

            <div className={`bg-zinc-900/80 backdrop-blur-md border rounded-lg min-w-[220px] shadow-md transition-all ${
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
                        {icon}
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

            {/* Add Node Button */}
            {onAddNode && (
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
                        className="w-5 h-5 rounded-full bg-zinc-500 hover:bg-zinc-400 flex items-center justify-center shadow-lg shadow-zinc-500/30 transition-colors"
                    >
                        <Plus className="w-3 h-3 text-white" />
                    </button>
                    {showAddMenu && (
                        <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[120px] z-30">
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddNode('step'); setShowAddMenu(false); }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-amber-500/15 hover:text-amber-300 transition-colors"
                            >
                                <Terminal className="w-3 h-3" />
                                Add Step
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

StepNode.displayName = 'StepNode';
