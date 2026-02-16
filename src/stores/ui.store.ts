import { create } from 'zustand';

export type TabId = 'changes' | 'history' | 'branches' | 'cloud' | 'settings' | 'pull-requests' | 'actions' | 'issues' | 'files';

export interface TerminalInstance {
    id: string;
    title: string;
    createdAt: number;
}

interface UIState {
    activeTab: TabId;
    theme: 'dark' | 'light';
    repoSidebarCollapsed: boolean;
    terminalExpanded: boolean;
    terminalHeight: number;
    terminals: TerminalInstance[];
    activeTerminalId: string | null;
    selectedFile: string | null;
    commitMessage: string;
    isCommitting: boolean;
    isSyncing: boolean;
    showConflictPanel: boolean;
    conflictFiles: string[];
    showNewRepoModal: boolean;
    branchCreateRequested: boolean;
    notification: { type: 'success' | 'error' | 'info'; message: string } | null;
    bottomPanel: 'terminal' | 'activity';

    // Generic modal state to avoid clutter
    modalState: {
        type: 'commit-details' | 'clone' | 'time-machine' | null;
        data: any;
    };
    openModal: (type: 'commit-details' | 'clone' | 'time-machine', data: any) => void;
    closeModal: () => void;
    setBottomPanel: (panel: 'terminal' | 'activity') => void;

    // Actions
    setActiveTab: (tab: TabId) => void;
    setTheme: (theme: 'dark' | 'light') => void;
    toggleRepoSidebar: () => void;
    toggleTerminal: () => void;
    setTerminalHeight: (height: number) => void;
    addTerminal: () => void;
    removeTerminal: (id: string) => void;
    setActiveTerminal: (id: string) => void;
    setSelectedFile: (file: string | null) => void;
    setCommitMessage: (message: string) => void;
    setIsCommitting: (value: boolean) => void;
    setIsSyncing: (value: boolean) => void;
    showConflicts: (files: string[]) => void;
    hideConflicts: () => void;
    setShowNewRepoModal: (show: boolean) => void;
    setBranchCreateRequested: (requested: boolean) => void;
    showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
    clearNotification: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    activeTab: 'changes',
    theme: 'dark',
    repoSidebarCollapsed: false,
    terminalExpanded: false,
    terminalHeight: 320,
    terminals: [],
    activeTerminalId: null,
    selectedFile: null,
    commitMessage: '',
    isCommitting: false,
    isSyncing: false,
    showConflictPanel: false,
    conflictFiles: [],
    showNewRepoModal: false,
    branchCreateRequested: false,
    notification: null,
    bottomPanel: 'terminal',
    modalState: { type: null, data: null },

    setActiveTab: (tab) => set({ activeTab: tab }),

    setTheme: (theme) => {
        set({ theme });
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    },

    toggleRepoSidebar: () =>
        set((state) => ({ repoSidebarCollapsed: !state.repoSidebarCollapsed })),

    toggleTerminal: () =>
        set((state) => ({ terminalExpanded: !state.terminalExpanded })),

    setTerminalHeight: (height) => set({ terminalHeight: height }),
    setSelectedFile: (file) => set({ selectedFile: file }),
    setCommitMessage: (message) => set({ commitMessage: message }),
    setIsCommitting: (value) => set({ isCommitting: value }),
    setIsSyncing: (value) => set({ isSyncing: value }),

    showConflicts: (files) =>
        set({ showConflictPanel: true, conflictFiles: files }),

    hideConflicts: () => set({ showConflictPanel: false, conflictFiles: [] }),

    setShowNewRepoModal: (show) => set({ showNewRepoModal: show }),
    setBranchCreateRequested: (requested) => set({ branchCreateRequested: requested }),

    openModal: (type, data) => set({ modalState: { type, data } }),
    closeModal: () => set({ modalState: { type: null, data: null } }),
    setBottomPanel: (panel) => set({ bottomPanel: panel }),

    showNotification: (type, message) => {
        set({ notification: { type, message } });
        setTimeout(() => set({ notification: null }), 4000);
    },
    clearNotification: () => set({ notification: null }),

    addTerminal: () => set((state) => {
        const id = `terminal-${Date.now()}`;
        const title = `Terminal ${state.terminals.length + 1}`;
        return {
            terminals: [...state.terminals, { id, title, createdAt: Date.now() }],
            activeTerminalId: id,
            terminalExpanded: true,
        };
    }),

    removeTerminal: (id) => set((state) => {
        const filtered = state.terminals.filter((t) => t.id !== id);
        const wasActive = state.activeTerminalId === id;
        return {
            terminals: filtered,
            activeTerminalId: wasActive ? (filtered[0]?.id || null) : state.activeTerminalId,
            terminalExpanded: filtered.length > 0 ? state.terminalExpanded : false,
        };
    }),

    setActiveTerminal: (id) => set({ activeTerminalId: id }),
}));
