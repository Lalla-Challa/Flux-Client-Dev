import { Node, Edge, MarkerType } from 'reactflow';
import yaml from 'js-yaml';
import { getLayoutedElements } from './workflow.layout';

// ── Types for parsed YAML ────────────────────────────────────────

interface WorkflowYAML {
    name?: string;
    on?: any;
    jobs?: Record<string, JobYAML>;
}

interface JobYAML {
    'runs-on'?: string;
    needs?: string | string[];
    steps?: StepYAML[];
    name?: string;
    if?: string;
    strategy?: any;
    env?: Record<string, string>;
}

interface StepYAML {
    name?: string;
    uses?: string;
    run?: string;
    with?: Record<string, any>;
    env?: Record<string, string>;
    if?: string;
    id?: string;
}

// ── Trigger parsing ──────────────────────────────────────────────

interface TriggerInfo {
    event: string;
    branches?: string[];
    types?: string[];
    cron?: string;
}

function parseTriggers(on: any): TriggerInfo[] {
    if (!on) return [];

    // on: push
    if (typeof on === 'string') {
        return [{ event: on }];
    }

    // on: [push, pull_request]
    if (Array.isArray(on)) {
        return on.map((event) => ({ event: String(event) }));
    }

    // on: { push: { branches: [...] }, ... }
    if (typeof on === 'object') {
        return Object.entries(on).map(([event, config]) => {
            const info: TriggerInfo = { event };

            if (config && typeof config === 'object') {
                const cfg = config as any;
                if (cfg.branches) {
                    info.branches = Array.isArray(cfg.branches) ? cfg.branches : [cfg.branches];
                }
                if (cfg.types) {
                    info.types = Array.isArray(cfg.types) ? cfg.types : [cfg.types];
                }
                if (event === 'schedule' && Array.isArray(cfg)) {
                    info.cron = cfg[0]?.cron;
                }
            }

            return info;
        });
    }

    return [];
}

// ── Step label extraction ────────────────────────────────────────

function getStepLabel(step: StepYAML): string {
    if (step.name) return step.name;
    if (step.uses) {
        // actions/checkout@v4 → actions/checkout
        const parts = step.uses.split('@');
        return parts[0];
    }
    if (step.run) {
        // Truncate long commands
        const firstLine = step.run.split('\n')[0].trim();
        return firstLine.length > 40 ? firstLine.substring(0, 37) + '...' : firstLine;
    }
    return 'Step';
}

function getStepType(step: StepYAML): 'uses' | 'run' {
    return step.uses ? 'uses' : 'run';
}

// ── Main conversion function ─────────────────────────────────────

export interface ParseResult {
    nodes: Node[];
    edges: Edge[];
    workflowName: string;
    error?: string;
}

export function yamlToGraph(yamlStr: string): ParseResult {
    if (!yamlStr.trim()) {
        return { nodes: [], edges: [], workflowName: '' };
    }

    let parsed: WorkflowYAML;

    try {
        parsed = yaml.load(yamlStr) as WorkflowYAML;
    } catch (e: any) {
        return {
            nodes: [],
            edges: [],
            workflowName: '',
            error: `YAML Parse Error: ${e.message}`,
        };
    }

    if (!parsed || typeof parsed !== 'object') {
        return { nodes: [], edges: [], workflowName: '' };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const workflowName = parsed.name || 'Untitled Workflow';

    // ── 1. Create trigger nodes ──────────────────────────────────

    const triggers = parseTriggers(parsed.on);

    if (triggers.length > 0) {
        nodes.push({
            id: '__trigger__',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: {
                triggers,
            },
        });
    }

    // ── 2. Create job + step nodes ───────────────────────────────

    const jobs = parsed.jobs || {};
    const jobIds = Object.keys(jobs);

    // Track which jobs have `needs:` (dependencies)
    const jobsWithNeeds = new Set<string>();

    for (const jobId of jobIds) {
        const job = jobs[jobId];
        const needs = job.needs
            ? Array.isArray(job.needs)
                ? job.needs
                : [job.needs]
            : [];

        if (needs.length > 0) {
            jobsWithNeeds.add(jobId);
        }

        // Job node
        const steps = job.steps || [];
        nodes.push({
            id: `job-${jobId}`,
            type: 'job',
            position: { x: 0, y: 0 },
            data: {
                jobId,
                name: job.name || jobId,
                runsOn: job['runs-on'] || 'unknown',
                stepCount: steps.length,
                condition: job.if,
                hasMatrix: !!job.strategy?.matrix,
            },
        });

        // Step nodes
        steps.forEach((step, idx) => {
            const stepId = `step-${jobId}-${idx}`;
            nodes.push({
                id: stepId,
                type: 'step',
                position: { x: 0, y: 0 },
                data: {
                    label: getStepLabel(step),
                    stepType: getStepType(step),
                    uses: step.uses,
                    run: step.run,
                    condition: step.if,
                    stepIndex: idx,
                    parentJobId: jobId,
                },
            });

            // Edge: previous step → this step (within same job)
            if (idx === 0) {
                // First step connects from its parent job
                edges.push({
                    id: `e-job-${jobId}-to-${stepId}`,
                    source: `job-${jobId}`,
                    target: stepId,
                    type: 'smoothstep',
                    animated: false,
                    style: { stroke: '#3f3f46', strokeWidth: 1.5 },
                });
            } else {
                const prevStepId = `step-${jobId}-${idx - 1}`;
                edges.push({
                    id: `e-${prevStepId}-to-${stepId}`,
                    source: prevStepId,
                    target: stepId,
                    type: 'smoothstep',
                    animated: false,
                    style: { stroke: '#3f3f46', strokeWidth: 1.5 },
                });
            }
        });

        // ── 3. Create edges for job dependencies ─────────────────

        for (const dep of needs) {
            if (jobIds.includes(dep)) {
                // Find last step of the dependency job (or the job node itself if no steps)
                const depSteps = jobs[dep].steps || [];
                const sourceId =
                    depSteps.length > 0
                        ? `step-${dep}-${depSteps.length - 1}`
                        : `job-${dep}`;

                edges.push({
                    id: `e-dep-${dep}-to-${jobId}`,
                    source: sourceId,
                    target: `job-${jobId}`,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#6366f1', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
                });
            }
        }
    }

    // ── 4. Connect trigger to root jobs (those with no `needs:`) ─

    if (triggers.length > 0) {
        for (const jobId of jobIds) {
            if (!jobsWithNeeds.has(jobId)) {
                edges.push({
                    id: `e-trigger-to-job-${jobId}`,
                    source: '__trigger__',
                    target: `job-${jobId}`,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#3b82f6', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
                });
            }
        }
    }

    // ── 5. Apply auto-layout ─────────────────────────────────────

    const layouted = getLayoutedElements(nodes, edges);

    return {
        nodes: layouted.nodes,
        edges: layouted.edges,
        workflowName,
    };
}
