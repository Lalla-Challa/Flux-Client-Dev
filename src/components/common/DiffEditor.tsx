import React from 'react';
import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
import { useUIStore } from '../../stores/ui.store';

interface DiffEditorProps {
    original: string;
    modified: string;
    language?: string;
    readOnly?: boolean;
    height?: string | number;
}

export const DiffEditor: React.FC<DiffEditorProps> = ({
    original,
    modified,
    language = 'javascript',
    readOnly = true,
    height = '100%'
}) => {
    const theme = useUIStore((s) => s.theme);

    return (
        <div className="h-full w-full overflow-hidden border border-border rounded-md">
            <MonacoDiffEditor
                height={height}
                language={language}
                original={original}
                modified={modified}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    renderSideBySide: true,
                    automaticLayout: true,
                }}
            />
        </div>
    );
};
