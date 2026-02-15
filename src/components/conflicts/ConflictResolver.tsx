import React from 'react';
import { useRepoStore } from '../../stores/repo.store';

interface ConflictResolverProps {
    file: string;
}

export function ConflictResolver({ file }: ConflictResolverProps) {
    const resolveConflict = useRepoStore((s) => s.resolveConflict);

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="bg-surface-2 p-6 rounded-xl border border-border max-w-md shadow-lg">
                <div className="w-12 h-12 rounded-full bg-status-conflict/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-status-conflict" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                <h3 className="text-lg font-bold text-text-primary mb-2">Merge Conflict Detected</h3>
                <p className="text-sm text-text-secondary mb-6">
                    File <span className="font-mono bg-surface-3 px-1.5 py-0.5 rounded text-text-primary">{file}</span> has conflicts that need to be resolved.
                </p>

                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={() => resolveConflict(file, 'theirs')}
                        className="btn-primary w-full justify-center bg-blue-600 hover:bg-blue-700 border-blue-600"
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-bold">Accept Incoming (Theirs)</span>
                            <span className="text-xs opacity-80">(Remote changes)</span>
                        </div>
                    </button>

                    <button
                        onClick={() => resolveConflict(file, 'ours')}
                        className="btn-secondary w-full justify-center"
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-bold">Accept Current (Ours)</span>
                            <span className="text-xs opacity-80">(Local changes)</span>
                        </div>
                    </button>

                    <div className="text-xs text-text-tertiary mt-2">
                        Manual resolution: Open file in external editor, fix conflicts, then stage the file.
                    </div>
                </div>
            </div>
        </div>
    );
}
