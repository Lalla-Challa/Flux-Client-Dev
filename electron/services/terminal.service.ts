import * as pty from 'node-pty';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { BrowserWindow } from 'electron';

export interface TerminalContext {
    cwd: string;
    username?: string;
    token?: string;
}

export class TerminalService {
    private terminals: Map<string, pty.IPty> = new Map();
    private contexts: Map<string, TerminalContext> = new Map();
    private mainWindow: BrowserWindow | null = null;

    setWindow(win: BrowserWindow): void {
        this.mainWindow = win;
    }

    createTerminal(id: string, context: TerminalContext): { cols: number; rows: number } {
        // Clean up existing terminal with same ID
        this.destroyTerminal(id);

        const { shell, shellArgs } = this.detectShell();
        const env = this.buildEnvironment(context);

        const cols = 80;
        const rows = 24;

        // PTY options
        const ptyOptions: any = {
            name: 'xterm-256color',
            cols,
            rows,
            cwd: context.cwd || os.homedir(),
            env,
        };

        // On Windows, use winpty backend instead of ConPTY to avoid console attachment issues
        if (os.platform() === 'win32') {
            ptyOptions.useConpty = false;
        }

        // Spawn PTY
        const terminal = pty.spawn(shell, shellArgs, ptyOptions);

        // Stream output to renderer
        terminal.onData((data) => {
            this.mainWindow?.webContents.send('terminal:data', { id, data });
        });

        terminal.onExit((exitCode) => {
            this.mainWindow?.webContents.send('terminal:exit', { id, exitCode });
            this.terminals.delete(id);
            this.contexts.delete(id);
        });

        this.terminals.set(id, terminal);
        this.contexts.set(id, context);

        return { cols, rows };
    }

    writeToTerminal(id: string, data: string): void {
        const terminal = this.terminals.get(id);
        if (terminal) {
            terminal.write(data);
        }
    }

    resizeTerminal(id: string, cols: number, rows: number): void {
        const terminal = this.terminals.get(id);
        if (terminal) {
            try {
                terminal.resize(Math.max(cols, 1), Math.max(rows, 1));
            } catch (e) {
                // Ignore resize errors (can happen during rapid resizing)
            }
        }
    }

    setTerminalContext(id: string, context: TerminalContext): void {
        const terminal = this.terminals.get(id);
        if (!terminal) return;

        const prevContext = this.contexts.get(id);
        this.contexts.set(id, context);

        const { cwd, username, token } = context;
        const isWindows = os.platform() === 'win32';
        const shell = this.detectShell().shell;
        const isGitBash = shell.includes('bash');
        const isPowerShell = shell.includes('powershell') || shell.includes('pwsh');

        // Change directory only if it actually changed
        if (cwd && cwd !== prevContext?.cwd && fs.existsSync(cwd)) {
            if (isPowerShell) {
                terminal.write(`Set-Location "${cwd}"\r`);
            } else {
                // Git Bash / Unix shells
                const normalizedCwd = isWindows ? cwd.replace(/\\/g, '/') : cwd;
                terminal.write(`cd "${normalizedCwd}"\r`);
            }

            // Clear after cd so the user sees a clean prompt in the new dir
            if (isPowerShell) {
                terminal.write(`Clear-Host\r`);
            } else {
                terminal.write(`clear\r`);
            }
        }

        // Update git credentials silently if they changed
        if (username && token && (username !== prevContext?.username || token !== prevContext?.token)) {
            if (isPowerShell) {
                terminal.write(`$env:GITHUB_TOKEN="${token}"\r`);
                terminal.write(`$env:GIT_AUTHOR_NAME="${username}"\r`);
                terminal.write(`$env:GIT_COMMITTER_NAME="${username}"\r`);
            } else {
                terminal.write(`export GITHUB_TOKEN="${token}"\r`);
                terminal.write(`export GIT_AUTHOR_NAME="${username}"\r`);
                terminal.write(`export GIT_COMMITTER_NAME="${username}"\r`);
            }

            // Clear so credential update commands aren't visible
            if (isPowerShell) {
                terminal.write(`Clear-Host\r`);
            } else {
                terminal.write(`clear\r`);
            }
        }
    }

    destroyTerminal(id: string): void {
        const terminal = this.terminals.get(id);
        if (terminal) {
            terminal.kill();
            this.terminals.delete(id);
            this.contexts.delete(id);
        }
    }

    destroyAll(): void {
        for (const [id] of this.terminals) {
            this.destroyTerminal(id);
        }
    }

    private detectShell(): { shell: string; shellArgs: string[] } {
        const platform = os.platform();

        if (platform === 'win32') {
            // Try Git Bash first
            const gitBashPaths = [
                'C:\\Program Files\\Git\\bin\\bash.exe',
                'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
                path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Git', 'bin', 'bash.exe'),
            ];

            for (const bashPath of gitBashPaths) {
                if (fs.existsSync(bashPath)) {
                    return { shell: bashPath, shellArgs: ['-l', '-i'] };
                }
            }

            // Try PowerShell Core (pwsh) first, then fall back to Windows PowerShell
            const pwshPath = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
            if (fs.existsSync(pwshPath)) {
                return {
                    shell: pwshPath,
                    shellArgs: ['-NoLogo'],
                };
            }

            // Fallback to Windows PowerShell
            return {
                shell: 'powershell.exe',
                shellArgs: ['-NoLogo'],
            };
        } else if (platform === 'darwin') {
            return { shell: process.env.SHELL || '/bin/zsh', shellArgs: ['-l'] };
        } else {
            return { shell: process.env.SHELL || '/bin/bash', shellArgs: ['-l'] };
        }
    }

    private buildEnvironment(context: TerminalContext): NodeJS.ProcessEnv {
        const env = { ...process.env };

        // Set git credentials if provided
        if (context.username) {
            env.GIT_AUTHOR_NAME = context.username;
            env.GIT_COMMITTER_NAME = context.username;
        }

        if (context.token) {
            env.GITHUB_TOKEN = context.token;
            env.GIT_TERMINAL_PROMPT = '0';
        }

        // Set terminal type
        env.TERM = 'xterm-256color';

        return env;
    }
}
