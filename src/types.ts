export const CELL_SIZES = [0.3, 0.5, 1] as const;
export type CellSize = (typeof CELL_SIZES)[number];

export type Rot = 0 | 90 | 180 | 270;

export type DxfLayer =
  | 'BOARD'
  | 'GRID'
  | 'TILE_OUTLINE'
  | 'TRACK_EDGE'
  | 'TRACK_CENTER'
  | 'FEATURE'
  | 'START_FINISH'
  | 'TEXT';

export interface Pt {
  x: number;
  y: number;
}

export interface LayerStyle {
  stroke: string;
  width: number;
  dash?: string;
  fill?: string;
  linecap?: 'butt' | 'round' | 'square';
}

export interface Board {
  cellSize: CellSize;
  widthM: number;
  heightM: number;
}

export interface PlacedTile {
  uid: string;
  defId: string;
  xM: number;
  yM: number;
  rotation: Rot;
  flipX: boolean;
  flipY: boolean;
  layer: number;
}

export interface TrackDoc {
  schemaVersion: 1;
  name: string;
  board: Board;
  tiles: PlacedTile[];
  meta: {
    author?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
  tileSetVersion: string;
}

export interface TileSize {
  w: number;
  h: number;
}

export type Primitive =
  | { kind: 'line'; a: Pt; b: Pt; layer: DxfLayer }
  | {
      kind: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      layer: DxfLayer;
      fill?: string;
      rx?: number;
    }
  | {
      kind: 'arc';
      center: Pt;
      r: number;
      startDeg: number;
      endDeg: number;
      layer: DxfLayer;
    }
  | { kind: 'circle'; center: Pt; r: number; layer: DxfLayer; fill?: string }
  | {
      kind: 'polyline';
      points: Pt[];
      closed?: boolean;
      layer: DxfLayer;
      fill?: string;
    };

export interface TileDef {
  id: string;
  name: string;
  category: 'base' | 'curve' | 'feature' | 'facility';
  categoryLabel: string;
  description: string;
  sizeM: TileSize;
  primitives: Primitive[];
}

export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface DraftBoard {
  cellSize: CellSize;
  widthM: number;
  heightM: number;
}

export const DEFAULT_BOARD: Board = {
  cellSize: 1,
  widthM: 30,
  heightM: 18,
};

export const DEFAULT_TILE_SET_VERSION = '1.0.0';
