import type { TrackDoc } from '@rctrack/core';
import { formatM } from '@rctrack/core';
import { safeFilename, timestamp } from '~/lib/dom';
import { renderBoardCanvas } from './png';

const DPI = 300;
const MM_TO_PX = DPI / 25.4;
const PAGE_W_MM = 297;
const PAGE_H_MM = 210;
const MARGIN_MM = 18;

function niceMeters(maxMeters: number): number {
  const steps = [0.5, 1, 2, 5, 10, 20, 50, 100];
  const target = maxMeters / 4;
  return steps.find((step) => step >= target) ?? 100;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 0 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number[],
): void {
  ctx.save();
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export async function exportPdf(doc: TrackDoc): Promise<void> {
  const landscape = doc.board.widthM >= doc.board.heightM;
  const pageWmm = landscape ? PAGE_W_MM : PAGE_H_MM;
  const pageHmm = landscape ? PAGE_H_MM : PAGE_W_MM;
  const pageW = Math.round(pageWmm * MM_TO_PX);
  const pageH = Math.round(pageHmm * MM_TO_PX);
  const margin = Math.round(MARGIN_MM * MM_TO_PX);

  const page = document.createElement('canvas');
  page.width = pageW;
  page.height = pageH;
  const ctx = page.getContext('2d');
  if (!ctx) throw new Error('无法创建 PDF 画布');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pageW, pageH);
  ctx.textBaseline = 'alphabetic';

  // Header
  ctx.fillStyle = '#ff7a45';
  ctx.fillRect(margin, margin, 56, 8);

  ctx.fillStyle = '#111827';
  ctx.font = '700 108px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  const title = truncate(ctx, doc.name || '未命名赛道', pageW - margin * 2);
  ctx.fillText(title, margin, margin + 118);

  ctx.fillStyle = '#64748b';
  ctx.font = '400 46px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  const meta = `${formatM(doc.board.widthM)} × ${formatM(doc.board.heightM)} m  ·  ${doc.board.cellSize} m 网格  ·  ${doc.tiles.length} 块瓦片  ·  ${formatM(doc.tiles.length * 9)} m²`;
  ctx.fillText(meta, margin, margin + 188);

  const headerBottom = margin + 245;
  const footerTop = pageH - margin - 150;

  // Board image
  const targetWidth = Math.min(pageW - margin * 2, 3000);
  const ppm = Math.max(18, Math.min(140, targetWidth / doc.board.widthM));
  const board = await renderBoardCanvas(doc, { ppm, grid: false, background: 'white' });
  const maxW = pageW - margin * 2;
  const maxH = footerTop - headerBottom - 26;
  const scale = Math.min(maxW / board.width, maxH / board.height);
  const drawW = board.width * scale;
  const drawH = board.height * scale;
  const drawX = (pageW - drawW) / 2;
  const drawY = headerBottom + (maxH - drawH) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(drawX, drawY, drawW, drawH);
  ctx.restore();

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(board, drawX, drawY, drawW, drawH);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(drawX - 1, drawY - 1, drawW + 2, drawH + 2);

  // Scale bar
  const pxPerMeter = drawW / doc.board.widthM;
  const scaleMeters = niceMeters(Math.min(doc.board.widthM, 60));
  const barW = scaleMeters * pxPerMeter;
  const barY = footerTop + 44;
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(margin, barY);
  ctx.lineTo(margin + barW, barY);
  ctx.moveTo(margin, barY - 9);
  ctx.lineTo(margin, barY + 9);
  ctx.moveTo(margin + barW, barY - 9);
  ctx.lineTo(margin + barW, barY + 9);
  ctx.stroke();
  ctx.fillStyle = '#475569';
  ctx.font = '500 38px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  ctx.fillText(`${scaleMeters} m`, margin, barY + 62);

  // Legend
  const legendX = pageW - margin - 520;
  const legendY = footerTop + 20;
  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(legendX, legendY);
  ctx.lineTo(legendX + 54, legendY);
  ctx.stroke();
  ctx.fillStyle = '#475569';
  ctx.font = '400 34px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  ctx.fillText('赛道边线', legendX + 72, legendY + 12);

  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 3;
  drawDashedLine(ctx, legendX, legendY + 54, legendX + 54, legendY + 54, [12, 8]);
  ctx.fillStyle = '#475569';
  ctx.fillText('中心线', legendX + 72, legendY + 66);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(legendX, legendY + 108);
  ctx.lineTo(legendX + 54, legendY + 108);
  ctx.stroke();
  ctx.fillStyle = '#475569';
  ctx.fillText('起终点', legendX + 72, legendY + 120);

  // Footer
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, footerTop + 100);
  ctx.lineTo(pageW - margin, footerTop + 100);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 30px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  const date = new Date().toLocaleString('zh-CN', { hour12: false });
  ctx.fillText(`RC Track Designer  ·  ${date}`, margin, pageH - margin + 6);
  ctx.textAlign = 'right';
  ctx.fillText('A4 · 300 DPI', pageW - margin, pageH - margin + 6);
  ctx.textAlign = 'left';

  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  pdf.addImage(page.toDataURL('image/png'), 'PNG', 0, 0, pageWmm, pageHmm, undefined, 'FAST');
  pdf.setProperties({
    title: doc.name || '未命名赛道',
    subject: 'RC 赛道设计图',
    author: 'RC Track Designer',
    creator: 'RC Track Designer',
  });
  pdf.save(`${safeFilename(doc.name)}-${timestamp()}.pdf`);
}
