import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';

const NODE_WIDTHS: Record<string, number> = {
    trigger: 220,
    job: 280,
    step: 240,
};

const NODE_HEIGHTS: Record<string, number> = {
    trigger: 60,
    job: 80,
    step: 50,
};

const DEFAULT_WIDTH = 250;
const DEFAULT_HEIGHT = 100;

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
        rankdir: 'TB',
        align: 'DL',
        nodesep: 40,
        ranksep: 60,
        marginx: 40,
        marginy: 40,
    });

    nodes.forEach((node) => {
        const w = NODE_WIDTHS[node.type || ''] || DEFAULT_WIDTH;
        const h = NODE_HEIGHTS[node.type || ''] || DEFAULT_HEIGHT;
        dagreGraph.setNode(node.id, { width: w, height: h });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const w = NODE_WIDTHS[node.type || ''] || DEFAULT_WIDTH;
        const h = NODE_HEIGHTS[node.type || ''] || DEFAULT_HEIGHT;

        return {
            ...node,
            targetPosition: Position.Top,
            sourcePosition: Position.Bottom,
            position: {
                x: nodeWithPosition.x - w / 2,
                y: nodeWithPosition.y - h / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};
