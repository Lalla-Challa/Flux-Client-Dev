/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                surface: {
                    0: '#09090b',
                    1: '#0f0f12',
                    2: '#18181b',
                    3: '#1e1e22',
                    4: '#27272a',
                    5: '#3f3f46',
                },
                border: {
                    DEFAULT: '#27272a',
                    hover: '#3f3f46',
                    active: '#6366f1',
                },
                text: {
                    primary: '#fafafa',
                    secondary: '#a1a1aa',
                    tertiary: '#71717a',
                    inverse: '#09090b',
                },
                status: {
                    added: '#22c55e',
                    modified: '#f59e0b',
                    deleted: '#ef4444',
                    conflict: '#f97316',
                    renamed: '#8b5cf6',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
            },
            fontSize: {
                '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
            },
            spacing: {
                'sidebar-slim': '60px',
                'sidebar-wide': '240px',
                'terminal-collapsed': '36px',
                'terminal-expanded': '240px',
            },
            animation: {
                'fade-in': 'fadeIn 0.15s ease-out',
                'slide-in': 'slideIn 0.2s ease-out',
                'pulse-ring': 'pulseRing 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideIn: {
                    '0%': { opacity: '0', transform: 'translateX(-8px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                pulseRing: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.4)' },
                    '50%': { boxShadow: '0 0 0 4px rgba(99, 102, 241, 0)' },
                },
            },
        },
    },
    plugins: [],
};
