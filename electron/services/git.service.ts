import { execFile, ExecFileOptions, exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { BrowserWindow } from 'electron';

// ─── Types ───────────────────────────────────────────────────────

export interface ExecResult {
    stdout: string;
    stderr: string;
    code: number;
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

export interface ReflogEntry {
    hash: string;
    shortHash: string;
    action: string;
    description: string;
    date: string;
    index: number;
}

// ─── GIT_ASKPASS Helper ──────────────────────────────────────────

/**
 * Creates a temporary GIT_ASKPASS script that echoes the token.
 * This is the secure way to inject credentials without modifying
 * the repo's remote URL or persisting anything to disk permanently.
 */
function createAskPassScript(token: string): string {
    const tmpDir = os.tmpdir();
    const isWindows = process.platform === 'win32';
    const scriptName = `gitflow-askpass-${Date.now()}${isWindows ? '.bat' : '.sh'}`;
    const scriptPath = path.join(tmpDir, scriptName);

    if (isWindows) {
        fs.writeFileSync(scriptPath, `@echo off\r\necho ${token}\r\n`, { mode: 0o700 });
    } else {
        fs.writeFileSync(scriptPath, `#!/bin/sh\necho "${token}"\n`, { mode: 0o700 });
    }

    return scriptPath;
}

function cleanupAskPassScript(scriptPath: string): void {
    try {
        if (fs.existsSync(scriptPath)) {
            fs.unlinkSync(scriptPath);
        }
    } catch {
        // Silently fail — it's a tmp file
    }
}

// ─── GitService Class ────────────────────────────────────────────

export class GitService {
    private mainWindow: BrowserWindow | null = null;
    private commandCounter = 0;
    private activeIdentity: { name: string; email: string } | null = null;

    setWindow(win: BrowserWindow): void {
        this.mainWindow = win;
    }

    /**
     * Sets the active git identity used for all git operations.
     * This ensures commits from the app use the same name/email
     * as the integrated terminal.
     */
    setActiveIdentity(name: string, email: string): void {
        this.activeIdentity = { name, email };
    }

    clearActiveIdentity(): void {
        this.activeIdentity = null;
    }

    private sanitizeArgs(args: string[], token?: string): string[] {
        if (!token) return args;
        return args.map(a => (a === token || a.includes(token)) ? '***' : a);
    }

    async checkoutPullRequest(repoPath: string, prNumber: number, branchName?: string): Promise<void> {
        const localBranch = branchName || `pr/${prNumber}`;
        // Fetch the PR head to a local branch
        await this.exec(repoPath, ['fetch', 'origin', `pull/${prNumber}/head:${localBranch}`]);
        // Checkout the local branch
        await this.exec(repoPath, ['checkout', localBranch]);
    }

    async checkoutCommit(repoPath: string, hash: string): Promise<void> {
        const result = await this.exec(repoPath, ['checkout', hash]);
        if (result.code !== 0) {
            throw new Error(`git checkout failed: ${result.stderr}`);
        }
    }

    async getCommitDetails(repoPath: string, hash: string): Promise<FileStatus[]> {
        const result = await this.exec(repoPath, [
            'show',
            '--name-status',
            '--format=',
            hash,
        ]);

        if (result.code !== 0) {
            throw new Error(`git show failed: ${result.stderr}`);
        }

        return result.stdout
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => {
                const parts = line.split('\t');
                const status = parts[0];
                let path = parts[1];

                // Handle renames: Git outputs "R100\tOldPath\tNewPath"
                if (status.startsWith('R') && parts.length >= 3) {
                    path = parts[2];
                }

                // Handle quoted paths (e.g. "path/to/file")
                if (path.startsWith('"') && path.endsWith('"')) {
                    path = path.slice(1, -1);
                }

                return {
                    path,
                    status: status.startsWith('A') ? 'added' :
                        status.startsWith('M') ? 'modified' :
                            status.startsWith('D') ? 'deleted' :
                                status.startsWith('R') ? 'renamed' : 'modified',
                    staged: false // Not relevant for commit details
                };
            });
    }

    async getFileDiff(repoPath: string, filePath: string, hash1: string, hash2?: string): Promise<string> {
        const args = ['diff', '--no-color', hash1];
        if (hash2) args.push(hash2);
        args.push('--', filePath);

        const result = await this.exec(repoPath, args);
        return result.stdout;
    }
    /**
     * Core execution method. Spawns a git process with optional token injection.
     * Token injection uses GIT_ASKPASS so credentials never touch the repo config.
     */
    async exec(
        repoPath: string,
        args: string[],
        token?: string
    ): Promise<ExecResult> {
        let askPassScript: string | undefined;

        const env: Record<string, string> = {
            ...process.env as Record<string, string>,
            GIT_TERMINAL_PROMPT: '0',
        };

        // Inject active account identity so commits use the same
        // name/email as the integrated terminal
        if (this.activeIdentity) {
            if (this.activeIdentity.name) {
                env.GIT_AUTHOR_NAME = this.activeIdentity.name;
                env.GIT_COMMITTER_NAME = this.activeIdentity.name;
            }
            if (this.activeIdentity.email) {
                env.GIT_AUTHOR_EMAIL = this.activeIdentity.email;
                env.GIT_COMMITTER_EMAIL = this.activeIdentity.email;
            }
        }

        // If a token is provided, create a GIT_ASKPASS helper
        if (token) {
            askPassScript = createAskPassScript(token);
            env.GIT_ASKPASS = askPassScript;
            env.GIT_CONFIG_NOSYSTEM = '1';

            // Override credential.helper to empty so Git doesn't use
            // Windows Credential Manager or any other stored credentials.
            // Git checks credential helpers BEFORE GIT_ASKPASS, so without
            // this override, cached credentials from another account would
            // take priority over the app's token.
            env.GIT_CONFIG_COUNT = '1';
            env.GIT_CONFIG_KEY_0 = 'credential.helper';
            env.GIT_CONFIG_VALUE_0 = '';
        }

        const options: ExecFileOptions = {
            cwd: repoPath,
            env,
            maxBuffer: 10 * 1024 * 1024, // 10MB for large diffs
            timeout: 60000, // 60s timeout
        };

        // Broadcast activity start
        const commandId = `cmd-${Date.now()}-${++this.commandCounter}`;
        const safeArgs = this.sanitizeArgs(args, token);
        const commandStr = `git ${safeArgs.join(' ')}`;
        const startedAt = Date.now();

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('activity:command-start', {
                id: commandId,
                command: commandStr,
                repoPath,
                startedAt,
            });
        }

        return new Promise<ExecResult>((resolve) => {
            execFile('git', args, options, (error, stdout, stderr) => {
                // Cleanup askpass script immediately
                if (askPassScript) {
                    cleanupAskPassScript(askPassScript);
                }

                const code = error ? (error as any).code || 1 : 0;
                const completedAt = Date.now();

                // Broadcast activity complete
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send('activity:command-complete', {
                        id: commandId,
                        command: commandStr,
                        repoPath,
                        startedAt,
                        completedAt,
                        durationMs: completedAt - startedAt,
                        exitCode: code,
                        status: code === 0 ? 'success' : 'error',
                        errorMessage: code !== 0 ? (stderr?.toString() || '').trim() : undefined,
                    });
                }

                resolve({
                    stdout: stdout?.toString() || '',
                    stderr: stderr?.toString() || '',
                    code,
                });
            });
        });
    }

    /**
     * For push/pull/fetch: rewrites remote URL to include token for HTTPS auth.
     * This is an alternative approach when GIT_ASKPASS doesn't work.
     */
    private injectTokenIntoUrl(remoteUrl: string, token: string): string {
        // https://github.com/user/repo.git -> https://TOKEN@github.com/user/repo.git
        if (remoteUrl.startsWith('https://')) {
            return remoteUrl.replace('https://', `https://${token}@`);
        }
        return remoteUrl;
    }

    // ── Status ──

    async status(repoPath: string): Promise<FileStatus[]> {
        if (!fs.existsSync(repoPath)) return [];

        const result = await this.exec(repoPath, [
            'status',
            '--porcelain=v2',
            '-z',
        ]);

        if (result.code !== 0) {
            throw new Error(`git status failed: ${result.stderr}`);
        }

        return this.parseStatusV2(result.stdout);
    }

    private parseStatusV2(output: string): FileStatus[] {
        const files: FileStatus[] = [];
        // Split by null byte for v2 porcelain format
        const entries = output.split('\0').filter(Boolean);

        let i = 0;
        while (i < entries.length) {
            const entry = entries[i];

            if (entry.startsWith('1 ') || entry.startsWith('2 ')) {
                // Changed entry
                const parts = entry.split(' ');
                const xy = parts[1]; // XY status codes
                const staged = xy[0] !== '.' && xy[0] !== '?';

                let status: FileStatus['status'];
                const statusChar = staged ? xy[0] : xy[1];

                switch (statusChar) {
                    case 'A':
                        status = 'added';
                        break;
                    case 'M':
                        status = 'modified';
                        break;
                    case 'D':
                        status = 'deleted';
                        break;
                    case 'R':
                        status = 'renamed';
                        break;
                    default:
                        status = 'modified';
                }

                // For renamed files, path is at different positions
                if (entry.startsWith('2 ')) {
                    const pathParts = parts.slice(8);
                    const filePath = pathParts.join(' ');
                    files.push({ path: filePath, status, staged });
                    // Skip the old path entry
                    i++;
                } else {
                    const filePath = parts.slice(8).join(' ');
                    files.push({ path: filePath, status, staged });
                }
            } else if (entry.startsWith('? ')) {
                const filePath = entry.substring(2);
                files.push({ path: filePath, status: 'untracked', staged: false });
            } else if (entry.startsWith('u ')) {
                const parts = entry.split(' ');
                const filePath = parts.slice(10).join(' ');
                files.push({ path: filePath, status: 'conflict', staged: false });
            }

            i++;
        }

        return files;
    }

    // ── Staging ──

    async stage(repoPath: string, files: string[]): Promise<void> {
        const result = await this.exec(repoPath, ['add', '--', ...files]);
        if (result.code !== 0) {
            throw new Error(`git add failed: ${result.stderr}`);
        }
    }

    async unstage(repoPath: string, files: string[]): Promise<void> {
        const result = await this.exec(repoPath, [
            'reset',
            'HEAD',
            '--',
            ...files,
        ]);
        if (result.code !== 0) {
            throw new Error(`git reset failed: ${result.stderr}`);
        }
    }

    // ── Commit ──

    async commit(repoPath: string, message: string): Promise<void> {
        const result = await this.exec(repoPath, ['commit', '-m', message]);
        if (result.code !== 0) {
            throw new Error(`git commit failed: ${result.stderr}`);
        }
    }

    // ── Push / Pull / Sync ──

    async push(
        repoPath: string,
        token: string,
        remote = 'origin',
        branch?: string,
        setUpstream = false,
        force: boolean = false
    ): Promise<void> {
        const args = ['push'];
        if (setUpstream) args.push('-u');
        if (force) args.push('--force');
        args.push(remote);
        if (branch) args.push(branch);

        const result = await this.exec(repoPath, args, token);
        if (result.code !== 0) {
            throw new Error(`git push failed: ${result.stderr}`);
        }
    }

    async pull(repoPath: string, token: string): Promise<void> {
        const result = await this.exec(
            repoPath,
            ['pull', '--rebase', '--autostash'],
            token
        );
        if (result.code !== 0) {
            throw new Error(`git pull failed: ${result.stderr}`);
        }
    }

    async sync(repoPath: string, token: string): Promise<SyncResult> {
        const result: SyncResult = {
            success: false,
            pulled: false,
            pushed: false,
            conflicts: [],
        };

        try {
            // Step 1: Pull with rebase
            const pullResult = await this.exec(
                repoPath,
                ['pull', '--rebase', '--autostash'],
                token
            );

            if (pullResult.code !== 0) {
                // Check for conflicts
                if (
                    pullResult.stderr.includes('CONFLICT') ||
                    pullResult.stderr.includes('conflict')
                ) {
                    const statusFiles = await this.status(repoPath);
                    result.conflicts = statusFiles
                        .filter((f) => f.status === 'conflict')
                        .map((f) => f.path);
                    result.error = 'Merge conflicts detected';
                    return result;
                }
                result.error = pullResult.stderr;
                return result;
            }
            result.pulled = true;

            // Step 2: Push
            const pushResult = await this.exec(
                repoPath,
                ['push', 'origin'],
                token
            );

            if (pushResult.code !== 0) {
                result.error = pushResult.stderr;
                return result;
            }
            result.pushed = true;
            result.success = true;

            return result;
        } catch (error: any) {
            result.error = error.message;
            return result;
        }
    }

    // ── Diff ──

    async diff(repoPath: string, file?: string): Promise<string> {
        const args = ['diff', '--no-color'];
        if (file) args.push('--', file);

        const stagedArgs = ['diff', '--cached', '--no-color'];
        if (file) stagedArgs.push('--', file);

        const [unstaged, staged] = await Promise.all([
            this.exec(repoPath, args),
            this.exec(repoPath, stagedArgs),
        ]);

        // Combine both diffs
        let combinedDiff = '';
        if (staged.stdout) combinedDiff += staged.stdout;
        if (unstaged.stdout) {
            if (combinedDiff) combinedDiff += '\n';
            combinedDiff += unstaged.stdout;
        }

        return combinedDiff;
    }

    // ── Log ──

    async log(repoPath: string, limit = 50): Promise<CommitInfo[]> {
        const format = '%H%n%h%n%s%n%an%n%ae%n%ci%n%D';
        const separator = '---COMMIT_SEPARATOR---';
        const result = await this.exec(repoPath, [
            'log',
            `--max-count=${limit}`,
            `--format=${format}${separator}`,
        ]);

        if (result.code !== 0) {
            return [];
        }

        return result.stdout
            .split(separator)
            .filter((block) => block.trim())
            .map((block) => {
                const lines = block.trim().split('\n');
                return {
                    hash: lines[0] || '',
                    shortHash: lines[1] || '',
                    message: lines[2] || '',
                    author: lines[3] || '',
                    email: lines[4] || '',
                    date: lines[5] || '',
                    refs: lines[6] || '',
                };
            });
    }

    // ── Branches ──

    async branches(repoPath: string): Promise<BranchInfo[]> {
        const result = await this.exec(repoPath, [
            'branch',
            '-a',
            '--no-color',
            '--format=%(HEAD) %(refname:short) %(objectname:short)',
        ]);

        if (result.code !== 0) {
            return [];
        }

        return result.stdout
            .split('\n')
            .filter(Boolean)
            .map((line) => {
                const current = line.startsWith('*');
                const parts = line.replace('*', '').trim().split(' ');
                const name = parts[0];
                const remote = name.startsWith('remotes/') || name.startsWith('origin/');

                return {
                    name: name.replace('remotes/origin/', '').replace(/^origin\//, ''),
                    current,
                    remote,
                    lastCommit: parts[1],
                };
            });
    }

    async currentBranch(repoPath: string): Promise<string> {
        const result = await this.exec(repoPath, [
            'branch',
            '--show-current',
        ]);
        return result.stdout.trim();
    }

    async checkout(
        repoPath: string,
        branch: string,
        create = false
    ): Promise<void> {
        const args = create
            ? ['checkout', '-b', branch]
            : ['checkout', branch];

        const result = await this.exec(repoPath, args);
        if (result.code !== 0) {
            throw new Error(`git checkout failed: ${result.stderr}`);
        }
    }

    async checkoutFile(repoPath: string, file: string): Promise<void> {
        // Discard changes to a specific file: git checkout HEAD -- <file>
        // Note: For untracked files, this won't work (need clean -f). 
        // But for 'modified' or 'deleted', this works.
        const result = await this.exec(repoPath, ['checkout', 'HEAD', '--', file]);
        if (result.code !== 0) {
            throw new Error(`git checkout file failed: ${result.stderr}`);
        }
    }

    async clean(repoPath: string, file: string): Promise<void> {
        // Remove untracked file
        const result = await this.exec(repoPath, ['clean', '-f', file]);
        if (result.code !== 0) {
            throw new Error(`git clean failed: ${result.stderr}`);
        }
    }

    async deleteBranch(repoPath: string, branch: string): Promise<void> {
        const result = await this.exec(repoPath, ['branch', '-D', branch]); // Force delete to be safe
        if (result.code !== 0) {
            throw new Error(`git branch -D failed: ${result.stderr}`);
        }
    }

    async deleteRemoteBranch(repoPath: string, remote: string, branch: string, token: string): Promise<void> {
        const result = await this.exec(repoPath, ['push', remote, '--delete', branch], token);
        if (result.code !== 0) {
            throw new Error(`git push --delete failed: ${result.stderr}`);
        }
    }

    async reset(repoPath: string, mode: 'soft' | 'hard', target: string): Promise<void> {
        const result = await this.exec(repoPath, ['reset', `--${mode}`, target]);
        if (result.code !== 0) {
            throw new Error(`git reset failed: ${result.stderr}`);
        }
    }

    // ── Stash ──

    async stash(repoPath: string): Promise<void> {
        const attemptStash = async (retries = 3): Promise<void> => {
            const result = await this.exec(repoPath, [
                'stash',
                'push',
                '-m',
                `GitFlow auto-stash ${new Date().toISOString()}`,
            ]);

            if (result.code !== 0) {
                // Ignore "No local changes" error
                if (result.stderr.includes('No local changes')) {
                    return;
                }

                // Retry on lock/index error
                if (result.stderr.includes('could not write index') || result.stderr.includes('index.lock')) {
                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        return attemptStash(retries - 1);
                    }
                }

                throw new Error(`git stash failed: ${result.stderr}`);
            }
        };

        await attemptStash();
    }

    async stashPop(repoPath: string): Promise<void> {
        const result = await this.exec(repoPath, ['stash', 'pop']);
        if (result.code !== 0) {
            throw new Error(`git stash pop failed: ${result.stderr}`);
        }
    }

    // ── Revert ──

    async revert(repoPath: string): Promise<void> {
        const result = await this.exec(repoPath, [
            'revert',
            'HEAD',
            '--no-edit',
        ]);
        if (result.code !== 0) {
            throw new Error(`git revert failed: ${result.stderr}`);
        }
    }

    async resolveConflict(repoPath: string, file: string, strategy: 'theirs' | 'ours'): Promise<void> {
        const flag = strategy === 'theirs' ? '--theirs' : '--ours';

        // 1. Checkout the version
        const checkoutResult = await this.exec(repoPath, ['checkout', flag, file]);
        if (checkoutResult.code !== 0) {
            throw new Error(`git checkout ${flag} failed: ${checkoutResult.stderr}`);
        }

        // 2. Add the file (mark as resolved)
        const addResult = await this.exec(repoPath, ['add', file]);
        if (addResult.code !== 0) {
            throw new Error(`git add failed: ${addResult.stderr}`);
        }
    }

    // ── Remote ──

    async getRemoteUrl(repoPath: string): Promise<string> {
        const result = await this.exec(repoPath, [
            'remote',
            'get-url',
            'origin',
        ]);
        return result.stdout.trim();
    }

    async addRemote(repoPath: string, name: string, url: string): Promise<void> {
        const result = await this.exec(repoPath, ['remote', 'add', name, url]);
        if (result.code !== 0) {
            throw new Error(`git remote add failed: ${result.stderr}`);
        }
    }

    async setUpstream(repoPath: string, branch: string, remote = 'origin'): Promise<void> {
        const result = await this.exec(repoPath, [
            'branch',
            '--set-upstream-to',
            `${remote}/${branch}`,
            branch,
        ]);
        if (result.code !== 0) {
            throw new Error(`git set upstream failed: ${result.stderr}`);
        }
    }

    async merge(repoPath: string, branch: string): Promise<void> {
        const result = await this.exec(repoPath, ['merge', branch]);
        if (result.code !== 0) {
            throw new Error(`Merge failed: ${result.stderr}`);
        }
    }

    async rebase(repoPath: string, branch: string): Promise<void> {
        const result = await this.exec(repoPath, ['rebase', branch]);
        if (result.code !== 0) {
            // Abort rebase if failed to avoid stuck state
            await this.exec(repoPath, ['rebase', '--abort']).catch(() => { });
            throw new Error(`Rebase failed: ${result.stderr}`);
        }
    }

    async blame(repoPath: string, file: string): Promise<BlameInfo[]> {
        // Use --line-porcelain to get full info for each line
        const result = await this.exec(repoPath, ['blame', '--line-porcelain', file]);
        if (result.code !== 0) {
            throw new Error(`git blame failed: ${result.stderr}`);
        }

        const lines = result.stdout.split('\n');
        const blameData: BlameInfo[] = [];
        let currentInfo: Partial<BlameInfo> = {};
        let currentLineNumber = 1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            if (line.match(/^[0-9a-f]{40} \d+ \d+/)) {
                // New block starting with hash
                const hash = line.split(' ')[0];
                currentInfo = {
                    hash,
                    shortHash: hash.substring(0, 7),
                    line: currentLineNumber
                };
            } else if (line.startsWith('author ')) {
                currentInfo.author = line.substring(7);
            } else if (line.startsWith('author-mail ')) {
                currentInfo.email = line.substring(12); // Remove 'author-mail <' and '>'
            } else if (line.startsWith('author-time ')) {
                const timestamp = parseInt(line.substring(12), 10);
                currentInfo.date = new Date(timestamp * 1000).toISOString();
            } else if (line.startsWith('summary ')) {
                currentInfo.message = line.substring(8);
            } else if (line.startsWith('\t')) {
                // Content line, ends the block
                if (currentInfo.hash) {
                    blameData.push(currentInfo as BlameInfo);
                    currentLineNumber++;
                }
            }
        }

        return blameData;
    }

    // ── Clone ──

    async clone(
        url: string,
        destination: string,
        token?: string,
        onProgress?: (message: string) => void
    ): Promise<void> {
        const env: Record<string, string> = {
            ...process.env as Record<string, string>,
            GIT_TERMINAL_PROMPT: '0',
        };

        // Inject active identity for consistency with terminal
        if (this.activeIdentity) {
            if (this.activeIdentity.name) {
                env.GIT_AUTHOR_NAME = this.activeIdentity.name;
                env.GIT_COMMITTER_NAME = this.activeIdentity.name;
            }
            if (this.activeIdentity.email) {
                env.GIT_AUTHOR_EMAIL = this.activeIdentity.email;
                env.GIT_COMMITTER_EMAIL = this.activeIdentity.email;
            }
        }

        let askPassScript: string | undefined;
        if (token) {
            askPassScript = createAskPassScript(token);
            env.GIT_ASKPASS = askPassScript;
            env.GIT_CONFIG_NOSYSTEM = '1';
            // Disable credential helpers so they don't override our token
            env.GIT_CONFIG_COUNT = '1';
            env.GIT_CONFIG_KEY_0 = 'credential.helper';
            env.GIT_CONFIG_VALUE_0 = '';
        }

        const options: ExecFileOptions = {
            env,
            maxBuffer: 50 * 1024 * 1024, // 50MB for large repos
            timeout: 600000, // 10 minutes
        };

        return new Promise<void>((resolve, reject) => {
            const proc = execFile(
                'git',
                ['clone', '--progress', url, destination],
                options,
                (error, stdout, stderr) => {
                    if (askPassScript) {
                        cleanupAskPassScript(askPassScript);
                    }

                    if (error) {
                        reject(new Error(`Clone failed: ${stderr || error.message}`));
                    } else {
                        resolve();
                    }
                }
            );

            // Capture progress from stderr (git writes progress to stderr)
            if (onProgress && proc.stderr) {
                proc.stderr.on('data', (data) => {
                    const message = data.toString().trim();
                    if (message) onProgress(message);
                });
            }
        });
    }

    // ── Init ──

    async init(repoPath: string, options?: { defaultBranch?: string }): Promise<void> {
        // Create directory if it doesn't exist
        if (!fs.existsSync(repoPath)) {
            fs.mkdirSync(repoPath, { recursive: true });
        }

        const args = ['init'];
        if (options?.defaultBranch) {
            args.push('-b', options.defaultBranch);
        }

        const result = await this.exec(repoPath, args);
        if (result.code !== 0) {
            throw new Error(`git init failed: ${result.stderr}`);
        }
    }
    async setRemote(repoPath: string, name: string, url: string): Promise<void> {
        const result = await this.exec(repoPath, ['remote', 'set-url', name, url]);
        if (result.code !== 0) {
            throw new Error(`git remote set-url failed: ${result.stderr}`);
        }
    }

    // ── Tags ──

    async listTags(repoPath: string): Promise<{ name: string; date: string; message: string; hash: string }[]> {
        const result = await this.exec(repoPath, [
            'tag', '-l', '--sort=-creatordate',
            '--format=%(refname:short)|%(creatordate:iso)|%(subject)|%(objectname:short)'
        ]);
        if (result.code !== 0) return [];

        return result.stdout
            .split('\n')
            .filter(Boolean)
            .map(line => {
                const [name, date, message, hash] = line.split('|');
                return { name: name || '', date: date || '', message: message || '', hash: hash || '' };
            });
    }

    async createTag(repoPath: string, tagName: string, message?: string, commitHash?: string): Promise<void> {
        const args = ['tag'];
        if (message) {
            args.push('-a', tagName, '-m', message);
        } else {
            args.push(tagName);
        }
        if (commitHash) args.push(commitHash);

        const result = await this.exec(repoPath, args);
        if (result.code !== 0) {
            throw new Error(`git tag failed: ${result.stderr}`);
        }
    }

    async pushTag(repoPath: string, tagName: string, token: string): Promise<void> {
        const result = await this.exec(repoPath, ['push', 'origin', tagName], token);
        if (result.code !== 0) {
            throw new Error(`git push tag failed: ${result.stderr}`);
        }
    }

    async deleteTag(repoPath: string, tagName: string): Promise<void> {
        const result = await this.exec(repoPath, ['tag', '-d', tagName]);
        if (result.code !== 0) {
            throw new Error(`git tag -d failed: ${result.stderr}`);
        }
    }

    async deleteRemoteTag(repoPath: string, tagName: string, token: string): Promise<void> {
        const result = await this.exec(repoPath, ['push', 'origin', `:refs/tags/${tagName}`], token);
        if (result.code !== 0) {
            throw new Error(`git push delete tag failed: ${result.stderr}`);
        }
    }

    // ── Cherry-Pick ──

    async cherryPick(repoPath: string, commitHash: string): Promise<void> {
        const result = await this.exec(repoPath, ['cherry-pick', commitHash]);
        if (result.code !== 0) {
            throw new Error(`git cherry-pick failed: ${result.stderr}`);
        }
    }

    // ── Squash / Reword ──

    async squashCommits(repoPath: string, count: number, message: string): Promise<void> {
        // Soft reset to undo N commits, keeping changes staged
        const resetResult = await this.exec(repoPath, ['reset', '--soft', `HEAD~${count}`]);
        if (resetResult.code !== 0) {
            throw new Error(`git reset --soft failed: ${resetResult.stderr}`);
        }
        // Re-commit with the new combined message
        const commitResult = await this.exec(repoPath, ['commit', '-m', message]);
        if (commitResult.code !== 0) {
            throw new Error(`git commit failed: ${commitResult.stderr}`);
        }
    }

    async rewordCommit(repoPath: string, newMessage: string): Promise<void> {
        const result = await this.exec(repoPath, ['commit', '--amend', '-m', newMessage]);
        if (result.code !== 0) {
            throw new Error(`git commit --amend failed: ${result.stderr}`);
        }
    }

    async listFiles(repoPath: string): Promise<string[]> {
        if (!fs.existsSync(repoPath)) return [];

        const result = await this.exec(repoPath, ['ls-files']);
        if (result.code !== 0) {
            throw new Error(`git ls-files failed: ${result.stderr}`);
        }
        return result.stdout.split('\n').filter(Boolean);
    }

    async getFileContent(repoPath: string, path: string, ref: string = 'HEAD'): Promise<string> {
        // Use git show ref:path
        // Need to handle paths with spaces or strange chars? git show handles it if quoted?
        // exec spawns process, arguments are passed as array.
        // path needs to be relative to repo root (which git show expects for ref:path syntax)
        // Note: path passed here might be relative.
        // git show expects forward slashes for paths in ref:path syntax
        const normalizedPath = path.replace(/\\/g, '/');
        const result = await this.exec(repoPath, ['show', `${ref}:${normalizedPath}`]);
        if (result.code !== 0) {
            // If file doesn't exist in that ref (new file), return empty string?
            // Or throw?
            // For diff (new file), original is empty.
            return '';
        }
        return result.stdout;
    }

    // ── Reflog ──

    async reflog(repoPath: string, limit = 100): Promise<ReflogEntry[]> {
        const separator = '---REFLOG_SEP---';
        const format = `%H%n%h%n%gs%n%ci${separator}`;
        const result = await this.exec(repoPath, [
            'reflog',
            `--max-count=${limit}`,
            `--format=${format}`,
        ]);

        if (result.code !== 0) {
            return [];
        }

        return result.stdout
            .split(separator)
            .filter(block => block.trim())
            .map((block, index) => {
                const lines = block.trim().split('\n');
                const description = lines[2] || '';
                // Extract action type from reflog subject (e.g. "commit:", "checkout:", "reset:", "merge:")
                const actionMatch = description.match(/^(\w+)(?:\s*\(.*?\))?:/);
                const action = actionMatch ? actionMatch[1] : 'unknown';

                return {
                    hash: lines[0] || '',
                    shortHash: lines[1] || '',
                    action,
                    description,
                    date: lines[3] || '',
                    index,
                };
            });
    }

    // ── LFS ──

    async isLfsInstalled(): Promise<boolean> {
        try {
            const result = await execAsync('git lfs env');
            return true;
        } catch {
            return false;
        }
    }

    async trackLfs(repoPath: string, pattern: string): Promise<void> {
        const result = await this.exec(repoPath, ['lfs', 'track', pattern]);
        if (result.code !== 0) {
            throw new Error(`git lfs track failed: ${result.stderr}`);
        }
    }

    async untrackLfs(repoPath: string, pattern: string): Promise<void> {
        const result = await this.exec(repoPath, ['lfs', 'untrack', pattern]);
        if (result.code !== 0) {
            throw new Error(`git lfs untrack failed: ${result.stderr}`);
        }
    }

    async getLfsTrackedFiles(repoPath: string): Promise<string[]> {
        const result = await this.exec(repoPath, ['lfs', 'ls-files', '-n']);
        if (result.code !== 0) {
            // If LFS isn't initialized or fails, return empty
            return [];
        }
        return result.stdout.split('\n').map(l => l.trim()).filter(Boolean);
    }
}

