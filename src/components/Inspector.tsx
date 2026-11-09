import { TILE_BY_ID } from '../model/tiles';
import { boardCells, formatM } from '../model/geometry';
import { useStore } from '../store/useStore';
import { Icon } from './Icons';

export function Inspector({ onOpenBoard }: { onOpenBoard: () => void }) {
  const doc = useStore((state) => state.doc);
  const selected = useStore((state) => state.selected);
  const readOnly = useStore((state) => state.readOnly);
  const rotateSelected = useStore((state) => state.rotateSelected);
  const flipSelected = useStore((state) => state.flipSelected);
  const deleteSelected = useStore((state) => state.deleteSelected);
  const duplicateSelected = useStore((state) => state.duplicateSelected);
  const clearSelection = useStore((state) => state.clearSelection);
  const showToast = useStore((state) => state.showToast);

  const { cols, rows } = boardCells(doc.board);
  const selectedTiles = doc.tiles.filter((tile) => selected.includes(tile.uid));
  const first = selectedTiles[0];
  const firstDef = first ? TILE_BY_ID.get(first.defId) : undefined;
  const area = doc.tiles.length * 9;

  return (
    <aside className="inspector">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Inspector</div>
          <h2>属性</h2>
        </div>
        {readOnly ? <span className="badge badge-amber">只读</span> : null}
      </div>

      <div className="inspector-scroll">
        {selectedTiles.length > 0 && first && firstDef ? (
          <section className="inspector-section">
            <div className="selection-title">
              <div className="selection-swatch">
                <Icon name="track" size={16} />
              </div>
              <div>
                <h3>{selectedTiles.length > 1 ? `已选择 ${selectedTiles.length} 块` : firstDef.name}</h3>
                <p>
                  {selectedTiles.length > 1
                    ? '批量旋转、翻转或删除'
                    : `${firstDef.sizeM.w} × ${firstDef.sizeM.h} m · ${firstDef.categoryLabel}`}
                </p>
              </div>
            </div>

            {selectedTiles.length === 1 ? (
              <div className="property-grid">
                <div className="property">
                  <span>位置 X</span>
                  <strong>{formatM(first.xM)} m</strong>
                </div>
                <div className="property">
                  <span>位置 Y</span>
                  <strong>{formatM(first.yM)} m</strong>
                </div>
                <div className="property">
                  <span>旋转</span>
                  <strong>{first.rotation}°</strong>
                </div>
                <div className="property">
                  <span>翻转</span>
                  <strong>
                    {first.flipX || first.flipY
                      ? [first.flipX ? 'H' : '', first.flipY ? 'V' : ''].filter(Boolean).join(' / ')
                      : '无'}
                  </strong>
                </div>
              </div>
            ) : null}

            <div className="action-grid">
              <button
                className="action-btn"
                disabled={readOnly}
                onClick={() => rotateSelected(-1)}
                title="逆时针旋转 90°"
              >
                <Icon name="rotate-ccw" size={17} />
                <span>左转 90°</span>
              </button>
              <button
                className="action-btn"
                disabled={readOnly}
                onClick={() => rotateSelected(1)}
                title="顺时针旋转 90°"
              >
                <Icon name="rotate-cw" size={17} />
                <span>右转 90°</span>
              </button>
              <button className="action-btn" disabled={readOnly} onClick={() => flipSelected('x')}>
                <Icon name="flip-h" size={17} />
                <span>水平翻转</span>
              </button>
              <button className="action-btn" disabled={readOnly} onClick={() => flipSelected('y')}>
                <Icon name="flip-v" size={17} />
                <span>垂直翻转</span>
              </button>
            </div>

            <div className="action-row">
              <button className="btn btn-sm" disabled={readOnly} onClick={duplicateSelected}>
                <Icon name="copy" size={15} /> 复制
              </button>
              <button className="btn btn-sm btn-danger" disabled={readOnly} onClick={deleteSelected}>
                <Icon name="trash" size={15} /> 删除
              </button>
            </div>
            <button className="link-btn" onClick={clearSelection}>
              取消选择
            </button>
          </section>
        ) : (
          <section className="inspector-section">
            <div className="selection-title">
              <div className="selection-swatch subtle">
                <Icon name="cursor" size={16} />
              </div>
              <div>
                <h3>未选择瓦片</h3>
                <p>点击画布上的瓦片查看属性</p>
              </div>
            </div>
            <p className="inspector-copy">
              从左侧选择瓦片后点击画布放置；拖动可移动，Shift + 点击可多选。
            </p>
          </section>
        )}

        <section className="inspector-section">
          <div className="section-title-row">
            <div className="section-label">
              <span>画布</span>
              <span className="section-line" />
            </div>
            <button className="mini-link" onClick={onOpenBoard} disabled={readOnly}>
              编辑
            </button>
          </div>
          <div className="stat-list">
            <div className="stat-row">
              <span>实际尺寸</span>
              <strong>
                {formatM(doc.board.widthM)} × {formatM(doc.board.heightM)} m
              </strong>
            </div>
            <div className="stat-row">
              <span>网格边长</span>
              <strong>{doc.board.cellSize} m</strong>
            </div>
            <div className="stat-row">
              <span>网格数量</span>
              <strong>
                {cols} × {rows} 格
              </strong>
            </div>
            <div className="stat-row">
              <span>瓦片数量</span>
              <strong>{doc.tiles.length} 块</strong>
            </div>
            <div className="stat-row">
              <span>占地估算</span>
              <strong>{area} m²</strong>
            </div>
          </div>
          <div className="strict-badge">
            <Icon name="grid" size={13} />
            严格整数倍网格
          </div>
        </section>

        <section className="inspector-section">
          <div className="section-label">
            <span>图例</span>
            <span className="section-line" />
          </div>
          <div className="legend-list">
            <div className="legend-row">
              <span className="legend-line edge" />
              <span>赛道边线</span>
            </div>
            <div className="legend-row">
              <span className="legend-line center" />
              <span>中心线</span>
            </div>
            <div className="legend-row">
              <span className="legend-line feature" />
              <span>跳台 / 波浪 / 桌面</span>
            </div>
            <div className="legend-row">
              <span className="legend-line start" />
              <span>起终点</span>
            </div>
          </div>
        </section>

        <section className="inspector-section">
          <div className="section-label">
            <span>提示</span>
            <span className="section-line" />
          </div>
          <p className="inspector-copy">
            {readOnly
              ? '当前是分享预览。点击顶部“复制到本地”即可继续编辑。'
              : '切换格子边长时，赛道保持真实尺寸不变；画布宽高必须始终是格子边长的整数倍。'}
          </p>
          <button
            className="btn btn-sm btn-ghost full"
            onClick={() => showToast('R 旋转 · F 翻转 · Delete 删除 · 空格拖动平移', 'info')}
          >
            <Icon name="info" size={14} /> 快捷键提示
          </button>
        </section>
      </div>
    </aside>
  );
}
