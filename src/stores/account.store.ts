import { create } from 'zustand';

export interface Account {
    id: string;
    username: string;
    avatarUrl: string;
    label: string;
    type: 'personal' | 'work' | 'client';
    token?: string; // OAuth token (populated when loaded from auth service)
}

interface AccountState {
    accounts: Account[];
    activeAccountId: string | null;
    isLoading: boolean;

    setActiveAccount: (id: string) => void;
    addAccount: (account: Account) => void;
    removeAccount: (id: string) => void;
    setAccounts: (accounts: Account[]) => void;
    loadAccounts: () => Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
    accounts: [],
    activeAccountId: null,
    isLoading: false,

    setActiveAccount: (id) => set({ activeAccountId: id }),

    addAccount: (account) =>
        set((state) => ({
            accounts: [...state.accounts, account],
            activeAccountId: state.activeAccountId ?? account.id,
        })),

    removeAccount: (id) =>
        set((state) => {
            const filtered = state.accounts.filter((a) => a.id !== id);
            return {
                accounts: filtered,
                activeAccountId:
                    state.activeAccountId === id
                        ? filtered[0]?.id ?? null
                        : state.activeAccountId,
            };
        }),

    setAccounts: (accounts) =>
        set({
            accounts,
            activeAccountId: accounts[0]?.id ?? null,
        }),

    loadAccounts: async () => {
        set({ isLoading: true });
        try {
            const api = (window as any).electronAPI;
            if (api?.auth) {
                const accounts = await api.auth.getAccounts();

                // Fetch tokens for each account
                const accountsWithTokens = await Promise.all(
                    accounts.map(async (acc: Account) => {
                        try {
                            const token = await api.auth.getToken(acc.username);
                            return { ...acc, token };
                        } catch {
                            return acc;
                        }
                    })
                );

                set({
                    accounts: accountsWithTokens,
                    activeAccountId: accountsWithTokens[0]?.id ?? null,
                    isLoading: false,
                });
            }
        } catch (error) {
            console.error('Failed to load accounts:', error);
            set({ isLoading: false });
        }
    },
}));
