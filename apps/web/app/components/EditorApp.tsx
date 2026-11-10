import { formatM, validateTrack } from '@rctrack/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isTypingTarget } from '~/lib/dom';
import { saveLocalDoc } from '~/lib/share';
import { useStore } from '~/store/useStore';
import { BoardSettingsModal } from './BoardSettingsModal';
import { Canvas } from './Canvas';
import { Icon } from './Icons';
import { Inspector } from './Inspector';
import { Palette } from './Palette';
import { Toast } from './Toast';
import { TopBar } from './TopBar';

export default function EditorApp() {
  const doc = useStore((state) => state.doc);
  const readOnly = useStore((state) => state.readOnly);
  const booted = useStore((state) => state.booted);
  const selected = useStore((state) => state.selected);
  const viewport = useStore((state) => state.viewport);
  const past = useStore((state) => state.past);
  const future = useStore((state) => state.future);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const rotateSelected = useStore((state) => state.rotateSelected);
  const flipSelected = useStore((state) => state.flipSelected);
  const deleteSelected = useStore((state) => state.deleteSelected);
  const duplicateSelected = useStore((state) => state.duplicateSelected);
  const clearSelection = useStore((state) => state.clearSelection);
  const setBrush = useStore((state) => state.setBrush);
  const setSelected = useStore((state) => state.setSelected);
  const requestFit = useStore((state) => state.requestFit);
  const showToast = useStore((state) => state.showToast);
  const startupNotice = useStore((state) => state.startupNotice);

  const validation = useMemo(() => validateTrack(doc), [doc]);

  const [boardOpen, setBoardOpen] = useState(false);
  const noticeShown = useRef(false);

  useEffect(() => {
    if (!booted || readOnly) return;
    const timer = window.setTimeout(() => saveLocalDoc(doc), 350);
    return () => window.clearTimeout(timer);
  }, [booted, doc, readOnly]);

  useEffect(() => {
    if (noticeShown.current || !startupNotice) return;
    noticeShown.current = true;
    showToast(startupNotice, 'error');
  }, [startupNotice, showToast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (document.querySelector('.modal-backdrop')) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (mod && key === 'd') {
        event.preventDefault();
        if (!readOnly) duplicateSelected();
        return;
      }
      if (mod && key === 'a') {
        event.preventDefault();
        if (!readOnly) setSelected(doc.tiles.map((tile) => tile.uid));
        return;
      }
      if (mod && key === '0') {
        event.preventDefault();
        requestFit();
        return;
      }
      if (mod) return;

      if (key === 'r') {
        event.preventDefault();
        if (!readOnly) rotateSelected(event.shiftKey ? -1 : 1);
      } else if (key === 'f') {
        event.preventDefault();
        if (!readOnly) flipSelected(event.shiftKey ? 'y' : 'x');
      } else if (key === 'delete' || key === 'backspace') {
        if (readOnly) return;
        if (selected.length > 0) {
          event.preventDefault();
          deleteSelected();
        }
      } else if (key === 'escape') {
        setBrush(null);
        clearSelection();
      } else if (key === '?') {
        showToast('R 旋转 · Shift+R 反向 · F 翻转 · Delete 删除 · 空格拖动 · 滚轮缩放', 'info');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    clearSelection,
    deleteSelected,
    doc.tiles,
    duplicateSelected,
    flipSelected,
    readOnly,
    redo,
    requestFit,
    rotateSelected,
    selected.length,
    setBrush,
    setSelected,
    showToast,
    undo,
  ]);


  return (
    <div className="app">
      <TopBar onOpenBoard={() => setBoardOpen(true)} validation={validation} />

      <main className="workspace">
        <Palette />
        <Canvas validation={validation} />
        <Inspector onOpenBoard={() => setBoardOpen(true)} />
      </main>

      <footer className="statusbar">
        <div className="status-left">
          <span
            className={`status-dot ${readOnly ? 'is-readonly' : validation.closed ? '' : 'is-open'}`}
          />
          <span>
            {readOnly
              ? '只读预览'
              : doc.tiles.length === 0
                ? '就绪'
                : validation.closed
                  ? '已闭合'
                  : '未闭合'}
          </span>
          <span className="status-sep" />
          <span className="status-muted">
            {doc.tiles.length} 块瓦片 · {formatM(doc.board.widthM * doc.board.heightM)} m² 画布
            {doc.tiles.length > 0 && !validation.closed
              ? ` · ${validation.stats.gaps} 处断点`
              : ''}
          </span>
        </div>
        <div className="status-center">
          <span className="status-rule">
            <Icon name="grid" size={12} />
            严格网格 · 所有边长均为 {doc.board.cellSize} m 的整数倍
          </span>
        </div>
        <div className="status-right">
          <span>{selected.length > 0 ? `已选 ${selected.length}` : '未选择'}</span>
          <span className="status-sep" />
          <span>
            撤销 {past.length} · 重做 {future.length}
          </span>
          <span className="status-sep" />
          <span>{Math.round(viewport.zoom * 100)}%</span>
          <span className="status-sep" />
          <span className="status-version">v0.2.0</span>
        </div>
      </footer>

      <BoardSettingsModal open={boardOpen} onClose={() => setBoardOpen(false)} />
      <Toast />
    </div>
  );
}
