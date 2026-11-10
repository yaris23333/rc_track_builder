import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import type { TrackDoc } from './types';
import { validateDoc } from './geometry';
import { TILE_BY_ID } from './tiles';

/** 分享载荷的硬上限：防止恶意超长链接拖垮解码。 */
const MAX_ENCODED_CHARS = 300_000;
const MAX_DECODED_BYTES = 2_000_000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** 文档 → 压缩 base64url 载荷（不依赖 DOM，可在 Node / 浏览器运行）。 */
export function encodeDoc(doc: TrackDoc): string {
  const payload = JSON.stringify(doc);
  const compressed = deflateSync(strToU8(payload), { level: 9 });
  return bytesToBase64Url(compressed);
}

/** 载荷 → 文档；任何解析 / 校验失败都返回 null，不抛错。 */
export function decodeDoc(encoded: string): TrackDoc | null {
  try {
    if (!encoded || encoded.length > MAX_ENCODED_CHARS) return null;
    const bytes = base64UrlToBytes(encoded);
    if (bytes.byteLength > MAX_DECODED_BYTES) return null;
    const json = strFromU8(inflateSync(bytes));
    if (json.length > MAX_DECODED_BYTES) return null;
    return validateDoc(JSON.parse(json), TILE_BY_ID);
  } catch {
    return null;
  }
}
