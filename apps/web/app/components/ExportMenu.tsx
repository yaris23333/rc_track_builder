import { useEffect, useRef, useState } from 'react';
import { TILE_BY_ID } from '@rctrack/core';
import { validateDoc } from '@rctrack/core';
import { clearShareHash } from '~/lib/share';
import { useStore } from '~/store/useStore';
import { downloadBlob, safeFilename, timestamp } from '~/lib/dom';
import { exportDxf } from '~/lib/export/dxf';
import { exportPdf } from '~/lib/export/pdf';
import { copyPngToClipboard, exportPng } from '~/lib/export/png';
import { Icon } from './Icons';

export function ExportMenu({ onShare }: { onShare: () => void }) {
  const doc = useStore((state) => state.doc);
  const readOnly = useStore((state) => state.readOnly);
  const loadDoc = useStore((state) => state.loadDoc);
  const newDoc = useStore((state) => state.newDoc);
  const loadSample = useStore((state) => state.loadSample);
  const clearBoard = useStore((state) => state.clearBoard);
  const showToast = useStore((state) => state.showToast);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = async (label: string, task: () => Promise<void> | void, successMessage?: string) => {
    setOpen(false);
    setBusy(label);
    try {
      await task();
      showToast(successMessage ?? `${label}已导出`, 'success');
    } catch (error) {
      console.error(error);
      showToast(`${label}失败：${error instanceof Error ? error.message : '未知错误'}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${safeFilename(doc.name)}-${timestamp()}.json`);
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = validateDoc(JSON.parse(text), TILE_BY_ID);
      if (!parsed) throw new Error('文件格式无效，或画布尺寸不是格子边长的整数倍');
      loadDoc(parsed, false);
      clearShareHash();
      showToast('赛道已导入', 'success');
    } catch (error) {
      showToast(`导入失败：${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  };

  return (
    <div className="export-root" ref={rootRef}>
      <button
        className={`btn btn-primary export-trigger ${busy ? 'is-busy' : ''}`}
        onClick={() => setOpen((value) => !value)}
        disabled={Boolean(busy)}
      >
        <Icon name="download" size={16} />
        {busy ?? '导出'}
        <Icon name="chevron-down" size={14} />
      </button>

      {open ? (
        <div className="menu-panel" role="menu">
          <div className="menu-label">分享与图片</div>
          <button
            className="menu-item"
            onClick={() => {
              setOpen(false);
              onShare();
            }}
          >
            <Icon name="link" size={16} />
            <span>分享链接</span>
            <span className="menu-hint">静态 hash</span>
          </button>
          <button
            className="menu-item"
            onClick={() => run('PNG 截图', () => exportPng(doc, { scale: 2 }))}
          >
            <Icon name="image" size={16} />
            <span>PNG 截图</span>
            <span className="menu-hint">2×</span>
          </button>
          <button
            className="menu-item"
            onClick={() =>
              run('复制图片', () => copyPngToClipboard(doc, { scale: 2 }), 'PNG 已复制到剪贴板')
            }
          >
            <Icon name="copy" size={16} />
            <span>复制图片</span>
            <span className="menu-hint">Ctrl/Cmd+V</span>
          </button>
          <button
            className="menu-item"
            onClick={() => run('PDF', () => exportPdf(doc))}
          >
            <Icon name="pdf" size={16} />
            <span>PDF 成品图</span>
            <span className="menu-hint">A4 · 300 DPI</span>
          </button>

          <div className="menu-divider" />
          <div className="menu-label">工程格式</div>
          <button
            className="menu-item"
            onClick={() =>
              run('DXF (R12)', () => exportDxf(doc, { version: 'R12', includeGrid: false }))
            }
          >
            <Icon name="dxf" size={16} />
            <span>DXF · R12</span>
            <span className="menu-hint">3ds Max</span>
          </button>
          <button
            className="menu-item"
            onClick={() =>
              run('DXF (R2000)', () => exportDxf(doc, { version: 'R2000', includeGrid: false }))
            }
          >
            <Icon name="dxf" size={16} />
            <span>DXF · R2000</span>
            <span className="menu-hint">Fusion / CAD</span>
          </button>
          <button
            className="menu-item"
            onClick={() =>
              run('JSON', () => {
                exportJson();
              })
            }
          >
            <Icon name="json" size={16} />
            <span>JSON 备份</span>
            <span className="menu-hint">可导入</span>
          </button>

          <div className="menu-divider" />
          <button
            className="menu-item"
            disabled={readOnly}
            onClick={() => {
              setOpen(false);
              fileRef.current?.click();
            }}
          >
            <Icon name="folder" size={16} />
            <span>导入 JSON</span>
          </button>
          <button
            className="menu-item"
            disabled={readOnly}
            onClick={() => {
              setOpen(false);
              if (doc.tiles.length > 0 && !window.confirm('清空当前画布上的所有瓦片？')) return;
              clearBoard();
              showToast('画布已清空（可撤销）', 'success');
            }}
          >
            <Icon name="trash" size={16} />
            <span>清空画布</span>
          </button>
          <button
            className="menu-item"
            disabled={readOnly}
            onClick={() => {
              setOpen(false);
              if (doc.tiles.length > 0 && !window.confirm('新建会清空当前画布，继续吗？')) return;
              newDoc();
            }}
          >
            <Icon name="plus" size={16} />
            <span>新建画布</span>
          </button>
          <button
            className="menu-item"
            disabled={readOnly}
            onClick={() => {
              setOpen(false);
              if (doc.tiles.length > 0 && !window.confirm('载入示例会替换当前画布，继续吗？')) return;
              loadSample();
            }}
          >
            <Icon name="sparkles" size={16} />
            <span>载入示例</span>
          </button>
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void importJson(file);
        }}
      />
    </div>
  );
}
