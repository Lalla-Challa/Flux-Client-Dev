import React, { ReactNode } from 'react';

interface BadgeProps {
    children: ReactNode;
    variant?: 'branch' | 'ahead' | 'behind' | 'default';
    className?: string;
}

const variantClasses = {
    branch: 'badge-branch',
    ahead: 'badge-ahead',
    behind: 'badge-behind',
    default: 'badge bg-surface-4 text-text-secondary',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    return (
        <span className={`${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    );
}
