import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlacedTile, ValidationResult } from '../types';
import {
  canPlace,
  clamp,
  isMultiple,
  snap,
  tileBounds,
} from '../model/geometry';
import { getTileDef, TILE_BY_ID } from '../model/tiles';
import { useStore } from '../store/useStore';
import { isTypingTarget } from '../utils/dom';
import { TileArt } from './TileArt';
import { Icon } from './Icons';

const PPM = 60;
const MIN_ZOOM = 0.04;
const MAX_ZOOM = 8;

interface DragState {
  active: boolean;
  dx: number;
  dy: number;
  valid: boolean;
}

const IDLE_DRAG: DragState = { active: false, dx: 0, dy: 0, valid: true };

function niceScale(pxPerMeter: number): number {
  const target = 110 / pxPerMeter;
  const steps = [0.5, 1, 2, 5, 10, 20, 50, 100];
  return steps.find((step) => step >= target) ?? 100;
}

export function Canvas({ validation }: { validation: ValidationResult }) {
  const doc = useStore((state) => state.doc);
  const viewport = useStore((state) => state.viewport);
  const selected = useStore((state) => state.selected);
  const brush = useStore((state) => state.brush);
  const readOnly = useStore((state) => state.readOnly);
  const fitNonce = useStore((state) => state.fitNonce);
  const setViewport = useStore((state) => state.setViewport);
  const setSelected = useStore((state) => state.setSelected);
  const clearSelection = useStore((state) => state.clearSelection);
  const addTile = useStore((state) => state.addTile);
  const moveSelectedBy = useStore((state) => state.moveSelectedBy);
  const showToast = useStore((state) => state.showToast);
  const requestFit = useStore((state) => state.requestFit);
  const loadSample = useStore((state) => state.loadSample);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<DragState>(IDLE_DRAG);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const spaceRef = useRef(false);
  const suppressClickRef = useRef(false);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const tileDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startBoardX: number;
    startBoardY: number;
    uids: string[];
    started: boolean;
  } | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const gapSet = useMemo(() => new Set(validation.gaps.map((port) => port.key)), [validation.gaps]);
  const selectedPorts = useMemo(
    () => validation.ports.filter((port) => selectedSet.has(port.uid)),
    [selectedSet, validation.ports],
  );

  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w < 10 || h < 10) return;
    const pad = Math.min(64, Math.max(28, w * 0.045));
    const boardW = doc.board.widthM * PPM;
    const boardH = doc.board.heightM * PPM;
    const zoom = clamp(Math.min((w - pad * 2) / boardW, (h - pad * 2) / boardH), MIN_ZOOM, 2.5);
    setViewport({
      zoom,
      panX: (w - boardW * zoom) / 2,
      panY: (h - boardH * zoom) / 2,
    });
  }, [doc.board.widthM, doc.board.heightM, setViewport]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setSize({ w: Math.max(1, rect.width), h: Math.max(1, rect.height) });
    });
    observer.observe(el);
    setSize({ w: Math.max(1, el.clientWidth), h: Math.max(1, el.clientHeight) });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fit();
  }, [fit, fitNonce, size.w, size.h]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const vp = viewportRef.current;
      const factor = Math.exp(-event.deltaY * 0.0015);
      const nextZoom = clamp(vp.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const ratio = nextZoom / vp.zoom;
      setViewport({
        zoom: nextZoom,
        panX: mx - (mx - vp.panX) * ratio,
        panY: my - (my - vp.panY) * ratio,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setViewport]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isTypingTarget(event.target)) return;
      event.preventDefault();
      spaceRef.current = true;
      setSpaceDown(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      spaceRef.current = false;
      setSpaceDown(false);
    };
    const blur = () => {
      spaceRef.current = false;
      setSpaceDown(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const clientToBoard = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const vp = viewportRef.current;
    return {
      x: (clientX - rect.left - vp.panX) / (vp.zoom * PPM),
      y: (clientY - rect.top - vp.panY) / (vp.zoom * PPM),
    };
  }, []);

  const { minorPath, majorPath } = useMemo(() => {
    const cell = doc.board.cellSize;
    const cols = Math.round(doc.board.widthM / cell);
    const rows = Math.round(doc.board.heightM / cell);
    const minor: string[] = [];
    const major: string[] = [];
    for (let i = 0; i <= cols; i += 1) {
      const x = i * cell;
      const command = `M ${x} 0 V ${doc.board.heightM}`;
      if (i % 5 === 0) major.push(command);
      else minor.push(command);
    }
    for (let j = 0; j <= rows; j += 1) {
      const y = j * cell;
      const command = `M 0 ${y} H ${doc.board.widthM}`;
      if (j % 5 === 0) major.push(command);
      else minor.push(command);
    }
    return { minorPath: minor.join(' '), majorPath: major.join(' ') };
  }, [doc.board]);

  const ghost = useMemo(() => {
    if (!brush || !cursor || readOnly) return null;
    const def = getTileDef(brush);
    if (!def) return null;
    if (
      cursor.x < 0 ||
      cursor.y < 0 ||
      cursor.x > doc.board.widthM ||
      cursor.y > doc.board.heightM
    ) {
      return null;
    }
    const x = clamp(snap(cursor.x, doc.board.cellSize), 0, doc.board.widthM - def.sizeM.w);
    const y = clamp(snap(cursor.y, doc.board.cellSize), 0, doc.board.heightM - def.sizeM.h);
    const valid = canPlace(doc.board, doc.tiles, def, x, y, 0, TILE_BY_ID);
    return { def, x, y, valid };
  }, [brush, cursor, doc.board, doc.tiles, readOnly]);

  const handleTilePointerDown = (event: React.PointerEvent<SVGGElement>, tile: PlacedTile) => {
    if (event.button !== 0 || readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = true;
    containerRef.current?.setPointerCapture(event.pointerId);

    let uids = selected;
    if (event.shiftKey) {
      if (selected.includes(tile.uid)) {
        setSelected(selected.filter((id) => id !== tile.uid));
        return;
      }
      uids = [...selected, tile.uid];
      setSelected(uids);
    } else if (!selected.includes(tile.uid)) {
      uids = [tile.uid];
      setSelected(uids);
    }

    const point = clientToBoard(event.clientX, event.clientY);
    tileDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startBoardX: point.x,
      startBoardY: point.y,
      uids,
      started: false,
    };
    setDrag({ active: true, dx: 0, dy: 0, valid: true });
  };

  const handleBackgroundPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button === 1 || (event.button === 0 && spaceRef.current)) {
      event.preventDefault();
      suppressClickRef.current = true;
      containerRef.current?.setPointerCapture(event.pointerId);
      panRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: viewport.panX,
        panY: viewport.panY,
      };
      setIsPanning(true);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = clientToBoard(event.clientX, event.clientY);
    setCursor(point);

    if (panRef.current) {
      const pan = panRef.current;
      setViewport({
        ...viewportRef.current,
        panX: pan.panX + event.clientX - pan.startX,
        panY: pan.panY + event.clientY - pan.startY,
      });
      return;
    }

    const tileDrag = tileDragRef.current;
    if (!tileDrag) return;
    const movedPx = Math.hypot(event.clientX - tileDrag.startX, event.clientY - tileDrag.startY);
    if (movedPx > 4) tileDrag.started = true;
    const dx = snap(point.x - tileDrag.startBoardX, doc.board.cellSize);
    const dy = snap(point.y - tileDrag.startBoardY, doc.board.cellSize);

    const ignore = new Set(tileDrag.uids);
    let valid = true;
    for (const uid of tileDrag.uids) {
      const tile = doc.tiles.find((item) => item.uid === uid);
      if (!tile) {
        valid = false;
        break;
      }
      const def = TILE_BY_ID.get(tile.defId);
      if (!def) {
        valid = false;
        break;
      }
      if (
        !canPlace(
          doc.board,
          doc.tiles,
          def,
          tile.xM + dx,
          tile.yM + dy,
          tile.rotation,
          TILE_BY_ID,
          ignore,
        )
      ) {
        valid = false;
        break;
      }
    }
    setDrag({ active: true, dx, dy, valid });
  };

  const finishInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panRef.current) {
      panRef.current = null;
      setIsPanning(false);
      containerRef.current?.releasePointerCapture(event.pointerId);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 60);
    }

    const tileDrag = tileDragRef.current;
    if (tileDrag) {
      const moved = tileDrag.started && (drag.dx !== 0 || drag.dy !== 0);
      if (moved) {
        if (drag.valid) {
          const ok = moveSelectedBy(drag.dx, drag.dy);
          if (!ok) showToast('移动位置不可用', 'error');
        } else {
          showToast('目标位置会超出画布或与其它瓦片重叠', 'error');
        }
      }
      tileDragRef.current = null;
      setDrag(IDLE_DRAG);
      containerRef.current?.releasePointerCapture(event.pointerId);
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 60);
    } else {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 60);
    }
  };

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (suppressClickRef.current) return;
    if (readOnly) return;
    if (brush && ghost) {
      if (ghost.valid) {
        if (addTile(ghost.def.id, ghost.x, ghost.y)) setCursor(null);
      } else {
        showToast('这里放不下：超出画布或与已有瓦片重叠', 'error');
      }
      return;
    }
    if (event.target === event.currentTarget) {
      clearSelection();
    }
  };

  const handlePointerLeave = () => {
    if (!panRef.current && !tileDragRef.current) setCursor(null);
    setHoverId(null);
  };

  const pxPerMeter = PPM * viewport.zoom;
  const scaleMeters = niceScale(pxPerMeter);
  const cursorCell = cursor
    ? {
        col: Math.floor(cursor.x / doc.board.cellSize) + 1,
        row: Math.floor(cursor.y / doc.board.cellSize) + 1,
      }
    : null;

  return (
    <div
      ref={containerRef}
      className={`canvas-shell ${spaceDown || isPanning ? 'is-panning' : ''} ${
        brush ? 'has-brush' : ''
      }`}
      onPointerMove={handlePointerMove}
      onPointerUp={finishInteraction}
      onPointerLeave={handlePointerLeave}
    >
      <svg
        ref={svgRef}
        className="canvas-svg"
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        onPointerDown={handleBackgroundPointerDown}
        onClick={handleClick}
      >
        <defs>
          <filter id="board-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="0.16" stdDeviation="0.22" floodColor="#0b1220" floodOpacity="0.35" />
          </filter>
        </defs>
        <g transform={`translate(${viewport.panX} ${viewport.panY}) scale(${viewport.zoom * PPM})`}>
          <rect
            x={0}
            y={0}
            width={doc.board.widthM}
            height={doc.board.heightM}
            rx={0.04}
            fill="#ffffff"
            filter="url(#board-shadow)"
          />
          <path d={minorPath} fill="none" stroke="#e2e8f0" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <path d={majorPath} fill="none" stroke="#c7d2df" strokeWidth={1.35} vectorEffect="non-scaling-stroke" />

          {doc.tiles.map((tile) => {
            const def = TILE_BY_ID.get(tile.defId);
            if (!def) return null;
            const isSelected = selectedSet.has(tile.uid);
            const isDragged = drag.active && isSelected;
            const offsetX = isDragged ? drag.dx : 0;
            const offsetY = isDragged ? drag.dy : 0;
            const bounds = tileBounds(
              { ...tile, xM: tile.xM + offsetX, yM: tile.yM + offsetY },
              def,
            );
            return (
              <g
                key={tile.uid}
                onPointerDown={(event) => handleTilePointerDown(event, tile)}
                onClick={(event) => event.stopPropagation()}
                onPointerEnter={() => setHoverId(tile.uid)}
                onPointerLeave={() => setHoverId((current) => (current === tile.uid ? null : current))}
                style={{ cursor: readOnly ? 'default' : isDragged ? 'grabbing' : 'grab' }}
              >
                <rect
                  x={bounds.x}
                  y={bounds.y}
                  width={bounds.w}
                  height={bounds.h}
                  fill="transparent"
                  pointerEvents="all"
                />
                <TileArt
                  def={def}
                  xM={tile.xM + offsetX}
                  yM={tile.yM + offsetY}
                  rotation={tile.rotation}
                  flipX={tile.flipX}
                  flipY={tile.flipY}
                  opacity={isDragged && !drag.valid ? 0.55 : 1}
                />
                {isSelected ? (
                  <rect
                    x={bounds.x - 0.03}
                    y={bounds.y - 0.03}
                    width={bounds.w + 0.06}
                    height={bounds.h + 0.06}
                    rx={0.06}
                    fill="none"
                    stroke={drag.active && !drag.valid ? '#ef4444' : '#ff7a45'}
                    strokeWidth={2}
                    strokeDasharray={drag.active && !drag.valid ? '5 4' : undefined}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                ) : hoverId === tile.uid ? (
                  <rect
                    x={bounds.x - 0.02}
                    y={bounds.y - 0.02}
                    width={bounds.w + 0.04}
                    height={bounds.h + 0.04}
                    rx={0.05}
                    fill="none"
                    stroke="rgba(255,122,69,0.5)"
                    strokeWidth={1.4}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                ) : null}
              </g>
            );
          })}

          {!drag.active
            ? validation.gaps.map((gap) => (
                <g
                  key={gap.key}
                  className="port-gap"
                  transform={`translate(${gap.point.x} ${gap.point.y})`}
                  pointerEvents="none"
                >
                  <circle r={0.18} className="port-gap-halo" />
                  <circle r={0.075} className="port-gap-dot" />
                </g>
              ))
            : null}

          {selectedPorts
            .filter((port) => !gapSet.has(port.key))
            .map((port) => (
              <circle
                key={`selected-${port.key}`}
                cx={port.point.x}
                cy={port.point.y}
                r={0.07}
                className="port-dot"
                pointerEvents="none"
              />
            ))}

          {ghost ? (
            <g pointerEvents="none">
              <TileArt
                def={ghost.def}
                xM={ghost.x}
                yM={ghost.y}
                rotation={0}
                flipX={false}
                flipY={false}
                ghost={ghost.valid ? 'valid' : 'invalid'}
                opacity={0.9}
              />
              <rect
                x={ghost.x - 0.03}
                y={ghost.y - 0.03}
                width={ghost.def.sizeM.w + 0.06}
                height={ghost.def.sizeM.h + 0.06}
                rx={0.06}
                fill="none"
                stroke={ghost.valid ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                strokeDasharray={ghost.valid ? undefined : '5 4'}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ) : null}

          <rect
            x={0}
            y={0}
            width={doc.board.widthM}
            height={doc.board.heightM}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        </g>
      </svg>

      <div className="canvas-topline">
        <div className="canvas-chip">
          <span className="dot" />
          {doc.board.widthM} × {doc.board.heightM} m
          <span className="sep">·</span>
          {Math.round(doc.board.widthM / doc.board.cellSize)} ×{' '}
          {Math.round(doc.board.heightM / doc.board.cellSize)} 格
          <span className="sep">·</span>
          {doc.board.cellSize} m 网格
          {isMultiple(doc.board.widthM, doc.board.cellSize) ? null : (
            <span className="chip-error">
              <Icon name="alert" size={13} /> 非整数倍
            </span>
          )}
        </div>
      </div>

      {doc.tiles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-card">
            <div className="empty-icon">
              <Icon name="track" size={28} />
            </div>
            <h2>开始设计你的赛道</h2>
            <p>从左侧选择一块瓦片，点击画布放置。所有瓦片都是 3 × 3 m 模块。</p>
            <div className="empty-actions">
              {!readOnly ? (
                <button className="btn btn-primary" onClick={loadSample}>
                  <Icon name="sparkles" size={16} /> 载入示例
                </button>
              ) : null}
              <button className="btn" onClick={requestFit}>
                <Icon name="fit" size={16} /> 适配画布
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {readOnly ? (
        <div className="readonly-banner">
          <Icon name="info" size={15} />
          正在预览分享的赛道 · 只读
        </div>
      ) : null}

      <div className="canvas-bottomline">
        <div className="scale-bar">
          <div className="scale-line" style={{ width: Math.max(28, scaleMeters * pxPerMeter) }} />
          <span>{scaleMeters} m</span>
        </div>
        <div className="canvas-hint">
          {cursor && cursorCell ? (
            <>
              <span>
                X {cursor.x.toFixed(2)} m · Y {cursor.y.toFixed(2)} m
              </span>
              <span className="sep">·</span>
              <span>
                格 {cursorCell.col}, {cursorCell.row}
              </span>
            </>
          ) : (
            <>
              <span>空格 + 拖动平移</span>
              <span className="sep">·</span>
              <span>滚轮缩放</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
