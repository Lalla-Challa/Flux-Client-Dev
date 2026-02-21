import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Repeat, X, Layers } from 'lucide-react';

interface MatrixDimension {
    key: string;     // e.g. "os", "node-version"
    values: string[]; // e.g. ["ubuntu-latest", "windows-latest"]
}

interface MatrixData {
    dimensions: MatrixDimension[];
    failFast?: boolean;
    maxParallel?: number;
    onDelete?: () => void;
}

export const MatrixNode = memo(({ data, selected }: NodeProps<MatrixData>) => {
    const {
        dimensions = [
            { key: 'os', values: ['ubuntu-latest', 'windows-latest'] },
            { key: 'node-version', values: ['18', '20', '22'] },
        ],
        failFast = true,
        maxParallel,
        onDelete,
    } = data;

    // Calculate total combinations
    const totalCombinations = dimensions.reduce((acc, d) => acc * Math.max(d.values.length, 1), 1);

    return (
        <div className="relative group">
            {/* Exec input - top center */}
            <Handle
                type="target"
                position={Position.Top}
                id="exec-in"
                className="!w-4 !h-4 !bg-pink-500 !border-2 !border-pink-300 hover:!w-5 hover:!h-5 hover:!bg-pink-400 !transition-all !cursor-pointer !shadow-lg !shadow-pink-500/50"
                style={{ top: -8 }}
            />

            {/* Stacked cards effect - creates depth illusion for parallel runs */}
            <div className="absolute top-1 left-1 right-[-3px] bottom-[-3px] bg-zinc-800/40 rounded-xl border border-white/5 pointer-events-none" />
            <div className="absolute top-0.5 left-0.5 right-[-1.5px] bottom-[-1.5px] bg-zinc-800/60 rounded-xl border border-white/5 pointer-events-none" />

            <div className={`relative bg-zinc-900/90 backdrop-blur-md border rounded-xl min-w-[300px] shadow-lg transition-all ${
                selected
                    ? 'border-pink-500 shadow-lg shadow-pink-500/20'
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
                <div className="bg-pink-500/10 border-b border-pink-500/20 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-pink-500/25 flex items-center justify-center">
                            <Repeat className="w-3.5 h-3.5 text-pink-400" />
                        </div>
                        <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">
                            Matrix Strategy
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-pink-400/60" />
                        <span className="text-[10px] font-bold text-pink-300/80 bg-pink-500/15 px-1.5 py-0.5 rounded">
                            {totalCombinations}x parallel
                        </span>
                    </div>
                </div>

                {/* Matrix dimensions */}
                <div className="px-4 py-3 space-y-2.5">
                    {dimensions.map((dim, i) => (
                        <div key={i}>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-semibold">
                                {dim.key}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {dim.values.map((val, j) => (
                                    <span
                                        key={j}
                                        className="text-[10px] font-mono bg-pink-500/10 border border-pink-500/20 text-pink-200 rounded px-1.5 py-0.5"
                                    >
                                        {val}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Options row */}
                    <div className="flex items-center gap-3 pt-1 border-t border-zinc-800">
                        <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${failFast ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                            <span className="text-[9px] text-zinc-500">
                                fail-fast: {failFast ? 'on' : 'off'}
                            </span>
                        </div>
                        {maxParallel && (
                            <span className="text-[9px] text-zinc-500">
                                max-parallel: {maxParallel}
                            </span>
                        )}
                    </div>
                </div>

                {/* Inner container zone - dashed area */}
                <div className="mx-3 mb-3 border-2 border-dashed border-pink-500/20 rounded-lg p-3 min-h-[48px] flex items-center justify-center">
                    <span className="text-[10px] text-pink-400/40 italic">
                        Steps run inside this matrix
                    </span>
                </div>
            </div>

            {/* Exec output - bottom center */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="exec-out"
                className="!w-4 !h-4 !bg-pink-500 !border-2 !border-pink-300 hover:!w-5 hover:!h-5 hover:!bg-pink-400 !transition-all !cursor-pointer !shadow-lg !shadow-pink-500/50"
                style={{ bottom: -8 }}
            />
        </div>
    );
});

MatrixNode.displayName = 'MatrixNode';
