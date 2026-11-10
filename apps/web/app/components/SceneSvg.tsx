import { useMemo } from 'react';
import type { TrackDoc } from '@rctrack/core';
import { boardCells } from '@rctrack/core';
import { TILE_BY_ID } from '@rctrack/core';
import { TileArt } from './TileArt';

export interface SceneSvgProps {
  doc: TrackDoc;
  widthPx: number;
  heightPx: number;
  includeGrid?: boolean;
  background?: 'white' | 'transparent';
  strokeScale?: number;
}

export function SceneSvg({
  doc,
  widthPx,
  heightPx,
  includeGrid = true,
  background = 'white',
  strokeScale,
}: SceneSvgProps) {
  const { board, tiles } = doc;
  const { cols, rows } = boardCells(board);
  const scale = strokeScale ?? Math.max(1, widthPx / 1700);

  const { minorPath, majorPath } = useMemo(() => {
    const minor: string[] = [];
    const major: string[] = [];
    const { cellSize, widthM, heightM } = board;
    for (let i = 0; i <= cols; i += 1) {
      const x = i * cellSize;
      const command = `M ${x} 0 V ${heightM}`;
      if (i % 5 === 0) major.push(command);
      else minor.push(command);
    }
    for (let j = 0; j <= rows; j += 1) {
      const y = j * cellSize;
      const command = `M 0 ${y} H ${widthM}`;
      if (j % 5 === 0) major.push(command);
      else minor.push(command);
    }
    return { minorPath: minor.join(' '), majorPath: major.join(' ') };
  }, [board, cols, rows]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={widthPx}
      height={heightPx}
      viewBox={`0 0 ${board.widthM} ${board.heightM}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {background === 'white' ? (
        <rect x={0} y={0} width={board.widthM} height={board.heightM} fill="#ffffff" />
      ) : null}
      {includeGrid ? (
        <>
          <path
            d={minorPath}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={majorPath}
            fill="none"
            stroke="#c8d2df"
            strokeWidth={1.3}
            vectorEffect="non-scaling-stroke"
          />
        </>
      ) : null}
      {tiles.map((tile) => {
        const def = TILE_BY_ID.get(tile.defId);
        if (!def) return null;
        return (
          <TileArt
            key={tile.uid}
            def={def}
            xM={tile.xM}
            yM={tile.yM}
            rotation={tile.rotation}
            flipX={tile.flipX}
            flipY={tile.flipY}
            strokeScale={scale}
          />
        );
      })}
      <rect
        x={0}
        y={0}
        width={board.widthM}
        height={board.heightM}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
