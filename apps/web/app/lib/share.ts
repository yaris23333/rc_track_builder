import { TILE_BY_ID, encodeDoc, validateDoc, type TrackDoc } from '@rctrack/core';

/** localStorage 键沿用 v1，保证老用户草稿不丢。 */
export const STORAGE_KEY = 'rctrack-designer.doc.v1';

/** 旧版分享链接的 hash 前缀，保留只为兼容已发出的链接。 */
const LEGACY_SHARE_PREFIX = '#/s/';

/** 把应用内路径拼成带部署 base 的绝对路径（兼容 GitHub Pages 子路径）。 */
export function appPath(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const rest = path.replace(/^\/+/, '');
  return rest ? `${base}/${rest}` : `${base}/`;
}

export function loadLocalDoc(): TrackDoc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validateDoc(JSON.parse(raw), TILE_BY_ID);
  } catch {
    return null;
  }
}

export function saveLocalDoc(doc: TrackDoc): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // 隐私模式下 localStorage 可能不可用；编辑器仍可在内存中工作。
  }
}

/** 生成路径式分享链接：<origin><base>s/<payload>。 */
export function buildShareUrl(doc: TrackDoc): { url: string; encodedLength: number } {
  const encoded = encodeDoc(doc);
  return {
    url: new URL(appPath(`s/${encoded}`), window.location.origin).toString(),
    encodedLength: encoded.length,
  };
}

/**
 * 识别旧版 `#/s/<payload>` 链接并给出新的路径式地址。
 * 老链接仍可打开，只是会 302 到 /s/<payload>（前端重定向）。
 */
export function legacyShareTarget(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash.startsWith(LEGACY_SHARE_PREFIX)) return null;
  const token = hash.slice(LEGACY_SHARE_PREFIX.length);
  return token ? appPath(`s/${token}`) : null;
}

/** 清掉遗留的 hash，避免地址栏继续显示旧分享标记。 */
export function clearShareHash(): void {
  if (typeof window === 'undefined') return;
  if (!window.location.hash.startsWith(LEGACY_SHARE_PREFIX)) return;
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}
