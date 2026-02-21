import Groq from 'groq-sdk';
import { BrowserWindow } from 'electron';
import { GitService } from './git.service';

// ─── Types ──────────────────────────────────────────────────────

export interface AgentMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: any[];
}

export interface UIState {
    repoPath: string | null;
    branch: string | null;
    uncommittedFiles: { path: string; status: string; staged: boolean }[];
    selectedNodes: { id: string; type: string }[];
    activeTab: string;
    accounts?: { id: string; username: string; label: string }[];
    activeAccount?: string | null;
    repositories?: { path: string; name: string }[];
    terminals?: { id: string; title: string }[];
}

export interface ToolExecResult {
    name: string;
    result: string;
    error?: boolean;
}

export interface ConfirmationRequest {
    id: string;
    tool: string;
    args: Record<string, any>;
    description: string;
}

// ─── Dangerous tools that require user confirmation ─────────────

const DANGEROUS_TOOLS = new Set([
    'git_push',
    'git_reset',
    'git_force_push',
    'git_delete_branch',
    'git_rebase',
    'git_merge',
]);

// ─── Tool Schemas (Groq function definitions) ───────────────────

const TOOL_SCHEMAS: Groq.Chat.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'git_status',
            description: 'Get the current git status showing uncommitted, staged, and untracked files.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_stage',
            description: 'Stage files for commit. Use ["."] to stage all files.',
            parameters: {
                type: 'object',
                properties: {
                    files: { type: 'array', items: { type: 'string' }, description: 'File paths to stage. Use ["."] for all.' },
                },
                required: ['files'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_unstage',
            description: 'Unstage files from the staging area.',
            parameters: {
                type: 'object',
                properties: {
                    files: { type: 'array', items: { type: 'string' }, description: 'File paths to unstage.' },
                },
                required: ['files'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_commit',
            description: 'Create a git commit with the staged changes.',
            parameters: {
                type: 'object',
                properties: {
                    message: { type: 'string', description: 'The commit message.' },
                },
                required: ['message'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_push',
            description: 'Push commits to the remote repository. DANGEROUS: requires user confirmation.',
            parameters: {
                type: 'object',
                properties: {
                    remote: { type: 'string', description: 'Remote name (default: origin).' },
                    branch: { type: 'string', description: 'Branch to push.' },
                    set_upstream: { type: 'boolean', description: 'Set upstream tracking.' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_pull',
            description: 'Pull latest changes from the remote repository.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_log',
            description: 'Show recent commit history.',
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'number', description: 'Number of commits to show (default: 10).' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_diff',
            description: 'Show the diff of uncommitted changes, or diff for a specific file.',
            parameters: {
                type: 'object',
                properties: {
                    file: { type: 'string', description: 'Optional file path to diff.' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_branches',
            description: 'List all local and remote branches.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'switch_branch',
            description: 'Switch to a different branch, or create a new branch and switch to it.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Branch name to switch to.' },
                    create: { type: 'boolean', description: 'If true, create the branch first.' },
                },
                required: ['name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_merge',
            description: 'Merge a branch into the current branch. DANGEROUS: requires confirmation.',
            parameters: {
                type: 'object',
                properties: {
                    branch: { type: 'string', description: 'Branch to merge into the current branch.' },
                },
                required: ['branch'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_reset',
            description: 'Reset the current branch. DANGEROUS: requires confirmation. Hard reset can lose uncommitted work.',
            parameters: {
                type: 'object',
                properties: {
                    mode: { type: 'string', enum: ['soft', 'hard'], description: 'Reset mode.' },
                    target: { type: 'string', description: 'Commit hash or ref to reset to (e.g. HEAD~1).' },
                },
                required: ['mode', 'target'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_stash',
            description: 'Stash uncommitted changes.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_stash_pop',
            description: 'Pop the most recent stash.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'git_resolve_conflict',
            description: 'Resolve a merge conflict on a file using a strategy.',
            parameters: {
                type: 'object',
                properties: {
                    file: { type: 'string', description: 'File with the conflict.' },
                    strategy: { type: 'string', enum: ['ours', 'theirs'], description: 'Which side to keep.' },
                },
                required: ['file', 'strategy'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: 'Read the contents of a file in the repository.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Relative file path within the repo.' },
                },
                required: ['path'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_files',
            description: 'List all tracked files in the repository.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'add_workflow_node',
            description: 'Add a node to the visual workflow editor (React Flow). Returns the created node info.',
            parameters: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['trigger', 'job', 'step', 'branch', 'switch', 'matrix', 'contextGetter', 'secretGetter', 'subWorkflow'],
                        description: 'The type of workflow node to add.',
                    },
                    position: {
                        type: 'object',
                        properties: {
                            x: { type: 'number' },
                            y: { type: 'number' },
                        },
                        required: ['x', 'y'],
                        description: 'Canvas position for the node.',
                    },
                    data: {
                        type: 'object',
                        description: 'Optional node data (e.g. { name: "Build", runsOn: "ubuntu-latest" } for a job node).',
                    },
                },
                required: ['type', 'position'],
            },
        }
    },
    {
        type: 'function',
        function: {
            name: 'ui_switch_account',
            description: 'Switch the active GitHub account.',
            parameters: {
                type: 'object',
                properties: {
                    username: { type: 'string', description: 'The username of the account to switch to.' },
                },
                required: ['username'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ui_navigate_tab',
            description: 'Navigate to a different main tab in the app.',
            parameters: {
                type: 'object',
                properties: {
                    tab: { type: 'string', enum: ['changes', 'history', 'branches', 'cloud', 'settings', 'pull-requests', 'actions', 'issues', 'files', 'agent'], description: 'The tab ID to navigate to.' },
                },
                required: ['tab'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ui_open_repository',
            description: 'Open a local repository from the known repositories list.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'The full local path of the repository.' },
                },
                required: ['path'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ui_show_notification',
            description: 'Show a toast notification to the user.',
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['success', 'info', 'error'], description: 'Type of notification.' },
                    message: { type: 'string', description: 'The notification message.' },
                },
                required: ['type', 'message'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ui_toggle_terminal',
            description: 'Toggle the visibility of the bottom terminal panel. It is useful when the user wants to run or see terminal commands.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'github_create_repo',
            description: 'Create a new repository on GitHub (and optionally locally).',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Name of the new repository.' },
                    description: { type: 'string', description: 'Description.' },
                    private: { type: 'boolean', description: 'Whether it is private.' },
                    type: { type: 'string', enum: ['local', 'github', 'both'], description: 'Where to create it. Default to "both".' }
                },
                required: ['name', 'type'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'terminal_run_command',
            description: 'Run a shell command in the active terminal panel. The terminal must be visible first.',
            parameters: {
                type: 'object',
                properties: {
                    command: { type: 'string', description: 'The shell command to run.' },
                },
                required: ['command'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ui_create_github_workflow',
            description: 'Create a new GitHub Actions workflow file through the app\'s visual workflow editor.',
            parameters: {
                type: 'object',
                properties: {
                    filename: { type: 'string', description: 'Name of the workflow yaml file (e.g. build.yml)' },
                    content: { type: 'string', description: 'The YAML content of the workflow.' },
                },
                required: ['filename', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ui_edit_github_workflow',
            description: 'Open an existing GitHub Actions workflow in the visual editor, optionally updating its content first.',
            parameters: {
                type: 'object',
                properties: {
                    filename: { type: 'string', description: 'Name of the workflow file to edit.' },
                    content: { type: 'string', description: 'The updated YAML content (optional, omitting it just opens the file).' },
                },
                required: ['filename'],
            },
        },
    },
];

// ─── System Prompt ──────────────────────────────────────────────

function buildSystemPrompt(uiState: UIState): string {
    return `You are Flux AI, an intelligent agent embedded in the Flux Client Git desktop app.
You can perform Git operations, manipulate the visual workflow editor, and control the app's UI on behalf of the user.

CURRENT STATE:
- Repository: ${uiState.repoPath || 'No repo open'} (Tracked repos: ${uiState.repositories?.map(r => r.name).join(', ') || 'None'})
- Branch: ${uiState.branch || 'unknown'}
- Uncommitted files: ${uiState.uncommittedFiles.length > 0 ? uiState.uncommittedFiles.map(f => `${f.path} (${f.status}${f.staged ? ', staged' : ''})`).join(', ') : 'None'}
- Active tab: ${uiState.activeTab}
- Selected workflow nodes: ${uiState.selectedNodes.length > 0 ? uiState.selectedNodes.map(n => `${n.id} (${n.type})`).join(', ') : 'None'}
- Active Account: ${uiState.activeAccount || 'None'} (Available: ${uiState.accounts?.map(a => a.username).join(', ') || 'None'})

RULES:
- Always check status before committing to understand what will be included.
- When the user asks to commit, stage all relevant files first unless they specify otherwise.
- For destructive operations (push, reset, merge, rebase, delete branch), always explain what you will do before calling the tool.
- Identify the user's intent: if they ask to switch accounts, use ui_switch_account. If they ask to navigate somewhere, use ui_navigate_tab. If they ask to open a repo, use ui_open_repository. DO NOT apologize for lacking capabilities; you can control the UI directly.
- When the user asks to create or edit a workflow/action, ALWAYS use \`ui_create_github_workflow\` or \`ui_edit_github_workflow\`. Using these tools will present the changes visually to the user in the app. Do NOT use terminal commands to overwrite workflows.
- If a tool call fails, analyze the error and try a different approach. Do not repeat the same failed call.
- Keep responses concise. Explain what you did, not what you will do.
- When adding workflow nodes, use reasonable default positions if not specified.`;
}

// ─── Agent Service ──────────────────────────────────────────────

export class AgentService {
    private groq: Groq | null = null;
    private apiKey: string | null = null;
    private gitService: GitService;
    private mainWindow: BrowserWindow | null = null;
    private pendingConfirmation: {
        resolve: (approved: boolean) => void;
        request: ConfirmationRequest;
    } | null = null;
    private conversationHistory: AgentMessage[] = [];

    constructor(gitService: GitService) {
        this.gitService = gitService;
    }

    setWindow(window: BrowserWindow) {
        this.mainWindow = window;
    }

    setApiKey(key: string) {
        this.apiKey = key;
        this.groq = new Groq({ apiKey: key });
    }

    getApiKey(): string | null {
        return this.apiKey;
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    // ── Resolve a pending confirmation ───────────────────────────

    resolveConfirmation(approved: boolean) {
        if (this.pendingConfirmation) {
            this.pendingConfirmation.resolve(approved);
            this.pendingConfirmation = null;
        }
    }

    // ── Main dispatch loop ───────────────────────────────────────

    async run(userMessage: string, uiState: UIState, token: string | null): Promise<string> {
        if (!this.groq) {
            throw new Error('Agent not configured. Please set your Groq API key in Settings.');
        }

        if (!uiState.repoPath) {
            throw new Error('No repository is open. Open a repo first.');
        }

        // Build conversation
        const systemMsg: AgentMessage = {
            role: 'system',
            content: buildSystemPrompt(uiState),
        };

        this.conversationHistory.push({
            role: 'user',
            content: userMessage,
        });

        // Groq messages (system + full history)
        const messages = [systemMsg, ...this.conversationHistory];

        const MAX_ITERATIONS = 10;
        let iteration = 0;

        while (iteration < MAX_ITERATIONS) {
            iteration++;

            this.emit('agent:thinking', { iteration });

            let response;
            try {
                response = await this.groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: messages as any,
                    tools: TOOL_SCHEMAS,
                    tool_choice: 'auto',
                    temperature: 0.1,
                    max_tokens: 4096,
                });
            } catch (err: any) {
                const errorMsg = `Groq API error: ${err.message || err}`;
                this.conversationHistory.push({ role: 'assistant', content: errorMsg });
                return errorMsg;
            }

            const choice = response.choices[0];
            if (!choice) {
                return 'No response from the model.';
            }

            const assistantMsg = choice.message;

            // Add assistant message to history
            const historyEntry: AgentMessage = {
                role: 'assistant',
                content: assistantMsg.content || '',
            };
            if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
                historyEntry.tool_calls = assistantMsg.tool_calls;
            }
            this.conversationHistory.push(historyEntry);
            messages.push(historyEntry);

            // If no tool calls, we're done
            if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
                return assistantMsg.content || '';
            }

            // Execute each tool call
            for (const toolCall of assistantMsg.tool_calls) {
                const { name } = toolCall.function;
                let args: Record<string, any>;
                try {
                    args = JSON.parse(toolCall.function.arguments || '{}');
                } catch {
                    // Hallucinated / malformed arguments
                    const errResult: AgentMessage = {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({ error: true, result: 'Failed to parse arguments. The arguments JSON was malformed. Please try again with valid JSON.' }),
                    };
                    this.conversationHistory.push(errResult);
                    messages.push(errResult);
                    continue;
                }

                this.emit('agent:tool_start', { tool: name, args });

                // Check if dangerous → ask for confirmation
                if (DANGEROUS_TOOLS.has(name)) {
                    const confirmed = await this.requestConfirmation({
                        id: toolCall.id,
                        tool: name,
                        args,
                        description: `${name}(${JSON.stringify(args)})`,
                    });

                    if (!confirmed) {
                        const deniedResult: AgentMessage = {
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: JSON.stringify({ error: true, result: 'User denied this action. Do not retry. Explain to the user that the action was cancelled.' }),
                        };
                        this.conversationHistory.push(deniedResult);
                        messages.push(deniedResult);
                        this.emit('agent:tool_denied', { tool: name });
                        continue;
                    }
                }

                // Execute the tool
                const result = await this.executeTool(name, args, uiState.repoPath!, token);

                this.emit('agent:tool_complete', { tool: name, result: result.result, error: result.error });

                const toolResult: AgentMessage = {
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result),
                };
                this.conversationHistory.push(toolResult);
                messages.push(toolResult);
            }

            // After executing all tool calls, notify renderer to refresh
            this.emit('agent:state_changed', {});

            // Loop back to let the model see the tool results
        }

        return 'Agent reached maximum iterations. Please try a simpler request.';
    }

    // ── Tool execution router ────────────────────────────────────

    private async executeTool(
        name: string,
        args: Record<string, any>,
        repoPath: string,
        token: string | null
    ): Promise<ToolExecResult> {
        try {
            switch (name) {
                case 'git_status': {
                    const files = await this.gitService.status(repoPath);
                    return { name, result: JSON.stringify(files) };
                }
                case 'git_stage': {
                    await this.gitService.stage(repoPath, args.files);
                    return { name, result: `Staged ${args.files.length === 1 && args.files[0] === '.' ? 'all files' : args.files.join(', ')}` };
                }
                case 'git_unstage': {
                    await this.gitService.unstage(repoPath, args.files);
                    return { name, result: `Unstaged ${args.files.join(', ')}` };
                }
                case 'git_commit': {
                    await this.gitService.commit(repoPath, args.message);
                    return { name, result: `Committed with message: "${args.message}"` };
                }
                case 'git_push': {
                    if (!token) return { name, result: 'No auth token available. User must be logged in.', error: true };
                    await this.gitService.push(repoPath, token, args.remote, args.branch, args.set_upstream);
                    return { name, result: 'Pushed successfully.' };
                }
                case 'git_pull': {
                    if (!token) return { name, result: 'No auth token available.', error: true };
                    await this.gitService.pull(repoPath, token);
                    return { name, result: 'Pulled latest changes.' };
                }
                case 'git_log': {
                    const commits = await this.gitService.log(repoPath, args.limit || 10);
                    const summary = commits.map((c: any) => `${c.shortHash} ${c.message} (${c.author}, ${c.date})`).join('\n');
                    return { name, result: summary };
                }
                case 'git_diff': {
                    const diff = await this.gitService.diff(repoPath, args.file);
                    return { name, result: diff || 'No changes.' };
                }
                case 'git_branches': {
                    const branches = await this.gitService.branches(repoPath);
                    const formatted = branches.map((b: any) => `${b.current ? '* ' : '  '}${b.name}${b.remote ? ' (remote)' : ''}`).join('\n');
                    return { name, result: formatted };
                }
                case 'switch_branch': {
                    await this.gitService.checkout(repoPath, args.name, args.create);
                    return { name, result: `Switched to branch '${args.name}'${args.create ? ' (created)' : ''}` };
                }
                case 'git_merge': {
                    await this.gitService.merge(repoPath, args.branch);
                    return { name, result: `Merged '${args.branch}' into current branch.` };
                }
                case 'git_reset': {
                    await this.gitService.reset(repoPath, args.mode, args.target);
                    return { name, result: `Reset (${args.mode}) to ${args.target}.` };
                }
                case 'git_stash': {
                    await this.gitService.stash(repoPath);
                    return { name, result: 'Stashed changes.' };
                }
                case 'git_stash_pop': {
                    await this.gitService.stashPop(repoPath);
                    return { name, result: 'Popped stash.' };
                }
                case 'git_resolve_conflict': {
                    await this.gitService.resolveConflict(repoPath, args.file, args.strategy);
                    return { name, result: `Resolved conflict on '${args.file}' using '${args.strategy}'.` };
                }
                case 'read_file': {
                    const content = await this.gitService.getFileContent(repoPath, args.path);
                    // Truncate very large files
                    const truncated = content.length > 8000 ? content.substring(0, 8000) + '\n... (truncated)' : content;
                    return { name, result: truncated };
                }
                case 'list_files': {
                    const files = await this.gitService.listFiles(repoPath);
                    return { name, result: files.join('\n') };
                }
                case 'add_workflow_node': {
                    // This is executed on the renderer side — send via IPC
                    this.emit('agent:add_workflow_node', {
                        type: args.type,
                        position: args.position,
                        data: args.data || {},
                    });
                    return { name, result: `Added '${args.type}' node at (${args.position.x}, ${args.position.y}).` };
                }
                case 'ui_switch_account': {
                    this.emit('agent:ui_action', { action: 'switch_account', payload: { username: args.username } });
                    return { name, result: `Switched account to ${args.username}.` };
                }
                case 'ui_navigate_tab': {
                    this.emit('agent:ui_action', { action: 'navigate_tab', payload: { tab: args.tab } });
                    return { name, result: `Navigated to tab ${args.tab}.` };
                }
                case 'ui_open_repository': {
                    this.emit('agent:ui_action', { action: 'open_repository', payload: { path: args.path } });
                    return { name, result: `Opened repository at ${args.path}.` };
                }
                case 'ui_show_notification': {
                    this.emit('agent:ui_action', { action: 'show_notification', payload: { type: args.type, message: args.message } });
                    return { name, result: `Displayed notification: [${args.type}] ${args.message}` };
                }
                case 'ui_toggle_terminal': {
                    this.emit('agent:ui_action', { action: 'toggle_terminal', payload: {} });
                    return { name, result: 'Toggled terminal visibility.' };
                }
                case 'github_create_repo': {
                    this.emit('agent:ui_action', { action: 'create_repository', payload: args });
                    return { name, result: `Dispatched request to create repository ${args.name} (${args.type}). The UI will handle it.` };
                }
                case 'terminal_run_command': {
                    this.emit('agent:ui_action', { action: 'run_terminal_command', payload: { command: args.command } });
                    return { name, result: `Dispatched command "${args.command}" to the terminal.` };
                }
                case 'ui_create_github_workflow': {
                    this.emit('agent:ui_action', { action: 'create_github_workflow', payload: { filename: args.filename, content: args.content } });
                    return { name, result: `Created workflow ${args.filename} and opened the visual workflow editor.` };
                }
                case 'ui_edit_github_workflow': {
                    this.emit('agent:ui_action', { action: 'edit_github_workflow', payload: { filename: args.filename, content: args.content } });
                    return { name, result: `Opened workflow ${args.filename} in the visual workflow editor.` };
                }
                default:
                    return { name, result: `Unknown tool: ${name}`, error: true };
            }
        } catch (err: any) {
            return {
                name,
                result: `Tool '${name}' failed: ${err.message || err}`,
                error: true,
            };
        }
    }

    // ── Confirmation flow ────────────────────────────────────────

    private requestConfirmation(request: ConfirmationRequest): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this.pendingConfirmation = { resolve, request };
            this.emit('agent:confirm_request', request);
        });
    }

    // ── IPC event emitter ────────────────────────────────────────

    private emit(channel: string, data: any) {
        this.mainWindow?.webContents.send(channel, data);
    }
}
