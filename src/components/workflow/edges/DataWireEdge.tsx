import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';

// Data wire colors by type
const DATA_WIRE_COLORS: Record<string, string> = {
    secret: '#22c55e',    // green
    context: '#f97316',   // orange
    output: '#06b6d4',    // cyan
    default: '#a78bfa',   // violet
};

export const DataWireEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    selected,
}) => {
    const wireType = data?.wireType || 'default';
    const color = DATA_WIRE_COLORS[wireType] || DATA_WIRE_COLORS.default;

    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        curvature: 0.4,
    });

    return (
        <>
            {/* Glow effect behind the wire */}
            <path
                d={edgePath}
                fill="none"
                stroke={color}
                strokeWidth={selected ? 6 : 4}
                strokeOpacity={selected ? 0.2 : 0.08}
                style={{ filter: 'blur(3px)' }}
            />
            {/* Main wire */}
            <BaseEdge
                id={id}
                path={edgePath}
                style={{
                    stroke: color,
                    strokeWidth: selected ? 2.5 : 1.5,
                    strokeDasharray: selected ? undefined : '6 3',
                    opacity: selected ? 1 : 0.7,
                    ...style,
                }}
            />
            {/* Animated flow dots */}
            <circle r="2.5" fill={color} opacity={0.9}>
                <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
            </circle>
        </>
    );
};

DataWireEdge.displayName = 'DataWireEdge';
