import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../stores/ui.store';
import { useRepoStore, FileStatus } from '../../stores/repo.store';
import { DiffViewer } from '../diff/DiffViewer';

const api = () => (window as any).electronAPI;

export function CommitDetailsModal() {
    const { modalState, closeModal, showNotification } = useUIStore();
    const { activeRepoPath, checkoutCommit } = useRepoStore();

    const isOpen = modalState.type === 'commit-details';
    const commitHash = modalState.data as string;

    const [files, setFiles] = useState<FileStatus[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [diff, setDiff] = useState('');
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isLoadingDiff, setIsLoadingDiff] = useState(false);

    // Fetch commit details (changed files)
    useEffect(() => {
        if (isOpen && commitHash && activeRepoPath) {
            setIsLoadingDetails(true);
            setFiles([]);
            setSelectedFile(null);
            setDiff('');

            api().git.getCommitDetails(activeRepoPath, commitHash)
                .then((fetchedFiles: FileStatus[]) => {
                    setFiles(fetchedFiles);
                    if (fetchedFiles.length > 0) {
                        setSelectedFile(fetchedFiles[0].path);
                    }
                })
                .catch((err: any) => {
                    console.error(err);
                    showNotification('error', 'Failed to load commit details');
                })
                .finally(() => setIsLoadingDetails(false));
        }
    }, [isOpen, commitHash, activeRepoPath]);

    // Fetch diff for selected file
    useEffect(() => {
        if (isOpen && activeRepoPath && commitHash && selectedFile) {
            setIsLoadingDiff(true);
            // Default: Compare with parent (hash~1)
            // Handle edge case for initial commit where hash~1 doesn't exist?
            // try hash~1, if fail, try hash (which might be wrong for diff, but git show handles it)
            // Actually getFileDiff uses `git diff`, which needs 2 commits.
            // For initial commit, we can use 4b825dc642cb6eb9a060e54bf8d69288fbee4904 (empty tree)
            // OR just use `git show hash:file` vs /dev/null?
            // GitService.getFileDiff uses `git diff hash1 hash2 -- file`.

            api().git.getFileDiff(activeRepoPath, selectedFile, `${commitHash}~1`, commitHash)
                .then((d: string) => setDiff(d))
                .catch(() => {
                    // Fallback for initial commit or other errors: try just 'git show' style diff?
                    // We can try getFileDiff with just hash1=commitHash (diff against working? No)
                    // If hash~1 fails, it's likely initial commit.
                    // We can try diffing against empty tree hash
                    return api().git.getFileDiff(activeRepoPath, selectedFile, '4b825dc642cb6eb9a060e54bf8d69288fbee4904', commitHash);
                })
                .then((d: string) => setDiff(d))
                .catch((err: any) => {
                    console.error(err);
                    setDiff(''); // No diff available
                })
                .finally(() => setIsLoadingDiff(false));
        }
    }, [isOpen, activeRepoPath, commitHash, selectedFile]);

    const handleCheckout = async () => {
        if (confirm(`Check out commit ${commitHash.substring(0, 7)}? \n\nYou will be in 'detached HEAD' state.`)) {
            await checkoutCommit(commitHash);
            closeModal();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                onClick={closeModal}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-surface-1 rounded-xl border border-border w-[90vw] h-[85vh] flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2 rounded-t-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    Commit Details
                                    <span className="text-xs font-mono bg-surface-3 px-1.5 py-0.5 rounded text-text-secondary">
                                        {commitHash.substring(0, 7)}
                                    </span>
                                </h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCheckout}
                                className="btn-secondary text-xs px-3 py-1.5"
                            >
                                Checkout
                            </button>
                            <button onClick={closeModal} className="btn-ghost p-1.5">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex min-h-0">
                        {/* File List (Left) */}
                        <div className="w-[250px] border-r border-border flex flex-col bg-surface-0 shrink-0">
                            <div className="px-3 py-2 border-b border-border text-xs font-semibold text-text-secondary uppercase">
                                Changed Files ({files.length})
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {isLoadingDetails ? (
                                    <div className="flex justify-center py-4">
                                        <svg className="w-5 h-5 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    </div>
                                ) : (
                                    files.map((file) => (
                                        <button
                                            key={file.path}
                                            onClick={() => setSelectedFile(file.path)}
                                            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs mb-0.5 transition-colors ${selectedFile === file.path
                                                    ? 'bg-accent/10 text-accent'
                                                    : 'hover:bg-surface-2 text-text-secondary'
                                                }`}
                                        >
                                            <span className={`w-3.5 h-3.5 flex items-center justify-center rounded text-[10px] font-bold shrink-0 ${file.status === 'added' ? 'bg-status-added/20 text-status-added' :
                                                    file.status === 'deleted' ? 'bg-status-deleted/20 text-status-deleted' :
                                                        file.status === 'modified' ? 'bg-status-modified/20 text-status-modified' :
                                                            'bg-text-tertiary/20 text-text-tertiary'
                                                }`}>
                                                {file.status === 'added' ? 'A' :
                                                    file.status === 'deleted' ? 'D' :
                                                        file.status === 'modified' ? 'M' : 'R'}
                                            </span>
                                            <span className="truncate">{file.path}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Diff Viewer (Right) */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">
                            {/* File Header */}
                            {selectedFile && (
                                <div className="px-4 py-2 border-b border-border bg-surface-1 flex items-center justify-between">
                                    <span className="text-sm font-medium text-text-primary start-with-slash">
                                        {selectedFile}
                                    </span>
                                </div>
                            )}

                            <div className="flex-1 overflow-hidden relative">
                                {isLoadingDiff && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-surface-1/50 z-10">
                                        <svg className="w-8 h-8 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    </div>
                                )}
                                {diff ? (
                                    <DiffViewer diff={diff} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                                        {selectedFile ? 'No diff available' : 'Select a file to view changes'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
