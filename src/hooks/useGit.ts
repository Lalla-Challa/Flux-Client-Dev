import { useCallback } from 'react';
import { useRepoStore } from '../stores/repo.store';
import { useAccountStore } from '../stores/account.store';
import { useUIStore } from '../stores/ui.store';

/**
 * Custom hook that provides convenient git operations
 * with automatic account token resolution.
 */
export function useGit() {
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const accounts = useAccountStore((s) => s.accounts);
    const activeAccount = accounts.find((a) => a.id === activeAccountId);

    const getToken = useCallback(async (): Promise<string | null> => {
        if (!activeAccount) return null;
        try {
            const api = (window as any).electronAPI;
            return await api.auth.getToken(activeAccount.username);
        } catch {
            return null;
        }
    }, [activeAccount]);

    const commit = useCallback(
        async (message: string) => {
            if (!activeRepoPath) return;
            useUIStore.getState().setIsCommitting(true);
            try {
                await useRepoStore.getState().commitChanges(message);
                useUIStore.getState().showNotification('success', 'Committed!');
                useUIStore.getState().setCommitMessage('');
            } catch (error: any) {
                useUIStore.getState().showNotification('error', error.message);
            } finally {
                useUIStore.getState().setIsCommitting(false);
            }
        },
        [activeRepoPath]
    );

    const push = useCallback(async () => {
        if (!activeRepoPath) return;
        const token = await getToken();
        if (!token) {
            useUIStore.getState().showNotification('error', 'No auth token');
            return;
        }
        try {
            const api = (window as any).electronAPI;
            await api.git.push(activeRepoPath, token);
            useUIStore.getState().showNotification('success', 'Pushed!');
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        }
    }, [activeRepoPath, getToken]);

    const pull = useCallback(async () => {
        if (!activeRepoPath) return;
        const token = await getToken();
        if (!token) {
            useUIStore.getState().showNotification('error', 'No auth token');
            return;
        }
        try {
            const api = (window as any).electronAPI;
            await api.git.pull(activeRepoPath, token);
            useRepoStore.getState().refreshStatus();
            useUIStore.getState().showNotification('success', 'Pulled!');
        } catch (error: any) {
            useUIStore.getState().showNotification('error', error.message);
        }
    }, [activeRepoPath, getToken]);

    const sync = useCallback(async () => {
        if (!activeRepoPath) return;
        const token = await getToken();
        if (!token) {
            useUIStore.getState().showNotification('error', 'No auth token');
            return;
        }
        useUIStore.getState().setIsSyncing(true);
        try {
            const result = await useRepoStore.getState().syncRepo(token);
            if (result.success) {
                useUIStore.getState().showNotification('success', 'Synced!');
            } else if (result.conflicts && result.conflicts.length > 0) {
                useUIStore.getState().showConflicts(result.conflicts);
            } else {
                useUIStore.getState().showNotification('error', result.error || 'Sync failed');
            }
        } finally {
            useUIStore.getState().setIsSyncing(false);
        }
    }, [activeRepoPath, getToken]);

    return {
        commit,
        push,
        pull,
        sync,
        getToken,
        activeRepoPath,
        activeAccount,
    };
}
