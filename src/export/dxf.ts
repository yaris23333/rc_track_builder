import type { DxfLayer, PlacedTile, Primitive, TileDef, TrackDoc } from '../types';
import { TILE_BY_ID } from '../model/tiles';
import { safeFilename, timestamp } from '../utils/dom';

export interface DxfOptions {
  version?: 'R12' | 'R2000';
  includeGrid?: boolean;
}

interface Segment {
  layer: DxfLayer;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const LAYERS: { name: DxfLayer; color: number }[] = [
  { name: 'BOARD', color: 8 },
  { name: 'GRID', color: 8 },
  { name: 'TILE_OUTLINE', color: 9 },
  { name: 'TRACK_EDGE', color: 7 },
  { name: 'TRACK_CENTER', color: 30 },
  { name: 'FEATURE', color: 5 },
  { name: 'START_FINISH', color: 1 },
  { name: 'TEXT', color: 7 },
];

function rotatePoint(x: number, y: number, cx: number, cy: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function transformPoint(def: TileDef, tile: PlacedTile, x: number, y: number) {
  let px = tile.flipX ? def.sizeM.w - x : x;
  let py = tile.flipY ? def.sizeM.h - y : y;
  const rotated = rotatePoint(px, py, def.sizeM.w / 2, def.sizeM.h / 2, tile.rotation);
  return { x: tile.xM + rotated.x, y: tile.yM + rotated.y };
}

function primitiveSegments(def: TileDef, tile: PlacedTile, primitive: Primitive): Segment[] {
  const segments: Segment[] = [];
  const push = (a: { x: number; y: number }, b: { x: number; y: number }, layer = primitive.layer) => {
    const p1 = transformPoint(def, tile, a.x, a.y);
    const p2 = transformPoint(def, tile, b.x, b.y);
    segments.push({ layer, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
  };

  switch (primitive.kind) {
    case 'line':
      push(primitive.a, primitive.b);
      break;
    case 'rect': {
      const a = { x: primitive.x, y: primitive.y };
      const b = { x: primitive.x + primitive.w, y: primitive.y };
      const c = { x: primitive.x + primitive.w, y: primitive.y + primitive.h };
      const d = { x: primitive.x, y: primitive.y + primitive.h };
      push(a, b);
      push(b, c);
      push(c, d);
      push(d, a);
      break;
    }
    case 'arc': {
      const steps = Math.max(8, Math.ceil(Math.abs(primitive.endDeg - primitive.startDeg) / 5));
      let previous: { x: number; y: number } | null = null;
      for (let i = 0; i <= steps; i += 1) {
        const angle =
          primitive.startDeg + ((primitive.endDeg - primitive.startDeg) * i) / steps;
        const rad = (angle * Math.PI) / 180;
        const point = {
          x: primitive.center.x + primitive.r * Math.cos(rad),
          y: primitive.center.y + primitive.r * Math.sin(rad),
        };
        if (previous) push(previous, point);
        previous = point;
      }
      break;
    }
    case 'circle': {
      const steps = 48;
      let previous: { x: number; y: number } | null = null;
      for (let i = 0; i <= steps; i += 1) {
        const angle = (i / steps) * Math.PI * 2;
        const point = {
          x: primitive.center.x + primitive.r * Math.cos(angle),
          y: primitive.center.y + primitive.r * Math.sin(angle),
        };
        if (previous) push(previous, point);
        previous = point;
      }
      break;
    }
    case 'polyline': {
      for (let i = 0; i < primitive.points.length - 1; i += 1) {
        push(primitive.points[i], primitive.points[i + 1]);
      }
      if (primitive.closed && primitive.points.length > 2) {
        push(primitive.points[primitive.points.length - 1], primitive.points[0]);
      }
      break;
    }
    default:
      break;
  }
  return segments;
}

function escapeText(value: string): string {
  return value.replace(/[\r\n]/g, ' ').replace(/[^\x20-\x7E]/g, '').trim();
}

function number(value: number): string {
  return (Math.round(value * 1000) / 1000).toFixed(3).replace(/\.?0+$/, '');
}

export function buildDxf(doc: TrackDoc, options: DxfOptions = {}): string {
  const version = options.version ?? 'R12';
  const includeGrid = options.includeGrid ?? false;
  const boardW = doc.board.widthM;
  const boardH = doc.board.heightM;
  const segments: Segment[] = [];

  // Board outline
  segments.push(
    { layer: 'BOARD', x1: 0, y1: 0, x2: boardW, y2: 0 },
    { layer: 'BOARD', x1: boardW, y1: 0, x2: boardW, y2: boardH },
    { layer: 'BOARD', x1: boardW, y1: boardH, x2: 0, y2: boardH },
    { layer: 'BOARD', x1: 0, y1: boardH, x2: 0, y2: 0 },
  );

  if (includeGrid) {
    const cell = doc.board.cellSize;
    const cols = Math.round(boardW / cell);
    const rows = Math.round(boardH / cell);
    for (let i = 0; i <= cols; i += 1) {
      segments.push({ layer: 'GRID', x1: i * cell, y1: 0, x2: i * cell, y2: boardH });
    }
    for (let j = 0; j <= rows; j += 1) {
      segments.push({ layer: 'GRID', x1: 0, y1: j * cell, x2: boardW, y2: j * cell });
    }
  }

  for (const tile of doc.tiles) {
    const def = TILE_BY_ID.get(tile.defId);
    if (!def) continue;
    for (const primitive of def.primitives) {
      segments.push(...primitiveSegments(def, tile, primitive));
    }
  }

  const out: string[] = [];
  const add = (code: number, value: string | number) => {
    out.push(String(code));
    out.push(String(value));
  };

  const maxY = boardH * 1000 + 1400;

  // HEADER
  add(0, 'SECTION');
  add(2, 'HEADER');
  add(9, '$ACADVER');
  add(1, version === 'R12' ? 'AC1009' : 'AC1015');
  add(9, '$LUNITS');
  add(70, 2);
  add(9, '$LUPREC');
  add(70, 3);
  add(9, '$MEASUREMENT');
  add(70, 1);
  if (version === 'R2000') {
    add(9, '$INSUNITS');
    add(70, 4);
  }
  add(9, '$EXTMIN');
  add(10, 0);
  add(20, 0);
  add(30, 0);
  add(9, '$EXTMAX');
  add(10, number(boardW * 1000));
  add(20, number(maxY));
  add(30, 0);
  add(0, 'ENDSEC');

  // TABLES
  add(0, 'SECTION');
  add(2, 'TABLES');

  add(0, 'TABLE');
  add(2, 'LTYPE');
  add(70, 1);
  add(0, 'LTYPE');
  add(2, 'CONTINUOUS');
  add(70, 0);
  add(3, 'Solid line');
  add(72, 65);
  add(73, 0);
  add(40, 0);
  add(0, 'ENDTAB');

  add(0, 'TABLE');
  add(2, 'LAYER');
  add(70, LAYERS.length);
  for (const layer of LAYERS) {
    add(0, 'LAYER');
    add(2, layer.name);
    add(70, 0);
    add(62, layer.color);
    add(6, 'CONTINUOUS');
  }
  add(0, 'ENDTAB');

  add(0, 'TABLE');
  add(2, 'STYLE');
  add(70, 1);
  add(0, 'STYLE');
  add(2, 'STANDARD');
  add(70, 0);
  add(40, 0);
  add(41, 1);
  add(50, 0);
  add(71, 0);
  add(42, 2.5);
  add(3, 'txt');
  add(4, '');
  add(0, 'ENDTAB');

  add(0, 'ENDSEC');

  // BLOCKS (required section, empty)
  add(0, 'SECTION');
  add(2, 'BLOCKS');
  add(0, 'ENDSEC');

  // ENTITIES
  add(0, 'SECTION');
  add(2, 'ENTITIES');
  for (const segment of segments) {
    add(0, 'LINE');
    add(8, segment.layer);
    add(10, number(segment.x1 * 1000));
    add(20, number((boardH - segment.y1) * 1000));
    add(30, 0);
    add(11, number(segment.x2 * 1000));
    add(21, number((boardH - segment.y2) * 1000));
    add(31, 0);
  }

  const asciiName = escapeText(doc.name);
  const title = /[A-Za-z]{3,}/.test(asciiName) ? asciiName : 'RC TRACK';
  const info = `W ${number(doc.board.widthM)} m  x  H ${number(doc.board.heightM)} m  |  GRID ${number(
    doc.board.cellSize,
  )} m  |  ${doc.tiles.length} TILES  |  UNITS mm`;

  add(0, 'TEXT');
  add(8, 'TEXT');
  add(10, 0);
  add(20, number(boardH * 1000 + 900));
  add(30, 0);
  add(40, 620);
  add(1, title);
  add(7, 'STANDARD');

  add(0, 'TEXT');
  add(8, 'TEXT');
  add(10, 0);
  add(20, number(boardH * 1000 + 360));
  add(30, 0);
  add(40, 320);
  add(1, info);
  add(7, 'STANDARD');

  add(0, 'ENDSEC');
  add(0, 'EOF');

  return `${out.join('\n')}\n`;
}

export async function exportDxf(doc: TrackDoc, options: DxfOptions = {}): Promise<void> {
  const content = buildDxf(doc, options);
  const blob = new Blob([content], { type: 'application/dxf;charset=utf-8' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `${safeFilename(doc.name)}-${timestamp()}.dxf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
