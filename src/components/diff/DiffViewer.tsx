import React, { useEffect, useMemo } from 'react';
import { useRepoStore } from '../../stores/repo.store';
import { DiffEditor } from '../common/DiffEditor';

interface DiffViewerProps {
    file: string;
}

export function DiffViewer({ file }: DiffViewerProps) {
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const diffCtx = useRepoStore((s) => s.diffCtx);
    const loadDiffContext = useRepoStore((s) => s.loadDiffContext);
    const isLoadingDiff = useRepoStore((s) => s.isLoadingDiff);

    useEffect(() => {
        if (file) {
            loadDiffContext(file);
        }
    }, [file, loadDiffContext]);

    if (isLoadingDiff) {
        return (
            <div className="flex items-center justify-center h-full">
                <span className="loading-spinner w-6 h-6" />
            </div>
        );
    }

    if (!diffCtx || diffCtx.file !== file) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                <span className="text-sm">Select a file to view diff</span>
            </div>
        );
    }

    return (
        <div className="h-full bg-surface-0">
            <DiffEditor
                original={diffCtx.original}
                modified={diffCtx.modified}
                language={diffCtx.language}
                readOnly={true}
            />
        </div>
    );
}
