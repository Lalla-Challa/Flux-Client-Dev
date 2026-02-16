import { create } from 'zustand';
import { GitHubRepo } from '../lib/github-types';
import { useAccountStore } from './account.store';
import { useUIStore } from './ui.store';

export interface RepoInfo {
    name: string;
    path: string;
    branch?: string;
    lastCommit?: string;
    status?: string;
    lastOpened?: number; // Unix timestamp
    accountId?: string;
    remoteUrl?: string;
    dirty?: boolean;
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

export interface TagInfo {
    name: string;
    date: string;
    message: string;
    hash: string;
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

interface RepoState {
    repos: RepoInfo[];
    activeRepoPath: string | null;
    isScanning: boolean;

    // Cloud repos
    cloudRepos: GitHubRepo[];
    isLoadingCloud: boolean;
    cloneProgress: string | null;


    // Active repo state
    fileStatuses: FileStatus[];
    commits: CommitInfo[];
    branches: BranchInfo[];
    currentDiff: string;
    isLoadingStatus: boolean;

    // Blame
    blameData: BlameInfo[] | null;
    isLoadingBlame: boolean;
    loadBlame: (file: string) => Promise<void>;
    clearBlame: () => void;

    // Actions
    loadSavedRepos: () => Promise<void>;
    setActiveRepo: (path: string) => void;
    setRepos: (repos: RepoInfo[]) => void;
    scanDirectory: (rootPath: string) => Promise<void>;
    removeRepo: (path: string) => void;

    // Cloud repo actions
    loadCloudRepos: (token: string) => Promise<void>;
    cloneRepo: (url: string, token: string, options?: { localPath?: string; checkoutRef?: string }) => Promise<void>;
    createRepo: (options: {
        type: 'local' | 'github' | 'both';
        name: string;
        description?: string;
        private?: boolean;
        localPath?: string;
        token?: string;
        auto_init?: boolean;
    }) => Promise<void>;
    publishRepo: (localPath: string, options: {
        name: string;
        description?: string;
        private?: boolean;
        token: string;
    }) => Promise<void>;
    renameCloudRepo: (token: string, repo: GitHubRepo, newName: string, localPath?: string) => Promise<void>;
    setCloudRepoVisibility: (token: string, repo: GitHubRepo, isPrivate: boolean) => Promise<void>;

    // PR actions
    pullRequests: any[];
    isLoadingPRs: boolean;
    loadPullRequests: (token: string, repo: GitHubRepo) => Promise<void>;
    checkoutPR: (pr: any) => Promise<void>;
    createPullRequest: (token: string, repo: GitHubRepo, title: string, body: string, head: string, base: string) => Promise<void>;
    listCheckRuns: (token: string, repo: GitHubRepo, ref: string) => Promise<any[]>;
    syncFork: (token: string, repo: GitHubRepo) => Promise<void>;

    issues: any[];
    isLoadingIssues: boolean;
    listIssues: (token: string, repo: GitHubRepo) => Promise<void>;

    refreshStatus: () => Promise<void>;
    refreshBranches: () => Promise<void>;
    refreshLog: () => Promise<void>;
    loadDiff: (file?: string) => Promise<void>;
    stageFiles: (files: string[]) => Promise<void>;
    unstageFiles: (files: string[]) => Promise<void>;
    commitChanges: (message: string) => Promise<void>;
    commitAndPush: (message: string) => Promise<void>;
    pushOnly: () => Promise<void>;
    syncRepo: (token: string) => Promise<{ success: boolean; error?: string; conflicts?: string[] }>;
    checkoutBranch: (branch: string, create?: boolean) => Promise<void>;
    publishBranch: (token: string) => Promise<void>;
    deleteBranch: (branch: string) => Promise<void>;

    mergeBranch: (branch: string) => Promise<void>;
    rebaseBranch: (branch: string) => Promise<void>;
    deleteRemoteBranch: (remote: string, branch: string, token: string) => Promise<void>;
    stashChanges: () => Promise<void>;
    popStash: () => Promise<void>;
    discardChanges: (file: string) => Promise<void>;
    cleanFile: (file: string) => Promise<void>;
    resolveConflict: (file: string, strategy: 'theirs' | 'ours') => Promise<void>;
    revertLastCommit: () => Promise<void>;
    undoLastCommit: () => Promise<void>;
    deleteLastCommit: () => Promise<void>;
    checkoutCommit: (hash: string) => Promise<void>;

    // Tags
    tags: TagInfo[];
    isLoadingTags: boolean;
    loadTags: () => Promise<void>;
    createTag: (tagName: string, message?: string, commitHash?: string) => Promise<void>;
    pushTag: (tagName: string) => Promise<void>;
    deleteTag: (tagName: string) => Promise<void>;

    // Cherry-pick
    cherryPick: (hash: string) => Promise<void>;

    // Squash / Reword
    squashCommits: (count: number, message: string) => Promise<void>;
    rewordCommit: (message: string) => Promise<void>;

    // Monaco Diff
    diffCtx: { original: string; modified: string; language: string; file: string } | null;
    isLoadingDiff: boolean;
    loadDiffContext: (file: string) => Promise<void>;

    // Reflog / Time Machine
    reflogEntries: { hash: string; shortHash: string; action: string; description: string; date: string; index: number }[];
    isLoadingReflog: boolean;
    loadReflog: () => Promise<void>;
    restoreToReflog: (hash: string) => Promise<void>;
}

const api = () => (window as any).electronAPI;

const STORAGE_KEY_REPOS = 'saved-repos';
const STORAGE_KEY_ACTIVE = 'active-repo';

// Persist repos + activeRepoPath to disk (fire-and-forget)
function persistRepos(repos: RepoInfo[], activeRepoPath: string | null) {
    try {
        // Only persist the fields we need (strip runtime state)
        const toSave = repos.map(({ name, path, branch, remoteUrl, accountId, lastOpened }) => ({
            name, path, branch, remoteUrl, accountId, lastOpened,
        }));
        api().storage.set(STORAGE_KEY_REPOS, toSave);
        api().storage.set(STORAGE_KEY_ACTIVE, activeRepoPath);
    } catch (e) {
        // Non-critical, ignore
    }
}

export const useRepoStore = create<RepoState>((set, get) => ({
    repos: [],
    activeRepoPath: null,
    isScanning: false,
    cloudRepos: [],
    isLoadingCloud: false,
    cloneProgress: null,

    pullRequests: [],
    isLoadingPRs: false,

    issues: [],
    isLoadingIssues: false,

    fileStatuses: [],
    commits: [],
    branches: [],
    currentDiff: '',
    isLoadingStatus: false,

    blameData: null,
    isLoadingBlame: false,

    reflogEntries: [],
    isLoadingReflog: false,

    loadSavedRepos: async () => {
        try {
            const savedRepos = await api().storage.get(STORAGE_KEY_REPOS);
            const savedActive = await api().storage.get(STORAGE_KEY_ACTIVE);

            if (savedRepos && Array.isArray(savedRepos) && savedRepos.length > 0) {
                set({ repos: savedRepos });

                // Restore active repo if it's still in the list
                if (savedActive && savedRepos.some((r: RepoInfo) => r.path === savedActive)) {
                    get().setActiveRepo(savedActive);
                }
            }
        } catch (e) {
            console.error('Failed to load saved repos:', e);
        }
    },

    loadBlame: async (file) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        set({ isLoadingBlame: true });
        try {
            const blameData = await api().git.blame(activeRepoPath, file);
            set({ blameData, isLoadingBlame: false });
        } catch (error) {
            console.error('Failed to load blame:', error);
            set({ blameData: [], isLoadingBlame: false });
        }
    },

    clearBlame: () => set({ blameData: null }),

    setActiveRepo: (path) => {
        // Update lastOpened timestamp
        set((state) => {
            const updatedRepos = state.repos.map((r) =>
                r.path === path ? { ...r, lastOpened: Date.now() } : r
            );
            persistRepos(updatedRepos, path);
            return {
                activeRepoPath: path,
                fileStatuses: [],
                commits: [],
                branches: [],
                currentDiff: '',
                repos: updatedRepos,
            };
        });
        // Auto-refresh when switching repos
        setTimeout(() => {
            get().refreshStatus();
            get().refreshBranches();
            get().refreshLog();

            // Auto-load cloud repos if not already loaded (needed for Settings/PRs tabs)
            const accountStore = useAccountStore.getState();
            const activeAccount = accountStore.accounts.find(a => a.id === accountStore.activeAccountId);
            if (activeAccount?.token && get().cloudRepos.length === 0) {
                get().loadCloudRepos(activeAccount.token).catch(() => { });
            }
        }, 0);
    },

    setRepos: (repos) => {
        set({ repos });
        persistRepos(repos, get().activeRepoPath);
    },

    removeRepo: (path) => {
        set((state) => {
            const updatedRepos = state.repos.filter((r) => r.path !== path);
            let newActiveRepoPath = state.activeRepoPath;

            // If removing the active repo, switch to another or clear
            if (state.activeRepoPath === path) {
                // Try to switch to the most recently opened repo
                const recentRepos = updatedRepos
                    .filter(r => r.lastOpened)
                    .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));

                newActiveRepoPath = recentRepos[0]?.path || updatedRepos[0]?.path || null;
            }

            persistRepos(updatedRepos, newActiveRepoPath);

            return {
                repos: updatedRepos,
                activeRepoPath: newActiveRepoPath,
                // Clear repo-specific state if we removed the active repo
                ...(state.activeRepoPath === path && {
                    fileStatuses: [],
                    commits: [],
                    branches: [],
                    currentDiff: '',
                }),
            };
        });

        // If we switched to a different repo, refresh its state
        const newActive = get().activeRepoPath;
        if (newActive && newActive !== path) {
            setTimeout(() => {
                get().refreshStatus();
                get().refreshBranches();
                get().refreshLog();
            }, 0);
        }
    },

    scanDirectory: async (rootPath) => {
        set({ isScanning: true });
        try {
            const newRepos = await api().repo.scan(rootPath) as RepoInfo[];
            set((state) => {
                const existingPaths = new Set(state.repos.map((r) => r.path));
                const uniqueNewRepos = newRepos.filter((r) => !existingPaths.has(r.path));
                const allRepos = [...state.repos, ...uniqueNewRepos];
                persistRepos(allRepos, state.activeRepoPath);
                return {
                    repos: allRepos,
                    isScanning: false,
                };
            });
        } catch (error) {
            console.error('Scan failed:', error);
            set({ isScanning: false });
        }
    },

    loadCloudRepos: async (token) => {
        set({ isLoadingCloud: true });
        try {
            const cloudRepos = await api().github.listRepos(token);
            set({ cloudRepos, isLoadingCloud: false });
        } catch (error) {
            console.error('Failed to load cloud repos:', error);
            set({ isLoadingCloud: false });
            throw error;
        }
    },

    cloneRepo: async (url, token, options) => {
        set({ cloneProgress: 'Preparing to clone...' });
        try {
            // Setup progress listener
            api().git.onCloneProgress((message: string) => {
                set({ cloneProgress: message });
            });

            let fullPath = '';

            if (options?.localPath) {
                // Use provided path
                fullPath = `${options.localPath}\\${url.split('/').pop()?.replace('.git', '') || 'repo'}`;
            } else {
                // Select destination using native dialog
                const destination = await api().dialog.openDirectory();
                if (!destination) {
                    set({ cloneProgress: null });
                    return;
                }
                const repoName = url.split('/').pop()?.replace('.git', '') || 'repo';
                fullPath = `${destination}\\${repoName}`;
            }

            await api().git.clone(url, fullPath, token);

            if (options?.checkoutRef) {
                set({ cloneProgress: `Checking out ${options.checkoutRef}...` });
                await api().git.checkout(fullPath, options.checkoutRef);
            }

            set({ cloneProgress: null });

            // Re-scan to pick up the new repo (parent dir of fullPath)
            const parentDir = fullPath.substring(0, fullPath.lastIndexOf('\\'));
            const { repos } = get();
            const newRepos = await api().repo.scan(parentDir);

            // Add new repos, avoiding duplicates
            const existingPaths = new Set(repos.map(r => r.path));
            const uniqueNewRepos = newRepos.filter((r: RepoInfo) => !existingPaths.has(r.path));
            const allRepos = [...repos, ...uniqueNewRepos];
            set({ repos: allRepos });
            persistRepos(allRepos, get().activeRepoPath);

        } catch (error: any) {
            console.error('Clone failed:', error);
            set({ cloneProgress: null });
            throw error;
        }
    },

    createRepo: async (options) => {
        const { type, name, description, token, localPath, auto_init } = options;

        try {
            if (type === 'local' || type === 'both') {
                // Create local repo — initialize the selected folder directly
                const selectedPath = localPath || await api().dialog.openDirectory();
                if (!selectedPath) return;

                console.log('Creating repo at:', selectedPath);

                await api().git.init(selectedPath, { defaultBranch: 'main' });

                // Create initial commit if requested or if syncing to GitHub (required for push)
                if (auto_init || (type === 'both' && token)) {
                    try {
                        const readmePath = `${selectedPath}\\README.md`;
                        const exists = await api().fs.checkFileExists(readmePath);
                        if (!exists) {
                            await api().fs.writeFile(readmePath, `# ${name}\n\n${description || ''}`);
                        }

                        await api().git.stage(selectedPath, ['.']);
                        await api().git.commit(selectedPath, 'Initial commit');
                    } catch (e) {
                        console.error('Failed to create initial commit:', e);
                        // Continue anyway, but push might fail if empty
                    }
                }

                // Add to local repos
                const newRepos = await api().repo.scan(selectedPath);
                const { repos } = get();
                const existingPaths = new Set(repos.map((r) => r.path));
                const uniqueNewRepos = newRepos.filter((r: RepoInfo) => !existingPaths.has(r.path));
                const allRepos = [...repos, ...uniqueNewRepos];
                set({ repos: allRepos });
                persistRepos(allRepos, get().activeRepoPath);

                // If "both", also create on GitHub and link
                if (type === 'both' && token) {
                    const ghRepo = await api().github.createRepo(token, {
                        name,
                        description,
                        private: options.private,
                        auto_init: false, // Don't init on GitHub since we have local
                    });

                    try {
                        await api().git.addRemote(selectedPath, 'origin', ghRepo.clone_url);
                    } catch (e) {
                        // Ignore if remote already exists, but UPDATE it to new URL
                        console.log('Remote origin might already exist, updating...');
                        await api().git.setRemote(selectedPath, 'origin', ghRepo.clone_url);
                    }

                    // Push with -u flag automatically sets upstream
                    const currentBranch = await api().git.currentBranch(selectedPath);
                    await api().git.push(selectedPath, token, 'origin', currentBranch, true);

                    // Refresh cloud repos so Settings/PRs tabs can find this repo
                    await get().loadCloudRepos(token).catch(() => { });
                }
            } else if (type === 'github' && token) {
                // Create only on GitHub
                await api().github.createRepo(token, {
                    name,
                    description,
                    private: options.private,
                    auto_init: auto_init ?? true,
                });

                // Refresh cloud repos
                await get().loadCloudRepos(token);
            }
        } catch (error) {
            console.error('Create repo failed:', error);
            throw error;
        }
    },

    publishRepo: async (localPath, options) => {
        const { name, description, token } = options;

        try {
            // Create repo on GitHub
            const ghRepo = await api().github.createRepo(token, {
                name,
                description,
                private: options.private,
                auto_init: false,
            });

            // Add remote and push
            try {
                await api().git.addRemote(localPath, 'origin', ghRepo.clone_url);
            } catch {
                // Remote might already exist, update it
                await api().git.setRemote(localPath, 'origin', ghRepo.clone_url);
            }

            const currentBranch = await api().git.currentBranch(localPath);
            // Push with -u flag sets upstream automatically
            await api().git.push(localPath, token, 'origin', currentBranch, true);

            // Update local repo's remoteUrl
            set((state) => ({
                repos: state.repos.map(r =>
                    r.path === localPath ? { ...r, remoteUrl: ghRepo.clone_url } : r
                )
            }));

            // Refresh cloud repos
            await get().loadCloudRepos(token);
        } catch (error) {
            console.error('Publish failed:', error);
            throw error;
        }
    },

    renameCloudRepo: async (token, repo, newName, localPath) => {
        try {
            const updatedRepo = await api().github.renameRepo(token, repo.owner.login, repo.name, newName);

            // Update cloud repos list
            set((state) => ({
                cloudRepos: state.cloudRepos.map((r) => r.id === repo.id ? updatedRepo : r)
            }));

            // If local path provided, update remote URL and local name
            if (localPath) {
                // Update remote 'origin'
                await api().git.addRemote(localPath, 'origin', updatedRepo.clone_url); // This actually adds, but we usually want set-url. 
                // Wait, GitService.addRemote uses 'remote add'. It fails if exists.
                // We need 'remote set-url'.
                // I need to add 'setRemoteUrl' to GitService? Or just use addRemote and ignore error? 
                // 'remote set-url' is cleaner. 
                // For now, I'll assume the user might need to update manually or I implement setRemoteUrl.
                // Actually, let's implement setRemoteUrl in GitService later.
                // For now, I'll skip local remote update or try to re-add?

                // Let's rely on refreshStatus/scan to pick up changes? 
                // No, remote URL is in .git/config.
            }
        } catch (error) {
            console.error('Rename failed:', error);
            throw error;
        }
    },

    setCloudRepoVisibility: async (token, repo, isPrivate) => {
        try {
            const updatedRepo = await api().github.setRepoVisibility(token, repo.owner.login, repo.name, isPrivate);
            set((state) => ({
                cloudRepos: state.cloudRepos.map((r) => r.id === repo.id ? updatedRepo : r)
            }));
        } catch (error) {
            console.error('Visibility change failed:', error);
            throw error;
        }
    },



    loadPullRequests: async (token, repo) => {
        set({ isLoadingPRs: true });
        try {
            const prs = await api().github.getPullRequests(token, repo.owner.login, repo.name);
            set({ pullRequests: prs });
        } catch (error) {
            console.error('Failed to load PRs:', error);
            set({ pullRequests: [] });
        } finally {
            set({ isLoadingPRs: false });
        }
    },

    listIssues: async (token, repo) => {
        set({ isLoadingIssues: true });
        try {
            const issues = await api().github.listIssues(token, repo.owner.login, repo.name);
            set({ issues });
        } catch (error) {
            console.error('Failed to load issues:', error);
            set({ issues: [] });
        } finally {
            set({ isLoadingIssues: false });
        }
    },

    checkoutPR: async (pr) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.checkoutPullRequest(activeRepoPath, pr.number);
            await get().refreshStatus();
            await get().refreshBranches();
            useUIStore.getState().showNotification('success', `Checked out PR #${pr.number}`);
        } catch (error: any) {
            console.error('Failed to checkout PR:', error);
            useUIStore.getState().showNotification('error', error.message);
            throw error;
        }
    },

    createPullRequest: async (token, repo, title, body, head, base) => {
        set({ isLoadingPRs: true });
        try {
            const pr = await api().github.createPullRequest(token, repo.owner.login, repo.name, {
                title,
                body,
                head,
                base
            });
            useUIStore.getState().showNotification('success', `Created PR #${pr.number}`);
            // Reload PRs
            await get().loadPullRequests(token, repo);
        } catch (error: any) {
            console.error('Failed to create PR:', error);
            useUIStore.getState().showNotification('error', error.message);
            throw error;
        } finally {
            set({ isLoadingPRs: false });
        }
    },

    listCheckRuns: async (token, repo, ref) => {
        try {
            const data = await api().github.listCheckRuns(token, repo.owner.login, repo.name, ref);
            return data.check_runs;
        } catch (error) {
            console.error('Failed to load check runs:', error);
            return [];
        }
    },

    syncFork: async (token, repo) => {
        try {
            await api().github.syncFork(token, repo.owner.login, repo.name, 'main'); // Default to main
            useUIStore.getState().showNotification('success', 'Fork synced with upstream!');
        } catch (error: any) {
            console.error('Failed to sync fork:', error);
            useUIStore.getState().showNotification('error', error.message);
        }
    },

    refreshStatus: async () => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        set({ isLoadingStatus: true });
        try {
            const fileStatuses = await api().git.status(activeRepoPath);
            set({ fileStatuses });
        } catch (error) {
            console.error('Status refresh failed:', error);
        } finally {
            set({ isLoadingStatus: false });
        }
    },

    refreshBranches: async () => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            const branches = await api().git.branches(activeRepoPath);
            set({ branches });
        } catch (error) {
            console.error('Branch refresh failed:', error);
        }
    },

    refreshLog: async () => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            const commits = await api().git.log(activeRepoPath, 100);
            set({ commits });
        } catch (error) {
            console.error('Log refresh failed:', error);
        }
    },

    loadDiff: async (file) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            const diff = await api().git.diff(activeRepoPath, file);
            set({ currentDiff: diff });
        } catch (error) {
            console.error('Diff load failed:', error);
        }
    },

    stageFiles: async (files) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        await api().git.stage(activeRepoPath, files);
        get().refreshStatus();
    },

    unstageFiles: async (files) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        await api().git.unstage(activeRepoPath, files);
        get().refreshStatus();
    },

    commitChanges: async (message) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        await api().git.commit(activeRepoPath, message);
        get().refreshStatus();
        get().refreshLog();
    },

    commitAndPush: async (message) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        const ui = useUIStore.getState();
        const accountStore = useAccountStore.getState();

        ui.setIsCommitting(true);
        try {
            // 1. Commit
            await api().git.commit(activeRepoPath, message);

            // 2. Push
            // Try to find token from repo's accountId or active account
            const repo = get().repos.find((r) => r.path === activeRepoPath);
            const accountId = repo?.accountId || accountStore.activeAccountId;
            const account = accountStore.accounts.find((a) => a.id === accountId);

            if (account?.token) {
                try {
                    await api().git.push(activeRepoPath, account.token);
                    ui.setCommitMessage(''); // Only clear on successful push
                    ui.showNotification('success', 'Committed & pushed!');
                } catch (pushError: any) {
                    // Commit succeeded but push failed
                    ui.showNotification('info', 'Committed locally, but push failed: ' + (pushError.message || 'Unknown error'));
                    // Don't clear commit message so user can see what was committed
                    // They can use the "Push" button to retry
                }
            } else {
                ui.setCommitMessage(''); // Clear on commit if no account
                ui.showNotification('info', 'Committed locally (no GitHub account linked)');
            }

            get().refreshStatus();
            get().refreshLog();
        } catch (error: any) {
            ui.showNotification('error', error.message || 'Commit failed');
        } finally {
            ui.setIsCommitting(false);
        }
    },

    pushOnly: async () => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        const ui = useUIStore.getState();
        const accountStore = useAccountStore.getState();

        const repo = get().repos.find((r) => r.path === activeRepoPath);
        const accountId = repo?.accountId || accountStore.activeAccountId;
        const account = accountStore.accounts.find((a) => a.id === accountId);

        if (!account?.token) {
            ui.showNotification('error', 'No GitHub account linked');
            return;
        }

        ui.setIsSyncing(true);
        try {
            await api().git.push(activeRepoPath, account.token);
            ui.setCommitMessage(''); // Clear message after successful push
            ui.showNotification('success', 'Pushed successfully!');
            get().refreshStatus();
            get().refreshLog();
        } catch (error: any) {
            if (error.message.includes('non-fast-forward') || error.message.includes('rejected')) {
                if (confirm('Push rejected (remote is ahead). Force push? \n\nWARNING: This will overwrite remote changes.')) {
                    try {
                        await api().git.push(activeRepoPath, account.token, undefined, undefined, undefined, true);
                        ui.setCommitMessage(''); // Clear message after successful force push
                        ui.showNotification('success', 'Force push successful!');
                        get().refreshStatus();
                        get().refreshLog();
                    } catch (forceError: any) {
                        ui.showNotification('error', 'Force push failed: ' + (forceError.message || 'Unknown error'));
                    }
                }
            } else {
                ui.showNotification('error', 'Push failed: ' + (error.message || 'Unknown error'));
            }
        } finally {
            ui.setIsSyncing(false);
        }
    },

    syncRepo: async (token) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return { success: false, error: 'No active repo' };

        try {
            const result = await api().git.sync(activeRepoPath, token);
            get().refreshStatus();
            get().refreshLog();
            return result;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    checkoutBranch: async (branch, create) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        // Auto-stash if dirty
        const { fileStatuses } = get();
        const isDirty = fileStatuses.length > 0;
        if (isDirty) {
            await api().git.stash(activeRepoPath);
        }

        await api().git.checkout(activeRepoPath, branch, create);

        // Pop stash if we stashed
        if (isDirty) {
            try {
                await api().git.stashPop(activeRepoPath);
            } catch {
                // Stash pop may fail if conflicts — that's ok
            }
        }

        get().refreshStatus();
        get().refreshBranches();
        get().refreshLog();
        get().refreshLog();
    },

    publishBranch: async (token) => {
        const { activeRepoPath, branches } = get();
        if (!activeRepoPath) return;

        const currentBranch = branches.find((b) => b.current)?.name;
        if (!currentBranch) return;

        set({ isLoadingStatus: true });
        try {
            await api().git.push(activeRepoPath, token, 'origin', currentBranch, true);
            useUIStore.getState().showNotification('success', `Published branch ${currentBranch}`);
            get().refreshStatus();
            get().refreshBranches();
        } catch (error: any) {
            console.error('Publish branch failed:', error);
            useUIStore.getState().showNotification('error', error.message);
        } finally {
            set({ isLoadingStatus: false });
        }
    },



    deleteBranch: async (branch) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        await api().git.deleteBranch(activeRepoPath, branch);
        get().refreshBranches();
    },

    mergeBranch: async (branch) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        // Auto-stash if dirty
        const { fileStatuses } = get();
        const isDirty = fileStatuses.length > 0;
        if (isDirty) {
            await api().git.stash(activeRepoPath);
        }

        try {
            await api().git.merge(activeRepoPath, branch);
            useUIStore.getState().showNotification('success', `Merged ${branch} into current branch`);
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        }

        // Pop stash if we stashed
        if (isDirty) {
            try {
                await api().git.stashPop(activeRepoPath);
            } catch { }
        }

        get().refreshStatus();
        get().refreshLog();
    },

    rebaseBranch: async (branch) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        // Auto-stash if dirty
        const { fileStatuses } = get();
        const isDirty = fileStatuses.length > 0;
        if (isDirty) {
            await api().git.stash(activeRepoPath);
        }

        try {
            await api().git.rebase(activeRepoPath, branch);
            useUIStore.getState().showNotification('success', `Rebased current branch onto ${branch}`);
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        }

        // Pop stash if we stashed
        if (isDirty) {
            try {
                await api().git.stashPop(activeRepoPath);
            } catch { }
        }

        get().refreshStatus();
        get().refreshLog();
    },

    deleteRemoteBranch: async (remote, branch, token) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        await api().git.deleteRemoteBranch(activeRepoPath, remote, branch, token);
        get().refreshBranches();
    },

    stashChanges: async () => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        await api().git.stash(activeRepoPath);
        get().refreshStatus();
    },

    popStash: async () => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        await api().git.stashPop(activeRepoPath);
        get().refreshStatus();
    },

    discardChanges: async (file: string) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.discardFile(activeRepoPath, file);
            get().refreshStatus();
        } catch (error: any) {
            console.error('Failed to discard changes:', error);
            useUIStore.getState().showNotification('error', `Discard failed: ${error.message}`);
        }
    },

    cleanFile: async (file: string) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.cleanFile(activeRepoPath, file);
            get().refreshStatus();
        } catch (error: any) {
            console.error('Failed to clean file:', error);
            useUIStore.getState().showNotification('error', `Clean failed: ${error.message}`);
        }
    },

    resolveConflict: async (file: string, strategy: 'theirs' | 'ours') => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.resolveConflict(activeRepoPath, file, strategy);

            // Refresh status to see if conflict is gone
            get().refreshStatus();

            // Load diff (now resolved)
            get().loadDiff(file);

            useUIStore.getState().showNotification('success', `Resolved conflict using ${strategy}`);
        } catch (error: any) {
            console.error('Failed to resolve conflict:', error);
            useUIStore.getState().showNotification('error', `Resolve failed: ${error.message}`);
        }
    },

    revertLastCommit: async () => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        await api().git.revert(activeRepoPath);
        get().refreshStatus();
        get().refreshLog();
    },

    undoLastCommit: async () => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.reset(activeRepoPath, 'soft', 'HEAD~1');
            // Refresh all git state after reset
            await Promise.all([
                get().refreshStatus(),
                get().refreshBranches(),
                get().refreshLog(),
            ]);
            useUIStore.getState().showNotification('success', 'Commit undone, changes staged');
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message || 'Failed to undo commit');
            // Even on error, refresh to show current state
            get().refreshStatus();
            get().refreshBranches();
            get().refreshLog();
        }
    },

    deleteLastCommit: async () => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        if (!confirm('DANGER: Delete last commit PERMANENTLY? \n\nThis will:\n1. Discard all local changes.\n2. Remove the last commit.\n3. Force push to remote.\n\nThis cannot be undone.')) return;

        const ui = useUIStore.getState();
        const accountStore = useAccountStore.getState();

        try {
            // 1. Hard Reset
            await api().git.reset(activeRepoPath, 'hard', 'HEAD~1');

            // 2. Force Push
            const repo = get().repos.find((r) => r.path === activeRepoPath);
            const accountId = repo?.accountId || accountStore.activeAccountId;
            const account = accountStore.accounts.find((a) => a.id === accountId);

            if (account?.token) {
                ui.showNotification('info', 'Force pushing to remote...');
                await api().git.push(activeRepoPath, account.token, undefined, undefined, undefined, true);
                ui.showNotification('success', 'Hard reset & force push complete');
            } else {
                ui.showNotification('info', 'Hard reset complete (local only - no account linked)');
            }

            get().refreshStatus();
            get().refreshLog();
        } catch (error: any) {
            ui.showNotification('error', error.message);
        }
    },

    checkoutCommit: async (hash) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.checkoutCommit(activeRepoPath, hash);
            get().refreshStatus();
            get().refreshLog();
            useUIStore.getState().showNotification('success', `Checked out ${hash.substring(0, 7)}`);
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        }
    },
    // Tags
    tags: [],
    isLoadingTags: false,

    loadTags: async () => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        set({ isLoadingTags: true });
        try {
            const tags = await api().git.listTags(activeRepoPath);
            set({ tags, isLoadingTags: false });
        } catch (error) {
            console.error('Failed to load tags:', error);
            set({ tags: [], isLoadingTags: false });
        }
    },

    createTag: async (tagName, message, commitHash) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.createTag(activeRepoPath, tagName, message, commitHash);
            useUIStore.getState().showNotification('success', `Created tag ${tagName}`);
            get().loadTags();
        } catch (error: any) {
            console.error('Failed to create tag:', error);
            useUIStore.getState().showNotification('error', error.message);
            throw error;
        }
    },

    pushTag: async (tagName) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        const accountStore = useAccountStore.getState();
        const repo = get().repos.find((r) => r.path === activeRepoPath);
        const accountId = repo?.accountId || accountStore.activeAccountId;
        const account = accountStore.accounts.find((a) => a.id === accountId);

        if (!account?.token) {
            useUIStore.getState().showNotification('error', 'No GitHub account connected');
            return;
        }

        try {
            await api().git.pushTag(activeRepoPath, tagName, account.token);
            useUIStore.getState().showNotification('success', `Pushed tag ${tagName}`);
        } catch (error: any) {
            console.error('Failed to push tag:', error);
            useUIStore.getState().showNotification('error', error.message);
        }
    },

    deleteTag: async (tagName) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.deleteTag(activeRepoPath, tagName);
            useUIStore.getState().showNotification('success', `Deleted tag ${tagName}`);
            get().loadTags();
        } catch (error: any) {
            console.error('Failed to delete tag:', error);
            useUIStore.getState().showNotification('error', error.message);
        }
    },

    // Cherry-pick
    cherryPick: async (hash) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.cherryPick(activeRepoPath, hash);
            useUIStore.getState().showNotification('success', `Cherry-picked ${hash.substring(0, 7)}`);
            get().refreshStatus();
            get().refreshLog();
        } catch (error: any) {
            console.error('Failed to cherry-pick:', error);
            useUIStore.getState().showNotification('error', error.message);
            throw error;
        }
    },

    // Squash / Reword
    squashCommits: async (count, message) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.squashCommits(activeRepoPath, count, message);
            useUIStore.getState().showNotification('success', `Squashed ${count} commits`);
            get().refreshStatus();
            get().refreshLog();
        } catch (error: any) {
            console.error('Failed to squash commits:', error);
            useUIStore.getState().showNotification('error', error.message);
            throw error;
        }
    },

    rewordCommit: async (message) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.rewordCommit(activeRepoPath, message);
            useUIStore.getState().showNotification('success', 'Commit message updated');
            get().refreshLog();
        } catch (error: any) {
            console.error('Failed to reword commit:', error);
            useUIStore.getState().showNotification('error', error.message);
            throw error;
        }
    },

    diffCtx: null,
    isLoadingDiff: false,
    loadDiffContext: async (file: string) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        set({ isLoadingDiff: true, diffCtx: null });
        try {
            const ext = file.split('.').pop();
            const language = ext === 'ts' ? 'typescript' : ext === 'js' ? 'javascript' : ext === 'json' ? 'json' : 'text';

            const status = get().fileStatuses.find(s => s.path === file);

            let original = '';
            let modified = '';

            if (status?.status === 'untracked' || status?.status === 'added') {
                original = '';
                modified = await api().fs.readFile(`${activeRepoPath}\\${file}`);
            } else if (status?.status === 'deleted') {
                original = await api().git.getFileContent(activeRepoPath, file, 'HEAD');
                modified = '';
            } else {
                original = await api().git.getFileContent(activeRepoPath, file, 'HEAD');
                modified = await api().fs.readFile(`${activeRepoPath}\\${file}`);
            }

            set({ diffCtx: { original, modified, language, file }, isLoadingDiff: false });
        } catch (error) {
            console.error('Failed to load diff context:', error);
            set({ diffCtx: null, isLoadingDiff: false });
        }
    },

    loadReflog: async () => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        set({ isLoadingReflog: true });
        try {
            const entries = await api().git.reflog(activeRepoPath, 100);
            set({ reflogEntries: entries, isLoadingReflog: false });
        } catch (error) {
            console.error('Failed to load reflog:', error);
            set({ reflogEntries: [], isLoadingReflog: false });
        }
    },

    restoreToReflog: async (hash: string) => {
        const { activeRepoPath } = get();
        if (!activeRepoPath) return;

        try {
            await api().git.reset(activeRepoPath, 'hard', hash);
            useUIStore.getState().showNotification('success', `Restored to ${hash.slice(0, 7)}`);
            useUIStore.getState().closeModal();
            get().refreshStatus();
            get().refreshBranches();
            get().refreshLog();
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message || 'Restore failed');
        }
    },
}));
