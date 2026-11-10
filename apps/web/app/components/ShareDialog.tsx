import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildShareUrl } from '~/lib/share';
import { useStore } from '~/store/useStore';
import { Icon } from './Icons';

export function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useStore((state) => state.doc);
  const showToast = useStore((state) => state.showToast);
  const [copied, setCopied] = useState(false);

  const share = useMemo(() => {
    if (!open) return null;
    try {
      return buildShareUrl(doc);
    } catch {
      return null;
    }
  }, [open, doc]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tooLong = (share?.url.length ?? 0) > 12000;

  const copy = async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      showToast('分享链接已复制', 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const area = document.getElementById('share-url') as HTMLTextAreaElement | null;
      area?.select();
      showToast('无法自动复制，请手动按 Ctrl/Cmd+C', 'info');
    }
  };

  return createPortal(
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div className="modal share-modal" onPointerDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Share</div>
            <h2>分享链接</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="share-visual">
            <div className="share-icon">
              <Icon name="link" size={24} />
            </div>
            <div>
              <h3>把整条赛道装进链接</h3>
              <p>设计数据压缩后放在 URL 的 # 后面，不会上传到服务器。</p>
            </div>
          </div>

          {share ? (
            <>
              <textarea
                id="share-url"
                className="share-url"
                value={share.url}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
                rows={4}
              />
              <div className="share-meta">
                <span>链接长度约 {Math.round(share.url.length / 1024)} KB</span>
                <span className={tooLong ? 'text-warn' : 'text-ok'}>
                  {tooLong ? '较长，部分聊天软件可能截断' : '适合直接发送'}
                </span>
              </div>
              {tooLong ? (
                <div className="form-warning">
                  <Icon name="alert" size={16} />
                  <span>
                    链接超过 12KB。建议先导出 JSON 备份；后续版本会加短链服务。
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="form-error">
              <Icon name="alert" size={16} />
              <span>链接生成失败，请检查浏览器是否支持压缩 API。</span>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>
            关闭
          </button>
          {share ? (
            <>
              <button
                className="btn"
                onClick={() => window.open(share.url, '_blank', 'noopener,noreferrer')}
              >
                <Icon name="external" size={15} /> 预览
              </button>
              <button className="btn btn-primary" onClick={copy}>
                <Icon name={copied ? 'check' : 'copy'} size={15} /> {copied ? '已复制' : '复制链接'}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
