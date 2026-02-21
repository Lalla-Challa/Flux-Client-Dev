import React, { useState } from 'react';
import { Node } from 'reactflow';
import {
    X,
    Zap,
    Layers,
    Terminal,
    Box,
    Plus,
    Trash2,
    GitBranch,
    Clock,
    Tag,
    Globe,
    ChevronDown,
    ChevronRight,
    Lock,
    GitFork,
    ArrowDownRight,
    Repeat,
    FolderClosed,
} from 'lucide-react';

import { GITHUB_CONTEXT_FIELDS } from './nodes/ContextGetterNode';

// ── Trigger events available ────────────────────────────────────
const AVAILABLE_EVENTS = [
    { id: 'push', label: 'Push', icon: GitBranch },
    { id: 'pull_request', label: 'Pull Request', icon: GitBranch },
    { id: 'workflow_dispatch', label: 'Manual Dispatch', icon: Zap },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'release', label: 'Release', icon: Tag },
    { id: 'pull_request_target', label: 'PR Target', icon: GitBranch },
    { id: 'workflow_call', label: 'Workflow Call', icon: Zap },
    { id: 'issues', label: 'Issues', icon: Globe },
    { id: 'issue_comment', label: 'Issue Comment', icon: Globe },
    { id: 'create', label: 'Create', icon: Plus },
    { id: 'delete', label: 'Delete', icon: Trash2 },
] as const;

const RUNNER_OPTIONS = [
    'ubuntu-latest',
    'ubuntu-22.04',
    'ubuntu-24.04',
    'windows-latest',
    'windows-2022',
    'macos-latest',
    'macos-14',
    'macos-15',
    'self-hosted',
];

// ── Props ───────────────────────────────────────────────────────

interface NodePropertiesPanelProps {
    selectedNode: Node | null;
    onUpdateNode: (nodeId: string, data: any) => void;
    onClose: () => void;
}

// ── Main Panel ──────────────────────────────────────────────────

export const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({
    selectedNode,
    onUpdateNode,
    onClose,
}) => {
    if (!selectedNode) return null;

    const update = (partial: Record<string, any>) => {
        onUpdateNode(selectedNode.id, { ...selectedNode.data, ...partial });
    };

    return (
        <div className="w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-2">
                    <NodeTypeIcon type={selectedNode.type || ''} />
                    <span className="text-sm font-semibold text-zinc-200 capitalize">
                        {getNodeTypeLabel(selectedNode.type || '')} Properties
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                {selectedNode.type === 'trigger' && (
                    <TriggerProperties data={selectedNode.data} onUpdate={update} />
                )}
                {selectedNode.type === 'job' && (
                    <JobProperties data={selectedNode.data} onUpdate={update} />
                )}
                {selectedNode.type === 'step' && (
                    <StepProperties data={selectedNode.data} onUpdate={update} />
                )}
                {selectedNode.type === 'contextGetter' && (
                    <ContextGetterProperties data={selectedNode.data} onUpdate={update} />
                )}
                {selectedNode.type === 'secretGetter' && (
                    <SecretGetterProperties data={selectedNode.data} onUpdate={update} />
                )}
                {selectedNode.type === 'branch' && (
                    <BranchProperties data={selectedNode.data} onUpdate={update} />
                )}
                {selectedNode.type === 'switch' && (
                    <SwitchProperties data={selectedNode.data} onUpdate={update} />
                )}
                {selectedNode.type === 'matrix' && (
                    <MatrixProperties data={selectedNode.data} onUpdate={update} />
                )}
                {selectedNode.type === 'subWorkflow' && (
                    <SubWorkflowProperties data={selectedNode.data} onUpdate={update} />
                )}
            </div>
        </div>
    );
};

// ── Node type helpers ────────────────────────────────────────────

function getNodeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        trigger: 'Trigger',
        job: 'Job',
        step: 'Step',
        contextGetter: 'Context',
        secretGetter: 'Secret',
        branch: 'Branch',
        switch: 'Switch',
        matrix: 'Matrix',
        subWorkflow: 'Sub-Workflow',
    };
    return labels[type] || type;
}

function NodeTypeIcon({ type }: { type: string }) {
    const cls = 'w-4 h-4';
    switch (type) {
        case 'trigger': return <Zap className={`${cls} text-blue-400`} />;
        case 'job': return <Layers className={`${cls} text-violet-400`} />;
        case 'step': return <Terminal className={`${cls} text-amber-400`} />;
        case 'contextGetter': return <Globe className={`${cls} text-orange-400`} />;
        case 'secretGetter': return <Lock className={`${cls} text-green-400`} />;
        case 'branch': return <GitFork className={`${cls} text-cyan-400`} />;
        case 'switch': return <ArrowDownRight className={`${cls} text-yellow-400`} />;
        case 'matrix': return <Repeat className={`${cls} text-pink-400`} />;
        case 'subWorkflow': return <FolderClosed className={`${cls} text-teal-400`} />;
        default: return null;
    }
}

// ── Shared field components ─────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            {children}
        </label>
    );
}

function TextInput({
    value,
    onChange,
    placeholder,
    mono,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    mono?: boolean;
}) {
    return (
        <input
            type="text"
            className={`w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500/60 transition-colors ${
                mono ? 'font-mono' : ''
            }`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    );
}

function TextArea({
    value,
    onChange,
    placeholder,
    rows = 3,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
}) {
    return (
        <textarea
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 font-mono outline-none focus:border-blue-500/60 transition-colors resize-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
        />
    );
}

function SelectInput({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
}) {
    return (
        <select
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500/60 transition-colors"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            {options.map((o) => (
                <option key={o} value={o}>
                    {o}
                </option>
            ))}
        </select>
    );
}

// ── Trigger Properties ──────────────────────────────────────────

function TriggerProperties({
    data,
    onUpdate,
}: {
    data: any;
    onUpdate: (partial: any) => void;
}) {
    const triggers: { event: string; branches?: string[]; types?: string[]; cron?: string }[] =
        data.triggers || [];

    const activeEvents = new Set(triggers.map((t: any) => t.event));

    const toggleEvent = (eventId: string) => {
        let newTriggers: any[];
        if (activeEvents.has(eventId)) {
            newTriggers = triggers.filter((t: any) => t.event !== eventId);
        } else {
            newTriggers = [...triggers, { event: eventId }];
        }
        onUpdate({ triggers: newTriggers });
    };

    const updateTriggerBranches = (event: string, branches: string[]) => {
        const newTriggers = triggers.map((t: any) =>
            t.event === event ? { ...t, branches: branches.length > 0 ? branches : undefined } : t
        );
        onUpdate({ triggers: newTriggers });
    };

    const updateTriggerCron = (cron: string) => {
        const newTriggers = triggers.map((t: any) =>
            t.event === 'schedule' ? { ...t, cron: cron || undefined } : t
        );
        onUpdate({ triggers: newTriggers });
    };

    return (
        <div className="p-4 space-y-4">
            <div>
                <FieldLabel>Events</FieldLabel>
                <div className="space-y-1">
                    {AVAILABLE_EVENTS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => toggleEvent(id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                                activeEvents.has(id)
                                    ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                    : 'text-zinc-400 hover:bg-zinc-800 border border-transparent'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1 text-left">{label}</span>
                            {activeEvents.has(id) && (
                                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 rounded">
                                    ON
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {triggers
                .filter((t) => ['push', 'pull_request', 'pull_request_target'].includes(t.event))
                .map((t) => (
                    <TriggerBranchSection
                        key={t.event}
                        event={t.event}
                        branches={t.branches || []}
                        onChange={(branches) => updateTriggerBranches(t.event, branches)}
                    />
                ))}

            {activeEvents.has('schedule') && (
                <div>
                    <FieldLabel>Cron Expression</FieldLabel>
                    <TextInput
                        value={triggers.find((t) => t.event === 'schedule')?.cron || ''}
                        onChange={updateTriggerCron}
                        placeholder="0 0 * * *"
                        mono
                    />
                    <p className="text-[10px] text-zinc-600 mt-1">e.g. "0 0 * * *" = daily at midnight</p>
                </div>
            )}
        </div>
    );
}

function TriggerBranchSection({
    event,
    branches,
    onChange,
}: {
    event: string;
    branches: string[];
    onChange: (branches: string[]) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const [newBranch, setNewBranch] = useState('');

    const addBranch = () => {
        const b = newBranch.trim();
        if (b && !branches.includes(b)) {
            onChange([...branches, b]);
            setNewBranch('');
        }
    };

    return (
        <div>
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 hover:text-zinc-400"
            >
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {event} branches
            </button>
            {expanded && (
                <div className="space-y-1.5">
                    {branches.map((b, i) => (
                        <div key={i} className="flex items-center gap-1">
                            <span className="flex-1 text-xs font-mono text-zinc-300 bg-zinc-800 rounded px-2 py-1">
                                {b}
                            </span>
                            <button
                                onClick={() => onChange(branches.filter((_, idx) => idx !== i))}
                                className="text-zinc-600 hover:text-red-400 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    <div className="flex gap-1">
                        <input
                            type="text"
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 font-mono outline-none focus:border-blue-500/60"
                            value={newBranch}
                            onChange={(e) => setNewBranch(e.target.value)}
                            placeholder="main"
                            onKeyDown={(e) => e.key === 'Enter' && addBranch()}
                        />
                        <button
                            onClick={addBranch}
                            className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Job Properties ──────────────────────────────────────────────

function JobProperties({
    data,
    onUpdate,
}: {
    data: any;
    onUpdate: (partial: any) => void;
}) {
    return (
        <div className="p-4 space-y-4">
            <div>
                <FieldLabel>Job ID</FieldLabel>
                <TextInput
                    value={data.jobId || ''}
                    onChange={(v) => onUpdate({ jobId: v.replace(/[^a-zA-Z0-9_-]/g, '') })}
                    placeholder="build"
                    mono
                />
                <p className="text-[10px] text-zinc-600 mt-1">Only letters, numbers, - and _</p>
            </div>

            <div>
                <FieldLabel>Display Name</FieldLabel>
                <TextInput
                    value={data.name || ''}
                    onChange={(v) => onUpdate({ name: v })}
                    placeholder="Build & Test"
                />
            </div>

            <div>
                <FieldLabel>Runs On</FieldLabel>
                <SelectInput
                    value={data.runsOn || 'ubuntu-latest'}
                    onChange={(v) => onUpdate({ runsOn: v })}
                    options={RUNNER_OPTIONS}
                />
            </div>

            <div>
                <FieldLabel>Condition (if)</FieldLabel>
                <TextInput
                    value={data.condition || ''}
                    onChange={(v) => onUpdate({ condition: v || undefined })}
                    placeholder="github.event_name == 'push'"
                    mono
                />
            </div>
        </div>
    );
}

// ── Step Properties ─────────────────────────────────────────────

function StepProperties({
    data,
    onUpdate,
}: {
    data: any;
    onUpdate: (partial: any) => void;
}) {
    const isAction = data.stepType === 'uses';

    return (
        <div className="p-4 space-y-4">
            <div>
                <FieldLabel>Step Name</FieldLabel>
                <TextInput
                    value={data.label || ''}
                    onChange={(v) => onUpdate({ label: v })}
                    placeholder="Checkout code"
                />
            </div>

            <div>
                <FieldLabel>Type</FieldLabel>
                <div className="flex gap-1">
                    <button
                        onClick={() => onUpdate({ stepType: 'uses', run: undefined })}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            isAction
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'text-zinc-500 hover:bg-zinc-800 border border-zinc-700'
                        }`}
                    >
                        <Box className="w-3 h-3" />
                        Action
                    </button>
                    <button
                        onClick={() => onUpdate({ stepType: 'run', uses: undefined })}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            !isAction
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'text-zinc-500 hover:bg-zinc-800 border border-zinc-700'
                        }`}
                    >
                        <Terminal className="w-3 h-3" />
                        Run
                    </button>
                </div>
            </div>

            {isAction ? (
                <div>
                    <FieldLabel>Action (uses)</FieldLabel>
                    <TextInput
                        value={data.uses || ''}
                        onChange={(v) => onUpdate({ uses: v })}
                        placeholder="actions/checkout@v4"
                        mono
                    />
                    <p className="text-[10px] text-zinc-600 mt-1">e.g. actions/setup-node@v4</p>
                </div>
            ) : (
                <div>
                    <FieldLabel>Command (run)</FieldLabel>
                    <TextArea
                        value={data.run || ''}
                        onChange={(v) => onUpdate({ run: v })}
                        placeholder="npm install&#10;npm test"
                        rows={4}
                    />
                </div>
            )}

            <div>
                <FieldLabel>Condition (if)</FieldLabel>
                <TextInput
                    value={data.condition || ''}
                    onChange={(v) => onUpdate({ condition: v || undefined })}
                    placeholder="success()"
                    mono
                />
            </div>
        </div>
    );
}

// ── Context Getter Properties ────────────────────────────────────

function ContextGetterProperties({
    data,
    onUpdate,
}: {
    data: any;
    onUpdate: (partial: any) => void;
}) {
    const fields: string[] = data.fields || [];
    const activeFields = new Set(fields);

    const toggleField = (fieldId: string) => {
        if (activeFields.has(fieldId)) {
            onUpdate({ fields: fields.filter((f: string) => f !== fieldId) });
        } else {
            onUpdate({ fields: [...fields, fieldId] });
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div>
                <FieldLabel>Context Fields</FieldLabel>
                <p className="text-[10px] text-zinc-600 mb-2">Select which GitHub context fields to expose as data pins</p>
                <div className="space-y-1">
                    {GITHUB_CONTEXT_FIELDS.map((field) => (
                        <button
                            key={field.id}
                            onClick={() => toggleField(field.id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                                activeFields.has(field.id)
                                    ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                                    : 'text-zinc-400 hover:bg-zinc-800 border border-transparent'
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${activeFields.has(field.id) ? 'bg-orange-500' : 'bg-zinc-600'}`} />
                            <span className="flex-1 text-left">{field.label}</span>
                            <span className="text-[9px] font-mono text-zinc-500">{field.expr}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Secret Getter Properties ─────────────────────────────────────

function SecretGetterProperties({
    data,
    onUpdate,
}: {
    data: any;
    onUpdate: (partial: any) => void;
}) {
    const secrets: string[] = data.secrets || [];
    const [newSecret, setNewSecret] = useState('');

    const addSecret = () => {
        const s = newSecret.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
        if (s && !secrets.includes(s)) {
            onUpdate({ secrets: [...secrets, s] });
            setNewSecret('');
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div>
                <FieldLabel>Secret Names</FieldLabel>
                <p className="text-[10px] text-zinc-600 mb-2">Each secret becomes a data output pin</p>
                <div className="space-y-1.5">
                    {secrets.map((s, i) => (
                        <div key={i} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            <span className="flex-1 text-xs font-mono text-green-300 bg-zinc-800 rounded px-2 py-1">
                                {s}
                            </span>
                            <button
                                onClick={() => onUpdate({ secrets: secrets.filter((_, idx) => idx !== i) })}
                                className="text-zinc-600 hover:text-red-400 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    <div className="flex gap-1">
                        <input
                            type="text"
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 font-mono outline-none focus:border-green-500/60"
                            value={newSecret}
                            onChange={(e) => setNewSecret(e.target.value)}
                            placeholder="MY_SECRET_KEY"
                            onKeyDown={(e) => e.key === 'Enter' && addSecret()}
                        />
                        <button
                            onClick={addSecret}
                            className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Branch Properties ────────────────────────────────────────────

function BranchProperties({
    data,
    onUpdate,
}: {
    data: any;
    onUpdate: (partial: any) => void;
}) {
    return (
        <div className="p-4 space-y-4">
            <div>
                <FieldLabel>Condition</FieldLabel>
                <TextArea
                    value={data.condition || ''}
                    onChange={(v) => onUpdate({ condition: v })}
                    placeholder="github.ref == 'refs/heads/main'"
                    rows={3}
                />
                <p className="text-[10px] text-zinc-600 mt-1">
                    This maps to an <code className="text-zinc-400">if:</code> condition. Use <code className="text-zinc-400">$&#123;&#123; &#125;&#125;</code> expressions.
                </p>
            </div>

            <div>
                <FieldLabel>True Branch Label</FieldLabel>
                <TextInput
                    value={data.trueLabel || 'True'}
                    onChange={(v) => onUpdate({ trueLabel: v })}
                    placeholder="True"
                />
            </div>

            <div>
                <FieldLabel>False Branch Label</FieldLabel>
                <TextInput
                    value={data.falseLabel || 'False'}
                    onChange={(v) => onUpdate({ falseLabel: v })}
                    placeholder="False"
                />
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-[10px] text-zinc-500">
                    Connect a data wire from a Context or Secret node to the orange input pin on the left for dynamic conditions.
                </p>
            </div>
        </div>
    );
}

// ── Switch Properties ────────────────────────────────────────────

function SwitchProperties({
    data,
    onUpdate,
}: {
    data: any;
    onUpdate: (partial: any) => void;
}) {
    const cases: { label: string; value: string }[] = data.cases || [];
    const [newLabel, setNewLabel] = useState('');
    const [newValue, setNewValue] = useState('');

    const addCase = () => {
        const label = newLabel.trim();
        const value = newValue.trim();
        if (label && value) {
            onUpdate({ cases: [...cases, { label, value }] });
            setNewLabel('');
            setNewValue('');
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div>
                <FieldLabel>Variable</FieldLabel>
                <TextInput
                    value={data.variable || ''}
                    onChange={(v) => onUpdate({ variable: v })}
                    placeholder="github.event_name"
                    mono
                />
                <p className="text-[10px] text-zinc-600 mt-1">The variable to switch on</p>
            </div>

            <div>
                <FieldLabel>Cases</FieldLabel>
                <div className="space-y-1.5">
                    {cases.map((c, i) => (
                        <div key={i} className="flex items-center gap-1">
                            <span className="text-xs text-zinc-400 w-16 truncate">{c.label}</span>
                            <span className="flex-1 text-xs font-mono text-zinc-300 bg-zinc-800 rounded px-2 py-1">
                                {c.value}
                            </span>
                            <button
                                onClick={() => onUpdate({ cases: cases.filter((_, idx) => idx !== i) })}
                                className="text-zinc-600 hover:text-red-400 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    <div className="flex gap-1">
                        <input
                            type="text"
                            className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-yellow-500/60"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="Label"
                        />
                        <input
                            type="text"
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 font-mono outline-none focus:border-yellow-500/60"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            placeholder="value"
                            onKeyDown={(e) => e.key === 'Enter' && addCase()}
                        />
                        <button
                            onClick={addCase}
                            className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                        type="checkbox"
                        checked={data.hasDefault !== false}
                        onChange={(e) => onUpdate({ hasDefault: e.target.checked })}
                        className="rounded bg-zinc-800 border-zinc-700"
                    />
                    Include default case
                </label>
            </div>
        </div>
    );
}

// ── Matrix Properties ────────────────────────────────────────────

function MatrixProperties({
    data,
    onUpdate,
}: {
    data: any;
    onUpdate: (partial: any) => void;
}) {
    const dimensions: { key: string; values: string[] }[] = data.dimensions || [];
    const [newKey, setNewKey] = useState('');
    const [newValues, setNewValues] = useState('');

    const addDimension = () => {
        const key = newKey.trim();
        const values = newValues.split(',').map((v) => v.trim()).filter(Boolean);
        if (key && values.length > 0) {
            onUpdate({ dimensions: [...dimensions, { key, values }] });
            setNewKey('');
            setNewValues('');
        }
    };

    const removeDimension = (index: number) => {
        onUpdate({ dimensions: dimensions.filter((_, i) => i !== index) });
    };

    const updateDimensionValues = (index: number, valuesStr: string) => {
        const values = valuesStr.split(',').map((v) => v.trim()).filter(Boolean);
        const newDims = [...dimensions];
        newDims[index] = { ...newDims[index], values };
        onUpdate({ dimensions: newDims });
    };

    return (
        <div className="p-4 space-y-4">
            <div>
                <FieldLabel>Matrix Dimensions</FieldLabel>
                <div className="space-y-2">
                    {dimensions.map((dim, i) => (
                        <div key={i} className="bg-zinc-800/50 rounded-lg p-2 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-pink-300">{dim.key}</span>
                                <button
                                    onClick={() => removeDimension(i)}
                                    className="text-zinc-600 hover:text-red-400 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                            <TextInput
                                value={dim.values.join(', ')}
                                onChange={(v) => updateDimensionValues(i, v)}
                                placeholder="value1, value2, value3"
                                mono
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-1.5">
                <FieldLabel>Add Dimension</FieldLabel>
                <TextInput
                    value={newKey}
                    onChange={setNewKey}
                    placeholder="Dimension key (e.g. os)"
                    mono
                />
                <TextInput
                    value={newValues}
                    onChange={setNewValues}
                    placeholder="Values (comma-separated)"
                    mono
                />
                <button
                    onClick={addDimension}
                    className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1"
                >
                    <Plus className="w-3 h-3" />
                    Add Dimension
                </button>
            </div>

            <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                        type="checkbox"
                        checked={data.failFast !== false}
                        onChange={(e) => onUpdate({ failFast: e.target.checked })}
                        className="rounded bg-zinc-800 border-zinc-700"
                    />
                    Fail fast
                </label>

                <div>
                    <FieldLabel>Max Parallel</FieldLabel>
                    <TextInput
                        value={data.maxParallel?.toString() || ''}
                        onChange={(v) => onUpdate({ maxParallel: v ? parseInt(v, 10) || undefined : undefined })}
                        placeholder="Leave empty for unlimited"
                    />
                </div>
            </div>
        </div>
    );
}

// ── Sub-Workflow Properties ──────────────────────────────────────

function SubWorkflowProperties({
    data,
    onUpdate,
}: {
    data: any;
    onUpdate: (partial: any) => void;
}) {
    return (
        <div className="p-4 space-y-4">
            <div>
                <FieldLabel>Name</FieldLabel>
                <TextInput
                    value={data.name || ''}
                    onChange={(v) => onUpdate({ name: v })}
                    placeholder="My Sub-Workflow"
                />
            </div>

            <div>
                <FieldLabel>Description</FieldLabel>
                <TextArea
                    value={data.description || ''}
                    onChange={(v) => onUpdate({ description: v || undefined })}
                    placeholder="What this sub-workflow does..."
                    rows={2}
                />
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400">Info</div>
                <div className="text-[10px] text-zinc-500 space-y-1">
                    <p>Contains {data.childNodeCount || 0} nodes</p>
                    <p>Status: {data.collapsed ? 'Collapsed' : 'Expanded'}</p>
                    {data.inputs?.length > 0 && (
                        <p>Inputs: {data.inputs.map((p: any) => p.name).join(', ')}</p>
                    )}
                    {data.outputs?.length > 0 && (
                        <p>Outputs: {data.outputs.map((p: any) => p.name).join(', ')}</p>
                    )}
                </div>
            </div>

            <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-3">
                <p className="text-[10px] text-teal-400/70">
                    Sub-workflows represent composite actions. Select multiple nodes, then use "Collapse" in the toolbar to create one. Click the arrow icon in the header to expand/collapse.
                </p>
            </div>
        </div>
    );
}
