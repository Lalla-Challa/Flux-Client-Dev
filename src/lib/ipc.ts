/**
 * Typed IPC wrappers for renderer process.
 * These provide type-safe access to Electron APIs exposed via preload.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAPI = () => (window as any).electronAPI;

// ─── Window ──────────────────────────────────────────────────────

export const windowAPI = {
    minimize: () => getAPI()?.window?.minimize(),
    maximize: () => getAPI()?.window?.maximize(),
    close: () => getAPI()?.window?.close(),
};

// ─── Auth ────────────────────────────────────────────────────────

export const authAPI = {
    login: () => getAPI()?.auth?.login() as Promise<{ url: string }>,
    getAccounts: () => getAPI()?.auth?.getAccounts() as Promise<any[]>,
    removeAccount: (username: string) => getAPI()?.auth?.removeAccount(username),
    getToken: (username: string) =>
        getAPI()?.auth?.getToken(username) as Promise<string | null>,
    onCallback: (callback: (data: any) => void) =>
        getAPI()?.auth?.onCallback(callback),
};

// ─── Repo ────────────────────────────────────────────────────────

export const repoAPI = {
    scan: (rootPath: string) =>
        getAPI()?.repo?.scan(rootPath) as Promise<any[]>,
    detectAccount: (repoPath: string) =>
        getAPI()?.repo?.detectAccount(repoPath) as Promise<string | null>,
};

// ─── Git ─────────────────────────────────────────────────────────

export const gitAPI = {
    status: (repoPath: string) => getAPI()?.git?.status(repoPath),
    stage: (repoPath: string, files: string[]) =>
        getAPI()?.git?.stage(repoPath, files),
    unstage: (repoPath: string, files: string[]) =>
        getAPI()?.git?.unstage(repoPath, files),
    commit: (repoPath: string, message: string) =>
        getAPI()?.git?.commit(repoPath, message),
    push: (repoPath: string, token: string, remote?: string, branch?: string) =>
        getAPI()?.git?.push(repoPath, token, remote, branch),
    pull: (repoPath: string, token: string) =>
        getAPI()?.git?.pull(repoPath, token),
    sync: (repoPath: string, token: string) =>
        getAPI()?.git?.sync(repoPath, token),
    diff: (repoPath: string, file?: string) =>
        getAPI()?.git?.diff(repoPath, file),
    log: (repoPath: string, limit?: number) =>
        getAPI()?.git?.log(repoPath, limit),
    branches: (repoPath: string) => getAPI()?.git?.branches(repoPath),
    checkout: (repoPath: string, branch: string, create?: boolean) =>
        getAPI()?.git?.checkout(repoPath, branch, create),
    deleteBranch: (repoPath: string, branch: string) =>
        getAPI()?.git?.deleteBranch(repoPath, branch),
    stash: (repoPath: string) => getAPI()?.git?.stash(repoPath),
    stashPop: (repoPath: string) => getAPI()?.git?.stashPop(repoPath),
    revert: (repoPath: string) => getAPI()?.git?.revert(repoPath),
    currentBranch: (repoPath: string) =>
        getAPI()?.git?.currentBranch(repoPath),
    remoteUrl: (repoPath: string) => getAPI()?.git?.remoteUrl(repoPath),
};

// ─── Shell ───────────────────────────────────────────────────────

export const shellAPI = {
    openExternal: (url: string) => getAPI()?.shell?.openExternal(url),
    openPath: (path: string) => getAPI()?.shell?.openPath(path),
};
