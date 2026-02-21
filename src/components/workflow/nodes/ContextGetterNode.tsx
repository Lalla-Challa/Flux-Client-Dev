import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Globe, X } from 'lucide-react';

// All available GitHub context fields
export const GITHUB_CONTEXT_FIELDS = [
    { id: 'actor', label: 'Actor', expr: 'github.actor' },
    { id: 'ref', label: 'Branch/Ref', expr: 'github.ref' },
    { id: 'sha', label: 'Commit SHA', expr: 'github.sha' },
    { id: 'event_name', label: 'Event Name', expr: 'github.event_name' },
    { id: 'repository', label: 'Repository', expr: 'github.repository' },
    { id: 'run_id', label: 'Run ID', expr: 'github.run_id' },
    { id: 'run_number', label: 'Run Number', expr: 'github.run_number' },
    { id: 'workspace', label: 'Workspace', expr: 'github.workspace' },
] as const;

interface ContextGetterData {
    fields: string[]; // Selected field IDs
    onDelete?: () => void;
}

export const ContextGetterNode = memo(({ data, selected }: NodeProps<ContextGetterData>) => {
    const { fields = ['actor', 'ref', 'sha'], onDelete } = data;

    const activeFields = GITHUB_CONTEXT_FIELDS.filter((f) => fields.includes(f.id));

    return (
        <div className="relative group">
            <div className={`bg-zinc-900/80 backdrop-blur-md border rounded-xl min-w-[200px] shadow-lg transition-all ${
                selected
                    ? 'border-orange-500 shadow-lg shadow-orange-500/20'
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
                <div className="bg-orange-500/10 border-b border-orange-500/20 px-3 py-2 flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-orange-500/25 flex items-center justify-center">
                        <Globe className="w-3 h-3 text-orange-400" />
                    </div>
                    <span className="text-[11px] font-bold text-orange-300 uppercase tracking-wider">
                        GitHub Context
                    </span>
                </div>

                {/* Output pins */}
                <div className="py-2 space-y-0.5 relative">
                    {activeFields.map((field, index) => (
                        <div key={field.id} className="flex items-center justify-end px-3 py-1 group/pin">
                            <span className="text-[10px] font-mono text-orange-300/70 mr-2">
                                {field.label}
                            </span>
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-orange-300 shadow-sm shadow-orange-500/50" />
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`data-out-${field.id}`}
                                className="!w-3 !h-3 !bg-orange-500 !border !border-orange-300 !rounded-full !right-[-6px] hover:!bg-orange-400 !transition-all !cursor-crosshair !shadow-md !shadow-orange-500/40"
                                style={{ top: `${44 + index * 28}px` }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

ContextGetterNode.displayName = 'ContextGetterNode';
