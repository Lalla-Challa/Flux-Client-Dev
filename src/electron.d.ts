import { GitHubRepo, CreateRepoOptions, UpdateRepoOptions } from './lib/github-types';
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
    };
    dialog: {
        openDirectory: () => Promise<string | null>;
    };
    fs: {
        writeFile: (path: string, content: string) => Promise<void>;
        checkFileExists: (path: string) => Promise<boolean>;
    };
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
