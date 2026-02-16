import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommandPaletteStore, MacroDefinition } from '../../stores/command-palette.store';
import { commandRegistry } from '../../lib/command-registry';

export function MacroEditorModal() {
    const { showMacroEditor, editingMacro, closeMacroEditor, saveMacro } = useCommandPaletteStore();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState<string[]>([]);

    const availableCommands = commandRegistry.getAll().filter((c) => !c.id.startsWith('macro:'));

    useEffect(() => {
        if (showMacroEditor) {
            if (editingMacro) {
                setName(editingMacro.name);
                setDescription(editingMacro.description);
                setSteps([...editingMacro.steps]);
            } else {
                setName('');
                setDescription('');
                setSteps([]);
            }
        }
    }, [showMacroEditor, editingMacro]);

    const handleSave = () => {
        if (!name.trim() || steps.length === 0) return;
        const macro: MacroDefinition = {
            id: editingMacro?.id || `macro-${Date.now()}`,
            name: name.trim(),
            description: description.trim(),
            steps,
        };
        saveMacro(macro);
    };

    const addStep = () => {
        if (availableCommands.length > 0) {
            setSteps([...steps, availableCommands[0].id]);
        }
    };

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const updateStep = (index: number, commandId: string) => {
        const updated = [...steps];
        updated[index] = commandId;
        setSteps(updated);
    };

    const moveStep = (from: number, to: number) => {
        if (to < 0 || to >= steps.length) return;
        const updated = [...steps];
        const [item] = updated.splice(from, 1);
        updated.splice(to, 0, item);
        setSteps(updated);
    };

    if (!showMacroEditor) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={closeMacroEditor}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg flex flex-col rounded-xl bg-surface-1 border border-border shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <h2 className="text-base font-semibold text-text-primary">
                            {editingMacro ? 'Edit Macro' : 'Create Macro'}
                        </h2>
                        <button
                            onClick={closeMacroEditor}
                            className="p-1 rounded-md hover:bg-surface-2 text-text-tertiary hover:text-text-primary transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4 space-y-4">
                        {/* Name */}
                        <div>
                            <label className="text-xs font-medium text-text-secondary block mb-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Ship It"
                                className="w-full px-3 py-1.5 text-sm bg-surface-0 border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-500/50"
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs font-medium text-text-secondary block mb-1">Description</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Stage all, commit, and push"
                                className="w-full px-3 py-1.5 text-sm bg-surface-0 border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-500/50"
                            />
                        </div>

                        {/* Steps */}
                        <div>
                            <label className="text-xs font-medium text-text-secondary block mb-1">Steps</label>
                            <div className="space-y-2">
                                {steps.map((stepId, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-2xs text-text-tertiary w-4 text-right shrink-0">{i + 1}.</span>
                                        <select
                                            value={stepId}
                                            onChange={(e) => updateStep(i, e.target.value)}
                                            className="flex-1 px-2 py-1 text-xs bg-surface-0 border border-border rounded text-text-primary focus:outline-none focus:border-brand-500/50"
                                        >
                                            {availableCommands.map((cmd) => (
                                                <option key={cmd.id} value={cmd.id}>
                                                    [{cmd.category}] {cmd.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => moveStep(i, i - 1)}
                                            disabled={i === 0}
                                            className="p-0.5 text-text-tertiary hover:text-text-primary disabled:opacity-30"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => moveStep(i, i + 1)}
                                            disabled={i === steps.length - 1}
                                            className="p-0.5 text-text-tertiary hover:text-text-primary disabled:opacity-30"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => removeStep(i)}
                                            className="p-0.5 text-red-400 hover:text-red-300"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={addStep}
                                    className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Step
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
                        <button
                            onClick={closeMacroEditor}
                            className="btn-ghost text-xs px-3 py-1.5"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name.trim() || steps.length === 0}
                            className={`btn-primary text-xs px-3 py-1.5 ${!name.trim() || steps.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {editingMacro ? 'Save Changes' : 'Create Macro'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
