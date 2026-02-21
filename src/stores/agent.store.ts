import { create } from 'zustand';
import type { AgentConfirmRequest, AgentUIState } from '../electron.d';

export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant' | 'tool' | 'status';
    content: string;
    timestamp: number;
    toolName?: string;
    toolArgs?: any;
    error?: boolean;
}

interface AgentState {
    // State
    isRunning: boolean;
    isConfigured: boolean;
    messages: AgentMessage[];
    pendingConfirmation: AgentConfirmRequest | null;
    currentTool: string | null;

    // Actions
    setRunning: (running: boolean) => void;
    setConfigured: (configured: boolean) => void;
    addMessage: (msg: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
    setPendingConfirmation: (req: AgentConfirmRequest | null) => void;
    setCurrentTool: (tool: string | null) => void;
    clearMessages: () => void;
}

let msgId = 0;

export const useAgentStore = create<AgentState>((set) => ({
    isRunning: false,
    isConfigured: false,
    messages: [],
    pendingConfirmation: null,
    currentTool: null,

    setRunning: (running) => set({ isRunning: running }),
    setConfigured: (configured) => set({ isConfigured: configured }),

    addMessage: (msg) =>
        set((state) => ({
            messages: [
                ...state.messages,
                { ...msg, id: `msg-${++msgId}`, timestamp: Date.now() },
            ],
        })),

    setPendingConfirmation: (req) => set({ pendingConfirmation: req }),
    setCurrentTool: (tool) => set({ currentTool: tool }),
    clearMessages: () => set({ messages: [], pendingConfirmation: null, currentTool: null }),
}));
