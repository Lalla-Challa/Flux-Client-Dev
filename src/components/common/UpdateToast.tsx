import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UpdateStatus } from '../../electron.d';

export function UpdateToast() {
    const [status, setStatus] = useState<UpdateStatus | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const api = window.electronAPI?.update;
        if (!api) return;

        api.onStatusChange((s: UpdateStatus) => {
            setStatus(s);

            if (s.status === 'available' || s.status === 'downloading' || s.status === 'downloaded') {
                setVisible(true);
            } else if (s.status === 'error') {
                setVisible(true);
                setTimeout(() => setVisible(false), 5000);
            } else {
                // checking, not-available — stay hidden
                setVisible(false);
            }
        });

        return () => {
            api.removeStatusListener();
        };
    }, []);

    const handleDownload = useCallback(() => {
        window.electronAPI?.update.downloadUpdate();
    }, []);

    const handleInstall = useCallback(() => {
        window.electronAPI?.update.quitAndInstall();
    }, []);

    const handleDismiss = useCallback(() => {
        setVisible(false);
    }, []);

    return (
        <AnimatePresence>
            {visible && status && (
                <motion.div
                    initial={{ opacity: 0, y: 20, x: 0 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-20 right-4 z-50 w-80 bg-surface-2 border border-border rounded-lg shadow-2xl overflow-hidden"
                >
                    {/* Available */}
                    {status.status === 'available' && (
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-text-primary">
                                        Update Available
                                    </p>
                                    <p className="text-xs text-text-secondary mt-1">
                                        Version {status.version} is ready to download
                                    </p>
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="text-text-tertiary hover:text-text-primary transition-colors p-0.5"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <button
                                onClick={handleDownload}
                                className="mt-3 w-full px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-md transition-colors"
                            >
                                Download
                            </button>
                        </div>
                    )}

                    {/* Downloading */}
                    {status.status === 'downloading' && (
                        <div className="p-4">
                            <p className="text-sm font-medium text-text-primary">Downloading Update...</p>
                            <div className="mt-3 w-full bg-surface-0 rounded-full h-2 overflow-hidden">
                                <motion.div
                                    className="h-full bg-brand-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${status.progress?.percent ?? 0}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <p className="text-xs text-text-tertiary mt-2">
                                {Math.round(status.progress?.percent ?? 0)}%
                            </p>
                        </div>
                    )}

                    {/* Downloaded */}
                    {status.status === 'downloaded' && (
                        <div className="p-4">
                            <p className="text-sm font-medium text-text-primary">Update Ready</p>
                            <p className="text-xs text-text-secondary mt-1">
                                Version {status.version} has been downloaded
                            </p>
                            <button
                                onClick={handleInstall}
                                className="mt-3 w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md transition-colors"
                            >
                                Restart Now
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {status.status === 'error' && (
                        <div className="p-4">
                            <p className="text-sm font-medium text-red-400">Update Error</p>
                            <p className="text-xs text-text-secondary mt-1">
                                {status.error || 'An error occurred while checking for updates'}
                            </p>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
