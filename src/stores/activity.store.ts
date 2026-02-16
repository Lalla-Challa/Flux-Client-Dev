import { create } from 'zustand';

export interface ActivityLogEntry {
    id: string;
    command: string;
    repoPath: string;
    status: 'running' | 'success' | 'error';
    startedAt: number;
    completedAt?: number;
    durationMs?: number;
    exitCode?: number;
    errorMessage?: string;
}

interface ActivityState {
    entries: ActivityLogEntry[];
    addEntry: (entry: ActivityLogEntry) => void;
    updateEntry: (id: string, updates: Partial<ActivityLogEntry>) => void;
    clearEntries: () => void;
}

const MAX_ENTRIES = 500;

export const useActivityStore = create<ActivityState>((set) => ({
    entries: [],

    addEntry: (entry) =>
        set((state) => ({
            entries: [entry, ...state.entries].slice(0, MAX_ENTRIES),
        })),

    updateEntry: (id, updates) =>
        set((state) => ({
            entries: state.entries.map((e) =>
                e.id === id ? { ...e, ...updates } : e
            ),
        })),

    clearEntries: () => set({ entries: [] }),
}));
