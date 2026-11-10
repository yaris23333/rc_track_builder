import { describe, expect, it } from 'vitest';
import { createSampleDoc } from './geometry';
import { decodeDoc, encodeDoc } from './share';

describe('share codec', () => {
  it('往返编解码保持文档内容一致', () => {
    const doc = createSampleDoc();
    const decoded = decodeDoc(encodeDoc(doc));

    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe(doc.name);
    expect(decoded?.board).toEqual(doc.board);
    expect(decoded?.tiles).toHaveLength(doc.tiles.length);
    expect(decoded?.tiles[0]?.defId).toBe(doc.tiles[0]?.defId);
  });

  it('拒绝空载荷与非法载荷', () => {
    expect(decodeDoc('')).toBeNull();
    expect(decodeDoc('not-a-valid-doc')).toBeNull();
    expect(decodeDoc('a'.repeat(300_001))).toBeNull();
  });
});
