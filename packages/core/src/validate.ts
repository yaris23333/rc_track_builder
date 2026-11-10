import type {
  Issue,
  IssueCode,
  IssueSeverity,
  PlacedTile,
  TileDef,
  TrackDoc,
  ValidationResult,
  WorldPort,
} from './types';
import { isInsideBoard, rectsOverlap, tileBounds } from './geometry';
import { TILE_BY_ID } from './tiles';
import { buildWorldPorts } from './ports';

const CONNECT_EPS = 2e-6;
const NORMAL_DOT = -0.999;

function issue(
  code: IssueCode,
  severity: IssueSeverity,
  message: string,
  extra: Partial<Issue> = {},
): Issue {
  return { code, severity, message, ...extra };
}

function portBucket(port: WorldPort): string {
  const x = Math.round(port.point.x * 1e6);
  const y = Math.round(port.point.y * 1e6);
  return `${x}:${y}`;
}

class UnionFind {
  private parent = new Map<string, string>();

  add(id: string): void {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    let root = id;
    while (this.parent.get(root) !== root) root = this.parent.get(root) as string;
    let cursor = id;
    while (this.parent.get(cursor) !== cursor) {
      const next = this.parent.get(cursor) as string;
      this.parent.set(cursor, root);
      cursor = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }
}

/**
 * Validates a track document: geometry, overlaps, port connectivity and
 * whether the tiles form one closed loop.
 *
 * Deterministic: the same document always yields the same issue order.
 */
export function validateTrack(doc: TrackDoc, defs: Map<string, TileDef> = TILE_BY_ID): ValidationResult {
  const issues: Issue[] = [];
  const tiles = doc.tiles;
  const known: Array<{ tile: PlacedTile; def: TileDef }> = [];
  const seenUids = new Set<string>();

  for (const tile of tiles) {
    if (seenUids.has(tile.uid)) {
      issues.push(
        issue('DUPLICATE_UID', 'error', `瓦片 uid 重复：${tile.uid}`, {
          uid: tile.uid,
          hint: '重新导入或删除重复瓦片',
        }),
      );
      continue;
    }
    seenUids.add(tile.uid);

    const def = defs.get(tile.defId);
    if (!def) {
      issues.push(
        issue('UNKNOWN_DEF', 'error', `未知瓦片类型：${tile.defId}`, {
          uid: tile.uid,
          hint: '检查 defId 或更新瓦片库',
        }),
      );
      continue;
    }

    known.push({ tile, def });

    const bounds = tileBounds(tile, def);
    if (!isInsideBoard(bounds, doc.board)) {
      issues.push(
        issue('OUT_OF_BOARD', 'error', `瓦片超出画布：${def.name}`, {
          uid: tile.uid,
          at: { x: bounds.x, y: bounds.y },
          hint: '移动瓦片或扩大画布',
        }),
      );
    }

    if (!def.ports || def.ports.length === 0) {
      issues.push(
        issue('NO_PORTS', 'warning', `瓦片没有端口定义：${def.name}`, {
          uid: tile.uid,
          hint: '补端口后才会参与连通校验',
        }),
      );
    }
  }

  // Pairwise overlap. Tiles are few (hundreds), so the simple sweep is fine
  // and keeps the result independent of insertion order.
  for (let i = 0; i < known.length; i += 1) {
    const a = tileBounds(known[i].tile, known[i].def);
    for (let j = i + 1; j < known.length; j += 1) {
      const b = tileBounds(known[j].tile, known[j].def);
      if (rectsOverlap(a, b)) {
        issues.push(
          issue('TILE_OVERLAP', 'error', `瓦片重叠：${known[i].def.name} / ${known[j].def.name}`, {
            uid: known[i].tile.uid,
            at: { x: a.x, y: a.y },
            hint: '移动其中一块瓦片',
          }),
        );
      }
    }
  }

  const ports = buildWorldPorts(doc, defs);
  const buckets = new Map<string, WorldPort[]>();
  for (const port of ports) {
    const key = portBucket(port);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(port);
    else buckets.set(key, [port]);
  }

  const connected = new Set<string>();
  const degree = new Map<string, number>();
  for (const { tile } of known) degree.set(tile.uid, 0);

  const uf = new UnionFind();
  for (const { tile } of known) uf.add(tile.uid);

  let connections = 0;
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    for (let i = 0; i < bucket.length; i += 1) {
      for (let j = i + 1; j < bucket.length; j += 1) {
        const a = bucket[i];
        const b = bucket[j];
        const distance = Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y);
        if (distance > CONNECT_EPS) continue;
        const dot = a.normal.x * b.normal.x + a.normal.y * b.normal.y;

        if (dot > NORMAL_DOT) {
          issues.push(
            issue('PORT_MISMATCH', 'error', '两个端口重合但朝向不一致', {
              uid: a.uid,
              portId: a.portId,
              at: a.point,
              hint: '旋转或更换其中一块瓦片',
            }),
          );
          continue;
        }
        if (connected.has(a.key) || connected.has(b.key)) continue;

        connected.add(a.key);
        connected.add(b.key);
        connections += 1;
        degree.set(a.uid, (degree.get(a.uid) ?? 0) + 1);
        degree.set(b.uid, (degree.get(b.uid) ?? 0) + 1);
        uf.union(a.uid, b.uid);
      }
    }
  }

  const gaps = ports.filter((port) => !connected.has(port.key));
  for (const gap of gaps) {
    issues.push(
      issue('PORT_GAP', 'error', `端口未连接：${gap.defId}.${gap.portId}`, {
        uid: gap.uid,
        portId: gap.portId,
        at: gap.point,
        hint: '在断点处补一块可连接的瓦片',
      }),
    );
  }

  const components = new Set(known.map(({ tile }) => uf.find(tile.uid))).size;
  const everyTileHasTwo = known.every(({ tile }) => (degree.get(tile.uid) ?? 0) === 2);
  const structuralError = issues.some(
    (item) =>
      item.severity === 'error' &&
      item.code !== 'PORT_GAP' &&
      item.code !== 'NOT_CLOSED',
  );
  const closed =
    tiles.length > 0 &&
    known.length === tiles.length &&
    gaps.length === 0 &&
    everyTileHasTwo &&
    components === 1 &&
    !structuralError;

  if (tiles.length > 0 && !closed) {
    const reasons: string[] = [];
    if (gaps.length > 0) reasons.push(`${gaps.length} 个端口未连接`);
    if (!everyTileHasTwo) reasons.push('存在连接数不为 2 的瓦片');
    if (components > 1) reasons.push(`分成 ${components} 段`);
    issues.push(
      issue('NOT_CLOSED', 'error', `赛道未闭合${reasons.length ? `：${reasons.join('，')}` : ''}`, {
        hint: '从断点开始补齐，直到每块瓦片都恰好连接两次',
      }),
    );
  }

  if (tiles.length > 0 && !tiles.some((tile) => tile.defId === 'start_finish')) {
    issues.push(
      issue('NO_START', 'warning', '缺少起终点瓦片', {
        hint: '加入一块起终点瓦片，方便现场定位',
      }),
    );
  }

  const severityRank: Record<IssueSeverity, number> = { error: 0, warning: 1 };
  issues.sort((a, b) => {
    const bySeverity = severityRank[a.severity] - severityRank[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const byCode = a.code.localeCompare(b.code);
    if (byCode !== 0) return byCode;
    const byUid = (a.uid ?? '').localeCompare(b.uid ?? '');
    if (byUid !== 0) return byUid;
    return (a.at?.x ?? 0) - (b.at?.x ?? 0) || (a.at?.y ?? 0) - (b.at?.y ?? 0);
  });

  return {
    closed,
    issues,
    stats: { tiles: tiles.length, connections, gaps: gaps.length, components },
    ports,
    gaps,
  };
}
