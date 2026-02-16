import { commandRegistry } from './command-registry';
import { useUIStore } from '../stores/ui.store';
import { useRepoStore } from '../stores/repo.store';
import { useAccountStore } from '../stores/account.store';
import { useCommandPaletteStore } from '../stores/command-palette.store';

function getToken(): Promise<string | null> {
    const acc = useAccountStore.getState();
    const active = acc.accounts.find((a) => a.id === acc.activeAccountId);
    if (!active) return Promise.resolve(null);
    return (window as any).electronAPI.auth.getToken(active.username);
}

export function registerDefaultCommands() {
    const cmds = [
        // ── Navigation ──
        { id: 'nav:changes', label: 'Go to Changes', category: 'navigation', shortcut: 'Ctrl+1', keywords: ['stage', 'diff'], handler: () => useUIStore.getState().setActiveTab('changes') },
        { id: 'nav:files', label: 'Go to Files', category: 'navigation', shortcut: 'Ctrl+2', keywords: ['browse', 'explorer'], handler: () => useUIStore.getState().setActiveTab('files') },
        { id: 'nav:history', label: 'Go to History', category: 'navigation', shortcut: 'Ctrl+3', keywords: ['log', 'commits'], handler: () => useUIStore.getState().setActiveTab('history') },
        { id: 'nav:branches', label: 'Go to Branches', category: 'navigation', shortcut: 'Ctrl+4', keywords: ['branch', 'checkout'], handler: () => useUIStore.getState().setActiveTab('branches') },
        { id: 'nav:cloud', label: 'Go to Cloud', category: 'navigation', shortcut: 'Ctrl+5', keywords: ['github', 'repos'], handler: () => useUIStore.getState().setActiveTab('cloud') },
        { id: 'nav:settings', label: 'Go to Settings', category: 'navigation', shortcut: 'Ctrl+6', keywords: ['config', 'preferences'], handler: () => useUIStore.getState().setActiveTab('settings') },
        { id: 'nav:prs', label: 'Go to Pull Requests', category: 'navigation', shortcut: 'Ctrl+7', keywords: ['pr', 'merge'], handler: () => useUIStore.getState().setActiveTab('pull-requests') },
        { id: 'nav:actions', label: 'Go to Actions', category: 'navigation', shortcut: 'Ctrl+8', keywords: ['workflow', 'ci'], handler: () => useUIStore.getState().setActiveTab('actions') },
        { id: 'nav:issues', label: 'Go to Issues', category: 'navigation', shortcut: 'Ctrl+9', keywords: ['bug', 'task'], handler: () => useUIStore.getState().setActiveTab('issues') },

        // ── Git ──
        {
            id: 'git:stage-all', label: 'Stage All Files', category: 'git', keywords: ['add'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: () => {
                const files = useRepoStore.getState().fileStatuses.filter((f) => !f.staged).map((f) => f.path);
                if (files.length) useRepoStore.getState().stageFiles(files);
            },
        },
        {
            id: 'git:unstage-all', label: 'Unstage All Files', category: 'git', keywords: ['reset'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: () => {
                const files = useRepoStore.getState().fileStatuses.filter((f) => f.staged).map((f) => f.path);
                if (files.length) useRepoStore.getState().unstageFiles(files);
            },
        },
        {
            id: 'git:push', label: 'Push', category: 'git', keywords: ['upload', 'remote'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: () => useRepoStore.getState().pushOnly(),
        },
        {
            id: 'git:sync', label: 'Sync (Pull & Push)', category: 'git', shortcut: 'Ctrl+P', keywords: ['pull', 'fetch'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: async () => {
                const token = await getToken();
                if (!token) { useUIStore.getState().showNotification('error', 'No auth token'); return; }
                useUIStore.getState().setIsSyncing(true);
                try {
                    const result = await useRepoStore.getState().syncRepo(token);
                    if (result.success) useUIStore.getState().showNotification('success', 'Synced!');
                    else useUIStore.getState().showNotification('error', result.error || 'Sync failed');
                } finally {
                    useUIStore.getState().setIsSyncing(false);
                }
            },
        },
        {
            id: 'git:stash', label: 'Stash Changes', category: 'git', shortcut: 'Ctrl+Shift+Z', keywords: ['save'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: () => useRepoStore.getState().stashChanges(),
        },
        {
            id: 'git:stash-pop', label: 'Pop Stash', category: 'git', keywords: ['apply'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: () => useRepoStore.getState().popStash(),
        },
        {
            id: 'git:undo', label: 'Undo Last Commit', category: 'git', keywords: ['soft reset'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: () => useRepoStore.getState().undoLastCommit(),
        },
        {
            id: 'git:revert', label: 'Revert Last Commit', category: 'git', shortcut: 'Ctrl+Shift+R', keywords: ['undo'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: () => useRepoStore.getState().revertLastCommit(),
        },
        {
            id: 'git:create-branch', label: 'Create Branch', category: 'git', shortcut: 'Ctrl+B', keywords: ['new branch'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: () => {
                useUIStore.getState().setActiveTab('branches');
                useUIStore.getState().setBranchCreateRequested(true);
            },
        },

        // ── View ──
        { id: 'view:toggle-terminal', label: 'Toggle Terminal', category: 'view', shortcut: 'Ctrl+J', keywords: ['console', 'shell'], handler: () => useUIStore.getState().toggleTerminal() },
        {
            id: 'view:activity-log', label: 'Show Activity Log', category: 'view', shortcut: 'Ctrl+Shift+A', keywords: ['commands', 'log'],
            handler: () => {
                const ui = useUIStore.getState();
                if (ui.bottomPanel === 'activity' && ui.terminalExpanded) {
                    ui.toggleTerminal(); // Close it
                } else {
                    ui.setBottomPanel('activity');
                    if (!ui.terminalExpanded) ui.toggleTerminal(); // Open it
                }
            },
        },
        {
            id: 'tools:macro-editor', label: 'Open Macro Editor', category: 'tools', shortcut: 'Ctrl+Shift+M', keywords: ['macro', 'automation'],
            handler: () => {
                useCommandPaletteStore.getState().openMacroEditor();
            },
        },
        {
            id: 'view:time-machine', label: 'Open Time Machine', category: 'view', keywords: ['reflog', 'restore', 'history'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: () => useUIStore.getState().openModal('time-machine', null),
        },
        {
            id: 'view:refresh', label: 'Refresh', category: 'view', shortcut: 'F5', keywords: ['reload'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: () => {
                useRepoStore.getState().refreshStatus();
                useRepoStore.getState().refreshBranches();
                useRepoStore.getState().refreshLog();
            },
        },
        { id: 'view:toggle-sidebar', label: 'Toggle Sidebar', category: 'view', keywords: ['collapse', 'expand'], handler: () => useUIStore.getState().toggleRepoSidebar() },

        // ── Repo ──
        { id: 'repo:new', label: 'New Repository', category: 'repo', shortcut: 'Ctrl+Shift+N', keywords: ['create', 'init'], handler: () => useUIStore.getState().setShowNewRepoModal(true) },
        {
            id: 'repo:publish', label: 'Publish Branch', category: 'repo', shortcut: 'Ctrl+Shift+P', keywords: ['upstream'],
            isAvailable: () => !!useRepoStore.getState().activeRepoPath,
            handler: async () => {
                const token = await getToken();
                if (token) useRepoStore.getState().publishBranch(token);
            },
        },
    ];

    cmds.forEach((cmd) => commandRegistry.register(cmd));
}
