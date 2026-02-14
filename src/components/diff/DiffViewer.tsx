import React, { useMemo } from 'react';

interface DiffViewerProps {
    diff: string;
}

interface DiffLine {
    type: 'added' | 'removed' | 'context' | 'header' | 'info';
    content: string;
    oldLineNum?: number;
    newLineNum?: number;
}

export function DiffViewer({ diff }: DiffViewerProps) {
    const lines = useMemo(() => parseDiff(diff), [diff]);

    if (!diff || diff.trim() === '') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                <svg className="w-10 h-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-text-secondary mb-1">No Changes to Show</span>
                <span className="text-xs">Select a file from the left panel to view its diff</span>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto font-mono text-xs bg-surface-0">
            <table className="w-full border-collapse">
                <tbody>
                    {lines.map((line, i) => (
                        <tr key={i} className={getDiffLineClass(line.type)}>
                            {/* Old line number */}
                            <td className="w-12 px-2 py-0 text-right text-text-tertiary select-none border-r border-border/30 shrink-0">
                                {line.type === 'header' || line.type === 'info'
                                    ? ''
                                    : line.oldLineNum ?? ''}
                            </td>
                            {/* New line number */}
                            <td className="w-12 px-2 py-0 text-right text-text-tertiary select-none border-r border-border/30 shrink-0">
                                {line.type === 'header' || line.type === 'info'
                                    ? ''
                                    : line.newLineNum ?? ''}
                            </td>
                            {/* Sign */}
                            <td className="w-5 px-1 py-0 text-center select-none shrink-0">
                                {line.type === 'added' && (
                                    <span className="text-status-added">+</span>
                                )}
                                {line.type === 'removed' && (
                                    <span className="text-status-deleted">-</span>
                                )}
                            </td>
                            {/* Content */}
                            <td className="px-2 py-0 whitespace-pre-wrap break-all">
                                {line.type === 'header' ? (
                                    <span className="text-brand-400 font-semibold">{line.content}</span>
                                ) : line.type === 'info' ? (
                                    <span className="text-text-tertiary italic">{line.content}</span>
                                ) : (
                                    <span>{line.content}</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function parseDiff(diff: string): DiffLine[] {
    const result: DiffLine[] = [];
    const rawLines = diff.split('\n');
    let oldLine = 0;
    let newLine = 0;

    for (const raw of rawLines) {
        if (raw.startsWith('diff --git')) {
            result.push({ type: 'info', content: raw });
        } else if (raw.startsWith('index ') || raw.startsWith('---') || raw.startsWith('+++')) {
            result.push({ type: 'info', content: raw });
        } else if (raw.startsWith('@@')) {
            // Parse hunk header: @@ -oldStart,oldLen +newStart,newLen @@
            const match = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            if (match) {
                oldLine = parseInt(match[1], 10);
                newLine = parseInt(match[2], 10);
            }
            result.push({ type: 'header', content: raw });
        } else if (raw.startsWith('+')) {
            result.push({
                type: 'added',
                content: raw.substring(1),
                newLineNum: newLine++,
            });
        } else if (raw.startsWith('-')) {
            result.push({
                type: 'removed',
                content: raw.substring(1),
                oldLineNum: oldLine++,
            });
        } else if (raw.startsWith(' ') || raw === '') {
            result.push({
                type: 'context',
                content: raw.substring(1) || '',
                oldLineNum: oldLine++,
                newLineNum: newLine++,
            });
        }
    }

    return result;
}

function getDiffLineClass(type: DiffLine['type']): string {
    switch (type) {
        case 'added':
            return 'bg-green-500/8 hover:bg-green-500/15';
        case 'removed':
            return 'bg-red-500/8 hover:bg-red-500/15';
        case 'header':
            return 'bg-brand-500/8';
        case 'info':
            return 'bg-surface-2';
        default:
            return 'hover:bg-surface-2/50';
    }
}
