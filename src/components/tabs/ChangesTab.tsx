import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRepoStore, FileStatus } from '../../stores/repo.store';
import { useUIStore } from '../../stores/ui.store';
import { DiffViewer } from '../diff/DiffViewer';
import { ConflictResolver } from '../conflicts/ConflictResolver';
import { useMemo } from 'react';

export function ChangesTab() {
    const fileStatuses = useRepoStore((s) => s.fileStatuses);
    const isLoadingStatus = useRepoStore((s) => s.isLoadingStatus);
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const stageFiles = useRepoStore((s) => s.stageFiles);
    const unstageFiles = useRepoStore((s) => s.unstageFiles);
    const commitMessage = useUIStore((s) => s.commitMessage);
    const setCommitMessage = useUIStore((s) => s.setCommitMessage);
    const selectedFile = useUIStore((s) => s.selectedFile);
    const setSelectedFile = useUIStore((s) => s.setSelectedFile);

    const stagedFiles = fileStatuses.filter((f) => f.staged);
    const unstagedFiles = fileStatuses.filter((f) => !f.staged);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Ensure textarea is always functional - fix for becoming unresponsive after undo
    useEffect(() => {
        if (textareaRef.current) {
            // Remove any disabled state that might have been set
            textareaRef.current.disabled = false;
            // Ensure it can receive focus
            textareaRef.current.style.pointerEvents = 'auto';
        }
    }, [fileStatuses, stagedFiles.length]); // Re-run when file status changes (e.g., after undo)

    const selectedFileStatus = useMemo(() =>
        fileStatuses.find(f => f.path === selectedFile),
        [fileStatuses, selectedFile]
    );

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
            <div className="w-[320px] border-r border-border flex flex-col shrink-0 bg-surface-0">
                {/* Commit Message */}
                <div className="px-3 pt-3 pb-4 border-b border-border">
                    <textarea
                        ref={textareaRef}
                        key={`commit-msg-${activeRepoPath}`}
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Commit message..."
                        className="input-field resize-none text-xs font-mono"
                        rows={3}
                        autoFocus={false}
                    />
                    <div className="flex items-center justify-between mt-3 mb-2 gap-2">
                        <span className="text-2xs text-text-tertiary">
                            {stagedFiles.length} staged
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="kbd text-2xs hidden sm:inline">Ctrl+Enter</span>
                            <button
                                onClick={() => {
                                    const { commitAndPush } = useRepoStore.getState();
                                    if (commitMessage.trim() && stagedFiles.length > 0) {
                                        commitAndPush(commitMessage);
                                    }
                                }}
                                disabled={!commitMessage.trim() || stagedFiles.length === 0}
                                className="px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-500 disabled:bg-surface-4 disabled:text-text-tertiary text-white rounded transition-colors disabled:cursor-not-allowed flex items-center gap-1.5"
                                title={
                                    !commitMessage.trim()
                                        ? "Enter a commit message"
                                        : stagedFiles.length === 0
                                            ? "Stage files to commit"
                                            : "Commit and push changes"
                                }
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Commit
                            </button>
                            <button
                                onClick={() => {
                                    const { pushOnly } = useRepoStore.getState();
                                    pushOnly();
                                }}
                                disabled={stagedFiles.length > 0}
                                className="px-3 py-1.5 text-xs font-medium bg-surface-3 hover:bg-surface-4 disabled:bg-surface-2 disabled:text-text-tertiary text-text-secondary hover:text-text-primary rounded transition-colors disabled:cursor-not-allowed flex items-center gap-1.5 border border-border"
                                title={
                                    stagedFiles.length > 0
                                        ? "Stage area not empty - commit first"
                                        : "Push local commits to remote"
                                }
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l4 4m0 0l4-4m-4 4V4" />
                                </svg>
                                Push
                            </button>
                        </div>
                    </div>
                </div>

                {/* Staged Files */}
                <div className="border-b border-border">
                    <div className="flex items-center justify-between px-3 py-2 bg-surface-1">
                        <div className="flex items-center gap-2">
                            {stagedFiles.length > 0 && (
                                <button
                                    onClick={handleUnstageAll}
                                    className="w-4 h-4 rounded border bg-brand-600 border-brand-600 flex items-center justify-center shrink-0 hover:bg-brand-500 transition-colors"
                                    title="Deselect all staged files"
                                >
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </button>
                            )}
                            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                Staged ({stagedFiles.length})
                            </span>
                        </div>
                        {stagedFiles.length > 0 && (
                            <button
                                onClick={handleUnstageAll}
                                className="flex items-center gap-1 px-2 py-1 text-2xs font-medium bg-surface-3 hover:bg-surface-4 border border-border rounded transition-colors text-text-secondary hover:text-text-primary"
                                title="Unstage all files"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Unstage All
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
                    <div className="flex items-center justify-between px-3 py-2 bg-surface-1">
                        <div className="flex items-center gap-2">
                            {unstagedFiles.length > 0 && (
                                <button
                                    onClick={handleStageAll}
                                    className="w-4 h-4 rounded border border-surface-5 hover:border-brand-500 flex items-center justify-center shrink-0 transition-colors"
                                    title="Select all files"
                                >
                                </button>
                            )}
                            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                Changes ({unstagedFiles.length})
                            </span>
                        </div>
                        {unstagedFiles.length > 0 && (
                            <button
                                onClick={handleStageAll}
                                className="flex items-center gap-1 px-2 py-1 text-2xs font-medium bg-brand-600/10 hover:bg-brand-600/20 border border-brand-600/30 rounded transition-colors text-brand-400 hover:text-brand-300"
                                title="Stage all files"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Stage All
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
                                onDiscard={() => {
                                    if (confirm(`Discard changes to ${file.path}? This cannot be undone.`)) {
                                        if (file.status === 'untracked') {
                                            useRepoStore.getState().cleanFile(file.path);
                                        } else {
                                            useRepoStore.getState().discardChanges(file.path);
                                        }
                                    }
                                }}
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
                {selectedFileStatus?.status === 'conflict' ? (
                    <ConflictResolver file={selectedFileStatus.path} />
                ) : (
                    <DiffViewer file={selectedFile || ''} />
                )}
            </div>
        </div>
    );
}

function FileItem({
    file,
    isSelected,
    onClick,
    onToggle,
    onDiscard,
}: {
    file: FileStatus;
    isSelected: boolean;
    onClick: () => void;
    onToggle: () => void;
    onDiscard?: () => void;
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

            {/* Discard Button (Only for unstaged) */}
            {!file.staged && onDiscard && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDiscard();
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-4 rounded text-text-tertiary hover:text-status-deleted transition-all"
                    title="Discard changes"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}

            {/* Status badge */}
            <span
                className={`text-2xs font-bold ${statusColors[file.status] || 'text-text-tertiary'}`}
            >
                {statusLabels[file.status] || '?'}
            </span>
        </motion.div>
    );
}
