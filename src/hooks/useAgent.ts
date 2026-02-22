import { useCallback, useEffect, useRef } from 'react';
import { useAgentStore } from '../stores/agent.store';
import { useRepoStore } from '../stores/repo.store';
import { useAccountStore } from '../stores/account.store';
import { useUIStore } from '../stores/ui.store';
import { useActionsStore } from '../stores/actions.store';
import type { AgentUIState } from '../electron.d';

export function useAgent() {
    const store = useAgentStore();
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
    const repos = useRepoStore((s) => s.repos);
    const branches = useRepoStore((s) => s.branches);
    const fileStatuses = useRepoStore((s) => s.fileStatuses);
    const currentBranch = branches.find((b) => b.current)?.name
        || repos.find((r) => r.path === activeRepoPath)?.branch
        || null;
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const accounts = useAccountStore((s) => s.accounts);
    const activeAccount = accounts.find((a) => a.id === activeAccountId);
    const listenersSetUp = useRef(false);

    // Set up IPC event listeners
    useEffect(() => {
        const api = window.electronAPI?.agent;
        if (!api || listenersSetUp.current) return;
        listenersSetUp.current = true;

        api.onThinking(({ iteration }) => {
            useAgentStore.getState().addMessage({
                role: 'status',
                content: `Thinking... (iteration ${iteration})`,
            });
        });

        api.onToolStart(({ tool, args }) => {
            useAgentStore.getState().setCurrentTool(tool);
            useAgentStore.getState().addMessage({
                role: 'tool',
                content: `Calling ${tool}...`,
                toolName: tool,
                toolArgs: args,
            });
        });

        api.onToolComplete(({ tool, result, error }) => {
            useAgentStore.getState().setCurrentTool(null);
            useAgentStore.getState().addMessage({
                role: 'tool',
                content: result,
                toolName: tool,
                error,
            });
        });

        api.onToolDenied(({ tool }) => {
            useAgentStore.getState().setCurrentTool(null);
            useAgentStore.getState().addMessage({
                role: 'status',
                content: `Action "${tool}" was denied by user.`,
            });
        });

        api.onConfirmRequest((data) => {
            useAgentStore.getState().setPendingConfirmation(data);
        });

        api.onStateChanged(() => {
            // Trigger a refresh of repo state
            useRepoStore.getState().refreshStatus?.();
        });

        api.onUIAction(({ action, payload }) => {
            if (action === 'switch_account') {
                const account = useAccountStore.getState().accounts.find(a => a.username === payload.username);
                if (account) useAccountStore.getState().setActiveAccount(account.id);
            } else if (action === 'navigate_tab') {
                useUIStore.getState().setActiveTab(payload.tab);
            } else if (action === 'open_repository') {
                useRepoStore.getState().setActiveRepo(payload.path);

                // Sync terminal and print success
                setTimeout(() => {
                    const state = useUIStore.getState();
                    const termId = state.activeTerminalId || (state.terminals.length > 0 ? state.terminals[0].id : null);
                    if (termId) {
                        const repoName = payload.path.split(/[/\\]/).pop() || payload.path;
                        // Use cd /d for windows drive changes, or just cd. Both work in powershell safely if quoted.
                        window.electronAPI.terminal.write(termId, `cd "${payload.path}"\r`);
                        setTimeout(() => {
                            window.electronAPI.terminal.write(termId, `\r\n\x1b[32m\x1b[1m✅ Switched to ${repoName}\x1b[0m\r\n\r`);
                        }, 50);
                    }
                }, 100);
            } else if (action === 'show_notification') {
                useUIStore.getState().showNotification(payload.type || 'info', payload.message);
            } else if (action === 'toggle_terminal') {
                useUIStore.getState().toggleTerminal();
            } else if (action === 'run_terminal_command') {
                const state = useUIStore.getState();
                let termId = state.activeTerminalId;
                if (!termId && state.terminals.length > 0) {
                    termId = state.terminals[0].id;
                } else if (!termId) {
                    state.addTerminal();
                    termId = useUIStore.getState().activeTerminalId;
                }
                if (!useUIStore.getState().terminalExpanded) {
                    useUIStore.getState().toggleTerminal();
                }
                if (termId) {
                    window.electronAPI.terminal.write(termId, payload.command + '\r');
                }
            } else if (action === 'create_repository') {
                const accountState = useAccountStore.getState();
                const activeAcc = accountState.accounts.find(a => a.id === accountState.activeAccountId);
                useRepoStore.getState().createRepo({
                    name: payload.name,
                    description: payload.description,
                    private: payload.private,
                    type: payload.type || 'both',
                    token: activeAcc?.token,
                    auto_init: true
                }).catch(e => {
                    useUIStore.getState().showNotification('error', `Failed to create repo: ${e.message}`);
                });
            } else if (action === 'create_github_workflow') {
                const { filename, content } = payload;
                const activeRepo = useRepoStore.getState().activeRepoPath;
                if (!activeRepo) {
                    useUIStore.getState().showNotification('error', 'Open a repository first to create a workflow.');
                    return;
                }
                let validFilename = filename;
                if (!validFilename.endsWith('.yml') && !validFilename.endsWith('.yaml')) {
                    validFilename += '.yml';
                }
                const path = `${activeRepo}/.github/workflows/${validFilename}`;

                useUIStore.getState().setActiveTab('actions');
                useActionsStore.getState().createWorkflowFile(path, content).then(() => {
                    useUIStore.getState().showNotification('success', `Created workflow: ${validFilename}`);
                }).catch(err => {
                    useUIStore.getState().showNotification('error', `Failed to create workflow: ${err.message}`);
                });
            } else if (action === 'edit_github_workflow') {
                const { filename, content } = payload;
                const activeRepo = useRepoStore.getState().activeRepoPath;
                if (!activeRepo) {
                    useUIStore.getState().showNotification('error', 'Open a repository first to edit a workflow.');
                    return;
                }
                let validFilename = filename;
                if (!validFilename.endsWith('.yml') && !validFilename.endsWith('.yaml')) {
                    validFilename += '.yml';
                }
                const path = `${activeRepo}/.github/workflows/${validFilename}`;

                useUIStore.getState().setActiveTab('actions');
                if (content) {
                    useActionsStore.getState().saveWorkflowFile(path, content).then(() => {
                        useActionsStore.getState().openWorkflowEditor(path);
                    }).catch(err => {
                        useUIStore.getState().showNotification('error', `Failed to update workflow: ${err.message}`);
                    });
                } else {
                    useActionsStore.getState().openWorkflowEditor(path).catch(err => {
                        useUIStore.getState().showNotification('error', `Failed to open workflow: ${err.message}`);
                    });
                }
            } else if (action === 'add_repository') {
                // Scan the parent directory so the repo gets picked up
                const repoPath: string = payload.path;
                useRepoStore.getState().scanDirectory(repoPath)
                    .then(() => {
                        // After scan, force set it active so it appears selected in sidebar immediately
                        useRepoStore.getState().setActiveRepo(repoPath);
                        useUIStore.getState().showNotification('success', `Repository added: ${repoPath.split(/[/\\]/).pop()}`);
                    })
                    .catch(() => {
                        // Fallback: just set it active and let the refresh handle the rest
                        useRepoStore.getState().setActiveRepo(repoPath);
                        useUIStore.getState().showNotification('info', `Opened repository: ${repoPath.split(/[/\\]/).pop()}`);
                    });
            }
        });

        return () => {
            api.removeAllListeners();
            listenersSetUp.current = false;
        };
    }, []);

    // Check if API key is configured on mount
    useEffect(() => {
        window.electronAPI?.agent?.getConfig().then((config) => {
            const hasValidKey = config?.provider && config?.keys?.[config.provider];
            useAgentStore.getState().setConfigured(!!hasValidKey);
        });
    }, []);

    // Build current UI state for the agent
    const buildUIState = useCallback((): AgentUIState => {
        const uiState = useUIStore.getState();
        const repoState = useRepoStore.getState();
        const accountState = useAccountStore.getState();

        const activeRepo = repoState.activeRepoPath;
        const currentBranchValue = repoState.branches.find((b) => b.current)?.name
            || repoState.repos.find((r) => r.path === activeRepo)?.branch
            || null;

        const activeAcc = accountState.accounts.find((a) => a.id === accountState.activeAccountId);

        return {
            repoPath: activeRepo,
            branch: currentBranchValue,
            uncommittedFiles: (repoState.fileStatuses || []).map((f) => ({
                path: f.path,
                status: f.status,
                staged: f.staged,
            })),
            selectedNodes: [],
            activeTab: uiState.activeTab,
            accounts: accountState.accounts.map(a => ({ id: a.id, username: a.username, label: a.label || a.displayName })),
            activeAccount: activeAcc ? activeAcc.username : null,
            repositories: repoState.repos.map(r => ({ path: r.path, name: r.name })),
            terminals: uiState.terminals.map(t => ({ id: t.id, title: t.title })),
        };
    }, []);

    // Send a message to the agent
    const sendMessage = useCallback(
        async (message: string) => {
            if (!message.trim()) return;

            const { setRunning, addMessage } = useAgentStore.getState();

            addMessage({ role: 'user', content: message });
            setRunning(true);

            try {
                // Get token for git operations
                let token: string | null = null;
                if (activeAccount) {
                    token = await window.electronAPI.auth.getToken(activeAccount.username);
                }

                const uiState = buildUIState();
                const response = await window.electronAPI.agent.run(message, uiState, token);

                addMessage({ role: 'assistant', content: response });
            } catch (err: any) {
                addMessage({
                    role: 'assistant',
                    content: `Error: ${err.message || err}`,
                    error: true,
                });
            } finally {
                setRunning(false);
            }
        },
        [activeAccount, buildUIState]
    );

    // Confirm or deny a dangerous action
    const confirmAction = useCallback(async (approved: boolean) => {
        useAgentStore.getState().setPendingConfirmation(null);
        await window.electronAPI.agent.confirmAction(approved);
    }, []);

    // Set the API key
    const setConfig = useCallback(async (config: any) => {
        await window.electronAPI.agent.setConfig(config);
        useAgentStore.getState().setConfigured(true);
    }, []);

    // Clear conversation
    const clearConversation = useCallback(async () => {
        useAgentStore.getState().clearMessages();
        await window.electronAPI.agent.clearHistory();
    }, []);

    return {
        // State
        isRunning: store.isRunning,
        isConfigured: store.isConfigured,
        messages: store.messages,
        pendingConfirmation: store.pendingConfirmation,
        currentTool: store.currentTool,

        // Actions
        sendMessage,
        confirmAction,
        setConfig,
        clearConversation,
    };
}
