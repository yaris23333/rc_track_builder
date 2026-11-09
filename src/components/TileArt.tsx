import type { Primitive, Rot, TileDef } from '../types';

const LAYER_STYLES: Record<
  string,
  { stroke: string; width: number; dash?: string; fill?: string }
> = {
  TILE_OUTLINE: { stroke: '#c4cedb', width: 1, dash: '2 3' },
  TRACK_EDGE: { stroke: '#172033', width: 2.2 },
  TRACK_CENTER: { stroke: '#f97316', width: 1.25, dash: '4 4' },
  FEATURE: { stroke: '#2563eb', width: 1.7, fill: 'rgba(37, 99, 235, 0.12)' },
  START_FINISH: { stroke: '#0f172a', width: 1.5 },
};

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function PrimitiveNode({
  primitive,
  strokeScale,
}: {
  primitive: Primitive;
  strokeScale: number;
}) {
  const style = LAYER_STYLES[primitive.layer] ?? LAYER_STYLES.TILE_OUTLINE;
  const strokeWidth = style.width * strokeScale;
  const common = {
    stroke: style.stroke,
    strokeWidth,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeDasharray: style.dash,
    vectorEffect: 'non-scaling-stroke' as const,
  };

  switch (primitive.kind) {
    case 'line':
      return <line x1={primitive.a.x} y1={primitive.a.y} x2={primitive.b.x} y2={primitive.b.y} {...common} />;
    case 'rect':
      return (
        <rect
          x={primitive.x}
          y={primitive.y}
          width={primitive.w}
          height={primitive.h}
          rx={primitive.rx}
          {...common}
          fill={primitive.fill ?? style.fill ?? 'none'}
        />
      );
    case 'arc':
      return (
        <path
          d={arcPath(primitive.center.x, primitive.center.y, primitive.r, primitive.startDeg, primitive.endDeg)}
          {...common}
        />
      );
    case 'circle':
      return (
        <circle
          cx={primitive.center.x}
          cy={primitive.center.y}
          r={primitive.r}
          {...common}
          fill={primitive.fill ?? style.fill ?? 'none'}
        />
      );
    case 'polyline': {
      const points = primitive.points.map((p) => `${p.x},${p.y}`).join(' ');
      if (primitive.closed) {
        return <polygon points={points} {...common} fill={primitive.fill ?? style.fill ?? 'none'} />;
      }
      return <polyline points={points} {...common} fill="none" />;
    }
    default:
      return null;
  }
}

export function TileArt({
  def,
  xM,
  yM,
  rotation,
  flipX,
  flipY,
  ghost = 'none',
  opacity = 1,
  strokeScale = 1,
}: {
  def: TileDef;
  xM: number;
  yM: number;
  rotation: Rot;
  flipX: boolean;
  flipY: boolean;
  ghost?: 'none' | 'valid' | 'invalid';
  opacity?: number;
  strokeScale?: number;
}) {
  const ghostFill =
    ghost === 'valid'
      ? 'rgba(74, 222, 128, 0.22)'
      : ghost === 'invalid'
        ? 'rgba(248, 113, 113, 0.22)'
        : 'transparent';
  const ghostStroke =
    ghost === 'valid' ? '#4ade80' : ghost === 'invalid' ? '#f87171' : undefined;

  return (
    <g transform={`translate(${xM} ${yM})`} opacity={opacity}>
      <g
        transform={`translate(${def.sizeM.w / 2} ${def.sizeM.h / 2}) rotate(${rotation}) scale(${
          flipX ? -1 : 1
        } ${flipY ? -1 : 1}) translate(${-def.sizeM.w / 2} ${-def.sizeM.h / 2})`}
      >
        <rect
          x={0}
          y={0}
          width={def.sizeM.w}
          height={def.sizeM.h}
          rx={0.04}
          fill={ghostFill}
          stroke={ghostStroke ?? 'none'}
          strokeWidth={ghostStroke ? 2 : 0}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
        {def.primitives
          .filter((primitive) => primitive.layer !== 'TILE_OUTLINE')
          .map((primitive, index) => (
          <PrimitiveNode key={`${def.id}-${index}`} primitive={primitive} strokeScale={strokeScale} />
          ))}
      </g>
    </g>
  );
}
