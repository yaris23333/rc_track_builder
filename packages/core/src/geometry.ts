import type { Board, CellSize, PlacedTile, Rot, TileDef, TrackDoc } from './types';
import { DEFAULT_TILE_SET_VERSION } from './types';

export const EPS = 1e-9;

export function roundM(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function isMultiple(value: number, cell: number): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(cell) || cell <= 0) return false;
  const q = value / cell;
  return Math.abs(q - Math.round(q)) < 1e-9;
}

export function boardCells(board: Board): { cols: number; rows: number } {
  return {
    cols: Math.round(board.widthM / board.cellSize),
    rows: Math.round(board.heightM / board.cellSize),
  };
}

export function snap(value: number, cell: number): number {
  return roundM(Math.round(value / cell) * cell);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function tileSizeFor(def: TileDef, rotation: Rot): { w: number; h: number } {
  if (rotation === 90 || rotation === 270) {
    return { w: def.sizeM.h, h: def.sizeM.w };
  }
  return { w: def.sizeM.w, h: def.sizeM.h };
}

export function tileBounds(tile: PlacedTile, def: TileDef): { x: number; y: number; w: number; h: number } {
  const size = tileSizeFor(def, tile.rotation);
  return { x: tile.xM, y: tile.yM, w: size.w, h: size.h };
}

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w - EPS &&
    a.x + a.w > b.x + EPS &&
    a.y < b.y + b.h - EPS &&
    a.y + a.h > b.y + EPS
  );
}

export function isInsideBoard(
  bounds: { x: number; y: number; w: number; h: number },
  board: Board,
): boolean {
  return (
    bounds.x >= -EPS &&
    bounds.y >= -EPS &&
    bounds.x + bounds.w <= board.widthM + EPS &&
    bounds.y + bounds.h <= board.heightM + EPS
  );
}

export function canPlace(
  board: Board,
  tiles: PlacedTile[],
  def: TileDef,
  xM: number,
  yM: number,
  rotation: Rot,
  defs: Map<string, TileDef>,
  ignoreUids: ReadonlySet<string> = new Set(),
): boolean {
  const probe: PlacedTile = {
    uid: '__probe__',
    defId: def.id,
    xM,
    yM,
    rotation,
    flipX: false,
    flipY: false,
    layer: 0,
  };
  const bounds = tileBounds(probe, def);
  if (!isInsideBoard(bounds, board)) return false;
  for (const tile of tiles) {
    if (ignoreUids.has(tile.uid)) continue;
    const otherDef = defs.get(tile.defId);
    if (!otherDef) return false;
    if (rectsOverlap(bounds, tileBounds(tile, otherDef))) return false;
  }
  return true;
}

export function tilesOutsideBoard(board: Board, tiles: PlacedTile[], defs: Map<string, TileDef>): PlacedTile[] {
  return tiles.filter((tile) => {
    const def = defs.get(tile.defId);
    if (!def) return true;
    return !isInsideBoard(tileBounds(tile, def), board);
  });
}

export function nearestValidMeters(value: number, cell: CellSize): { lower: number; upper: number; nearest: number } {
  const lower = roundM(Math.floor(value / cell) * cell);
  const upper = roundM(Math.ceil(value / cell) * cell);
  const nearest = Math.abs(value - lower) <= Math.abs(upper - value) ? lower : upper;
  return { lower, upper, nearest };
}

export function formatM(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function createEmptyDoc(name = '未命名赛道'): TrackDoc {
  const now = nowISO();
  return {
    schemaVersion: 1,
    name,
    board: { cellSize: 1, widthM: 30, heightM: 18 },
    tiles: [],
    meta: { createdAt: now, updatedAt: now },
    tileSetVersion: DEFAULT_TILE_SET_VERSION,
  };
}

interface SampleTile {
  defId: string;
  x: number;
  y: number;
  rotation?: Rot;
}

const SAMPLE_TILES: SampleTile[] = [
  // top row
  { defId: 'straight', x: 6, y: 3 },
  { defId: 'rollers_big', x: 9, y: 3 },
  { defId: 'straight', x: 12, y: 3 },
  { defId: 'table', x: 15, y: 3 },
  { defId: 'single', x: 18, y: 3 },
  { defId: 'straight', x: 21, y: 3 },
  // top corners
  { defId: 'curve90', x: 3, y: 3, rotation: 270 },
  { defId: 'curve90', x: 24, y: 3, rotation: 0 },
  // right side
  { defId: 'straight', x: 24, y: 6, rotation: 90 },
  { defId: 'straight', x: 24, y: 9, rotation: 90 },
  { defId: 'straight', x: 24, y: 12, rotation: 90 },
  // bottom right corner
  { defId: 'curve90', x: 24, y: 15, rotation: 90 },
  // bottom row
  { defId: 'straight', x: 21, y: 15 },
  { defId: 'rollers_small', x: 18, y: 15 },
  { defId: 'start_finish', x: 15, y: 15 },
  { defId: 'straight', x: 12, y: 15 },
  { defId: 'double_small', x: 9, y: 15 },
  { defId: 'straight', x: 6, y: 15 },
  // bottom left corner
  { defId: 'curve90', x: 3, y: 15, rotation: 180 },
  // left side
  { defId: 'straight', x: 3, y: 6, rotation: 90 },
  { defId: 'straight', x: 3, y: 9, rotation: 90 },
  { defId: 'straight', x: 3, y: 12, rotation: 90 },
];

export function createSampleDoc(cellSize: CellSize = 1): TrackDoc {
  const now = nowISO();
  const board: Board = { cellSize, widthM: 30, heightM: 18 };
  return {
    schemaVersion: 1,
    name: '示例赛道 · 24 × 15 m',
    board,
    tiles: SAMPLE_TILES.map((tile) => ({
      uid: uid(),
      defId: tile.defId,
      xM: tile.x,
      yM: tile.y,
      rotation: tile.rotation ?? 0,
      flipX: false,
      flipY: false,
      layer: 0,
    })),
    meta: { createdAt: now, updatedAt: now },
    tileSetVersion: DEFAULT_TILE_SET_VERSION,
  };
}

export function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return '未命名赛道';
  return name.trim().slice(0, 80) || '未命名赛道';
}

/**
 * Validates a document coming from localStorage / a share link / a JSON file.
 * Strictly enforces the physical-first grid rule: both board edges must be
 * integer multiples of the selected cell size.
 */
export function validateDoc(raw: unknown, defs: Map<string, TileDef>): TrackDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<TrackDoc>;
  const board = source.board as Partial<Board> | undefined;
  if (!board) return null;
  const cellSize = board.cellSize;
  if (cellSize !== 0.3 && cellSize !== 0.5 && cellSize !== 1) return null;
  const widthM = Number(board.widthM);
  const heightM = Number(board.heightM);
  if (!Number.isFinite(widthM) || !Number.isFinite(heightM)) return null;
  if (widthM <= 0 || heightM <= 0 || widthM > 300 || heightM > 300) return null;
  if (!isMultiple(widthM, cellSize) || !isMultiple(heightM, cellSize)) return null;
  const cols = Math.round(widthM / cellSize);
  const rows = Math.round(heightM / cellSize);
  if (cols < 1 || rows < 1 || cols > 1000 || rows > 1000) return null;

  if (!Array.isArray(source.tiles)) return null;
  if (source.tiles.length > 5000) return null;
  const seen = new Set<string>();
  const tiles: PlacedTile[] = [];
  for (const rawTile of source.tiles) {
    if (!rawTile || typeof rawTile !== 'object') return null;
    const tile = rawTile as Partial<PlacedTile>;
    if (typeof tile.uid !== 'string' || !tile.uid || seen.has(tile.uid)) return null;
    if (typeof tile.defId !== 'string') return null;
    const def = defs.get(tile.defId);
    if (!def) return null;
    const xM = Number(tile.xM);
    const yM = Number(tile.yM);
    if (!Number.isFinite(xM) || !Number.isFinite(yM)) return null;
    const rotation = tile.rotation;
    if (rotation !== 0 && rotation !== 90 && rotation !== 180 && rotation !== 270) return null;
    const placed: PlacedTile = {
      uid: tile.uid,
      defId: tile.defId,
      xM: roundM(xM),
      yM: roundM(yM),
      rotation,
      flipX: Boolean(tile.flipX),
      flipY: Boolean(tile.flipY),
      layer: Number.isFinite(Number(tile.layer)) ? Number(tile.layer) : 0,
    };
    if (!isInsideBoard(tileBounds(placed, def), { cellSize, widthM, heightM })) return null;
    seen.add(placed.uid);
    tiles.push(placed);
  }

  // Reject overlapping imports; a valid document should never contain them.
  for (let i = 0; i < tiles.length; i += 1) {
    const aDef = defs.get(tiles[i].defId)!;
    const a = tileBounds(tiles[i], aDef);
    for (let j = i + 1; j < tiles.length; j += 1) {
      const bDef = defs.get(tiles[j].defId)!;
      if (rectsOverlap(a, tileBounds(tiles[j], bDef))) return null;
    }
  }

  const now = nowISO();
  const meta = (source.meta ?? {}) as Partial<TrackDoc['meta']>;
  const rawMeta = meta as Record<string, unknown>;
  return {
    schemaVersion: 1,
    name: sanitizeName(source.name),
    board: { cellSize, widthM, heightM },
    tiles,
    meta: {
      author: typeof rawMeta.author === 'string' ? rawMeta.author.slice(0, 80) : undefined,
      notes: typeof rawMeta.notes === 'string' ? rawMeta.notes.slice(0, 2000) : undefined,
      createdAt: typeof rawMeta.createdAt === 'string' ? rawMeta.createdAt : now,
      updatedAt: typeof rawMeta.updatedAt === 'string' ? rawMeta.updatedAt : now,
    },
    tileSetVersion:
      typeof source.tileSetVersion === 'string' ? source.tileSetVersion : DEFAULT_TILE_SET_VERSION,
  };
}
