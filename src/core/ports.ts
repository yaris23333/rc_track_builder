import type { PlacedTile, Port, PortDir, Pt, Side, TileDef, TrackDoc, WorldPort } from '../types';

const SIDE_NORMAL: Record<Side, Pt> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};

/** Port position in the tile's local, unrotated coordinate system. */
export function portLocalPoint(def: TileDef, port: Port): Pt {
  const offset = port.offset ?? 0.5;
  switch (port.side) {
    case 'n':
      return { x: offset * def.sizeM.w, y: 0 };
    case 'e':
      return { x: def.sizeM.w, y: offset * def.sizeM.h };
    case 's':
      return { x: offset * def.sizeM.w, y: def.sizeM.h };
    case 'w':
    default:
      return { x: 0, y: offset * def.sizeM.h };
  }
}

function rotateVector(x: number, y: number, deg: number): Pt {
  const rad = (deg * Math.PI) / 180;
  return {
    x: x * Math.cos(rad) - y * Math.sin(rad),
    y: x * Math.sin(rad) + y * Math.cos(rad),
  };
}

/**
 * Local -> world transform. Must stay in sync with the renderer/DXF:
 * flip inside the tile box, rotate around the tile centre, then translate.
 */
export function transformPoint(def: TileDef, tile: PlacedTile, point: Pt): Pt {
  const px = tile.flipX ? def.sizeM.w - point.x : point.x;
  const py = tile.flipY ? def.sizeM.h - point.y : point.y;
  const cx = def.sizeM.w / 2;
  const cy = def.sizeM.h / 2;
  const rotated = rotateVector(px - cx, py - cy, tile.rotation);
  return { x: tile.xM + cx + rotated.x, y: tile.yM + cy + rotated.y };
}

export function transformNormal(tile: PlacedTile, normal: Pt): Pt {
  const nx = tile.flipX ? -normal.x : normal.x;
  const ny = tile.flipY ? -normal.y : normal.y;
  return rotateVector(nx, ny, tile.rotation);
}

export function worldPortsFor(def: TileDef, tile: PlacedTile): WorldPort[] {
  const ports = def.ports ?? [];
  return ports.map((port) => {
    const offset = port.offset ?? 0.5;
    const dir: PortDir = port.dir ?? 'both';
    return {
      key: `${tile.uid}:${port.id}`,
      uid: tile.uid,
      defId: def.id,
      portId: port.id,
      side: port.side,
      offset,
      dir,
      laneWidth: port.laneWidth ?? 1.5,
      point: transformPoint(def, tile, portLocalPoint(def, port)),
      normal: transformNormal(tile, SIDE_NORMAL[port.side]),
    };
  });
}

export function buildWorldPorts(doc: TrackDoc, defs: Map<string, TileDef>): WorldPort[] {
  const ports: WorldPort[] = [];
  for (const tile of doc.tiles) {
    const def = defs.get(tile.defId);
    if (!def) continue;
    ports.push(...worldPortsFor(def, tile));
  }
  return ports;
}
