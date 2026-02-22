import { GitHubRepo, CreateRepoOptions, UpdateRepoOptions, GitHubWorkflow, GitHubWorkflowRun, GitHubJob } from './lib/github-types';
import { RepoInfo, FileStatus, CommitInfo, SyncResult } from './stores/repo.store';

export interface ElectronAPI {
    window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
    };
    auth: {
        login: () => Promise<{ url: string }>;
        getAccounts: () => Promise<any[]>;
        removeAccount: (username: string) => Promise<void>;
        getToken: (username: string) => Promise<string | null>;
        onCallback: (callback: (data: any) => void) => void;
    };
    repo: {
        scan: (rootPath: string) => Promise<RepoInfo[]>;
        detectAccount: (repoPath: string) => Promise<string | null>;
    };
    github: {
        listRepos: (token: string) => Promise<GitHubRepo[]>;
        createRepo: (token: string, options: any) => Promise<GitHubRepo>;
        updateRepo: (token: string, owner: string, repo: string, updates: any) => Promise<GitHubRepo>;
        deleteRepo: (token: string, owner: string, repo: string) => Promise<void>;
        getRepoDetails: (token: string, owner: string, repo: string) => Promise<GitHubRepo>;
        renameRepo: (token: string, owner: string, repo: string, newName: string) => Promise<GitHubRepo>;
        setRepoVisibility: (token: string, owner: string, repo: string, isPrivate: boolean) => Promise<GitHubRepo>;
        getCollaborators: (token: string, owner: string, repo: string) => Promise<any[]>;
        addCollaborator: (token: string, owner: string, repo: string, username: string) => Promise<void>;
        removeCollaborator: (token: string, owner: string, repo: string, username: string) => Promise<void>;
        getPullRequests: (token: string, owner: string, repo: string) => Promise<any[]>;
        updateDefaultBranch: (token: string, owner: string, repo: string, branch: string) => Promise<void>;
        getProtectedBranches: (token: string, owner: string, repo: string) => Promise<any[]>;
        getBranchProtection: (token: string, owner: string, repo: string, branch: string) => Promise<any>;
        addBranchProtection: (token: string, owner: string, repo: string, branch: string, rules?: any) => Promise<void>;
        removeBranchProtection: (token: string, owner: string, repo: string, branch: string) => Promise<void>;

        // Actions
        listWorkflows: (token: string, owner: string, repo: string) => Promise<{ total_count: number; workflows: GitHubWorkflow[] }>;
        listWorkflowRuns: (token: string, owner: string, repo: string, workflowId?: number) => Promise<{ total_count: number; workflow_runs: GitHubWorkflowRun[] }>;
        getWorkflowRunJobs: (token: string, owner: string, repo: string, runId: number) => Promise<{ total_count: number; jobs: GitHubJob[] }>;
        triggerWorkflow: (token: string, owner: string, repo: string, workflowId: number, ref: string, inputs?: any) => Promise<void>;
        cancelWorkflowRun: (token: string, owner: string, repo: string, runId: number) => Promise<void>;
        rerunWorkflow: (token: string, owner: string, repo: string, runId: number) => Promise<void>;
    };
    git: {
        status: (repoPath: string) => Promise<FileStatus[]>;
        stage: (repoPath: string, files: string[]) => Promise<void>;
        unstage: (repoPath: string, files: string[]) => Promise<void>;
        commit: (repoPath: string, message: string) => Promise<void>;
        push: (repoPath: string, token: string, remote?: string, branch?: string, setUpstream?: boolean, force?: boolean) => Promise<void>;
        deleteRemoteBranch: (repoPath: string, remote: string, branch: string, token: string) => Promise<void>;
        reset: (repoPath: string, mode: 'soft' | 'hard', target: string) => Promise<void>;
        checkoutPullRequest: (repoPath: string, prNumber: number) => Promise<void>;
        checkoutCommit: (repoPath: string, hash: string) => Promise<void>;
        getCommitDetails: (repoPath: string, hash: string) => Promise<{ path: string; status: 'added' | 'modified' | 'deleted' | 'renamed'; staged: boolean }[]>;
        getFileDiff: (repoPath: string, filePath: string, hash1: string, hash2?: string) => Promise<string>;
        pull: (repoPath: string, token: string) => Promise<void>;
        sync: (repoPath: string, token: string) => Promise<SyncResult>;
        diff: (repoPath: string, file?: string) => Promise<string>;
        log: (repoPath: string, limit?: number) => Promise<CommitInfo[]>;
        getBranches: (repoPath: string) => Promise<{ local: string[]; current: string; remote: string[] }>;
        checkout: (repoPath: string, branch: string) => Promise<void>;
        createBranch: (repoPath: string, branch: string) => Promise<void>;
        deleteBranch: (repoPath: string, branch: string) => Promise<void>;
        init: (path: string) => Promise<void>;
        clone: (url: string, path: string, token?: string) => Promise<void>;
        addRemote: (path: string, name: string, url: string) => Promise<void>;
        merge: (repoPath: string, branch: string) => Promise<void>;
        rebase: (repoPath: string, branch: string) => Promise<void>;
        listTags: (repoPath: string) => Promise<{ name: string; date: string; message: string; hash: string }[]>;
        createTag: (repoPath: string, tagName: string, message?: string, commitHash?: string) => Promise<void>;
        pushTag: (repoPath: string, tagName: string, token: string) => Promise<void>;
        deleteTag: (repoPath: string, tagName: string) => Promise<void>;
        deleteRemoteTag: (repoPath: string, tagName: string, token: string) => Promise<void>;
        cherryPick: (repoPath: string, commitHash: string) => Promise<void>;
        squashCommits: (repoPath: string, count: number, message: string) => Promise<void>;
        rewordCommit: (repoPath: string, newMessage: string) => Promise<void>;
        reflog: (repoPath: string, limit?: number) => Promise<ReflogEntry[]>;
        setIdentity: (name: string, email: string) => Promise<void>;
        clearIdentity: () => Promise<void>;

        // LFS
        isLfsInstalled: () => Promise<boolean>;
        lfsTrack: (repoPath: string, pattern: string) => Promise<void>;
        lfsUntrack: (repoPath: string, pattern: string) => Promise<void>;
        getLfsTrackedFiles: (repoPath: string) => Promise<string[]>;
    };
    agent: {
        run: (userMessage: string, uiState: AgentUIState, token: string | null) => Promise<string>;
        setConfig: (config: AgentConfig) => Promise<void>;
        getConfig: () => Promise<AgentConfig>;
        confirmAction: (approved: boolean) => Promise<void>;
        clearHistory: () => Promise<void>;
        onThinking: (callback: (data: { iteration: number }) => void) => void;
        onToolStart: (callback: (data: { tool: string; args: any }) => void) => void;
        onToolComplete: (callback: (data: { tool: string; result: string; error?: boolean }) => void) => void;
        onToolDenied: (callback: (data: { tool: string }) => void) => void;
        onConfirmRequest: (callback: (data: AgentConfirmRequest) => void) => void;
        onStateChanged: (callback: (data: any) => void) => void;
        onAddWorkflowNode: (callback: (data: { type: string; position: { x: number; y: number }; data: any }) => void) => void;
        onUIAction: (callback: (data: { action: string; payload: any }) => void) => void;
        removeAllListeners: () => void;
    };
    dialog: {
        openDirectory: () => Promise<string | null>;
    };
    fs: {
        writeFile: (path: string, content: string) => Promise<void>;
        readFile: (path: string) => Promise<string>;
        checkFileExists: (path: string) => Promise<boolean>;
    };
    update: {
        checkForUpdates: () => Promise<UpdateStatus>;
        downloadUpdate: () => Promise<void>;
        quitAndInstall: () => void;
        onStatusChange: (callback: (status: UpdateStatus) => void) => void;
        removeStatusListener: () => void;
    };
    storage: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
    };
    activity: {
        onCommandStart: (callback: (data: ActivityCommandStart) => void) => void;
        onCommandComplete: (callback: (data: ActivityCommandComplete) => void) => void;
        removeActivityListeners: () => void;
    };
    terminal: {
        create: (id: string, context: TerminalContext) => Promise<{ cols: number; rows: number }>;
        write: (id: string, data: string) => Promise<void>;
        resize: (id: string, cols: number, rows: number) => Promise<void>;
        setContext: (id: string, context: TerminalContext) => Promise<void>;
        destroy: (id: string) => Promise<void>;
        onData: (callback: (data: { id: string; data: string }) => void) => () => void;
        onExit: (callback: (data: { id: string; exitCode: number }) => void) => () => void;
        removeDataListener: () => void;
        removeExitListener: () => void;
    };
}

export interface UpdateStatus {
    status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
    version?: string;
    releaseNotes?: string;
    progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number };
    error?: string;
}

export interface TerminalContext {
    cwd: string;
    username?: string;
    displayName?: string;
    email?: string;
    token?: string;
    env?: Record<string, string>;
}

export interface AgentConfig {
    provider: 'groq' | 'deepseek' | 'anthropic' | 'openai' | 'grok' | 'gemini';
    model: string;
    keys: {
        groq?: string;
        deepseek?: string;
        anthropic?: string;
        openai?: string;
        grok?: string;
        gemini?: string;
    };
}

export interface ReflogEntry {
    hash: string;
    shortHash: string;
    action: string;
    description: string;
    date: string;
    index: number;
}

export interface ActivityCommandStart {
    id: string;
    command: string;
    repoPath: string;
    startedAt: number;
}

export interface ActivityCommandComplete {
    id: string;
    command: string;
    repoPath: string;
    startedAt: number;
    completedAt: number;
    durationMs: number;
    exitCode: number;
    status: 'success' | 'error';
    errorMessage?: string;
}

export interface AgentUIState {
    repoPath: string | null;
    branch: string | null;
    uncommittedFiles: { path: string; status: string; staged: boolean }[];
    selectedNodes: { id: string; type: string }[];
    activeTab: string;
    accounts: { id: string; username: string; label: string }[];
    activeAccount: string | null;
    repositories: { path: string; name: string }[];
    terminals: { id: string; title: string }[];
}

export interface AgentConfirmRequest {
    id: string;
    tool: string;
    args: Record<string, any>;
    description: string;
}

export interface AgentToolEvent {
    tool: string;
    args?: any;
    result?: string;
    error?: boolean;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
