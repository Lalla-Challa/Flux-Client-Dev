import React from 'react';

interface AvatarProps {
    src?: string;
    fallback: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizes = {
    sm: 'w-6 h-6 text-2xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-lg',
};

export function Avatar({ src, fallback, size = 'md', className = '' }: AvatarProps) {
    return (
        <div
            className={`rounded-full overflow-hidden shrink-0 ${sizes[size]} ${className}`}
        >
            {src ? (
                <img src={src} alt={fallback} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {fallback.charAt(0).toUpperCase()}
                </div>
            )}
        </div>
    );
}
