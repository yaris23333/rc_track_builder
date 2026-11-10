import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TrackDoc } from '@rctrack/core';
import { SceneSvg } from '~/components/SceneSvg';
import { downloadBlob, safeFilename, timestamp } from '~/lib/dom';

export interface RasterOptions {
  scale?: number;
  ppm?: number;
  grid?: boolean;
  background?: 'white' | 'transparent';
}

export async function renderBoardCanvas(
  doc: TrackDoc,
  options: RasterOptions = {},
): Promise<HTMLCanvasElement> {
  const ppm = options.ppm ?? 60 * (options.scale ?? 2);
  const widthPx = Math.max(200, Math.round(doc.board.widthM * ppm));
  const heightPx = Math.max(200, Math.round(doc.board.heightM * ppm));
  const svg = renderToStaticMarkup(
    createElement(SceneSvg, {
      doc,
      widthPx,
      heightPx,
      includeGrid: options.grid ?? true,
      background: options.background ?? 'white',
    }),
  );
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('场景 SVG 渲染失败'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建 Canvas 上下文');
    if ((options.background ?? 'white') === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, widthPx, heightPx);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, widthPx, heightPx);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG 生成失败'));
    }, 'image/png');
  });
}

export async function exportPng(doc: TrackDoc, options: RasterOptions = {}): Promise<void> {
  const canvas = await renderBoardCanvas(doc, { scale: 2, grid: false, background: 'white', ...options });
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, `${safeFilename(doc.name)}-${timestamp()}.png`);
}

export async function copyPngToClipboard(doc: TrackDoc, options: RasterOptions = {}): Promise<void> {
  const canvas = await renderBoardCanvas(doc, { scale: 2, grid: false, background: 'white', ...options });
  const blob = await canvasToBlob(canvas);
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('当前浏览器不支持复制图片');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
