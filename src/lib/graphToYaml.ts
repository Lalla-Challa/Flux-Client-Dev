import { Node, Edge } from 'reactflow';
import yaml from 'js-yaml';

/**
 * Serializes React Flow nodes/edges back into a GitHub Actions YAML string.
 * This is the reverse of yamlToGraph — it makes the visual editor "write code".
 */
export function graphToYaml(
    nodes: Node[],
    edges: Edge[],
    workflowName: string
): string {
    const workflow: any = {};

    if (workflowName) {
        workflow.name = workflowName;
    }

    // ── 1. Build `on:` from trigger node ─────────────────────────

    const triggerNode = nodes.find((n) => n.type === 'trigger');
    if (triggerNode && triggerNode.data?.triggers?.length > 0) {
        const triggers = triggerNode.data.triggers as {
            event: string;
            branches?: string[];
        }[];

        if (triggers.length === 1 && !triggers[0].branches?.length) {
            // Simple: on: push
            workflow.on = triggers[0].event;
        } else {
            const on: any = {};
            for (const t of triggers) {
                if (t.branches && t.branches.length > 0) {
                    on[t.event] = { branches: t.branches };
                } else {
                    on[t.event] = null;
                }
            }
            workflow.on = on;
        }
    }

    // ── 2. Build `jobs:` from job and step nodes ─────────────────

    const jobNodes = nodes.filter((n) => n.type === 'job');
    const stepNodes = nodes.filter((n) => n.type === 'step');

    if (jobNodes.length === 0) {
        // No jobs — return just the header
        if (Object.keys(workflow).length === 0) return '';
        return yaml.dump(workflow, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
    }

    const jobs: any = {};

    // Find job dependencies from edges (job→job connections or lastStep→job)
    // A dependency edge goes from either a job node or the last step of a job
    // TO a target job node.
    for (const jobNode of jobNodes) {
        const jobId: string = jobNode.data.jobId;
        const job: any = {};

        if (jobNode.data.name && jobNode.data.name !== jobId) {
            job.name = jobNode.data.name;
        }

        job['runs-on'] = jobNode.data.runsOn || 'ubuntu-latest';

        if (jobNode.data.condition) {
            job.if = jobNode.data.condition;
        }

        // Find needs: look for edges whose target is this job node
        // and whose source is another job or the last step of another job
        const incomingEdges = edges.filter(
            (e) => e.target === jobNode.id && e.id.startsWith('e-dep-')
        );
        if (incomingEdges.length > 0) {
            const needs: string[] = [];
            for (const edge of incomingEdges) {
                // Source could be job-{id} or step-{id}-{n}
                const sourceNode = nodes.find((n) => n.id === edge.source);
                if (sourceNode?.type === 'job') {
                    needs.push(sourceNode.data.jobId);
                } else if (sourceNode?.type === 'step' && sourceNode.data.parentJobId) {
                    needs.push(sourceNode.data.parentJobId);
                }
            }
            if (needs.length > 0) {
                job.needs = needs.length === 1 ? needs[0] : needs;
            }
        }

        // Collect steps for this job, ordered by stepIndex
        const jobSteps = stepNodes
            .filter((s) => s.data.parentJobId === jobId)
            .sort((a, b) => (a.data.stepIndex ?? 0) - (b.data.stepIndex ?? 0));

        if (jobSteps.length > 0) {
            job.steps = jobSteps.map((s) => {
                const step: any = {};
                if (s.data.label && s.data.label !== 'Step') {
                    step.name = s.data.label;
                }
                if (s.data.stepType === 'uses' && s.data.uses) {
                    step.uses = s.data.uses;
                } else if (s.data.run) {
                    step.run = s.data.run;
                }
                if (s.data.condition) {
                    step.if = s.data.condition;
                }
                return step;
            });
        }

        jobs[jobId] = job;
    }

    workflow.jobs = jobs;

    return yaml.dump(workflow, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
        quotingType: "'",
        forceQuotes: false,
    });
}
