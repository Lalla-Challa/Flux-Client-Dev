import React from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../stores/ui.store';

export function ConflictPanel() {
    const conflictFiles = useUIStore((s) => s.conflictFiles);
    const hideConflicts = useUIStore((s) => s.hideConflicts);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={hideConflicts}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-surface-2 border border-border rounded-2xl shadow-2xl w-[480px] max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-border">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-text-primary">Merge Conflicts Detected</h3>
                        <p className="text-xs text-text-secondary">
                            {conflictFiles.length} file{conflictFiles.length !== 1 ? 's' : ''} need manual resolution
                        </p>
                    </div>
                </div>

                {/* File List */}
                <div className="p-4 max-h-[300px] overflow-y-auto">
                    <div className="space-y-2">
                        {conflictFiles.map((file) => (
                            <div
                                key={file}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-3 border border-border"
                            >
                                <div className="w-2 h-2 rounded-full bg-status-conflict shrink-0" />
                                <span className="text-sm font-mono text-text-primary truncate flex-1">
                                    {file}
                                </span>
                                <button
                                    onClick={() => {
                                        try {
                                            (window as any).electronAPI?.shell?.openPath(file);
                                        } catch { }
                                    }}
                                    className="btn-ghost text-xs"
                                >
                                    Open
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-border bg-surface-1/50">
                    <p className="text-xs text-text-tertiary">
                        Resolve conflicts, then stage and commit
                    </p>
                    <div className="flex gap-2">
                        <button onClick={hideConflicts} className="btn-secondary text-xs">
                            Dismiss
                        </button>
                        <button
                            onClick={() => {
                                try {
                                    (window as any).electronAPI?.shell?.openPath('.');
                                } catch { }
                                hideConflicts();
                            }}
                            className="btn-primary text-xs"
                        >
                            Open in Editor
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
