import { describe, expect, it } from 'vitest';
import type { Board, PlacedTile } from './types';
import {
  boardCells,
  canPlace,
  createSampleDoc,
  isMultiple,
  nearestValidMeters,
  validateDoc,
} from './geometry';
import { TILE_BY_ID } from './tiles';

const board: Board = { cellSize: 1, widthM: 30, heightM: 18 };

function tile(uid: string, xM: number, yM: number): PlacedTile {
  return {
    uid,
    defId: 'straight',
    xM,
    yM,
    rotation: 0,
    flipX: false,
    flipY: false,
    layer: 0,
  };
}

describe('strict physical grid', () => {
  it('accepts only integer multiples of the cell size', () => {
    expect(isMultiple(30, 0.3)).toBe(true);
    expect(isMultiple(18, 0.3)).toBe(true);
    expect(isMultiple(30.1, 0.3)).toBe(false);
    expect(isMultiple(20, 0.3)).toBe(false);
    expect(isMultiple(20, 0.5)).toBe(true);
    expect(isMultiple(30, 1)).toBe(true);
  });

  it('derives board cells from physical size', () => {
    expect(boardCells({ cellSize: 0.3, widthM: 30, heightM: 18 })).toEqual({ cols: 100, rows: 60 });
    expect(boardCells({ cellSize: 0.5, widthM: 30, heightM: 18 })).toEqual({ cols: 60, rows: 36 });
    expect(boardCells({ cellSize: 1, widthM: 30, heightM: 18 })).toEqual({ cols: 30, rows: 18 });
  });

  it('reports the nearest legal values', () => {
    expect(nearestValidMeters(30.1, 1)).toMatchObject({ lower: 30, upper: 31, nearest: 30 });
    expect(nearestValidMeters(19, 0.3)).toMatchObject({ lower: 18.9, upper: 19.2, nearest: 18.9 });
  });
});

describe('placement', () => {
  const def = TILE_BY_ID.get('straight')!;

  it('allows an empty cell and rejects overlap', () => {
    expect(canPlace(board, [], def, 3, 3, 0, TILE_BY_ID)).toBe(true);
    const existing = tile('a', 3, 3);
    expect(canPlace(board, [existing], def, 3, 3, 0, TILE_BY_ID)).toBe(false);
    expect(canPlace(board, [existing], def, 6, 3, 0, TILE_BY_ID)).toBe(true);
  });

  it('rejects tiles outside the board', () => {
    expect(canPlace(board, [], def, 28, 3, 0, TILE_BY_ID)).toBe(false);
    expect(canPlace(board, [], def, 3, 16, 0, TILE_BY_ID)).toBe(false);
  });

  it('ignores selected tiles while moving', () => {
    const existing = tile('a', 3, 3);
    expect(canPlace(board, [existing], def, 6, 3, 0, TILE_BY_ID, new Set(['a']))).toBe(true);
  });
});

describe('document validation', () => {
  it('accepts the sample document at every supported grid size', () => {
    for (const cellSize of [0.3, 0.5, 1] as const) {
      const sample = createSampleDoc(cellSize);
      expect(validateDoc(sample, TILE_BY_ID)).not.toBeNull();
      expect(validateDoc(sample, TILE_BY_ID)?.tiles.length).toBe(22);
    }
  });

  it('rejects a board whose edge is not an integer multiple', () => {
    const sample = createSampleDoc(1);
    const bad = { ...sample, board: { ...sample.board, widthM: 30.1 } };
    expect(validateDoc(bad, TILE_BY_ID)).toBeNull();
  });

  it('rejects overlapping imported tiles', () => {
    const sample = createSampleDoc(1);
    const duplicate = { ...sample.tiles[0], uid: 'duplicate' };
    const bad = { ...sample, tiles: [...sample.tiles, duplicate] };
    expect(validateDoc(bad, TILE_BY_ID)).toBeNull();
  });
});
