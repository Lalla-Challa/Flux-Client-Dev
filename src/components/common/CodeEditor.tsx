import React from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { useUIStore } from '../../stores/ui.store';

interface CodeEditorProps {
    value: string;
    language?: string;
    readOnly?: boolean;
    onChange?: (value: string | undefined) => void;
    height?: string | number;
    filename?: string; // For schema validation
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
    value,
    language = 'javascript',
    readOnly = false,
    onChange,
    height = '100%',
    filename
}) => {
    const theme = useUIStore((s) => s.theme);

    // Configure Monaco
    const handleEditorWillMount = (monaco: any) => {
        // Custom theme can be added here
        monaco.editor.defineTheme('flux-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#18181b', // zinc-900
                'editor.lineHighlightBackground': '#27272a', // zinc-800
            }
        });
    };

    return (
        <div className="h-full w-full overflow-hidden border border-border rounded-md">
            <Editor
                height={height}
                defaultLanguage={language}
                language={language}
                value={value}
                theme={theme === 'dark' ? 'flux-dark' : 'light'}
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    fontLigatures: true,
                    automaticLayout: true,
                    renderWhitespace: 'selection',
                }}
                beforeMount={handleEditorWillMount}
                onChange={onChange}
                path={filename} // Important for model URI matching (schemas)
            />
        </div>
    );
};
