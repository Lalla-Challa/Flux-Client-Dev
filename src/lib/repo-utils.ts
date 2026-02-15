import { RepoInfo } from '../stores/repo.store';
import { GitHubRepo } from './github-types';
import { Account } from '../stores/account.store';

/**
 * Finds a cloud repository that matches the local repository based on remote URLs.
 */
export function findCloudRepo(activeRepo: RepoInfo | undefined, cloudRepos: GitHubRepo[]): GitHubRepo | undefined {
    if (!activeRepo) return undefined;
    const remoteUrl = activeRepo.remoteUrl;
    if (!remoteUrl) return undefined;

    return cloudRepos.find((r) =>
        r.clone_url === remoteUrl ||
        r.ssh_url === remoteUrl ||
        (remoteUrl && r.html_url === remoteUrl.replace('.git', '')) ||
        (remoteUrl && r.clone_url === remoteUrl.replace(/\/$/, '') + '.git') ||
        (remoteUrl && remoteUrl === r.clone_url.replace(/\.git$/, ''))
    );
}

/**
 * Finds the best matching account for a given cloud repository.
 * Falls back to the active account if no specific match is found but the active account is logged in.
 */
export function findAccountForRepo(
    cloudRepo: GitHubRepo | undefined,
    accounts: Account[],
    activeAccountId: string | null
): Account | undefined {
    if (!cloudRepo) return undefined;

    // 1. Try to match by owner login
    let account = accounts.find(a => a.username.toLowerCase() === cloudRepo.owner.login.toLowerCase());

    // 2. If no direct match (e.g. organization repo), try the active account
    if (!account && activeAccountId) {
        account = accounts.find(a => a.id === activeAccountId);
    }

    // 3. If still no account, try ANY account that has a token (fallback)
    if (!account) {
        account = accounts.find(a => !!a.token);
    }

    return account;
}
