import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Lock, X, Plus } from 'lucide-react';

interface SecretGetterData {
    secrets: string[]; // Secret names like "API_KEY", "DEPLOY_TOKEN"
    onDelete?: () => void;
}

export const SecretGetterNode = memo(({ data, selected }: NodeProps<SecretGetterData>) => {
    const { secrets = ['API_KEY'], onDelete } = data;

    return (
        <div className="relative group">
            <div className={`bg-zinc-900/80 backdrop-blur-md border rounded-xl min-w-[180px] shadow-lg transition-all ${
                selected
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
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
                <div className="bg-green-500/10 border-b border-green-500/20 px-3 py-2 flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-green-500/25 flex items-center justify-center">
                        <Lock className="w-3 h-3 text-green-400" />
                    </div>
                    <span className="text-[11px] font-bold text-green-300 uppercase tracking-wider">
                        Secrets
                    </span>
                </div>

                {/* Output pins - one per secret */}
                <div className="py-2 space-y-0.5 relative">
                    {secrets.map((secret, index) => (
                        <div key={index} className="flex items-center justify-end px-3 py-1">
                            <span className="text-[10px] font-mono text-green-300/70 mr-2">
                                {secret}
                            </span>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-green-300 shadow-sm shadow-green-500/50" />
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`data-out-secret-${index}`}
                                className="!w-3 !h-3 !bg-green-500 !border !border-green-300 !rounded-full !right-[-6px] hover:!bg-green-400 !transition-all !cursor-crosshair !shadow-md !shadow-green-500/40"
                                style={{ top: `${44 + index * 28}px` }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

SecretGetterNode.displayName = 'SecretGetterNode';
