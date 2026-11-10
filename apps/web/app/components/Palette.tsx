import { TILE_DEFS } from '@rctrack/core';
import { useStore } from '~/store/useStore';
import { Icon } from './Icons';
import { TileArt } from './TileArt';

function TileThumb({ defId }: { defId: string }) {
  const def = TILE_DEFS.find((item) => item.id === defId);
  if (!def) return null;
  return (
    <svg viewBox="0 0 3 3" className="tile-thumb" aria-hidden="true">
      <rect x="0" y="0" width="3" height="3" rx="0.06" fill="#ffffff" />
      <TileArt
        def={def}
        xM={0}
        yM={0}
        rotation={0}
        flipX={false}
        flipY={false}
        strokeScale={0.72}
      />
    </svg>
  );
}

export function Palette() {
  const brush = useStore((state) => state.brush);
  const setBrush = useStore((state) => state.setBrush);
  const readOnly = useStore((state) => state.readOnly);
  const showToast = useStore((state) => state.showToast);

  return (
    <aside className="palette">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Library</div>
          <h2>瓦片库</h2>
        </div>
        <span className="badge">{TILE_DEFS.length}</span>
      </div>

      <div className="palette-scroll">
        <div className="tile-grid">
          {TILE_DEFS.map((def) => {
            const active = brush === def.id;
            return (
              <button
                key={def.id}
                className={`tile-card ${active ? 'is-active' : ''}`}
                onClick={() => {
                  if (readOnly) {
                    showToast('分享预览是只读的，复制到本地后才能编辑', 'info');
                    return;
                  }
                  setBrush(active ? null : def.id);
                }}
                title={`${def.name} · ${def.description}`}
                aria-pressed={active}
              >
                <div className="tile-card-art">
                  <TileThumb defId={def.id} />
                </div>
                <div className="tile-card-meta">
                  <span className="tile-name">{def.name}</span>
                  <span className="tile-size">3 × 3 m</span>
                </div>
                {active ? (
                  <span className="tile-active-mark">
                    <Icon name="check" size={12} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="palette-footer">
        <Icon name="info" size={14} />
        <span>
          点击瓦片选中，再点击画布放置。
          <br />
          所有瓦片均为 3 × 3 m 模块。
        </span>
      </div>
    </aside>
  );
}
