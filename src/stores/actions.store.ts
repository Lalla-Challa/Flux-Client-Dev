import { create } from 'zustand';
import { GitHubWorkflow, GitHubWorkflowRun, GitHubJob } from '../lib/github-types';

interface ActionsState {
    workflows: GitHubWorkflow[];
    activeWorkflow: number | null; // ID filtering
    runs: GitHubWorkflowRun[];
    activeRun: GitHubWorkflowRun | null;
    jobs: GitHubJob[];
    isLoading: boolean;
    error: string | null;

    // Pagination for runs could be added later
    editorMode: 'runs' | 'edit' | 'create';
    selectedWorkflowPath: string | null;
    fileContent: string;
}

interface ActionsActions {
    fetchWorkflows: (token: string, owner: string, repo: string) => Promise<void>;
    fetchRuns: (token: string, owner: string, repo: string, workflowId?: number) => Promise<void>;
    fetchJobs: (token: string, owner: string, repo: string, runId: number) => Promise<void>;
    triggerWorkflow: (token: string, owner: string, repo: string, workflowId: number, ref: string, inputs?: any) => Promise<void>;
    cancelRun: (token: string, owner: string, repo: string, runId: number) => Promise<void>;
    rerunWorkflow: (token: string, owner: string, repo: string, runId: number) => Promise<void>;

    setActiveWorkflow: (workflowId: number | null) => void;
    setActiveRun: (run: GitHubWorkflowRun | null) => void;

    setEditorMode: (mode: 'runs' | 'edit' | 'create') => void;
    openWorkflowEditor: (path: string) => Promise<void>;
    saveWorkflowFile: (path: string, content: string) => Promise<void>;
    createWorkflowFile: (path: string, content: string) => Promise<void>;

    // Live polling
    isPolling: boolean;
    startPolling: (token: string, owner: string, repo: string, intervalMs?: number) => void;
    stopPolling: () => void;

    reset: () => void;
}

const api = () => window.electronAPI;

export const useActionsStore = create<ActionsState & ActionsActions>((set, get) => ({
    workflows: [],
    activeWorkflow: null,
    runs: [],
    activeRun: null,
    jobs: [],
    isLoading: false,
    error: null,

    editorMode: 'runs',
    selectedWorkflowPath: null,
    fileContent: '',
    isPolling: false,

    fetchWorkflows: async (token, owner, repo) => {
        set({ isLoading: true, error: null });
        try {
            const result = await api().github.listWorkflows(token, owner, repo);
            set({ workflows: result.workflows, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchRuns: async (token, owner, repo, workflowId) => {
        set({ isLoading: true, error: null });
        try {
            const result = await api().github.listWorkflowRuns(token, owner, repo, workflowId);
            set({ runs: result.workflow_runs, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchJobs: async (token, owner, repo, runId) => {
        set({ isLoading: true, error: null });
        try {
            const result = await api().github.getWorkflowRunJobs(token, owner, repo, runId);
            set({ jobs: result.jobs, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    triggerWorkflow: async (token, owner, repo, workflowId, ref, inputs) => {
        set({ isLoading: true, error: null });
        try {
            await api().github.triggerWorkflow(token, owner, repo, workflowId, ref, inputs);
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    cancelRun: async (token, owner, repo, runId) => {
        set({ isLoading: true, error: null });
        try {
            await api().github.cancelWorkflowRun(token, owner, repo, runId);
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    rerunWorkflow: async (token, owner, repo, runId) => {
        set({ isLoading: true, error: null });
        try {
            await api().github.rerunWorkflow(token, owner, repo, runId);
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    setActiveWorkflow: (workflowId) => set({ activeWorkflow: workflowId }),
    setActiveRun: (run) => set({ activeRun: run }),

    setEditorMode: (mode) => set({ editorMode: mode }),

    openWorkflowEditor: async (path) => {
        set({ isLoading: true, error: null, selectedWorkflowPath: path, editorMode: 'edit' });
        try {
            const content = await api().fs.readFile(path);
            set({ fileContent: content, isLoading: false });
        } catch (error: any) {
            set({ error: 'Failed to read file: ' + error.message, isLoading: false });
        }
    },

    saveWorkflowFile: async (path, content) => {
        set({ isLoading: true, error: null });
        try {
            await api().fs.writeFile(path, content);
            set({ isLoading: false, fileContent: content });
        } catch (error: any) {
            set({ error: 'Failed to save file: ' + error.message, isLoading: false });
            throw error;
        }
    },

    createWorkflowFile: async (path, content) => {
        set({ isLoading: true, error: null });
        try {
            await api().fs.writeFile(path, content);
            set({ isLoading: false, selectedWorkflowPath: path, fileContent: content, editorMode: 'edit' });
        } catch (error: any) {
            set({ error: 'Failed to create file: ' + error.message, isLoading: false });
            throw error;
        }
    },

    startPolling: (token, owner, repo, intervalMs = 10000) => {
        // Stop any existing polling first
        get().stopPolling();

        const interval = setInterval(() => {
            const { activeWorkflow } = get();
            get().fetchRuns(token, owner, repo, activeWorkflow ?? undefined);
        }, intervalMs);

        // Store interval ID on the store instance (we'll use a module-level variable)
        _pollingInterval = interval;
        set({ isPolling: true });
    },

    stopPolling: () => {
        if (_pollingInterval) {
            clearInterval(_pollingInterval);
            _pollingInterval = null;
        }
        set({ isPolling: false });
    },

    reset: () => {
        get().stopPolling();
        set({
            workflows: [],
            runs: [],
            jobs: [],
            activeWorkflow: null,
            activeRun: null,
            error: null,
            editorMode: 'runs',
            selectedWorkflowPath: null,
            fileContent: '',
            isPolling: false,
        });
    },
}));

let _pollingInterval: ReturnType<typeof setInterval> | null = null;
