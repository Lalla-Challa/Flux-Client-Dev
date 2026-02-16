import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccountStore, Account } from '../../stores/account.store';
import { useUIStore } from '../../stores/ui.store';

export function AccountSidebar() {
    const accounts = useAccountStore((s) => s.accounts);
    const activeAccountId = useAccountStore((s) => s.activeAccountId);
    const setActiveAccount = useAccountStore((s) => s.setActiveAccount);
    const removeAccount = useAccountStore((s) => s.removeAccount);

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; account: Account } | null>(null);

    const handleAddAccount = async () => {
        try {
            const api = (window as any).electronAPI;
            if (api?.auth) {
                const account = await api.auth.login();
                if (account) {
                    useAccountStore.getState().addAccount(account);
                    useUIStore.getState().showNotification('success', `Connected as ${account.username}`);
                }
            }
        } catch (error: any) {
            console.error('Login failed:', error);
            useUIStore.getState().showNotification('error', error?.message || 'Login failed');
        }
    };

    const handleRemoveAccount = async (account: Account) => {
        setContextMenu(null);
        try {
            const api = (window as any).electronAPI;
            if (api?.auth) {
                await api.auth.removeAccount(account.username);
            }
            removeAccount(account.id);
            useUIStore.getState().showNotification('info', `Removed ${account.username}`);
        } catch (error: any) {
            console.error('Remove failed:', error);
            useUIStore.getState().showNotification('error', error?.message || 'Failed to remove account');
        }
    };

    const handleContextMenu = (e: React.MouseEvent, account: Account) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, account });
    };

    // Close context menu on click outside
    useEffect(() => {
        if (!contextMenu) return;
        const handler = () => setContextMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [contextMenu]);

    return (
        <div className="flex flex-col items-center w-[60px] bg-surface-1 border-r border-border py-3 gap-3 shrink-0">
            {/* Logo */}
            <div className="w-10 h-10 mb-2 flex items-center justify-center">
                <img src="logo.png" className="w-full h-full object-contain filter drop-shadow-lg" alt="Flux" />
            </div>

            {/* Divider */}
            <div className="w-6 h-px bg-border" />

            {/* Account Avatars */}
            <div className="flex flex-col items-center gap-2 flex-1 overflow-y-auto py-1">
                {accounts.map((account) => (
                    <AccountAvatar
                        key={account.id}
                        account={account}
                        isActive={account.id === activeAccountId}
                        onClick={() => setActiveAccount(account.id)}
                        onContextMenu={(e) => handleContextMenu(e, account)}
                    />
                ))}

                {/* Add Account Button */}
                <button
                    onClick={handleAddAccount}
                    className="w-9 h-9 rounded-full border-2 border-dashed border-surface-5 flex items-center justify-center
                     hover:border-brand-500 hover:text-brand-400 text-text-tertiary transition-all duration-200"
                    title="Add GitHub Account"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Bottom: Collapse Toggle */}
            <div className="w-6 h-px bg-border" />
            <button
                onClick={() => useUIStore.getState().toggleRepoSidebar()}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary
                   hover:bg-surface-3 hover:text-text-secondary transition-all"
                title="Toggle Sidebar"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h7" />
                </svg>
            </button>

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.1 }}
                        className="fixed z-50 bg-surface-2 border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-3 py-1.5 border-b border-border">
                            <p className="text-xs font-medium truncate">{contextMenu.account.username}</p>
                            <p className="text-2xs text-text-tertiary capitalize">{contextMenu.account.type}</p>
                        </div>
                        <button
                            onClick={() => handleRemoveAccount(contextMenu.account)}
                            className="w-full px-3 py-1.5 text-left text-xs text-status-error hover:bg-status-error/10
                                       flex items-center gap-2 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove Account
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function AccountAvatar({
    account,
    isActive,
    onClick,
    onContextMenu,
}: {
    account: Account;
    isActive: boolean;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}) {
    return (
        <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            onContextMenu={onContextMenu}
            className="relative group"
            title={`${account.label} (${account.type}) — Right-click to remove`}
        >
            {/* Active ring */}
            {isActive && (
                <motion.div
                    layoutId="active-account-ring"
                    className="absolute -inset-1 rounded-full border-2 border-brand-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            )}

            {/* Avatar */}
            <div
                className={`w-9 h-9 rounded-full overflow-hidden transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                    }`}
            >
                {account.avatarUrl ? (
                    <img
                        src={account.avatarUrl}
                        alt={account.username}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        {account.username.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Type indicator dot */}
            <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-1 ${account.type === 'personal'
                    ? 'bg-green-500'
                    : account.type === 'work'
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
            />
        </motion.button>
    );
}
