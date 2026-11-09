import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import type { TrackDoc } from '../types';
import { validateDoc } from '../model/geometry';
import { TILE_BY_ID } from '../model/tiles';

export const SHARE_PREFIX = '#/s/';
export const STORAGE_KEY = 'rctrack-designer.doc.v1';
const MAX_SHARE_CHARS = 300_000;
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

export function encodeDoc(doc: TrackDoc): string {
  const payload = JSON.stringify(doc);
  const compressed = deflateSync(strToU8(payload), { level: 9 });
  return bytesToBase64Url(compressed);
}

export function decodeDoc(encoded: string): TrackDoc | null {
  try {
    if (!encoded || encoded.length > MAX_SHARE_CHARS) return null;
    const bytes = base64UrlToBytes(encoded);
    if (bytes.byteLength > MAX_DECODED_BYTES) return null;
    const json = strFromU8(inflateSync(bytes));
    if (json.length > MAX_DECODED_BYTES) return null;
    return validateDoc(JSON.parse(json), TILE_BY_ID);
  } catch {
    return null;
  }
}

export function buildShareUrl(doc: TrackDoc): { url: string; encodedLength: number } {
  const encoded = encodeDoc(doc);
  const base = `${window.location.origin}${window.location.pathname}`;
  return { url: `${base}${SHARE_PREFIX}${encoded}`, encodedLength: encoded.length };
}

export function readShareHash(): TrackDoc | null {
  const hash = window.location.hash;
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  return decodeDoc(hash.slice(SHARE_PREFIX.length));
}

export function isShareHash(): boolean {
  return window.location.hash.startsWith(SHARE_PREFIX);
}

export function clearShareHash(): void {
  if (!window.location.hash) return;
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
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
    // Storage can be unavailable in private mode; the editor still works in memory.
  }
}
