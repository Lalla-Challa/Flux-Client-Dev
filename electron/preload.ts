import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
    // Window controls
    window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
    };

    // Authentication
    auth: {
        login: () => Promise<{ url: string }>;
        getAccounts: () => Promise<Account[]>;
        removeAccount: (username: string) => Promise<void>;
        getToken: (username: string) => Promise<string | null>;
        onCallback: (callback: (data: AuthCallbackData) => void) => void;
    };

    // Repository
    repo: {
        scan: (rootPath: string) => Promise<RepoInfo[]>;
        detectAccount: (repoPath: string) => Promise<string | null>;
    };

    // GitHub
    github: {
        listRepos: (token: string) => Promise<GitHubRepo[]>;
        createRepo: (token: string, options: CreateRepoOptions) => Promise<GitHubRepo>;
        updateRepo: (token: string, owner: string, repo: string, updates: UpdateRepoOptions) => Promise<GitHubRepo>;
        deleteRepo: (token: string, owner: string, repo: string) => Promise<void>;
        getRepoDetails: (token: string, owner: string, repo: string) => Promise<GitHubRepo>;
        renameRepo: (token: string, owner: string, repo: string, newName: string) => Promise<GitHubRepo>;
        setRepoVisibility: (token: string, owner: string, repo: string, isPrivate: boolean) => Promise<GitHubRepo>;
        getCollaborators: (token: string, owner: string, repo: string) => Promise<any[]>;
        addCollaborator: (token: string, owner: string, repo: string, username: string) => Promise<void>;
        removeCollaborator: (token: string, owner: string, repo: string, username: string) => Promise<void>;
        getPullRequests: (token: string, owner: string, repo: string) => Promise<any[]>;
        listIssues: (token: string, owner: string, repo: string) => Promise<any[]>;
        createPullRequest: (token: string, owner: string, repo: string, options: { title: string; body?: string; head: string; base: string }) => Promise<any>;
        listCheckRuns: (token: string, owner: string, repo: string, ref: string) => Promise<any>;
        syncFork: (token: string, owner: string, repo: string, branch: string) => Promise<any>;

        // Actions
        listWorkflows: (token: string, owner: string, repo: string) => Promise<{ total_count: number; workflows: any[] }>;
        listWorkflowRuns: (token: string, owner: string, repo: string, workflowId?: number) => Promise<{ total_count: number; workflow_runs: any[] }>;
        getWorkflowRunJobs: (token: string, owner: string, repo: string, runId: number) => Promise<{ total_count: number; jobs: any[] }>;
        triggerWorkflow: (token: string, owner: string, repo: string, workflowId: number, ref: string, inputs?: any) => Promise<void>;
        cancelWorkflowRun: (token: string, owner: string, repo: string, runId: number) => Promise<void>;
        rerunWorkflow: (token: string, owner: string, repo: string, runId: number) => Promise<void>;
    };

    // Git operations
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
        branches: (repoPath: string) => Promise<BranchInfo[]>;
        checkout: (repoPath: string, branch: string, create?: boolean) => Promise<void>;
        deleteBranch: (repoPath: string, branch: string) => Promise<void>;
        stash: (repoPath: string) => Promise<void>;
        stashPop: (repoPath: string) => Promise<void>;
        revert: (repoPath: string) => Promise<void>;
        currentBranch: (repoPath: string) => Promise<string>;
        remoteUrl: (repoPath: string) => Promise<string>;
        clone: (url: string, destination: string, token?: string) => Promise<void>;
        init: (repoPath: string, options?: { defaultBranch?: string }) => Promise<void>;
        addRemote: (repoPath: string, name: string, url: string) => Promise<void>;
        setRemote: (repoPath: string, name: string, url: string) => Promise<void>;
        setUpstream: (repoPath: string, branch: string, remote: string) => Promise<void>;
        merge: (repoPath: string, branch: string) => Promise<void>;
        rebase: (repoPath: string, branch: string) => Promise<void>;
        onCloneProgress: (callback: (message: string) => void) => void;
        discardFile: (repoPath: string, file: string) => Promise<void>;
        cleanFile: (repoPath: string, file: string) => Promise<void>;
        resolveConflict: (repoPath: string, file: string, strategy: 'theirs' | 'ours') => Promise<void>;
        blame: (repoPath: string, file: string) => Promise<BlameInfo[]>;
        listFiles: (repoPath: string) => Promise<string[]>;
        getFileContent: (repoPath: string, path: string, ref?: string) => Promise<string>;
        listTags: (repoPath: string) => Promise<{ name: string; date: string; message: string; hash: string }[]>;
        createTag: (repoPath: string, tagName: string, message?: string, commitHash?: string) => Promise<void>;
        pushTag: (repoPath: string, tagName: string, token: string) => Promise<void>;
        deleteTag: (repoPath: string, tagName: string) => Promise<void>;
        deleteRemoteTag: (repoPath: string, tagName: string, token: string) => Promise<void>;
        cherryPick: (repoPath: string, commitHash: string) => Promise<void>;
        squashCommits: (repoPath: string, count: number, message: string) => Promise<void>;
        rewordCommit: (repoPath: string, newMessage: string) => Promise<void>;
        reflog: (repoPath: string, limit?: number) => Promise<any[]>;
        setIdentity: (name: string, email: string) => Promise<void>;
        clearIdentity: () => Promise<void>;

        // LFS
        isLfsInstalled: () => Promise<boolean>;
        lfsTrack: (repoPath: string, pattern: string) => Promise<void>;
        lfsUntrack: (repoPath: string, pattern: string) => Promise<void>;
        getLfsTrackedFiles: (repoPath: string) => Promise<string[]>;
    };

    // Dialog
    dialog: {
        openDirectory: () => Promise<string | null>;
    };

    // Shell
    shell: {
        openExternal: (url: string) => Promise<void>;
        openPath: (path: string) => Promise<string>;
    };

    // File System
    fs: {
        writeFile: (path: string, content: string) => Promise<void>;
        readFile: (path: string) => Promise<string>;
        checkFileExists: (path: string) => Promise<boolean>;
    };

    // Update
    update: {
        checkForUpdates: () => Promise<any>;
        downloadUpdate: () => Promise<void>;
        quitAndInstall: () => void;
        onStatusChange: (callback: (status: any) => void) => void;
        removeStatusListener: () => void;
    };

    // Storage (persisted key-value in userData)
    storage: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
    };

    agent: {
        run: (userMessage: string, uiState: any, token: string | null) => Promise<string>;
        setConfig: (config: any) => Promise<void>;
        getConfig: () => Promise<any>;
        confirmAction: (approved: boolean) => Promise<void>;
        clearHistory: () => Promise<void>;
        onThinking: (callback: (data: { iteration: number }) => void) => void;
        onToolStart: (callback: (data: { tool: string; args: any }) => void) => void;
        onToolComplete: (callback: (data: { tool: string; result: string; error?: boolean }) => void) => void;
        onToolDenied: (callback: (data: { tool: string }) => void) => void;
        onConfirmRequest: (callback: (data: { id: string; tool: string; args: any; description: string }) => void) => void;
        onStateChanged: (callback: (data: any) => void) => void;
        onAddWorkflowNode: (callback: (data: { type: string; position: { x: number; y: number }; data: any }) => void) => void;
        onUIAction: (callback: (data: { action: string; payload: any }) => void) => void;
        removeAllListeners: () => void;
    };

    // Activity Log
    activity: {
        onCommandStart: (callback: (data: any) => void) => void;
        onCommandComplete: (callback: (data: any) => void) => void;
        removeActivityListeners: () => void;
    };

    // Terminal
    terminal: {
        create: (id: string, context: { cwd: string; username?: string; displayName?: string; email?: string; token?: string }) => Promise<{ cols: number; rows: number }>;
        write: (id: string, data: string) => Promise<void>;
        resize: (id: string, cols: number, rows: number) => Promise<void>;
        setContext: (id: string, context: { cwd: string; username?: string; displayName?: string; email?: string; token?: string }) => Promise<void>;
        destroy: (id: string) => Promise<void>;
        onData: (callback: (data: { id: string; data: string }) => void) => void;
        onExit: (callback: (data: { id: string; exitCode: number }) => void) => void;
        removeDataListener: () => void;
        removeExitListener: () => void;
    };
}

export interface Account {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatarUrl: string;
    label: string;
    type: 'personal' | 'work' | 'client';
}

export interface RepoInfo {
    path: string;
    name: string;
    branch: string;
    dirty: boolean;
    remoteUrl: string;
    accountId?: string;
}

export interface FileStatus {
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'conflict';
    staged: boolean;
    oldPath?: string;
}

export interface CommitInfo {
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    email: string;
    date: string;
    refs: string;
}

export interface BranchInfo {
    name: string;
    current: boolean;
    remote: boolean;
    lastCommit?: string;
}

export interface BlameInfo {
    line: number;
    hash: string;
    shortHash: string;
    author: string;
    email: string;
    date: string;
    message: string;
}

export interface SyncResult {
    success: boolean;
    pulled: boolean;
    pushed: boolean;
    conflicts: string[];
    error?: string;
}

export interface AuthCallbackData {
    success: boolean;
    account?: Account;
    error?: string;
}

interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    private: boolean;
    html_url: string;
    clone_url: string;
    ssh_url: string;
    owner: {
        login: string;
        avatar_url: string;
    };
    default_branch: string;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    pushed_at: string;
    created_at: string;
    archived: boolean;
    fork: boolean;
}

interface CreateRepoOptions {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
}

interface UpdateRepoOptions {
    name?: string;
    description?: string;
    private?: boolean;
    default_branch?: string;
}

const electronAPI: ElectronAPI = {
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
    },

    auth: {
        login: () => ipcRenderer.invoke('auth:login'),
        getAccounts: () => ipcRenderer.invoke('auth:getAccounts'),
        removeAccount: (username) => ipcRenderer.invoke('auth:removeAccount', username),
        getToken: (username) => ipcRenderer.invoke('auth:getToken', username),
        onCallback: (callback) => {
            ipcRenderer.on('auth:callback', (_event, data) => callback(data));
        },
    },

    repo: {
        scan: (rootPath) => ipcRenderer.invoke('repo:scan', rootPath),
        detectAccount: (repoPath) => ipcRenderer.invoke('repo:detect-account', repoPath),
    },

    github: {
        listRepos: (token) => ipcRenderer.invoke('github:listRepos', token),
        createRepo: (token, options) => ipcRenderer.invoke('github:createRepo', token, options),
        updateRepo: (token, owner, repo, updates) => ipcRenderer.invoke('github:updateRepo', token, owner, repo, updates),
        deleteRepo: (token, owner, repo) => ipcRenderer.invoke('github:deleteRepo', token, owner, repo),
        getRepoDetails: (token: string, owner: string, repo: string) => ipcRenderer.invoke('github:getRepoDetails', token, owner, repo),
        renameRepo: (token: string, owner: string, repo: string, newName: string) => ipcRenderer.invoke('github:renameRepo', token, owner, repo, newName),
        setRepoVisibility: (token: string, owner: string, repo: string, isPrivate: boolean) => ipcRenderer.invoke('github:setRepoVisibility', token, owner, repo, isPrivate),
        getCollaborators: (token: string, owner: string, repo: string) => ipcRenderer.invoke('github:getCollaborators', token, owner, repo),
        addCollaborator: (token: string, owner: string, repo: string, username: string) => ipcRenderer.invoke('github:addCollaborator', token, owner, repo, username),
        removeCollaborator: (token: string, owner: string, repo: string, username: string) => ipcRenderer.invoke('github:removeCollaborator', token, owner, repo, username),
        getPullRequests: (token: string, owner: string, repo: string) => ipcRenderer.invoke('github:getPullRequests', token, owner, repo),
        listIssues: (token, owner, repo) => ipcRenderer.invoke('github:listIssues', token, owner, repo),
        createPullRequest: (token, owner, repo, options) => ipcRenderer.invoke('github:createPullRequest', token, owner, repo, options),
        listCheckRuns: (token, owner, repo, ref) => ipcRenderer.invoke('github:listCheckRuns', token, owner, repo, ref),
        syncFork: (token, owner, repo, branch) => ipcRenderer.invoke('github:syncFork', token, owner, repo, branch),

        // Actions
        listWorkflows: (token, owner, repo) => ipcRenderer.invoke('github:listWorkflows', token, owner, repo),
        listWorkflowRuns: (token, owner, repo, workflowId) => ipcRenderer.invoke('github:listWorkflowRuns', token, owner, repo, workflowId),
        getWorkflowRunJobs: (token, owner, repo, runId) => ipcRenderer.invoke('github:getWorkflowRunJobs', token, owner, repo, runId),
        triggerWorkflow: (token, owner, repo, workflowId, ref, inputs) => ipcRenderer.invoke('github:triggerWorkflow', token, owner, repo, workflowId, ref, inputs),
        cancelWorkflowRun: (token, owner, repo, runId) => ipcRenderer.invoke('github:cancelWorkflowRun', token, owner, repo, runId),
        rerunWorkflow: (token, owner, repo, runId) => ipcRenderer.invoke('github:rerunWorkflow', token, owner, repo, runId),
    },

    git: {
        status: (repoPath) => ipcRenderer.invoke('git:status', repoPath),
        stage: (repoPath, files) => ipcRenderer.invoke('git:stage', repoPath, files),
        unstage: (repoPath, files) => ipcRenderer.invoke('git:unstage', repoPath, files),
        commit: (repoPath, message) => ipcRenderer.invoke('git:commit', repoPath, message),
        push: (repoPath, token, remote, branch, setUpstream, force) =>
            ipcRenderer.invoke('git:push', repoPath, token, remote, branch, setUpstream, force),
        pull: (repoPath, token) => ipcRenderer.invoke('git:pull', repoPath, token),
        deleteRemoteBranch: (repoPath, remote, branch, token) =>
            ipcRenderer.invoke('git:deleteRemoteBranch', repoPath, remote, branch, token),
        reset: (repoPath, mode, target) => ipcRenderer.invoke('git:reset', repoPath, mode, target),
        checkoutPullRequest: (repoPath: string, prNumber: number) => ipcRenderer.invoke('git:checkoutPullRequest', repoPath, prNumber),
        checkoutCommit: (repoPath, hash) => ipcRenderer.invoke('git:checkoutCommit', repoPath, hash),
        getCommitDetails: (repoPath, hash) => ipcRenderer.invoke('git:getCommitDetails', repoPath, hash),
        getFileDiff: (repoPath, filePath, hash1, hash2) => ipcRenderer.invoke('git:getFileDiff', repoPath, filePath, hash1, hash2),
        sync: (repoPath, token) => ipcRenderer.invoke('git:sync', repoPath, token),
        diff: (repoPath, file) => ipcRenderer.invoke('git:diff', repoPath, file),
        log: (repoPath, limit) => ipcRenderer.invoke('git:log', repoPath, limit),
        branches: (repoPath) => ipcRenderer.invoke('git:branches', repoPath),
        checkout: (repoPath, branch, create) =>
            ipcRenderer.invoke('git:checkout', repoPath, branch, create),
        deleteBranch: (repoPath, branch) => ipcRenderer.invoke('git:deleteBranch', repoPath, branch),
        stash: (repoPath) => ipcRenderer.invoke('git:stash', repoPath),
        stashPop: (repoPath) => ipcRenderer.invoke('git:stashPop', repoPath),
        revert: (repoPath) => ipcRenderer.invoke('git:revert', repoPath),
        currentBranch: (repoPath) => ipcRenderer.invoke('git:currentBranch', repoPath),
        remoteUrl: (repoPath) => ipcRenderer.invoke('git:remoteUrl', repoPath),
        clone: (url, destination, token) => ipcRenderer.invoke('git:clone', url, destination, token),
        init: (repoPath, options) => ipcRenderer.invoke('git:init', repoPath, options),
        addRemote: (repoPath, name, url) => ipcRenderer.invoke('git:addRemote', repoPath, name, url),
        setRemote: (repoPath, name, url) => ipcRenderer.invoke('git:setRemote', repoPath, name, url),
        setUpstream: (repoPath, branch, remote) => ipcRenderer.invoke('git:setUpstream', repoPath, branch, remote),
        merge: (repoPath, branch) => ipcRenderer.invoke('git:merge', repoPath, branch),
        rebase: (repoPath, branch) => ipcRenderer.invoke('git:rebase', repoPath, branch),
        onCloneProgress: (callback) => {
            ipcRenderer.on('git:cloneProgress', (_event, message) => callback(message));
        },
        discardFile: (repoPath, file) => ipcRenderer.invoke('git:discardFile', repoPath, file),
        cleanFile: (repoPath, file) => ipcRenderer.invoke('git:cleanFile', repoPath, file),
        resolveConflict: (repoPath, file, strategy) => ipcRenderer.invoke('git:resolveConflict', repoPath, file, strategy),
        blame: (repoPath, file) => ipcRenderer.invoke('git:blame', repoPath, file),
        listFiles: (repoPath: string) => ipcRenderer.invoke('git:listFiles', repoPath),
        getFileContent: (repoPath: string, path: string, ref?: string) => ipcRenderer.invoke('git:getFileContent', repoPath, path, ref),
        listTags: (repoPath: string) => ipcRenderer.invoke('git:listTags', repoPath),
        createTag: (repoPath: string, tagName: string, message?: string, commitHash?: string) => ipcRenderer.invoke('git:createTag', repoPath, tagName, message, commitHash),
        pushTag: (repoPath: string, tagName: string, token: string) => ipcRenderer.invoke('git:pushTag', repoPath, tagName, token),
        deleteTag: (repoPath: string, tagName: string) => ipcRenderer.invoke('git:deleteTag', repoPath, tagName),
        deleteRemoteTag: (repoPath: string, tagName: string, token: string) => ipcRenderer.invoke('git:deleteRemoteTag', repoPath, tagName, token),
        cherryPick: (repoPath: string, commitHash: string) => ipcRenderer.invoke('git:cherryPick', repoPath, commitHash),
        squashCommits: (repoPath: string, count: number, message: string) => ipcRenderer.invoke('git:squashCommits', repoPath, count, message),
        rewordCommit: (repoPath: string, newMessage: string) => ipcRenderer.invoke('git:rewordCommit', repoPath, newMessage),
        reflog: (repoPath: string, limit?: number) => ipcRenderer.invoke('git:reflog', repoPath, limit),
        setIdentity: (name: string, email: string) => ipcRenderer.invoke('git:setIdentity', name, email),
        clearIdentity: () => ipcRenderer.invoke('git:clearIdentity'),

        // LFS
        isLfsInstalled: () => ipcRenderer.invoke('git:isLfsInstalled'),
        lfsTrack: (repoPath: string, pattern: string) => ipcRenderer.invoke('git:lfsTrack', repoPath, pattern),
        lfsUntrack: (repoPath: string, pattern: string) => ipcRenderer.invoke('git:lfsUntrack', repoPath, pattern),
        getLfsTrackedFiles: (repoPath: string) => ipcRenderer.invoke('git:getLfsTrackedFiles', repoPath),
    },

    dialog: {
        openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    },

    shell: {
        openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
        openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
    },

    fs: {
        writeFile: (path, content) => ipcRenderer.invoke('fs:writeFile', path, content),
        readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
        checkFileExists: (path: string) => ipcRenderer.invoke('fs:exists', path),
    },

    update: {
        checkForUpdates: () => ipcRenderer.invoke('update:check'),
        downloadUpdate: () => ipcRenderer.invoke('update:download'),
        quitAndInstall: () => ipcRenderer.invoke('update:install'),
        onStatusChange: (callback) => {
            ipcRenderer.on('update:status', (_event, status) => callback(status));
        },
        removeStatusListener: () => {
            ipcRenderer.removeAllListeners('update:status');
        },
    },

    agent: {
        run: (userMessage: string, uiState: any, token: string | null) =>
            ipcRenderer.invoke('agent:run', userMessage, uiState, token),
        setConfig: (config: any) => ipcRenderer.invoke('agent:setConfig', config),
        getConfig: () => ipcRenderer.invoke('agent:getConfig'),
        confirmAction: (approved: boolean) => ipcRenderer.invoke('agent:confirmAction', approved),
        clearHistory: () => ipcRenderer.invoke('agent:clearHistory'),
        onThinking: (callback: (data: any) => void) => {
            ipcRenderer.on('agent:thinking', (_event, data) => callback(data));
        },
        onToolStart: (callback: (data: any) => void) => {
            ipcRenderer.on('agent:tool_start', (_event, data) => callback(data));
        },
        onToolComplete: (callback: (data: any) => void) => {
            ipcRenderer.on('agent:tool_complete', (_event, data) => callback(data));
        },
        onToolDenied: (callback: (data: any) => void) => {
            ipcRenderer.on('agent:tool_denied', (_event, data) => callback(data));
        },
        onConfirmRequest: (callback: (data: any) => void) => {
            ipcRenderer.on('agent:confirm_request', (_event, data) => callback(data));
        },
        onStateChanged: (callback: (data: any) => void) => {
            ipcRenderer.on('agent:state_changed', (_event, data) => callback(data));
        },
        onAddWorkflowNode: (callback: (data: any) => void) => {
            ipcRenderer.on('agent:add_workflow_node', (_event, data) => callback(data));
        },
        onUIAction: (callback: (data: any) => void) => {
            ipcRenderer.on('agent:ui_action', (_event, data) => callback(data));
        },
        removeAllListeners: () => {
            ipcRenderer.removeAllListeners('agent:thinking');
            ipcRenderer.removeAllListeners('agent:tool_start');
            ipcRenderer.removeAllListeners('agent:tool_complete');
            ipcRenderer.removeAllListeners('agent:tool_denied');
            ipcRenderer.removeAllListeners('agent:confirm_request');
            ipcRenderer.removeAllListeners('agent:state_changed');
            ipcRenderer.removeAllListeners('agent:add_workflow_node');
            ipcRenderer.removeAllListeners('agent:ui_action');
        },
    },

    storage: {
        get: (key: string) => ipcRenderer.invoke('storage:get', key),
        set: (key: string, value: any) => ipcRenderer.invoke('storage:set', key, value),
    },

    activity: {
        onCommandStart: (callback) => {
            ipcRenderer.on('activity:command-start', (_event, data) => callback(data));
        },
        onCommandComplete: (callback) => {
            ipcRenderer.on('activity:command-complete', (_event, data) => callback(data));
        },
        removeActivityListeners: () => {
            ipcRenderer.removeAllListeners('activity:command-start');
            ipcRenderer.removeAllListeners('activity:command-complete');
        },
    },

    terminal: {
        create: (id: string, context: { cwd: string; username?: string; displayName?: string; email?: string; token?: string }) => ipcRenderer.invoke('terminal:create', id, context),
        write: (id, data) => ipcRenderer.invoke('terminal:write', id, data),
        resize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
        setContext: (id: string, context: { cwd: string; username?: string; displayName?: string; email?: string; token?: string }) => ipcRenderer.invoke('terminal:setContext', id, context),
        destroy: (id) => ipcRenderer.invoke('terminal:destroy', id),
        onData: (callback) => {
            const subscription = (_event: any, data: { id: string; data: string }) => callback(data);
            ipcRenderer.on('terminal:data', subscription);
            return () => ipcRenderer.removeListener('terminal:data', subscription);
        },
        onExit: (callback) => {
            const subscription = (_event: any, data: { id: string; exitCode: number }) => callback(data);
            ipcRenderer.on('terminal:exit', subscription);
            return () => ipcRenderer.removeListener('terminal:exit', subscription);
        },
        removeDataListener: () => {
            ipcRenderer.removeAllListeners('terminal:data');
        },
        removeExitListener: () => {
            ipcRenderer.removeAllListeners('terminal:exit');
        },
    },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
