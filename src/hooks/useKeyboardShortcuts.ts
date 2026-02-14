import { useEffect } from 'react';
import { useUIStore } from '../stores/ui.store';
import { useRepoStore } from '../stores/repo.store';
import { useAccountStore } from '../stores/account.store';

export function useKeyboardShortcuts() {
    const setActiveTab = useUIStore((s) => s.setActiveTab);
    const setShowNewRepoModal = useUIStore((s) => s.setShowNewRepoModal);
    const syncRepo = useRepoStore((s) => s.syncRepo);
    const publishBranch = useRepoStore((s) => s.publishBranch);
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const accounts = useAccountStore((s) => s.accounts);

    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            // Ignore if input/textarea is focused
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA'
            ) {
                return;
            }

            const isCtrl = e.metaKey || e.ctrlKey;
            const isShift = e.shiftKey;

            if (isCtrl) {
                switch (e.key.toLowerCase()) {
                    // Navigation
                    case '1':
                        e.preventDefault();
                        setActiveTab('changes');
                        break;
                    case '2':
                        e.preventDefault();
                        setActiveTab('history');
                        break;
                    case '3':
                        e.preventDefault();
                        setActiveTab('branches');
                        break;
                    case '4':
                        e.preventDefault();
                        setActiveTab('cloud');
                        break;
                    case '5':
                        e.preventDefault();
                        setActiveTab('pull-requests');
                        break;

                    case ',':
                        e.preventDefault();
                        setActiveTab('settings');
                        break;

                    // Actions
                    case 'p':
                        e.preventDefault();
                        if (isShift) {
                            // Push / Publish
                            const account = accounts.find((a) => a.id === activeAccountId) || accounts[0];
                            if (account && account.token) {
                                await publishBranch(account.token);
                            }
                        } else {
                            // Pull / Sync
                            const account = accounts.find((a) => a.id === activeAccountId) || accounts[0];
                            if (account && account.token) {
                                await syncRepo(account.token);
                            }
                        }
                        break;

                    case 'n':
                        if (isShift) {
                            e.preventDefault();
                            setShowNewRepoModal(true);
                        }
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setActiveTab, setShowNewRepoModal, syncRepo, publishBranch, activeRepoPath, activeAccountId, accounts]);
}
