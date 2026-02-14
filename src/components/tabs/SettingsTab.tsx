import React, { useState, useEffect } from 'react';
import { useRepoStore } from '../../stores/repo.store';
import { useAccountStore } from '../../stores/account.store';
import { GitHubRepo } from '../../lib/github-types';
import { useUIStore } from '../../stores/ui.store';

export function SettingsTab() {
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const repos = useRepoStore((s) => s.repos);
    const cloudRepos = useRepoStore((s) => s.cloudRepos);
    const activeRepo = repos.find((r) => r.path === activeRepoPath);

    const accounts = useAccountStore((s) => s.accounts);

    // Find cloud counterpart
    const remoteUrl = activeRepo?.remoteUrl;
    // Normalize URL for comparison (remove .git, ignore protocol?)
    // For now, simple check
    const cloudRepo = cloudRepos.find((r) =>
        r.clone_url === remoteUrl ||
        r.ssh_url === remoteUrl ||
        (remoteUrl && r.html_url === remoteUrl.replace('.git', ''))
    );

    const activeAccount = accounts.find(a => cloudRepo?.owner.login === a.username);
    const token = activeAccount?.token;

    if (!activeRepo) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                <p>Select a repository to view settings</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-6 overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">Repository Settings</h2>

            {/* Local Settings */}
            <section className="mb-8">
                <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">General</h3>
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-text-secondary">Local Path</label>
                        <code className="bg-surface-2 px-3 py-2 rounded text-sm font-mono">{activeRepo.path}</code>
                    </div>
                </div>
            </section>

            {/* Cloud Settings */}
            {cloudRepo && token ? (
                <>
                    <RenameSection repo={cloudRepo} token={token} localPath={activeRepo.path} />
                    <DefaultBranchSection repo={cloudRepo} token={token} />
                    <ProtectedBranchesSection repo={cloudRepo} token={token} />
                    <CollaboratorsSection repo={cloudRepo} token={token} />
                    <DangerZone repo={cloudRepo} token={token} />
                </>
            ) : (
                <div className="p-4 bg-surface-2 rounded-lg border border-border">
                    <p className="text-sm text-text-secondary">
                        This repository is not linked to a GitHub repository or you don't have access.
                    </p>
                    {/* Add Publish button here later */}
                </div>
            )}
        </div>
    );
}

function RenameSection({ repo, token, localPath }: { repo: GitHubRepo; token: string; localPath: string }) {
    const [name, setName] = useState(repo.name);
    const [isLoading, setIsLoading] = useState(false);
    const renameCloudRepo = useRepoStore((s) => s.renameCloudRepo);

    const handleRename = async () => {
        if (name === repo.name) return;
        setIsLoading(true);
        try {
            await renameCloudRepo(token, repo, name, localPath);
            // Optionally show success toast
        } catch (error) {
            console.error(error);
            // Show error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">Repository Name</h3>
            <div className="flex items-end gap-3">
                <div className="flex-1 max-w-md">
                    <label className="text-sm font-medium text-text-secondary mb-1 block">Repository Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-field w-full"
                    />
                </div>
                <button
                    onClick={handleRename}
                    disabled={name === repo.name || isLoading}
                    className="btn-primary"
                >
                    {isLoading ? 'Renaming...' : 'Rename'}
                </button>
            </div>
        </section>
    );
}

function DefaultBranchSection({ repo, token }: { repo: GitHubRepo; token: string }) {
    const branches = useRepoStore((s) => s.branches);
    const [selectedBranch, setSelectedBranch] = useState(repo.default_branch);
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdate = async () => {
        if (selectedBranch === repo.default_branch) return;

        if (!confirm(`Change default branch from ${repo.default_branch} to ${selectedBranch}?`)) return;

        setIsLoading(true);
        try {
            await window.electronAPI.github.updateDefaultBranch(token, repo.owner.login, repo.name, selectedBranch);
            useUIStore.getState().showNotification('success', `Default branch changed to ${selectedBranch}`);
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Get local branch names (excluding remote-only)
    const localBranchNames = branches.filter(b => !b.remote).map(b => b.name);

    return (
        <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">Default Branch</h3>
            <div className="flex items-end gap-3">
                <div className="flex-1 max-w-md">
                    <label className="text-sm font-medium text-text-secondary mb-1 block">Default Branch</label>
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="input-field w-full"
                    >
                        {localBranchNames.length > 0 ? (
                            localBranchNames.map(branch => (
                                <option key={branch} value={branch}>{branch}</option>
                            ))
                        ) : (
                            <option value={repo.default_branch}>{repo.default_branch}</option>
                        )}
                    </select>
                    <p className="text-xs text-text-tertiary mt-1">
                        The default branch is the base branch for pull requests and code commits.
                    </p>
                </div>
                <button
                    onClick={handleUpdate}
                    disabled={selectedBranch === repo.default_branch || isLoading}
                    className="btn-primary"
                >
                    {isLoading ? 'Updating...' : 'Update'}
                </button>
            </div>
        </section>
    );
}

function ProtectedBranchesSection({ repo, token }: { repo: GitHubRepo; token: string }) {
    const [protectedBranches, setProtectedBranches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('');
    const branches = useRepoStore((s) => s.branches);

    const loadProtectedBranches = async () => {
        setIsLoading(true);
        try {
            const protectedBranches = await window.electronAPI.github.getProtectedBranches(token, repo.owner.login, repo.name);
            setProtectedBranches(protectedBranches);
        } catch (error) {
            console.error('Failed to load protected branches:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProtectedBranches();
    }, [repo.id]);

    const handleProtect = async () => {
        if (!selectedBranch) return;

        try {
            await window.electronAPI.github.addBranchProtection(token, repo.owner.login, repo.name, selectedBranch);
            useUIStore.getState().showNotification('success', `Protected branch ${selectedBranch} `);
            setSelectedBranch('');
            loadProtectedBranches();
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        }
    };

    const handleUnprotect = async (branch: string) => {
        if (!confirm(`Remove protection from ${branch}?`)) return;

        try {
            await window.electronAPI.github.removeBranchProtection(token, repo.owner.login, repo.name, branch);
            useUIStore.getState().showNotification('success', `Unprotected branch ${branch} `);
            loadProtectedBranches();
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        }
    };

    const localBranchNames = branches.filter(b => !b.remote).map(b => b.name);
    const unprotectedBranches = localBranchNames.filter(b =>
        !protectedBranches.some(pb => pb.name === b)
    );

    return (
        <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">Protected Branches</h3>

            <div className="flex gap-2 mb-4 max-w-md">
                <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="input-field flex-1"
                >
                    <option value="">Select branch to protect...</option>
                    {unprotectedBranches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                    ))}
                </select>
                <button
                    onClick={handleProtect}
                    disabled={!selectedBranch}
                    className="btn-secondary"
                >
                    Protect
                </button>
            </div>

            <div className="bg-surface-2 rounded-lg border border-border divide-y divide-border">
                {isLoading && protectedBranches.length === 0 ? (
                    <div className="p-4 text-center text-text-tertiary">Loading...</div>
                ) : protectedBranches.length === 0 ? (
                    <div className="p-4 text-center text-text-tertiary">
                        No protected branches. Protected branches require pull request reviews before merging.
                    </div>
                ) : (
                    protectedBranches.map((branch) => (
                        <div key={branch.name} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="text-sm font-medium">{branch.name}</span>
                            </div>
                            <button
                                onClick={() => handleUnprotect(branch.name)}
                                className="text-status-error hover:bg-status-error/10 p-1.5 rounded text-xs"
                                title="Remove protection"
                            >
                                Unprotect
                            </button>
                        </div>
                    ))
                )}
            </div>

            <a
                href={`https://github.com/${repo.owner.login}/${repo.name}/settings/branches`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 mt-2"
            >
                <span>Advanced protection rules on GitHub</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </a >
        </section >
    );
}

function CollaboratorsSection({ repo, token }: { repo: GitHubRepo; token: string }) {
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newCollab, setNewCollab] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const loadCollaborators = async () => {
        setIsLoading(true);
        try {
            const cols = await window.electronAPI.github.getCollaborators(token, repo.owner.login, repo.name);
            setCollaborators(cols);
        } catch (error) {
            console.error('Failed to load collaborators', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCollaborators();
    }, [repo.id]);

    const handleAdd = async () => {
        if (!newCollab) return;
        setIsAdding(true);
        try {
            await window.electronAPI.github.addCollaborator(token, repo.owner.login, repo.name, newCollab);
            setNewCollab('');
            loadCollaborators();
        } catch (error) {
            console.error('Failed to add collaborator', error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemove = async (username: string) => {
        if (!confirm(`Remove ${username} from ${repo.name}?`)) return;
        try {
            await window.electronAPI.github.removeCollaborator(token, repo.owner.login, repo.name, username);
            loadCollaborators();
        } catch (error) {
            console.error('Failed to remove collaborator', error);
        }
    };

    return (
        <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">Collaborators</h3>

            <div className="flex gap-2 mb-4 max-w-md">
                <input
                    type="text"
                    value={newCollab}
                    onChange={(e) => setNewCollab(e.target.value)}
                    placeholder="GitHub username"
                    className="input-field flex-1"
                />
                <button
                    onClick={handleAdd}
                    disabled={!newCollab || isAdding}
                    className="btn-secondary"
                >
                    {isAdding ? 'Adding...' : 'Add Collaborator'}
                </button>
            </div>

            <div className="bg-surface-2 rounded-lg border border-border divide-y divide-border">
                {isLoading && collaborators.length === 0 ? (
                    <div className="p-4 text-center text-text-tertiary">Loading...</div>
                ) : collaborators.length === 0 ? (
                    <div className="p-4 text-center text-text-tertiary">No collaborators found</div>
                ) : (
                    collaborators.map((collab) => (
                        <div key={collab.id} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img src={collab.avatar_url} alt={collab.login} className="w-8 h-8 rounded-full" />
                                <span className="text-sm font-medium">{collab.login}</span>
                            </div>
                            <button
                                onClick={() => handleRemove(collab.login)}
                                className="text-status-error hover:bg-status-error/10 p-1.5 rounded"
                                title="Remove collaborator"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}

function DangerZone({ repo, token }: { repo: GitHubRepo; token: string }) {
    const setRepoVisibility = useRepoStore((s) => s.setCloudRepoVisibility);
    const [isLoading, setIsLoading] = useState(false);

    const toggleVisibility = async () => {
        const newVisibility = !repo.private;
        // Confirm
        if (!confirm(`Are you sure you want to make this repository ${newVisibility ? 'private' : 'public'}?`)) return;

        setIsLoading(true);
        try {
            await setRepoVisibility(token, repo, newVisibility);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="mb-8 border border-status-error/30 rounded-lg overflow-hidden">
            <div className="bg-status-error/5 px-4 py-2 border-b border-status-error/30">
                <h3 className="text-sm font-semibold text-status-error">Danger Zone</h3>
            </div>
            <div className="p-4 bg-surface-1">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-medium">Change Visibility</h4>
                        <p className="text-xs text-text-tertiary">
                            This repository is currently <strong>{repo.private ? 'Private' : 'Public'}</strong>.
                        </p>
                    </div>
                    <button
                        onClick={toggleVisibility}
                        disabled={isLoading}
                        className="btn-ghost text-status-error border border-status-error/30 hover:bg-status-error/10"
                    >
                        {isLoading ? 'Changing...' : `Make ${repo.private ? 'Public' : 'Private'}`}
                    </button>
                </div>
            </div>
        </section>
    );
}
