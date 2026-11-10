import { create } from 'zustand';
import type { Board, PlacedTile, Rot, TrackDoc, Viewport } from '@rctrack/core';
import {
  canPlace,
  createEmptyDoc,
  createSampleDoc,
  isMultiple,
  nowISO,
  roundM,
  tilesOutsideBoard,
  uid,
} from '@rctrack/core';
import { getTileDef, TILE_BY_ID } from '@rctrack/core';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

interface StoreState {
  doc: TrackDoc;
  past: TrackDoc[];
  future: TrackDoc[];
  selected: string[];
  brush: string | null;
  readOnly: boolean;
  /** 首次环境初始化（本地草稿 / 分享载荷）是否完成，完成前不触发自动保存。 */
  booted: boolean;
  viewport: Viewport;
  fitNonce: number;
  toast: ToastMessage | null;
  startupNotice: string | null;

  setName: (name: string) => void;
  setBrush: (id: string | null) => void;
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  addTile: (defId: string, xM: number, yM: number) => boolean;
  moveSelectedBy: (dx: number, dy: number) => boolean;
  rotateSelected: (direction?: 1 | -1) => void;
  flipSelected: (axis: 'x' | 'y') => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  clearBoard: () => void;
  setBoard: (board: Board) => { ok: boolean; removed: number; message?: string };
  loadDoc: (doc: TrackDoc, readOnly?: boolean) => void;
  /** 由路由 clientLoader 调用：注入首屏文档，重置历史与选择。 */
  bootstrap: (doc: TrackDoc, options?: { readOnly?: boolean; notice?: string | null }) => void;
  loadSample: () => void;
  newDoc: () => void;
  adoptShare: () => void;
  undo: () => void;
  redo: () => void;
  setViewport: (viewport: Viewport) => void;
  requestFit: () => void;
  showToast: (message: string, tone?: ToastTone) => void;
  clearToast: () => void;
}

function filterSelection(ids: string[], doc: TrackDoc): string[] {
  const alive = new Set(doc.tiles.map((tile) => tile.uid));
  return ids.filter((id) => alive.has(id));
}

function withUpdatedAt(doc: TrackDoc): TrackDoc {
  return { ...doc, meta: { ...doc.meta, updatedAt: nowISO() } };
}


export const useStore = create<StoreState>((set, get) => ({
  // 初始值必须与浏览器环境无关：SPA 模式在构建期也会求值一次模块（预渲染 index.html）。
  doc: createEmptyDoc(),
  past: [],
  future: [],
  selected: [],
  brush: null,
  readOnly: false,
  booted: false,
  viewport: { zoom: 1, panX: 0, panY: 0 },
  fitNonce: 0,
  toast: null,
  startupNotice: null,

  setName: (name) => {
    const clean = name.slice(0, 80);
    set((state) => ({ doc: { ...state.doc, name: clean } }));
  },

  setBrush: (id) => set({ brush: id }),

  setSelected: (ids) => set({ selected: ids }),

  toggleSelected: (id) =>
    set((state) => ({
      selected: state.selected.includes(id)
        ? state.selected.filter((item) => item !== id)
        : [...state.selected, id],
    })),

  clearSelection: () => set({ selected: [] }),

  addTile: (defId, xM, yM) => {
    const state = get();
    if (state.readOnly) return false;
    const def = getTileDef(defId);
    if (!def) return false;
    if (!canPlace(state.doc.board, state.doc.tiles, def, xM, yM, 0, TILE_BY_ID)) {
      state.showToast('这里放不下：超出画布或与已有瓦片重叠', 'error');
      return false;
    }
    const tile: PlacedTile = {
      uid: uid(),
      defId,
      xM: roundM(xM),
      yM: roundM(yM),
      rotation: 0,
      flipX: false,
      flipY: false,
      layer: 0,
    };
    const next = withUpdatedAt({ ...state.doc, tiles: [...state.doc.tiles, tile] });
    set({
      doc: next,
      past: [...state.past, state.doc].slice(-80),
      future: [],
      selected: [tile.uid],
    });
    return true;
  },

  moveSelectedBy: (dx, dy) => {
    const state = get();
    if (state.readOnly || state.selected.length === 0) return false;
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return false;
    const selected = new Set(state.selected);
    const moved = state.doc.tiles.map((tile) =>
      selected.has(tile.uid)
        ? { ...tile, xM: roundM(tile.xM + dx), yM: roundM(tile.yM + dy) }
        : tile,
    );
    for (const tile of moved) {
      if (!selected.has(tile.uid)) continue;
      const def = TILE_BY_ID.get(tile.defId);
      if (!def) return false;
      if (!canPlace(state.doc.board, moved, def, tile.xM, tile.yM, tile.rotation, TILE_BY_ID, selected)) {
        return false;
      }
    }
    set({
      doc: withUpdatedAt({ ...state.doc, tiles: moved }),
      past: [...state.past, state.doc].slice(-80),
      future: [],
    });
    return true;
  },

  rotateSelected: (direction = 1) => {
    const state = get();
    if (state.readOnly || state.selected.length === 0) return;
    const selected = new Set(state.selected);
    const nextTiles = state.doc.tiles.map((tile) => {
      if (!selected.has(tile.uid)) return tile;
      const rotation = (((tile.rotation + direction * 90) % 360) + 360) % 360;
      return { ...tile, rotation: rotation as Rot };
    });
    for (const tile of nextTiles) {
      if (!selected.has(tile.uid)) continue;
      const def = TILE_BY_ID.get(tile.defId);
      if (!def) return;
      if (!canPlace(state.doc.board, nextTiles, def, tile.xM, tile.yM, tile.rotation, TILE_BY_ID, selected)) {
        state.showToast('旋转后会超出画布或与其它瓦片重叠', 'error');
        return;
      }
    }
    set({
      doc: withUpdatedAt({ ...state.doc, tiles: nextTiles }),
      past: [...state.past, state.doc].slice(-80),
      future: [],
    });
  },

  flipSelected: (axis) => {
    const state = get();
    if (state.readOnly || state.selected.length === 0) return;
    const selected = new Set(state.selected);
    const nextTiles = state.doc.tiles.map((tile) =>
      selected.has(tile.uid)
        ? { ...tile, [axis === 'x' ? 'flipX' : 'flipY']: !tile[axis === 'x' ? 'flipX' : 'flipY'] }
        : tile,
    );
    set({
      doc: withUpdatedAt({ ...state.doc, tiles: nextTiles }),
      past: [...state.past, state.doc].slice(-80),
      future: [],
    });
  },

  deleteSelected: () => {
    const state = get();
    if (state.readOnly || state.selected.length === 0) return;
    const selected = new Set(state.selected);
    const tiles = state.doc.tiles.filter((tile) => !selected.has(tile.uid));
    if (tiles.length === state.doc.tiles.length) return;
    set({
      doc: withUpdatedAt({ ...state.doc, tiles }),
      past: [...state.past, state.doc].slice(-80),
      future: [],
      selected: [],
    });
  },

  duplicateSelected: () => {
    const state = get();
    if (state.readOnly || state.selected.length === 0) return;
    const selected = new Set(state.selected);
    const source = state.doc.tiles.filter((tile) => selected.has(tile.uid));
    const offset = state.doc.board.cellSize;
    let placed: PlacedTile[] | null = null;
    let dx = offset;
    let dy = offset;
    for (let attempt = 0; attempt < 8 && !placed; attempt += 1) {
      dx = offset * (attempt + 1);
      dy = offset * (attempt + 1);
      const candidates = source.map((tile) => ({
        ...tile,
        uid: uid(),
        xM: roundM(tile.xM + dx),
        yM: roundM(tile.yM + dy),
      }));
      const combined = [...state.doc.tiles, ...candidates];
      const ok = candidates.every((tile) => {
        const def = TILE_BY_ID.get(tile.defId);
        if (!def) return false;
        return canPlace(state.doc.board, combined, def, tile.xM, tile.yM, tile.rotation, TILE_BY_ID);
      });
      if (ok) placed = candidates;
    }
    if (!placed) {
      state.showToast('附近没有空间复制，请先移动或缩小选择', 'error');
      return;
    }
    set({
      doc: withUpdatedAt({ ...state.doc, tiles: [...state.doc.tiles, ...placed] }),
      past: [...state.past, state.doc].slice(-80),
      future: [],
      selected: placed.map((tile) => tile.uid),
    });
  },

  clearBoard: () => {
    const state = get();
    if (state.readOnly || state.doc.tiles.length === 0) return;
    set({
      doc: withUpdatedAt({ ...state.doc, tiles: [] }),
      past: [...state.past, state.doc].slice(-80),
      future: [],
      selected: [],
    });
  },

  setBoard: (board) => {
    const state = get();
    if (state.readOnly) {
      return { ok: false, removed: 0, message: '只读预览不能修改画布，请先复制到本地' };
    }
    if (!isMultiple(board.widthM, board.cellSize) || !isMultiple(board.heightM, board.cellSize)) {
      return { ok: false, removed: 0, message: '画布边长必须是格子边长的整数倍' };
    }
    if (board.widthM <= 0 || board.heightM <= 0) {
      return { ok: false, removed: 0, message: '画布尺寸必须大于 0' };
    }
    const outside = tilesOutsideBoard(board, state.doc.tiles, TILE_BY_ID);
    const outsideSet = new Set(outside.map((tile) => tile.uid));
    const tiles = state.doc.tiles.filter((tile) => !outsideSet.has(tile.uid));
    const next = withUpdatedAt({ ...state.doc, board, tiles });
    set({
      doc: next,
      past: [...state.past, state.doc].slice(-80),
      future: [],
      selected: filterSelection(state.selected, next),
      fitNonce: state.fitNonce + 1,
    });
    return { ok: true, removed: outside.length };
  },

  loadDoc: (doc, readOnly = false) => {
    set({
      doc,
      past: [],
      future: [],
      selected: [],
      brush: null,
      readOnly,
      fitNonce: get().fitNonce + 1,
      toast: null,
    });
  },

  bootstrap: (doc, options = {}) => {
    set((state) => ({
      doc,
      past: [],
      future: [],
      selected: [],
      brush: null,
      readOnly: options.readOnly ?? false,
      booted: true,
      startupNotice: options.notice ?? null,
      fitNonce: state.fitNonce + 1,
      toast: null,
    }));
  },

  loadSample: () => {
    const state = get();
    if (state.readOnly) return;
    const sample = createSampleDoc(state.doc.board.cellSize);
    set({
      doc: sample,
      past: [...state.past, state.doc].slice(-80),
      future: [],
      selected: [],
      brush: null,
      fitNonce: state.fitNonce + 1,
      toast: { id: Date.now(), message: '已载入示例赛道', tone: 'success' },
    });
  },

  newDoc: () => {
    const state = get();
    if (state.readOnly) return;
    const doc = createEmptyDoc();
    set({
      doc,
      past: [...state.past, state.doc].slice(-80),
      future: [],
      selected: [],
      brush: null,
      fitNonce: state.fitNonce + 1,
      toast: { id: Date.now(), message: '已新建空白画布', tone: 'success' },
    });
  },

  adoptShare: () => {
    const state = get();
    if (!state.readOnly) return;
    set({
      readOnly: false,
      past: [],
      future: [],
      toast: { id: Date.now(), message: '已复制到本地画布，可以继续编辑', tone: 'success' },
    });
  },

  undo: () => {
    const state = get();
    if (state.readOnly || state.past.length === 0) return;
    const previous = state.past[state.past.length - 1];
    set({
      doc: previous,
      past: state.past.slice(0, -1),
      future: [state.doc, ...state.future].slice(0, 80),
      selected: filterSelection(state.selected, previous),
    });
  },

  redo: () => {
    const state = get();
    if (state.readOnly || state.future.length === 0) return;
    const next = state.future[0];
    set({
      doc: next,
      past: [...state.past, state.doc].slice(-80),
      future: state.future.slice(1),
      selected: filterSelection(state.selected, next),
    });
  },

  setViewport: (viewport) => set({ viewport }),

  requestFit: () => set((state) => ({ fitNonce: state.fitNonce + 1 })),

  showToast: (message, tone = 'info') =>
    set({ toast: { id: Date.now() + Math.random(), message, tone } }),

  clearToast: () => set({ toast: null }),
}));
