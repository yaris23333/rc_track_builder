import { useState } from 'react';
import { useNavigate } from 'react-router';
import { boardCells, clamp, formatM } from '@rctrack/core';
import { clearShareHash } from '~/lib/share';
import { useStore } from '~/store/useStore';
import { ExportMenu } from './ExportMenu';
import type { ValidationResult } from '@rctrack/core';
import { Icon } from './Icons';
import { ShareDialog } from './ShareDialog';

export function TopBar({
  onOpenBoard,
  validation,
}: {
  onOpenBoard: () => void;
  validation: ValidationResult;
}) {
  const doc = useStore((state) => state.doc);
  const showToast = useStore((state) => state.showToast);
  const viewport = useStore((state) => state.viewport);
  const setViewport = useStore((state) => state.setViewport);
  const requestFit = useStore((state) => state.requestFit);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const past = useStore((state) => state.past);
  const future = useStore((state) => state.future);
  const readOnly = useStore((state) => state.readOnly);
  const setName = useStore((state) => state.setName);
  const adoptShare = useStore((state) => state.adoptShare);

  const [shareOpen, setShareOpen] = useState(false);
  const navigate = useNavigate();
  const { cols, rows } = boardCells(doc.board);

  const hasTiles = doc.tiles.length > 0;
  const errorCount = validation.issues.filter((item) => item.severity === 'error').length;
  const closureLabel = !hasTiles
    ? '空画布'
    : validation.closed
      ? '已闭合'
      : validation.stats.gaps > 0
        ? `未闭合 · ${validation.stats.gaps} 处断点`
        : `未闭合 · ${errorCount} 个问题`;
  const closureTitle = !hasTiles
    ? '还没有放置瓦片'
    : validation.closed
      ? '所有端口已连接，构成闭合回路'
      : validation.issues
          .filter((item) => item.severity === 'error')
          .slice(0, 6)
          .map((item) => item.message)
          .join('\n');

  const onClosureClick = () => {
    if (!hasTiles) {
      showToast('从左侧选择一块瓦片，点击画布开始拼赛道', 'info');
      return;
    }
    if (validation.closed) {
      showToast('赛道已闭合，可以导出 PNG / PDF / DXF 了', 'success');
      return;
    }
    const first = validation.issues
      .filter((item) => item.severity === 'error')
      .slice(0, 3)
      .map((item) => item.message);
    showToast(first.join('；') || '还有未连接的问题', 'error');
  };

  const zoomBy = (factor: number) => {
    const el = document.querySelector('.canvas-shell') as HTMLElement | null;
    const rect = el?.getBoundingClientRect();
    const mx = rect ? rect.width / 2 : 0;
    const my = rect ? rect.height / 2 : 0;
    const next = clamp(viewport.zoom * factor, 0.04, 8);
    const ratio = next / viewport.zoom;
    setViewport({
      zoom: next,
      panX: mx - (mx - viewport.panX) * ratio,
      panY: my - (my - viewport.panY) * ratio,
    });
  };

  const adoptLocal = () => {
    adoptShare();
    clearShareHash();
    navigate('/', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 40 40">
            <path
              d="M11 33c-5 0-7-4.4-4.4-8.7L13 9.8C15 6 19 4.2 22.5 5.6c4.4 1.8 5 7.3 2.4 11.8L21 24.2c-1.7 2.8-.5 5.5 2.4 5.5H30"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            <path d="M6 33h10M29 10h6" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
          </svg>
        </div>
        <div className="brand-text">
          <strong>RC TRACK</strong>
          <span>DESIGNER</span>
        </div>
      </div>

      <div className="project-block">
        <input
          className="project-name"
          value={doc.name}
          onChange={(event) => setName(event.target.value)}
          readOnly={readOnly}
          maxLength={80}
          aria-label="项目名称"
        />
        <button className="board-chip" onClick={onOpenBoard} disabled={readOnly} title="画布设置">
          <Icon name="grid" size={14} />
          <span>
            {formatM(doc.board.widthM)} × {formatM(doc.board.heightM)} m
          </span>
          <span className="sep">·</span>
          <span>{doc.board.cellSize} m 网格</span>
          <span className="sep">·</span>
          <span>
            {cols} × {rows} 格
          </span>
          {!readOnly ? <Icon name="chevron-down" size={13} /> : null}
        </button>
        <button
          className={`closure-chip ${
            !hasTiles ? 'is-empty' : validation.closed ? 'is-closed' : 'is-open'
          }`}
          onClick={onClosureClick}
          title={closureTitle || '赛道连通状态'}
        >
          <Icon name={!hasTiles ? 'info' : validation.closed ? 'check' : 'alert'} size={13} />
          <span>{closureLabel}</span>
        </button>
      </div>

      {readOnly ? (
        <div className="preview-pill">
          <Icon name="info" size={14} /> 只读预览
          <button className="preview-adopt" onClick={adoptLocal}>
            复制到本地
          </button>
        </div>
      ) : null}

      <div className="topbar-actions">
        <div className="tool-group">
          <button className="icon-btn" onClick={undo} disabled={readOnly || past.length === 0} title="撤销 (Ctrl/Cmd+Z)">
            <Icon name="undo" size={17} />
          </button>
          <button className="icon-btn" onClick={redo} disabled={readOnly || future.length === 0} title="重做 (Ctrl/Cmd+Shift+Z)">
            <Icon name="redo" size={17} />
          </button>
        </div>

        <div className="zoom-group">
          <button className="icon-btn" onClick={() => zoomBy(1 / 1.2)} title="缩小">
            <Icon name="zoom-out" size={17} />
          </button>
          <button className="zoom-value" onClick={requestFit} title="适配画布">
            {Math.round(viewport.zoom * 100)}%
          </button>
          <button className="icon-btn" onClick={() => zoomBy(1.2)} title="放大">
            <Icon name="zoom-in" size={17} />
          </button>
          <button className="icon-btn" onClick={requestFit} title="适配画布">
            <Icon name="fit" size={17} />
          </button>
        </div>

        <button className="icon-btn" onClick={onOpenBoard} disabled={readOnly} title="画布设置">
          <Icon name="settings" size={17} />
        </button>

        <button className="btn btn-ghost share-btn" onClick={() => setShareOpen(true)}>
          <Icon name="share" size={15} />
          分享
        </button>

        <ExportMenu onShare={() => setShareOpen(true)} />
      </div>

      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />    </header>
  );
}
