import React, { useEffect, useState } from 'react';
import { useRepoStore, BlameInfo } from '../../stores/repo.store';
import { motion, AnimatePresence } from 'framer-motion';
import { CodeEditor } from './CodeEditor';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-git';

// Helper to guess language
const getLanguage = (filename: string) => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.sh')) return 'bash';
    if (filename.endsWith('.md')) return 'markdown';
    return 'text';
};

// Generate a color from a string (author name)
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

interface FileViewerProps {
    file: string; // Relative path
    onClose: () => void;
}

export function FileViewer({ file, onClose }: FileViewerProps) {
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const blameData = useRepoStore((s) => s.blameData);
    const isLoadingBlame = useRepoStore((s) => s.isLoadingBlame);
    const loadBlame = useRepoStore((s) => s.loadBlame);
    const clearBlame = useRepoStore((s) => s.clearBlame);

    const [content, setContent] = useState<string | null>(null);
    const [showBlame, setShowBlame] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load content
    useEffect(() => {
        if (!activeRepoPath) return;
        const load = async () => {
            try {
                // We need to construct absolute path.
                // Assuming activeRepoPath is the root.
                // We need a path joiner. Since we are in renderer, we can't use 'path' module directly nicely.
                // But we can assume activeRepoPath + '\\' + file (windows) or '/'
                const separator = activeRepoPath.includes('\\') ? '\\' : '/';
                const fullPath = `${activeRepoPath}${separator}${file}`;
                const text = await (window as any).electronAPI.fs.readFile(fullPath);
                setContent(text);
            } catch (err: any) {
                console.error('Failed to load file:', err);
                setError(err.message);
            }
        };
        load();
    }, [activeRepoPath, file]);

    // Cleanup blame on unmount or file change
    useEffect(() => {
        return () => clearBlame();
    }, [clearBlame, file]);

    // Load blame when toggled
    useEffect(() => {
        if (showBlame && !blameData && !isLoadingBlame) {
            loadBlame(file);
        }
    }, [showBlame, blameData, isLoadingBlame, loadBlame, file]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-400">
                <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p>Error loading file: {error}</p>
                <button onClick={onClose} className="mt-4 btn-secondary px-4 py-2 text-sm">Close</button>
            </div>
        );
    }

    if (content === null) {
        return (
            <div className="flex items-center justify-center h-full">
                <span className="loading-spinner w-6 h-6" />
            </div>
        );
    }

    const lines = content.split('\n');
    const language = getLanguage(file);
    const highlighted = Prism.highlight(content, Prism.languages[language] || Prism.languages.text, language);

    return (
        <div className="flex flex-col h-full bg-surface-0">
            {/* Header */}
            <div className="h-10 border-b border-border flex items-center justify-between px-3 shrink-0 bg-surface-1">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium text-sm text-text-primary">{file}</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowBlame(!showBlame)}
                        className={`
                            px-2 py-1 text-xs font-medium rounded border transition-colors
                            ${showBlame
                                ? 'bg-brand-500/10 text-brand-500 border-brand-500/20'
                                : 'bg-surface-2 text-text-secondary border-border hover:border-text-secondary'
                            }
                        `}
                    >
                        {isLoadingBlame ? (
                            <span className="flex items-center gap-1">
                                <span className="loading-spinner w-2 h-2" /> Loading...
                            </span>
                        ) : (
                            showBlame ? 'Hide Blame' : 'Show Blame'
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-surface-3 rounded text-text-secondary"
                        title="Close"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative bg-[#1e1e1e]">
                {!showBlame ? (
                    <div className="h-full w-full">
                        <CodeEditor
                            value={content}
                            language={language}
                            readOnly={true}
                            filename={file}
                        />
                    </div>
                ) : (
                    <div className="flex h-full font-mono text-sm overflow-auto relative">
                        {/* Blame Gutter */}
                        <AnimatePresence>
                            {showBlame && blameData && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 250, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    className="bg-[#1e1e1e] border-r border-[#333] shrink-0 overflow-hidden flex flex-col select-none"
                                >
                                    {lines.map((_, i) => {
                                        const lineNum = i + 1;
                                        const blame = blameData.find(b => b.line === lineNum);
                                        const prevBlame = blameData.find(b => b.line === lineNum - 1);
                                        const isSameCommit = prevBlame && blame && prevBlame.hash === blame.hash;

                                        return (
                                            <div
                                                key={i}
                                                className="h-[20px] px-2 flex items-center text-[10px] text-gray-500 hover:bg-[#2a2d2e] hover:text-gray-300 border-r border-transparent hover:border-brand-500 cursor-pointer transition-colors"
                                                title={blame ? `${blame.author}: ${blame.message} (${blame.shortHash}) - ${new Date(blame.date).toLocaleDateString()}` : ''}
                                                style={{ contain: 'strict' }}
                                            >
                                                {blame && !isSameCommit && (
                                                    <div className="flex items-center justify-between w-full">
                                                        <span
                                                            className="truncate font-medium w-[100px]"
                                                            style={{ color: stringToColor(blame.author) }}
                                                        >
                                                            {blame.author}
                                                        </span>
                                                        <span className="text-[9px] opacity-60 ml-2 shrink-0">
                                                            {new Date(blame.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Line Numbers */}
                        <div className="bg-[#1e1e1e] border-r border-[#333] px-3 flex flex-col text-right text-gray-500 select-none shrink-0 min-w-[40px]">
                            {lines.map((_, i) => (
                                <div key={i} className="h-[20px] leading-[20px]">{i + 1}</div>
                            ))}
                        </div>

                        {/* Code (Prism) */}
                        <div className="flex-1 overflow-x-auto">
                            <pre
                                className="m-0 p-0 bg-transparent font-mono text-sm leading-[20px]"
                                dangerouslySetInnerHTML={{ __html: highlighted }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

