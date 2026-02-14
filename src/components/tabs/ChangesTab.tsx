import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRepoStore, FileStatus } from '../../stores/repo.store';
import { useUIStore } from '../../stores/ui.store';
import { DiffViewer } from '../diff/DiffViewer';

export function ChangesTab() {
    const fileStatuses = useRepoStore((s) => s.fileStatuses);
    const isLoadingStatus = useRepoStore((s) => s.isLoadingStatus);
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const stageFiles = useRepoStore((s) => s.stageFiles);
    const unstageFiles = useRepoStore((s) => s.unstageFiles);
    const currentDiff = useRepoStore((s) => s.currentDiff);
    const loadDiff = useRepoStore((s) => s.loadDiff);
    const commitMessage = useUIStore((s) => s.commitMessage);
    const setCommitMessage = useUIStore((s) => s.setCommitMessage);
    const selectedFile = useUIStore((s) => s.selectedFile);
    const setSelectedFile = useUIStore((s) => s.setSelectedFile);

    const stagedFiles = fileStatuses.filter((f) => f.staged);
    const unstagedFiles = fileStatuses.filter((f) => !f.staged);

    // Load diff when file is selected
    useEffect(() => {
        if (selectedFile) {
            loadDiff(selectedFile);
        } else {
            loadDiff();
        }
    }, [selectedFile, loadDiff]);

    const handleStageAll = () => {
        const files = unstagedFiles.map((f) => f.path);
        if (files.length) stageFiles(files);
    };

    const handleUnstageAll = () => {
        const files = stagedFiles.map((f) => f.path);
        if (files.length) unstageFiles(files);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const { commitAndPush } = useRepoStore.getState();
            if (commitMessage.trim() && stagedFiles.length > 0) {
                commitAndPush(commitMessage);
            }
        }
    };

    if (isLoadingStatus) {
        return (
            <div className="flex items-center justify-center h-full">
                <svg className="w-6 h-6 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* File List Panel */}
            <div className="w-[280px] border-r border-border flex flex-col shrink-0 bg-surface-0">
                {/* Commit Message */}
                <div className="p-3 border-b border-border">
                    <textarea
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Commit message..."
                        className="input-field resize-none text-xs font-mono"
                        rows={3}
                    />
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-2xs text-text-tertiary">
                            {stagedFiles.length} staged
                        </span>
                        <span className="kbd text-2xs">Ctrl+Enter</span>
                    </div>
                </div>

                {/* Staged Files */}
                <div className="border-b border-border">
                    <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            Staged ({stagedFiles.length})
                        </span>
                        {stagedFiles.length > 0 && (
                            <button onClick={handleUnstageAll} className="text-2xs text-text-tertiary hover:text-text-secondary">
                                Unstage all
                            </button>
                        )}
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                        {stagedFiles.map((file) => (
                            <FileItem
                                key={file.path}
                                file={file}
                                isSelected={selectedFile === file.path}
                                onClick={() => setSelectedFile(file.path)}
                                onToggle={() => unstageFiles([file.path])}
                            />
                        ))}
                    </div>
                </div>

                {/* Unstaged Files */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            Changes ({unstagedFiles.length})
                        </span>
                        {unstagedFiles.length > 0 && (
                            <button onClick={handleStageAll} className="text-2xs text-text-tertiary hover:text-text-secondary">
                                Stage all
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {unstagedFiles.map((file) => (
                            <FileItem
                                key={file.path}
                                file={file}
                                isSelected={selectedFile === file.path}
                                onClick={() => setSelectedFile(file.path)}
                                onToggle={() => stageFiles([file.path])}
                            />
                        ))}
                    </div>
                </div>

                {fileStatuses.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary p-4">
                        <svg className="w-10 h-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-text-secondary mb-1">All Clean</span>
                        <span className="text-xs text-center">No uncommitted changes. Your working tree is clean.</span>
                    </div>
                )}
            </div>

            {/* Diff Panel */}
            <div className="flex-1 overflow-hidden">
                <DiffViewer diff={currentDiff} />
            </div>
        </div>
    );
}

function FileItem({
    file,
    isSelected,
    onClick,
    onToggle,
}: {
    file: FileStatus;
    isSelected: boolean;
    onClick: () => void;
    onToggle: () => void;
}) {
    const statusColors: Record<string, string> = {
        added: 'text-status-added',
        modified: 'text-status-modified',
        deleted: 'text-status-deleted',
        renamed: 'text-renamed',
        untracked: 'text-status-added',
        conflict: 'text-status-conflict',
    };

    const statusLabels: Record<string, string> = {
        added: 'A',
        modified: 'M',
        deleted: 'D',
        renamed: 'R',
        untracked: 'U',
        conflict: '!',
    };

    return (
        <motion.div
            whileHover={{ backgroundColor: 'rgba(39, 39, 42, 0.5)' }}
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer group ${isSelected ? 'bg-surface-3' : ''
                }`}
        >
            {/* Checkbox */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${file.staged
                    ? 'bg-brand-600 border-brand-600'
                    : 'border-surface-5 hover:border-brand-500'
                    }`}
            >
                {file.staged && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </button>

            {/* File path */}
            <span className="text-xs font-mono truncate flex-1">{file.path}</span>

            {/* Status badge */}
            <span
                className={`text-2xs font-bold ${statusColors[file.status] || 'text-text-tertiary'}`}
            >
                {statusLabels[file.status] || '?'}
            </span>
        </motion.div>
    );
}
