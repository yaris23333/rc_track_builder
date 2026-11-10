import type { Port, Primitive, TileDef } from './types';

const OUTLINE: Primitive = {
  kind: 'rect',
  x: 0,
  y: 0,
  w: 3,
  h: 3,
  layer: 'TILE_OUTLINE',
  rx: 0.04,
};

const STRAIGHT_PORTS: Port[] = [
  { id: 'w', side: 'w', offset: 0.5, dir: 'both', laneWidth: 1.5 },
  { id: 'e', side: 'e', offset: 0.5, dir: 'both', laneWidth: 1.5 },
];

const CURVE_PORTS: Port[] = [
  { id: 'w', side: 'w', offset: 0.5, dir: 'both', laneWidth: 1.5 },
  { id: 's', side: 's', offset: 0.5, dir: 'both', laneWidth: 1.5 },
];

const LANE_TOP: Primitive = {
  kind: 'line',
  a: { x: 0, y: 0.75 },
  b: { x: 3, y: 0.75 },
  layer: 'TRACK_EDGE',
};

const LANE_BOTTOM: Primitive = {
  kind: 'line',
  a: { x: 0, y: 2.25 },
  b: { x: 3, y: 2.25 },
  layer: 'TRACK_EDGE',
};

const CENTER: Primitive = {
  kind: 'line',
  a: { x: 0, y: 1.5 },
  b: { x: 3, y: 1.5 },
  layer: 'TRACK_CENTER',
};

function straightBase(): Primitive[] {
  return [OUTLINE, LANE_TOP, LANE_BOTTOM, CENTER];
}

function band(x: number, w: number, fill: string): Primitive {
  return {
    kind: 'rect',
    x,
    y: 0.75,
    w,
    h: 1.5,
    layer: 'FEATURE',
    fill,
  };
}

function shortLine(x: number, y1: number, y2: number): Primitive {
  return {
    kind: 'line',
    a: { x, y: y1 },
    b: { x, y: y2 },
    layer: 'FEATURE',
  };
}

function table(): Primitive[] {
  return [
    ...straightBase(),
    {
      kind: 'rect',
      x: 1.05,
      y: 0.82,
      w: 0.9,
      h: 1.36,
      layer: 'FEATURE',
      fill: 'rgba(37, 99, 235, 0.10)',
      rx: 0.06,
    },
    {
      kind: 'line',
      a: { x: 1.05, y: 1.5 },
      b: { x: 1.95, y: 1.5 },
      layer: 'FEATURE',
    },
  ];
}

function startFinish(): Primitive[] {
  const primitives: Primitive[] = [...straightBase()];
  const rows = 8;
  const h = 1.5 / rows;
  for (let i = 0; i < rows; i += 1) {
    primitives.push({
      kind: 'rect',
      x: 1.36,
      y: 0.75 + i * h,
      w: 0.28,
      h,
      layer: 'START_FINISH',
      fill: i % 2 === 0 ? '#0f172a' : '#f8fafc',
    });
  }
  primitives.push({
    kind: 'line',
    a: { x: 1.36, y: 0.75 },
    b: { x: 1.36, y: 2.25 },
    layer: 'START_FINISH',
  });
  primitives.push({
    kind: 'line',
    a: { x: 1.64, y: 0.75 },
    b: { x: 1.64, y: 2.25 },
    layer: 'START_FINISH',
  });
  return primitives;
}

function curve90(): Primitive[] {
  // The turn is centered on the bottom-left corner of the tile. At 270° the
  // lane sits on the left edge (y = 0.75..2.25); at 360° it sits on the bottom
  // edge (x = 0.75..2.25). Rotating the tile moves the turn to any corner.
  const center = { x: 0, y: 3 };
  return [
    OUTLINE,
    { kind: 'arc', center, r: 2.25, startDeg: 270, endDeg: 360, layer: 'TRACK_EDGE' },
    { kind: 'arc', center, r: 0.75, startDeg: 270, endDeg: 360, layer: 'TRACK_EDGE' },
    { kind: 'arc', center, r: 1.5, startDeg: 270, endDeg: 360, layer: 'TRACK_CENTER' },
  ];
}

export const TILE_DEFS: TileDef[] = [
  {
    id: 'straight',
    name: '直线',
    category: 'base',
    categoryLabel: '基础',
    description: '3m 直线段',
    sizeM: { w: 3, h: 3 },
    ports: STRAIGHT_PORTS,
    primitives: straightBase(),
  },
  {
    id: 'curve90',
    name: '90° 弯',
    category: 'curve',
    categoryLabel: '弯道',
    description: '90° 弯道，连接左侧与下方',
    sizeM: { w: 3, h: 3 },
    ports: CURVE_PORTS,
    primitives: curve90(),
  },
  {
    id: 'single',
    name: '单跳',
    category: 'feature',
    categoryLabel: '组合',
    description: '单个跳台',
    sizeM: { w: 3, h: 3 },
    ports: STRAIGHT_PORTS,
    primitives: [...straightBase(), band(1.34, 0.32, 'rgba(37, 99, 235, 0.16)'), shortLine(1.34, 0.75, 2.25), shortLine(1.66, 0.75, 2.25)],
  },
  {
    id: 'double_small',
    name: '小双跳',
    category: 'feature',
    categoryLabel: '组合',
    description: '两个连续小跳',
    sizeM: { w: 3, h: 3 },
    ports: STRAIGHT_PORTS,
    primitives: [
      ...straightBase(),
      band(1.0, 0.2, 'rgba(37, 99, 235, 0.14)'),
      band(1.8, 0.2, 'rgba(37, 99, 235, 0.14)'),
      shortLine(1.0, 0.75, 2.25),
      shortLine(1.2, 0.75, 2.25),
      shortLine(1.8, 0.75, 2.25),
      shortLine(2.0, 0.75, 2.25),
    ],
  },
  {
    id: 'rollers_big',
    name: '大波浪',
    category: 'feature',
    categoryLabel: '组合',
    description: '三个大滚筒',
    sizeM: { w: 3, h: 3 },
    ports: STRAIGHT_PORTS,
    primitives: [
      ...straightBase(),
      band(0.66, 0.34, 'rgba(249, 115, 22, 0.16)'),
      band(1.33, 0.34, 'rgba(249, 115, 22, 0.16)'),
      band(2.0, 0.34, 'rgba(249, 115, 22, 0.16)'),
      shortLine(0.66, 0.75, 2.25),
      shortLine(1.0, 0.75, 2.25),
      shortLine(1.33, 0.75, 2.25),
      shortLine(1.67, 0.75, 2.25),
      shortLine(2.0, 0.75, 2.25),
      shortLine(2.34, 0.75, 2.25),
    ],
  },
  {
    id: 'rollers_small',
    name: '小波浪',
    category: 'feature',
    categoryLabel: '组合',
    description: '六个小滚筒',
    sizeM: { w: 3, h: 3 },
    ports: STRAIGHT_PORTS,
    primitives: [
      ...straightBase(),
      ...[0.5, 0.9, 1.3, 1.7, 2.1, 2.5].flatMap((x) => [
        band(x, 0.12, 'rgba(249, 115, 22, 0.16)'),
        shortLine(x, 0.75, 2.25),
      ]),
    ],
  },
  {
    id: 'table',
    name: '桌子',
    category: 'feature',
    categoryLabel: '组合',
    description: '桌面/平台',
    sizeM: { w: 3, h: 3 },
    ports: STRAIGHT_PORTS,
    primitives: table(),
  },
  {
    id: 'start_finish',
    name: '起终点',
    category: 'facility',
    categoryLabel: '设施',
    description: '带黑白格起终点线',
    sizeM: { w: 3, h: 3 },
    ports: STRAIGHT_PORTS,
    primitives: startFinish(),
  },
];

export const TILE_BY_ID = new Map(TILE_DEFS.map((def) => [def.id, def]));

export const TILE_CATEGORIES = [
  { id: 'base', label: '基础' },
  { id: 'curve', label: '弯道' },
  { id: 'feature', label: '组合' },
  { id: 'facility', label: '设施' },
] as const;

export function getTileDef(id: string): TileDef | undefined {
  return TILE_BY_ID.get(id);
}
