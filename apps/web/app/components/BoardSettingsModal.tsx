import { useEffect, useMemo, useState } from 'react';
import type { CellSize } from '@rctrack/core';
import {
  formatM,
  isMultiple,
  nearestValidMeters,
  roundM,
  tilesOutsideBoard,
} from '@rctrack/core';
import { TILE_BY_ID } from '@rctrack/core';
import { useStore } from '~/store/useStore';
import { Icon } from './Icons';

const CELL_OPTIONS: { value: CellSize; label: string }[] = [
  { value: 0.3, label: '0.3 m' },
  { value: 0.5, label: '0.5 m' },
  { value: 1, label: '1 m' },
];

const PRESETS = [
  { label: '9 × 6', w: 9, h: 6 },
  { label: '18 × 12', w: 18, h: 12 },
  { label: '30 × 18', w: 30, h: 18 },
  { label: '45 × 27', w: 45, h: 27 },
  { label: '60 × 36', w: 60, h: 36 },
];

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanInput(value: number): string {
  return String(roundM(value));
}

export function BoardSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useStore((state) => state.doc);
  const setBoard = useStore((state) => state.setBoard);
  const showToast = useStore((state) => state.showToast);

  const [cellSize, setCellSize] = useState<CellSize>(doc.board.cellSize);
  const [widthInput, setWidthInput] = useState(cleanInput(doc.board.widthM));
  const [heightInput, setHeightInput] = useState(cleanInput(doc.board.heightM));
  const [widthCells, setWidthCells] = useState(String(Math.round(doc.board.widthM / doc.board.cellSize)));
  const [heightCells, setHeightCells] = useState(String(Math.round(doc.board.heightM / doc.board.cellSize)));
  const [widthCellsError, setWidthCellsError] = useState(false);
  const [heightCellsError, setHeightCellsError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCellSize(doc.board.cellSize);
    setWidthInput(cleanInput(doc.board.widthM));
    setHeightInput(cleanInput(doc.board.heightM));
    setWidthCells(String(Math.round(doc.board.widthM / doc.board.cellSize)));
    setHeightCells(String(Math.round(doc.board.heightM / doc.board.cellSize)));
    setWidthCellsError(false);
    setHeightCellsError(false);
  }, [open, doc.board.cellSize, doc.board.widthM, doc.board.heightM]);

  const widthM = parseNumber(widthInput);
  const heightM = parseNumber(heightInput);

  const errors = useMemo(() => {
    const list: string[] = [];
    if (widthM === null || widthM <= 0) {
      list.push('请输入有效的画布宽度。');
    } else if (widthM > 300) {
      list.push('画布宽度不能超过 300 m。');
    } else if (!isMultiple(widthM, cellSize)) {
      const near = nearestValidMeters(widthM, cellSize);
      list.push(
        `宽度 ${formatM(widthM)} m 不是 ${cellSize} m 的整数倍。最近合法值：${formatM(
          near.lower,
        )} m 或 ${formatM(near.upper)} m。`,
      );
    }
    if (heightM === null || heightM <= 0) {
      list.push('请输入有效的画布高度。');
    } else if (heightM > 300) {
      list.push('画布高度不能超过 300 m。');
    } else if (!isMultiple(heightM, cellSize)) {
      const near = nearestValidMeters(heightM, cellSize);
      list.push(
        `高度 ${formatM(heightM)} m 不是 ${cellSize} m 的整数倍。最近合法值：${formatM(
          near.lower,
        )} m 或 ${formatM(near.upper)} m。`,
      );
    }
    if (widthCellsError) list.push('宽度格数必须是正整数。');
    if (heightCellsError) list.push('高度格数必须是正整数。');
    if (widthM !== null && widthM > 0 && heightM !== null && heightM > 0) {
      const cols = Math.round(widthM / cellSize);
      const rows = Math.round(heightM / cellSize);
      if (cols > 1000 || rows > 1000) list.push('单个方向最多 1000 格。');
    }
    return list;
  }, [widthM, heightM, cellSize, widthCellsError, heightCellsError]);

  const valid = errors.length === 0;
  const outsideCount = useMemo(() => {
    if (!valid || widthM === null || heightM === null) return 0;
    return tilesOutsideBoard(
      { cellSize, widthM, heightM },
      doc.tiles,
      TILE_BY_ID,
    ).length;
  }, [valid, widthM, heightM, cellSize, doc.tiles]);

  const cols = widthM !== null && widthM > 0 ? Math.round(widthM / cellSize) : 0;
  const rows = heightM !== null && heightM > 0 ? Math.round(heightM / cellSize) : 0;

  const handleWidthM = (value: string) => {
    setWidthInput(value);
    setWidthCellsError(false);
    const parsed = parseNumber(value);
    if (parsed !== null && parsed > 0 && isMultiple(parsed, cellSize)) {
      setWidthCells(String(Math.round(parsed / cellSize)));
    } else {
      setWidthCells('');
    }
  };

  const handleHeightM = (value: string) => {
    setHeightInput(value);
    setHeightCellsError(false);
    const parsed = parseNumber(value);
    if (parsed !== null && parsed > 0 && isMultiple(parsed, cellSize)) {
      setHeightCells(String(Math.round(parsed / cellSize)));
    } else {
      setHeightCells('');
    }
  };

  const handleWidthCells = (value: string) => {
    setWidthCells(value);
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setWidthCellsError(true);
      return;
    }
    setWidthCellsError(false);
    setWidthInput(cleanInput(parsed * cellSize));
  };

  const handleHeightCells = (value: string) => {
    setHeightCells(value);
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setHeightCellsError(true);
      return;
    }
    setHeightCellsError(false);
    setHeightInput(cleanInput(parsed * cellSize));
  };

  const handleCellSize = (next: CellSize) => {
    setCellSize(next);
    const w = parseNumber(widthInput);
    const h = parseNumber(heightInput);
    setWidthCells(
      w !== null && w > 0 && isMultiple(w, next) ? String(Math.round(w / next)) : '',
    );
    setHeightCells(
      h !== null && h > 0 && isMultiple(h, next) ? String(Math.round(h / next)) : '',
    );
    setWidthCellsError(false);
    setHeightCellsError(false);
  };

  const applyNearest = (axis: 'width' | 'height') => {
    const value = axis === 'width' ? widthM : heightM;
    if (value === null) return;
    const near = nearestValidMeters(value, cellSize);
    if (axis === 'width') {
      setWidthInput(cleanInput(near.nearest));
      setWidthCells(String(Math.round(near.nearest / cellSize)));
      setWidthCellsError(false);
    } else {
      setHeightInput(cleanInput(near.nearest));
      setHeightCells(String(Math.round(near.nearest / cellSize)));
      setHeightCellsError(false);
    }
  };

  const applyPreset = (w: number, h: number) => {
    setWidthInput(String(w));
    setHeightInput(String(h));
    setWidthCells(String(Math.round(w / cellSize)));
    setHeightCells(String(Math.round(h / cellSize)));
    setWidthCellsError(false);
    setHeightCellsError(false);
  };

  const handleApply = () => {
    if (!valid || widthM === null || heightM === null) return;
    if (outsideCount > 0) {
      const ok = window.confirm(
        `画布缩小后有 ${outsideCount} 块瓦片会落在画布外，应用后将被删除。继续吗？`,
      );
      if (!ok) return;
    }
    const result = setBoard({ cellSize, widthM: roundM(widthM), heightM: roundM(heightM) });
    if (!result.ok) {
      showToast(result.message ?? '画布设置未生效', 'error');
      return;
    }
    showToast(
      result.removed > 0
        ? `画布已更新，移除了 ${result.removed} 块画布外的瓦片（可撤销）`
        : '画布设置已更新',
      'success',
    );
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div className="modal board-modal" onPointerDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Grid & Canvas</div>
            <h2>画布设置</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="field-block">
            <div className="field-label">
              <span>格子边长</span>
              <span className="field-hint">正方形 · 吸附精度</span>
            </div>
            <div className="segmented">
              {CELL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={cellSize === option.value ? 'is-active' : ''}
                  onClick={() => handleCellSize(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="field-note">
              切换格子边长时，已放置瓦片保持原米坐标，赛道不会缩放。
            </p>
          </div>

          <div className="size-grid">
            <div className="field-block">
              <div className="field-label">
                <span>画布宽度</span>
                <span className="field-hint">米 / 格</span>
              </div>
              <div className="dual-input">
                <div className="input-wrap">
                  <input
                    value={widthInput}
                    onChange={(event) => handleWidthM(event.target.value)}
                    inputMode="decimal"
                    aria-label="画布宽度（米）"
                  />
                  <span className="unit">m</span>
                </div>
                <span className="equals">=</span>
                <div className="input-wrap">
                  <input
                    value={widthCells}
                    onChange={(event) => handleWidthCells(event.target.value)}
                    inputMode="numeric"
                    placeholder="—"
                    aria-label="画布宽度（格）"
                  />
                  <span className="unit">格</span>
                </div>
              </div>
              {widthM !== null && widthM > 0 && !isMultiple(widthM, cellSize) ? (
                <button className="inline-fix" onClick={() => applyNearest('width')}>
                  <Icon name="alert" size={13} /> 取最近合法值
                </button>
              ) : null}
            </div>

            <div className="field-block">
              <div className="field-label">
                <span>画布高度</span>
                <span className="field-hint">米 / 格</span>
              </div>
              <div className="dual-input">
                <div className="input-wrap">
                  <input
                    value={heightInput}
                    onChange={(event) => handleHeightM(event.target.value)}
                    inputMode="decimal"
                    aria-label="画布高度（米）"
                  />
                  <span className="unit">m</span>
                </div>
                <span className="equals">=</span>
                <div className="input-wrap">
                  <input
                    value={heightCells}
                    onChange={(event) => handleHeightCells(event.target.value)}
                    inputMode="numeric"
                    placeholder="—"
                    aria-label="画布高度（格）"
                  />
                  <span className="unit">格</span>
                </div>
              </div>
              {heightM !== null && heightM > 0 && !isMultiple(heightM, cellSize) ? (
                <button className="inline-fix" onClick={() => applyNearest('height')}>
                  <Icon name="alert" size={13} /> 取最近合法值
                </button>
              ) : null}
            </div>
          </div>

          <div className="preset-row">
            <span className="field-hint">常用尺寸</span>
            {PRESETS.map((preset) => (
              <button key={preset.label} className="preset-chip" onClick={() => applyPreset(preset.w, preset.h)}>
                {preset.label} m
              </button>
            ))}
          </div>

          <div className={`summary-strip ${valid ? '' : 'is-invalid'}`}>
            <div>
              <span className="summary-label">实际画布</span>
              <strong>
                {valid && widthM !== null && heightM !== null
                  ? `${formatM(widthM)} × ${formatM(heightM)} m`
                  : '—'}
              </strong>
            </div>
            <div>
              <span className="summary-label">网格</span>
              <strong>
                {valid ? `${cols} × ${rows} 格` : '—'}
              </strong>
            </div>
            <div>
              <span className="summary-label">瓦片</span>
              <strong>{doc.tiles.length} 块</strong>
            </div>
          </div>

          <div className="rule-note">
            <Icon name="grid" size={15} />
            <span>
              硬性规则：画布宽高必须是当前格子边长的整数倍，否则不能创建或变更网格。
            </span>
          </div>

          {errors.length > 0 ? (
            <div className="form-error" role="alert">
              <Icon name="alert" size={16} />
              <div>
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            </div>
          ) : outsideCount > 0 ? (
            <div className="form-warning">
              <Icon name="alert" size={16} />
              <span>{outsideCount} 块瓦片在画布外，应用后将被移除（可撤销）。</span>
            </div>
          ) : null}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" disabled={!valid} onClick={handleApply}>
            <Icon name="check" size={16} /> 应用设置
          </button>
        </div>
      </div>
    </div>
  );
}
