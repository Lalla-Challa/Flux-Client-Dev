import React, { useEffect, useState, useMemo } from 'react';
import { useRepoStore } from '../../stores/repo.store';
import { FileViewer } from '../common/FileViewer';

interface FileNode {
    name: string;
    path: string;
    children?: FileNode[];
    isOpen?: boolean;
}

export function FilesTab() {
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const [fileList, setFileList] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Load file list
    useEffect(() => {
        if (!activeRepoPath) return;
        const load = async () => {
            setIsLoading(true);
            try {
                const files = await (window as any).electronAPI.git.listFiles(activeRepoPath);
                setFileList(files);
            } catch (err) {
                console.error('Failed to list files:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [activeRepoPath]);

    // Construct tree from flat list
    const fileTree = useMemo(() => {
        const root: FileNode = { name: '', path: '', children: [], isOpen: true };
        const filteredFiles = fileList.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));

        filteredFiles.forEach(path => {
            const parts = path.split('/'); // git ls-files uses /
            let current = root;

            parts.forEach((part, index) => {
                if (!current.children) current.children = [];

                let child = current.children.find(c => c.name === part);
                const isFile = index === parts.length - 1;

                if (!child) {
                    child = {
                        name: part,
                        path: parts.slice(0, index + 1).join('/'),
                        children: isFile ? undefined : [], // Files don't have children
                        isOpen: false
                    };
                    current.children.push(child);
                }

                // If filtering, expand all parents to show matches
                if (searchTerm) {
                    current.isOpen = true;
                    // child.isOpen = true; // Optional: expand matches too
                }

                current = child;
            });
        });

        // Sort: Directories first, then files
        const sortNodes = (nodes: FileNode[]) => {
            nodes.sort((a, b) => {
                const aIsDir = !!a.children;
                const bIsDir = !!b.children;
                if (aIsDir === bIsDir) return a.name.localeCompare(b.name);
                return aIsDir ? -1 : 1;
            });
            nodes.forEach(n => {
                if (n.children) sortNodes(n.children);
            });
        };

        if (root.children) sortNodes(root.children);

        return root.children || [];
    }, [fileList, searchTerm]);

    const FileTreeItem = ({ node, level }: { node: FileNode, level: number }) => {
        const [isOpen, setIsOpen] = useState(node.isOpen);
        const isDir = !!node.children;
        const isSelected = selectedFile === node.path;

        useEffect(() => {
            // Keep sync with node state if search changes properties
            // But for now, local state overrides unless we lift state up which is complex for tree.
            // Let's just default to passed `node.isOpen` on mount.
        }, [node.isOpen]);

        const handleClick = () => {
            if (isDir) {
                setIsOpen(!isOpen);
            } else {
                setSelectedFile(node.path);
            }
        };

        return (
            <div>
                <div
                    className={`
                        flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none text-sm
                        hover:bg-surface-2 transition-colors
                        ${isSelected ? 'bg-brand-500/10 text-brand-500' : 'text-text-secondary'}
                    `}
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                    onClick={handleClick}
                >
                    {isDir ? (
                        <span className="opacity-70">
                            {isOpen ? (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            )}
                        </span>
                    ) : (
                        <span className="opacity-70 w-3.5" /> // Indent
                    )}

                    {isDir ? (
                        <svg className="w-4 h-4 text-amber-400 opacity-80" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-blue-400 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    )}

                    <span className="truncate">{node.name}</span>
                </div>

                {isDir && isOpen && node.children && (
                    <div>
                        {node.children.map(child => (
                            <FileTreeItem key={child.path} node={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-full bg-surface-0">
            {/* Sidebar */}
            <div className="w-64 border-r border-border flex flex-col shrink-0">
                <div className="h-10 border-b border-border flex items-center px-3 bg-surface-1">
                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Filter files..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-surface-2 border border-border rounded px-2 py-1 text-xs text-text-primary focus:border-brand-500 focus:outline-none pl-7"
                        />
                        <svg className="w-3.5 h-3.5 text-text-tertiary absolute left-2 top-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {isLoading ? (
                        <div className="flex justify-center p-4">
                            <span className="loading-spinner w-4 h-4" />
                        </div>
                    ) : (
                        fileTree.length > 0 ? (
                            fileTree.map(node => (
                                <FileTreeItem key={node.path} node={node} level={0} />
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-text-tertiary">
                                {searchTerm ? 'No matches found' : 'No files found'}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {selectedFile ? (
                    <FileViewer
                        file={selectedFile}
                        onClose={() => setSelectedFile(null)}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                        <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm">Select a file to view content</p>
                    </div>
                )}
            </div>
        </div>
    );
}

