import { useEffect, useRef, useCallback } from 'react';
import { useRepoStore } from '../stores/repo.store';

/**
 * Custom hook for managing the xterm.js terminal instance.
 * Handles syncing the terminal CWD to the active repo path
 * and provides methods for terminal interaction.
 */
export function useTerminal() {
    const terminalRef = useRef<any>(null);
    const activeRepoPath = useRepoStore((s) => s.activeRepoPath);

    // Sync terminal CWD when active repo changes
    useEffect(() => {
        if (terminalRef.current && activeRepoPath) {
            const terminal = terminalRef.current;
            // Send cd command to the terminal PTY
            try {
                const api = (window as any).electronAPI;
                api?.terminal?.write(`cd "${activeRepoPath}"\r`);
            } catch {
                // Terminal might not be connected yet
            }
        }
    }, [activeRepoPath]);

    const writeToTerminal = useCallback((data: string) => {
        try {
            const api = (window as any).electronAPI;
            api?.terminal?.write(data);
        } catch {
            console.warn('Terminal write failed');
        }
    }, []);

    const clearTerminal = useCallback(() => {
        if (terminalRef.current) {
            terminalRef.current.clear();
        }
    }, []);

    return {
        terminalRef,
        writeToTerminal,
        clearTerminal,
    };
}
