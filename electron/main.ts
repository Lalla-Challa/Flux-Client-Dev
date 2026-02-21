import * as path from 'path';

// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const dotenv = require('dotenv');
        dotenv.config({ path: path.join(__dirname, '..', '.env') });
    } catch (e) {
        // dotenv not available, skip
    }
}


import { app, BrowserWindow, ipcMain, protocol, shell } from 'electron';
import { GitService } from './services/git.service';
import { AuthService } from './services/auth.service';
import { RepoScannerService } from './services/repo-scanner.service';
import { GitHubService } from './services/github.service';
import { UpdaterService } from './services/updater.service';
import { TerminalService } from './services/terminal.service';
import { AgentService } from './services/agent.service';

let mainWindow: BrowserWindow | null = null;
const gitService = new GitService();
const authService = new AuthService();
const repoScanner = new RepoScannerService(gitService);
const githubService = new GitHubService();
const updaterService = new UpdaterService();
const terminalService = new TerminalService();
const agentService = new AgentService(gitService);

const isDev = !app.isPackaged;

function createWindow(): void {
    logStartup('Creating window...');
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        frame: false,
        icon: path.join(__dirname, '../resources/logo.png'),
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#09090b',
            symbolColor: '#a1a1aa',
            height: 36,
        },
        backgroundColor: '#09090b',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
        show: true, // Show immediately for debugging startup hangs
    });

    logStartup('Window object created');

    // mainWindow.once('ready-to-show', () => {
    //     mainWindow?.show();
    // });

    mainWindow.webContents.on('did-finish-load', () => {
        logStartup('Window: did-finish-load');
    });

    mainWindow.webContents.on('crashed', (e) => {
        logStartup('Window: renderer process crashed');
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        const indexHtml = path.join(__dirname, '../dist/index.html');
        logStartup(`Loading file: ${indexHtml}`);
        mainWindow.loadFile(indexHtml).catch((e) => {
            logStartup(`Failed to load index.html: ${e.message}`);
        });
    }

    mainWindow.on('closed', () => {
        logStartup('Window closed');
        mainWindow = null;
    });
}

// ─── Protocol Handler for OAuth Callback ─────────────────────────
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('gitflow', process.execPath, [
            path.resolve(process.argv[1]),
        ]);
    }
} else {
    app.setAsDefaultProtocolClient('gitflow');
}

// simple logging for startup debugging
function logStartup(msg: string) {
    try {
        const fs = require('fs');
        const logPath = path.join(app.getPath('userData'), 'startup.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {
        // ignore
    }
}

const gotTheLock = app.requestSingleInstanceLock();
logStartup(`Acquired lock: ${gotTheLock}`);

if (!gotTheLock) {
    logStartup('Quitting because lock was not acquired');
    app.quit();
} else {
    app.on('second-instance', (_event, commandLine) => {
        logStartup('Second instance detected');
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        } else {
            // Process exists but no window (zombie or just background), create one!
            logStartup('No window found for existing process, creating new one');
            createWindow();
        }
        // Handle OAuth callback from protocol
        const url = commandLine.find((arg) => arg.startsWith('gitflow://'));
        if (url) {
            handleOAuthCallback(url);
        }
    });
}


async function handleOAuthCallback(url: string): Promise<void> {
    try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        if (code) {
            const account = await authService.exchangeCodeForToken(code);
            mainWindow?.webContents.send('auth:callback', { success: true, account });
        }
    } catch (error: any) {
        mainWindow?.webContents.send('auth:callback', {
            success: false,
            error: error.message,
        });
    }
}

// ─── IPC Handlers ────────────────────────────────────────────────

function registerIpcHandlers(): void {
    // ── Window Controls ──
    ipcMain.handle('window:minimize', () => mainWindow?.minimize());
    ipcMain.handle('window:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow?.maximize();
        }
    });
    ipcMain.handle('window:close', () => mainWindow?.close());

    // ── Dialog ──
    ipcMain.handle('dialog:openDirectory', async () => {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog(mainWindow!, {
            properties: ['openDirectory'],
            title: 'Select a folder to scan for Git repositories',
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    // ── Auth ──
    ipcMain.handle('auth:login', async () => {
        const account = await authService.initiateOAuth();
        return account;
    });
    ipcMain.handle('auth:getAccounts', async () => {
        return authService.getAccounts();
    });
    ipcMain.handle('auth:removeAccount', async (_event, username: string) => {
        return authService.removeAccount(username);
    });
    ipcMain.handle('auth:getToken', async (_event, username: string) => {
        return authService.getToken(username);
    });

    // ── Repository Scanning ──
    ipcMain.handle('repo:scan', async (_event, rootPath: string) => {
        return repoScanner.scanDirectory(rootPath);
    });
    ipcMain.handle('repo:detect-account', async (_event, repoPath: string) => {
        return repoScanner.detectAccount(repoPath, await authService.getAccounts());
    });

    // ── GitHub Operations ──
    ipcMain.handle('github:listRepos', async (_event, token: string) => {
        return githubService.getUserRepos(token);
    });
    ipcMain.handle('github:createRepo', async (_event, token: string, options: any) => {
        return githubService.createRepo(token, options);
    });
    ipcMain.handle('github:updateRepo', async (_event, token: string, owner: string, repo: string, updates: any) => {
        return githubService.updateRepo(token, owner, repo, updates);
    });
    ipcMain.handle('github:deleteRepo', async (_event, token: string, owner: string, repo: string) => {
        return githubService.deleteRepo(token, owner, repo);
    });
    ipcMain.handle('github:getRepoDetails', async (_event, token: string, owner: string, repo: string) => {
        return githubService.getRepoDetails(token, owner, repo);
    });
    ipcMain.handle('github:renameRepo', async (_event, token: string, owner: string, repo: string, newName: string) => {
        return githubService.renameRepo(token, owner, repo, newName);
    });
    ipcMain.handle('github:setRepoVisibility', async (_event, token: string, owner: string, repo: string, isPrivate: boolean) => {
        return githubService.setRepoVisibility(token, owner, repo, isPrivate);
    });
    ipcMain.handle('github:getCollaborators', async (_event, token: string, owner: string, repo: string) => {
        return githubService.getCollaborators(token, owner, repo);
    });
    ipcMain.handle('github:addCollaborator', async (_event, token: string, owner: string, repo: string, username: string) => {
        return githubService.addCollaborator(token, owner, repo, username);
    });
    ipcMain.handle('github:removeCollaborator', async (_event, token: string, owner: string, repo: string, username: string) => {
        return githubService.removeCollaborator(token, owner, repo, username);
    });
    ipcMain.handle('github:getPullRequests', async (_event, token: string, owner: string, repo: string) => {
        return githubService.getPullRequests(token, owner, repo);
    });

    ipcMain.handle('github:updateDefaultBranch', async (_event, token: string, owner: string, repo: string, branch: string) => {
        return githubService.updateDefaultBranch(token, owner, repo, branch);
    });

    ipcMain.handle('github:getProtectedBranches', async (_event, token: string, owner: string, repo: string) => {
        return githubService.getProtectedBranches(token, owner, repo);
    });

    ipcMain.handle('github:getBranchProtection', async (_event, token: string, owner: string, repo: string, branch: string) => {
        return githubService.getBranchProtection(token, owner, repo, branch);
    });

    ipcMain.handle('github:addBranchProtection', async (_event, token: string, owner: string, repo: string, branch: string, rules?: any) => {
        return githubService.addBranchProtection(token, owner, repo, branch, rules);
    });

    ipcMain.handle('github:removeBranchProtection', async (_event, token: string, owner: string, repo: string, branch: string) => {
        return githubService.removeBranchProtection(token, owner, repo, branch);
    });

    // ── Actions ──
    ipcMain.handle('github:listWorkflows', async (_event, token: string, owner: string, repo: string) => {
        return githubService.listWorkflows(token, owner, repo);
    });

    ipcMain.handle('github:listWorkflowRuns', async (_event, token: string, owner: string, repo: string, workflowId?: number) => {
        return githubService.listWorkflowRuns(token, owner, repo, workflowId);
    });

    ipcMain.handle('github:getWorkflowRunJobs', async (_event, token: string, owner: string, repo: string, runId: number) => {
        return githubService.getWorkflowRunJobs(token, owner, repo, runId);
    });

    ipcMain.handle('github:triggerWorkflow', async (_event, token: string, owner: string, repo: string, workflowId: number, ref: string, inputs?: any) => {
        return githubService.triggerWorkflow(token, owner, repo, workflowId, ref, inputs);
    });

    ipcMain.handle('github:cancelWorkflowRun', async (_event, token: string, owner: string, repo: string, runId: number) => {
        return githubService.cancelWorkflowRun(token, owner, repo, runId);
    });

    ipcMain.handle('github:rerunWorkflow', async (_event, token: string, owner: string, repo: string, runId: number) => {
        return githubService.rerunWorkflow(token, owner, repo, runId);
    });

    ipcMain.handle('github:listIssues', async (_event, token: string, owner: string, repo: string) => {
        return githubService.listIssues(token, owner, repo);
    });

    ipcMain.handle('github:createPullRequest', async (_event, token: string, owner: string, repo: string, options: any) => {
        return githubService.createPullRequest(token, owner, repo, options);
    });

    ipcMain.handle('github:listCheckRuns', async (_event, token: string, owner: string, repo: string, ref: string) => {
        return githubService.listCheckRuns(token, owner, repo, ref);
    });

    ipcMain.handle('github:syncFork', async (_event, token: string, owner: string, repo: string, branch: string) => {
        return githubService.syncFork(token, owner, repo, branch);
    });

    // ── Git Operations ──
    ipcMain.handle('git:status', async (_event, repoPath: string) => {
        return gitService.status(repoPath);
    });
    ipcMain.handle(
        'git:stage',
        async (_event, repoPath: string, files: string[]) => {
            return gitService.stage(repoPath, files);
        }
    );
    ipcMain.handle(
        'git:unstage',
        async (_event, repoPath: string, files: string[]) => {
            return gitService.unstage(repoPath, files);
        }
    );
    ipcMain.handle(
        'git:commit',
        async (_event, repoPath: string, message: string) => {
            return gitService.commit(repoPath, message);
        }
    );
    ipcMain.handle(
        'git:push',
        async (
            _event,
            repoPath: string,
            token: string,
            remote?: string,
            branch?: string,
            setUpstream?: boolean,
            force?: boolean
        ) => {
            return gitService.push(repoPath, token, remote, branch, setUpstream, force);
        }
    );
    ipcMain.handle(
        'git:pull',
        async (_event, repoPath: string, token: string) => {
            return gitService.pull(repoPath, token);
        }
    );
    ipcMain.handle(
        'git:setRemote',
        async (_event, repoPath: string, name: string, url: string) => {
            return gitService.setRemote(repoPath, name, url);
        }
    );
    ipcMain.handle(
        'git:sync',
        async (_event, repoPath: string, token: string) => {
            return gitService.sync(repoPath, token);
        }
    );
    ipcMain.handle(
        'git:diff',
        async (_event, repoPath: string, file?: string) => {
            return gitService.diff(repoPath, file);
        }
    );
    ipcMain.handle(
        'git:log',
        async (_event, repoPath: string, limit?: number) => {
            return gitService.log(repoPath, limit);
        }
    );
    ipcMain.handle('git:branches', async (_event, repoPath: string) => {
        return gitService.branches(repoPath);
    });
    ipcMain.handle(
        'git:checkout',
        async (_event, repoPath: string, branch: string, create?: boolean) => {
            return gitService.checkout(repoPath, branch, create);
        }
    );
    ipcMain.handle(
        'git:deleteBranch',
        async (_event, repoPath: string, branch: string) => {
            return gitService.deleteBranch(repoPath, branch);
        }
    );
    ipcMain.handle(
        'git:deleteRemoteBranch',
        async (_event, repoPath: string, remote: string, branch: string, token: string) => {
            return gitService.deleteRemoteBranch(repoPath, remote, branch, token);
        }
    );

    ipcMain.handle(
        'git:reset',
        async (_event, repoPath: string, mode: 'soft' | 'hard', target: string) => {
            return gitService.reset(repoPath, mode, target);
        }
    );
    ipcMain.handle('git:checkoutPullRequest', async (_event, repoPath: string, prNumber: number) => {
        return gitService.checkoutPullRequest(repoPath, prNumber);
    });

    ipcMain.handle(
        'git:checkoutCommit',
        async (_event, repoPath: string, hash: string) => {
            return gitService.checkoutCommit(repoPath, hash);
        }
    );
    ipcMain.handle(
        'git:getCommitDetails',
        async (_event, repoPath: string, hash: string) => {
            return gitService.getCommitDetails(repoPath, hash);
        }
    );
    ipcMain.handle(
        'git:getFileDiff',
        async (_event, repoPath: string, filePath: string, hash1: string, hash2?: string) => {
            return gitService.getFileDiff(repoPath, filePath, hash1, hash2);
        }
    );
    ipcMain.handle('git:stash', async (_event, repoPath: string) => {
        return gitService.stash(repoPath);
    });
    ipcMain.handle('git:stashPop', async (_event, repoPath: string) => {
        return gitService.stashPop(repoPath);
    });
    ipcMain.handle('git:revert', async (_event, repoPath: string) => {
        return gitService.revert(repoPath);
    });
    ipcMain.handle('git:currentBranch', async (_event, repoPath: string) => {
        return gitService.currentBranch(repoPath);
    });
    ipcMain.handle('git:remoteUrl', async (_event, repoPath: string) => {
        return gitService.getRemoteUrl(repoPath);
    });
    ipcMain.handle('git:merge', async (_event, repoPath: string, branch: string) => {
        return gitService.merge(repoPath, branch);
    });

    ipcMain.handle('git:rebase', async (_event, repoPath: string, branch: string) => {
        return gitService.rebase(repoPath, branch);
    });

    ipcMain.handle('git:discardFile', async (_event, repoPath: string, file: string) => {
        return gitService.checkoutFile(repoPath, file);
    });

    ipcMain.handle('git:cleanFile', async (_event, repoPath: string, file: string) => {
        return gitService.clean(repoPath, file);
    });

    ipcMain.handle('git:resolveConflict', async (_event, repoPath: string, file: string, strategy: 'theirs' | 'ours') => {
        return gitService.resolveConflict(repoPath, file, strategy);
    });

    ipcMain.handle('git:blame', async (_event, repoPath: string, file: string) => {
        return gitService.blame(repoPath, file);
    });

    // ── Tags ──
    ipcMain.handle('git:listTags', async (_event, repoPath: string) => {
        return gitService.listTags(repoPath);
    });
    ipcMain.handle('git:createTag', async (_event, repoPath: string, tagName: string, message?: string, commitHash?: string) => {
        return gitService.createTag(repoPath, tagName, message, commitHash);
    });
    ipcMain.handle('git:pushTag', async (_event, repoPath: string, tagName: string, token: string) => {
        return gitService.pushTag(repoPath, tagName, token);
    });
    ipcMain.handle('git:deleteTag', async (_event, repoPath: string, tagName: string) => {
        return gitService.deleteTag(repoPath, tagName);
    });
    ipcMain.handle('git:deleteRemoteTag', async (_event, repoPath: string, tagName: string, token: string) => {
        return gitService.deleteRemoteTag(repoPath, tagName, token);
    });

    // ── Cherry-Pick ──
    ipcMain.handle('git:cherryPick', async (_event, repoPath: string, commitHash: string) => {
        return gitService.cherryPick(repoPath, commitHash);
    });

    // ── Squash / Reword ──
    ipcMain.handle('git:squashCommits', async (_event, repoPath: string, count: number, message: string) => {
        return gitService.squashCommits(repoPath, count, message);
    });
    ipcMain.handle('git:rewordCommit', async (_event, repoPath: string, newMessage: string) => {
        return gitService.rewordCommit(repoPath, newMessage);
    });

    ipcMain.handle('git:listFiles', async (_event, repoPath: string) => {
        return gitService.listFiles(repoPath);
    });

    ipcMain.handle('git:getFileContent', async (_event, repoPath: string, path: string, ref?: string) => {
        return gitService.getFileContent(repoPath, path, ref);
    });

    ipcMain.handle('git:reflog', async (_event, repoPath: string, limit?: number) => {
        return gitService.reflog(repoPath, limit);
    });

    // ── Git Identity (sync with terminal) ──
    ipcMain.handle('git:setIdentity', async (_event, name: string, email: string) => {
        gitService.setActiveIdentity(name, email);
    });
    ipcMain.handle('git:clearIdentity', async () => {
        gitService.clearActiveIdentity();
    });

    ipcMain.handle('git:clone', async (_event, url: string, destination: string, token?: string) => {
        return gitService.clone(url, destination, token, (progress) => {
            mainWindow?.webContents.send('git:cloneProgress', progress);
        });
    });
    ipcMain.handle('git:init', async (_event, repoPath: string, options?: any) => {
        return gitService.init(repoPath, options);
    });
    ipcMain.handle('git:addRemote', async (_event, repoPath: string, name: string, url: string) => {
        return gitService.addRemote(repoPath, name, url);
    });
    ipcMain.handle('git:setUpstream', async (_event, repoPath: string, branch: string, remote?: string) => {
        return gitService.setUpstream(repoPath, branch, remote);
    });

    // ── Update ──
    ipcMain.handle('update:check', async () => {
        return updaterService.checkForUpdates();
    });
    ipcMain.handle('update:download', async () => {
        return updaterService.downloadUpdate();
    });
    ipcMain.handle('update:install', () => {
        updaterService.quitAndInstall();
    });

    // ── Terminal ──
    ipcMain.handle('terminal:create', async (_event, id: string, context: { cwd: string; username?: string; displayName?: string; email?: string; token?: string }) => {
        return terminalService.createTerminal(id, context);
    });
    ipcMain.handle('terminal:write', async (_event, id: string, data: string) => {
        terminalService.writeToTerminal(id, data);
    });
    ipcMain.handle('terminal:resize', async (_event, id: string, cols: number, rows: number) => {
        terminalService.resizeTerminal(id, cols, rows);
    });
    ipcMain.handle('terminal:setContext', async (_event, id: string, context: { cwd: string; username?: string; displayName?: string; email?: string; token?: string }) => {
        terminalService.setTerminalContext(id, context);
    });
    ipcMain.handle('terminal:destroy', async (_event, id: string) => {
        terminalService.destroyTerminal(id);
    });

    // ── Shell ──
    ipcMain.handle('shell:openExternal', async (_event, url: string) => {
        return shell.openExternal(url);
    });
    ipcMain.handle('shell:openPath', async (_event, p: string) => {
        return shell.openPath(p);
    });
    // ── File System ──
    ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
        const fs = require('fs/promises');
        const path = require('path');

        // Create parent directories if they don't exist
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        return fs.writeFile(filePath, content, 'utf8');
    });
    ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
        const fs = require('fs/promises');
        return fs.readFile(filePath, 'utf8');
    });
    ipcMain.handle('fs:exists', async (_event, filePath: string) => {
        const fs = require('fs');
        return fs.existsSync(filePath);
    });

    // ── Agent ──
    ipcMain.handle('agent:run', async (_event, userMessage: string, uiState: any, token: string | null) => {
        return agentService.run(userMessage, uiState, token);
    });
    ipcMain.handle('agent:setApiKey', async (_event, key: string) => {
        agentService.setApiKey(key);
        // Persist in storage
        const fs = require('fs');
        const filePath = path.join(app.getPath('userData'), 'agent-key.json');
        fs.writeFileSync(filePath, JSON.stringify({ key }), 'utf8');
    });
    ipcMain.handle('agent:getApiKey', async () => {
        if (agentService.getApiKey()) return agentService.getApiKey();
        // Try loading from storage
        try {
            const fs = require('fs');
            const filePath = path.join(app.getPath('userData'), 'agent-key.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (data.key) {
                    agentService.setApiKey(data.key);
                    return data.key;
                }
            }
        } catch {}
        return null;
    });
    ipcMain.handle('agent:confirmAction', async (_event, approved: boolean) => {
        agentService.resolveConfirmation(approved);
    });
    ipcMain.handle('agent:clearHistory', async () => {
        agentService.clearHistory();
    });

    // ── Storage (persists JSON data in userData) ──
    ipcMain.handle('storage:get', async (_event, key: string) => {
        const fs = require('fs');
        const filePath = path.join(app.getPath('userData'), `${key}.json`);
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error(`Failed to read storage key "${key}":`, e);
        }
        return null;
    });
    ipcMain.handle('storage:set', async (_event, key: string, value: any) => {
        const fs = require('fs');
        const filePath = path.join(app.getPath('userData'), `${key}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify(value), 'utf8');
        } catch (e) {
            console.error(`Failed to write storage key "${key}":`, e);
        }
    });
}

// ─── App Lifecycle ───────────────────────────────────────────────

app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();

    if (mainWindow) {
        updaterService.setWindow(mainWindow);
        terminalService.setWindow(mainWindow);
        gitService.setWindow(mainWindow);
        agentService.setWindow(mainWindow);
    }

    // Check for updates in production after a short delay
    if (!isDev) {
        setTimeout(() => {
            updaterService.checkForUpdates();
        }, 5000);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    terminalService.destroyAll();
    if (process.platform !== 'darwin') {
        app.quit();
        // Safety net: Force exit if quit hangs (common on Windows with background tasks)
        setTimeout(() => {
            app.exit(0);
        }, 5000);
    }
});

app.on('open-url', (_event, url) => {
    handleOAuthCallback(url);
});
