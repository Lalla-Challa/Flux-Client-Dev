import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap, GitBranch, Clock, Tag, Globe, X } from 'lucide-react';

interface TriggerData {
    triggers: {
        event: string;
        branches?: string[];
        types?: string[];
        cron?: string;
    }[];
    onDelete?: () => void;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
    push: <GitBranch className="w-3.5 h-3.5" />,
    pull_request: <GitBranch className="w-3.5 h-3.5" />,
    pull_request_target: <GitBranch className="w-3.5 h-3.5" />,
    schedule: <Clock className="w-3.5 h-3.5" />,
    workflow_dispatch: <Zap className="w-3.5 h-3.5" />,
    release: <Tag className="w-3.5 h-3.5" />,
    workflow_call: <Zap className="w-3.5 h-3.5" />,
};

export const TriggerNode = memo(({ data, selected }: NodeProps<TriggerData>) => {
    const { triggers, onDelete } = data;

    return (
        <div className="relative group">
            <div className={`bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border rounded-xl px-4 py-3 min-w-[200px] shadow-lg shadow-blue-500/5 transition-all ${
                selected ? 'border-blue-400 ring-2 ring-blue-400/20' : 'border-blue-500/40'
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
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-blue-500/30 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                        Triggers
                    </span>
                </div>

                {/* Trigger list */}
                {triggers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {triggers.map((t, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-0.5"
                            >
                                <span className="text-blue-400">
                                    {EVENT_ICONS[t.event] || <Globe className="w-3.5 h-3.5" />}
                                </span>
                                <span className="text-[11px] font-mono text-blue-200">
                                    {t.event}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-[11px] text-blue-400/50 italic">
                        Click to configure events
                    </div>
                )}

                {/* Branch details */}
                {triggers.some((t) => t.branches && t.branches.length > 0) && (
                    <div className="mt-2 pt-2 border-t border-blue-500/20">
                        {triggers
                            .filter((t) => t.branches && t.branches.length > 0)
                            .map((t, i) => (
                                <div key={i} className="flex items-center gap-1 text-[10px] text-blue-300/70">
                                    <GitBranch className="w-3 h-3" />
                                    <span className="font-mono">
                                        {t.branches!.join(', ')}
                                    </span>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-4 !h-4 !bg-blue-500 !border-2 !border-blue-300 hover:!w-5 hover:!h-5 hover:!bg-blue-400 !transition-all !cursor-pointer !shadow-lg !shadow-blue-500/50"
                style={{ bottom: -8 }}
            />
        </div>
    );
});

TriggerNode.displayName = 'TriggerNode';
