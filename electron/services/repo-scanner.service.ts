import * as fs from 'fs';
import * as path from 'path';
import { GitService } from './git.service';

// ─── Types ───────────────────────────────────────────────────────

export interface RepoInfo {
    path: string;
    name: string;
    branch: string;
    dirty: boolean;
    remoteUrl: string;
    accountId?: string;
}

interface Account {
    id: string;
    username: string;
}

// ─── RepoScannerService ─────────────────────────────────────────

export class RepoScannerService {
    private gitService: GitService;

    // Directories to skip during recursive scanning
    private readonly SKIP_DIRS = new Set([
        'node_modules',
        '.git',
        '__pycache__',
        '.venv',
        'venv',
        'dist',
        'build',
        '.next',
        '.nuxt',
        'vendor',
        'target',
        '.gradle',
        'Pods',
        '.cache',
        'coverage',
        '.tox',
    ]);

    constructor(gitService: GitService) {
        this.gitService = gitService;
    }

    /**
     * Recursively scans a directory for Git repositories.
     * Returns enriched repo info including branch, dirty status, and remote URL.
     */
    async scanDirectory(
        rootPath: string,
        maxDepth = 5
    ): Promise<RepoInfo[]> {
        const repoPaths: string[] = [];
        await this.findGitRepos(rootPath, repoPaths, 0, maxDepth);

        // Enrich each found repo with git info
        const repos = await Promise.all(
            repoPaths.map((repoPath) => this.enrichRepoInfo(repoPath))
        );

        return repos.filter((r): r is RepoInfo => r !== null);
    }

    /**
     * Detects which account a repository belongs to based on its remote URL.
     * Matches the GitHub username in the remote URL against stored accounts.
     */
    async detectAccount(
        repoPath: string,
        accounts: Account[]
    ): Promise<string | null> {
        try {
            const remoteUrl = await this.gitService.getRemoteUrl(repoPath);

            for (const account of accounts) {
                // Match patterns like:
                // https://github.com/USERNAME/repo.git
                // git@github.com:USERNAME/repo.git
                const httpsPattern = `github.com/${account.username}/`;
                const sshPattern = `github.com:${account.username}/`;

                if (
                    remoteUrl.toLowerCase().includes(httpsPattern.toLowerCase()) ||
                    remoteUrl.toLowerCase().includes(sshPattern.toLowerCase())
                ) {
                    return account.id;
                }
            }
        } catch {
            // Repository might not have a remote
        }

        return null;
    }

    // ── Private Helpers ──

    private async findGitRepos(
        dirPath: string,
        results: string[],
        depth: number,
        maxDepth: number
    ): Promise<void> {
        if (depth > maxDepth) return;

        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            // Check if this directory contains a .git folder
            const hasGit = entries.some(
                (e) => e.isDirectory() && e.name === '.git'
            );

            if (hasGit) {
                results.push(dirPath);
                return; // Don't recurse into git repos (nested repos are rare)
            }

            // Recurse into subdirectories
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                if (this.SKIP_DIRS.has(entry.name)) continue;
                if (entry.name.startsWith('.')) continue;

                const childPath = path.join(dirPath, entry.name);

                try {
                    // Check permissions before recursing
                    fs.accessSync(childPath, fs.constants.R_OK);
                    await this.findGitRepos(childPath, results, depth + 1, maxDepth);
                } catch {
                    // Skip inaccessible directories
                }
            }
        } catch {
            // Skip if we can't read the directory
        }
    }

    private async enrichRepoInfo(repoPath: string): Promise<RepoInfo | null> {
        try {
            const [branch, remoteUrl, statusFiles] = await Promise.all([
                this.gitService.currentBranch(repoPath),
                this.gitService.getRemoteUrl(repoPath).catch(() => ''),
                this.gitService.status(repoPath).catch(() => []),
            ]);

            return {
                path: repoPath,
                name: path.basename(repoPath),
                branch: branch || 'main',
                dirty: statusFiles.length > 0,
                remoteUrl,
            };
        } catch {
            return null;
        }
    }
}
