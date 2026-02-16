import { create } from 'zustand';
import { commandRegistry } from '../lib/command-registry';

export interface MacroDefinition {
    id: string;
    name: string;
    description: string;
    steps: string[]; // command IDs
}

interface CommandPaletteState {
    isOpen: boolean;
    query: string;
    selectedIndex: number;

    macros: MacroDefinition[];
    showMacroEditor: boolean;
    editingMacro: MacroDefinition | null;

    open: () => void;
    close: () => void;
    setQuery: (q: string) => void;
    setSelectedIndex: (i: number) => void;
    toggle: () => void;

    loadMacros: () => Promise<void>;
    saveMacro: (macro: MacroDefinition) => Promise<void>;
    deleteMacro: (id: string) => Promise<void>;
    executeMacro: (macro: MacroDefinition) => Promise<void>;
    openMacroEditor: (macro?: MacroDefinition) => void;
    closeMacroEditor: () => void;
}

const STORAGE_KEY = 'command-macros';
const api = () => (window as any).electronAPI;

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
    isOpen: false,
    query: '',
    selectedIndex: 0,

    macros: [],
    showMacroEditor: false,
    editingMacro: null,

    open: () => set({ isOpen: true, query: '', selectedIndex: 0 }),
    close: () => set({ isOpen: false, query: '', selectedIndex: 0 }),
    toggle: () => {
        const { isOpen } = get();
        if (isOpen) get().close();
        else get().open();
    },
    setQuery: (q) => set({ query: q, selectedIndex: 0 }),
    setSelectedIndex: (i) => set({ selectedIndex: i }),

    loadMacros: async () => {
        try {
            const saved = await api().storage.get(STORAGE_KEY);
            if (saved && Array.isArray(saved)) {
                set({ macros: saved });
            }
        } catch {
            // ignore
        }
    },

    saveMacro: async (macro) => {
        const { macros } = get();
        const existing = macros.findIndex((m) => m.id === macro.id);
        const updated = existing >= 0
            ? macros.map((m) => (m.id === macro.id ? macro : m))
            : [...macros, macro];
        set({ macros: updated, showMacroEditor: false, editingMacro: null });
        await api().storage.set(STORAGE_KEY, updated);
    },

    deleteMacro: async (id) => {
        const updated = get().macros.filter((m) => m.id !== id);
        set({ macros: updated });
        await api().storage.set(STORAGE_KEY, updated);
    },

    executeMacro: async (macro) => {
        for (const stepId of macro.steps) {
            const cmd = commandRegistry.get(stepId);
            if (cmd) {
                await cmd.handler();
            }
        }
    },

    openMacroEditor: (macro) =>
        set({
            showMacroEditor: true,
            editingMacro: macro || null,
        }),

    closeMacroEditor: () =>
        set({ showMacroEditor: false, editingMacro: null }),
}));
