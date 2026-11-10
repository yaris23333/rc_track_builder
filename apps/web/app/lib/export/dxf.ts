import { buildDxf, type DxfOptions, type TrackDoc } from '@rctrack/core';
import { downloadBlob, safeFilename, timestamp } from '~/lib/dom';

export type { DxfOptions };

/** 纯字符串构建在 core，下载动作（DOM）留在 web 层。 */
export async function exportDxf(doc: TrackDoc, options: DxfOptions = {}): Promise<void> {
  const content = buildDxf(doc, options);
  downloadBlob(
    new Blob([content], { type: 'application/dxf;charset=utf-8' }),
    `${safeFilename(doc.name)}-${timestamp()}.dxf`,
  );
}
