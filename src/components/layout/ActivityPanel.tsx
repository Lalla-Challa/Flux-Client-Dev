import React, { useState } from 'react';
import { useActivityStore, ActivityLogEntry } from '../../stores/activity.store';

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString();
}

function StatusIcon({ status }: { status: ActivityLogEntry['status'] }) {
    if (status === 'running') {
        return (
            <svg className="w-3.5 h-3.5 animate-spin text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
        );
    }
    if (status === 'success') {
        return (
            <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        );
    }
    return (
        <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function EntryRow({ entry }: { entry: ActivityLogEntry }) {
    const [expanded, setExpanded] = useState(false);
    const hasError = entry.status === 'error' && entry.errorMessage;

    return (
        <div
            className={`px-3 py-1.5 border-b border-border/50 hover:bg-surface-2/50 transition-colors ${hasError ? 'cursor-pointer' : ''}`}
            onClick={() => hasError && setExpanded(!expanded)}
        >
            <div className="flex items-center gap-2">
                <StatusIcon status={entry.status} />
                <span className="font-mono text-xs text-text-primary truncate flex-1">
                    {entry.command}
                </span>
                {entry.durationMs != null && (
                    <span className="text-2xs text-text-tertiary tabular-nums shrink-0">
                        {formatDuration(entry.durationMs)}
                    </span>
                )}
                <span className="text-2xs text-text-tertiary tabular-nums shrink-0">
                    {formatTime(entry.startedAt)}
                </span>
            </div>
            {expanded && entry.errorMessage && (
                <div className="mt-1.5 ml-5.5 p-2 rounded bg-red-500/10 border border-red-500/20">
                    <pre className="text-2xs text-red-400 whitespace-pre-wrap font-mono break-all">
                        {entry.errorMessage}
                    </pre>
                </div>
            )}
        </div>
    );
}

export function ActivityPanel() {
    const entries = useActivityStore((s) => s.entries);
    const clearEntries = useActivityStore((s) => s.clearEntries);

    return (
        <div className="flex flex-col h-full bg-surface-0">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface-1 shrink-0">
                <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-xs font-medium text-text-secondary">
                        Activity Log
                    </span>
                    <span className="text-2xs text-text-tertiary">
                        ({entries.length})
                    </span>
                </div>
                {entries.length > 0 && (
                    <button
                        onClick={clearEntries}
                        className="text-2xs text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                        <svg className="w-8 h-8 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="text-xs">No commands logged yet</span>
                        <span className="text-2xs mt-0.5">Git commands will appear here in real-time</span>
                    </div>
                ) : (
                    entries.map((entry) => (
                        <EntryRow key={entry.id} entry={entry} />
                    ))
                )}
            </div>
        </div>
    );
}
