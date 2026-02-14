import React, { ReactNode, useEffect, useRef, useState } from 'react';

interface ContextMenuItem {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    danger?: boolean;
    divider?: boolean;
}

interface ContextMenuProps {
    items: ContextMenuItem[];
    children: ReactNode;
}

export function ContextMenu({ items, children }: ContextMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setPosition({ x: e.clientX, y: e.clientY });
        setIsOpen(true);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    return (
        <>
            <div onContextMenu={handleContextMenu}>{children}</div>
            {isOpen && (
                <div
                    ref={menuRef}
                    className="fixed z-50 min-w-[180px] py-1 bg-surface-2 border border-border rounded-lg shadow-2xl animate-fade-in"
                    style={{ left: position.x, top: position.y }}
                >
                    {items.map((item, i) =>
                        item.divider ? (
                            <div key={i} className="h-px bg-border my-1" />
                        ) : (
                            <button
                                key={i}
                                onClick={() => {
                                    item.onClick();
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${item.danger
                                        ? 'text-red-400 hover:bg-red-500/10'
                                        : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'
                                    }`}
                            >
                                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                                {item.label}
                            </button>
                        )
                    )}
                </div>
            )}
        </>
    );
}
