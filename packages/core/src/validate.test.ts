import { describe, expect, it } from 'vitest';
import type { PlacedTile, TileDef, TrackDoc } from './types';
import { createSampleDoc } from './geometry';
import { TILE_BY_ID } from './tiles';
import { worldPortsFor } from './ports';
import { validateTrack } from './validate';

function placed(partial: Partial<PlacedTile> & Pick<PlacedTile, 'uid' | 'xM' | 'yM'>): PlacedTile {
  return {
    defId: 'straight',
    rotation: 0,
    flipX: false,
    flipY: false,
    layer: 0,
    ...partial,
  };
}

describe('port geometry', () => {
  it('puts straight ports on the west and east edges', () => {
    const def = TILE_BY_ID.get('straight')!;
    const ports = worldPortsFor(def, placed({ uid: 'a', xM: 3, yM: 3 }));
    expect(ports.map((port) => port.point)).toEqual([
      { x: 3, y: 4.5 },
      { x: 6, y: 4.5 },
    ]);
    expect(ports.map((port) => port.normal)).toEqual([
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ]);
  });

  it('follows the flip-then-rotate order', () => {
    const def = TILE_BY_ID.get('straight')!;
    const rotated = worldPortsFor(def, placed({ uid: 'b', xM: 3, yM: 3, rotation: 90 }));
    expect(rotated[0].point).toEqual({ x: 4.5, y: 3 });
    expect(rotated[1].point).toEqual({ x: 4.5, y: 6 });

    const flipped = worldPortsFor(def, placed({ uid: 'c', xM: 3, yM: 3, flipX: true }));
    expect(flipped[0].point).toEqual({ x: 6, y: 4.5 });
    expect(flipped[0].normal).toEqual({ x: 1, y: 0 });
  });

  it('maps the 90° curve to its two open edges', () => {
    const def = TILE_BY_ID.get('curve90')!;
    const ports = worldPortsFor(def, placed({ uid: 'd', xM: 3, yM: 3, rotation: 270, defId: 'curve90' }));
    const points = ports.map((port) => port.point);
    expect(points).toContainEqual({ x: 4.5, y: 6 });
    expect(points).toContainEqual({ x: 6, y: 4.5 });
  });
});

describe('track validation', () => {
  it('accepts the sample loop as closed', () => {
    const doc = createSampleDoc(1);
    const result = validateTrack(doc);
    expect(result.closed).toBe(true);
    expect(result.stats.tiles).toBe(22);
    expect(result.stats.connections).toBe(22);
    expect(result.stats.gaps).toBe(0);
    expect(result.issues.filter((item) => item.severity === 'error')).toEqual([]);
  });

  it('reports two gaps and not-closed when a tile is removed', () => {
    const doc = createSampleDoc(1);
    const tiles = doc.tiles.slice(0, -1);
    const result = validateTrack({ ...doc, tiles });
    expect(result.closed).toBe(false);
    expect(result.stats.gaps).toBe(2);
    expect(result.issues.some((item) => item.code === 'PORT_GAP')).toBe(true);
    expect(result.issues.some((item) => item.code === 'NOT_CLOSED')).toBe(true);
  });

  it('reports overlapping tiles', () => {
    const doc = createSampleDoc(1);
    const duplicate: PlacedTile = { ...doc.tiles[0], uid: 'dup' };
    const result = validateTrack({ ...doc, tiles: [...doc.tiles, duplicate] });
    expect(result.closed).toBe(false);
    expect(result.issues.some((item) => item.code === 'TILE_OVERLAP')).toBe(true);
  });

  it('reports tiles outside the board', () => {
    const doc = createSampleDoc(1);
    const tiles = doc.tiles.map((tile, index) =>
      index === 0 ? { ...tile, xM: 28 } : tile,
    );
    const result = validateTrack({ ...doc, tiles });
    expect(result.issues.some((item) => item.code === 'OUT_OF_BOARD')).toBe(true);
  });

  it('reports unknown definitions', () => {
    const doc = createSampleDoc(1);
    const tiles = doc.tiles.map((tile, index) =>
      index === 0 ? { ...tile, defId: 'does_not_exist' } : tile,
    );
    const result = validateTrack({ ...doc, tiles });
    expect(result.issues.some((item) => item.code === 'UNKNOWN_DEF')).toBe(true);
  });

  it('warns when a tile has no ports', () => {
    const def = TILE_BY_ID.get('straight')!;
    const noPorts: TileDef = { ...def, ports: [] };
    const defs = new Map(TILE_BY_ID);
    defs.set('straight', noPorts);
    const doc: TrackDoc = {
      ...createSampleDoc(1),
      tiles: [placed({ uid: 'only', xM: 3, yM: 3 })],
    };
    const result = validateTrack(doc, defs);
    expect(result.issues.some((item) => item.code === 'NO_PORTS')).toBe(true);
  });

  it('is deterministic', () => {
    const doc = createSampleDoc(1);
    expect(JSON.stringify(validateTrack(doc))).toBe(JSON.stringify(validateTrack(doc)));
  });
});
