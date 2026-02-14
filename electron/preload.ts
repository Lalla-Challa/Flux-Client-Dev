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
        checkFileExists: (path: string) => Promise<boolean>;
    };
}

export interface Account {
    id: string;
    username: string;
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
        checkFileExists: (path: string) => ipcRenderer.invoke('fs:exists', path),
    },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
