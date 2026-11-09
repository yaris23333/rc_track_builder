import type { ReactNode } from 'react';

export type IconName =
  | 'undo'
  | 'redo'
  | 'zoom-in'
  | 'zoom-out'
  | 'fit'
  | 'settings'
  | 'share'
  | 'download'
  | 'trash'
  | 'rotate-cw'
  | 'rotate-ccw'
  | 'flip-h'
  | 'flip-v'
  | 'copy'
  | 'close'
  | 'plus'
  | 'grid'
  | 'link'
  | 'image'
  | 'pdf'
  | 'dxf'
  | 'json'
  | 'chevron-down'
  | 'chevron-right'
  | 'cursor'
  | 'hand'
  | 'check'
  | 'alert'
  | 'sparkles'
  | 'folder'
  | 'arrow-left'
  | 'external'
  | 'info'
  | 'layers'
  | 'ruler'
  | 'track';

const paths: Record<IconName, ReactNode> = {
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a4.5 4.5 0 0 1 0 9H11" />,
  redo: <path d="m15 14 5-5-5-5M20 9H9.5a4.5 4.5 0 0 0 0 9H13" />,
  'zoom-in': (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5M11 8.5v5M8.5 11h5" />
    </>
  ),
  'zoom-out': (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5M8.5 11h5" />
    </>
  ),
  fit: (
    <>
      <path d="M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4M16 21h4a1 1 0 0 0 1-1v-4" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.16.38.4.72.7 1 .3.27.68.4 1.1.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.6Z" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  download: <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  trash: <path d="M4 7h16M9 7V4h6v3m-8 0 1 14h8l1-14M10 11v6M14 11v6" />,
  'rotate-cw': <path d="M20 5v5h-5M20 10a8 8 0 1 0 .5 4" />,
  'rotate-ccw': <path d="M4 5v5h5M4 10a8 8 0 1 1-.5 4" />,
  'flip-h': <path d="M12 3v18M8 7 4 12l4 5M16 7l4 5-4 5" />,
  'flip-v': <path d="M3 12h18M7 8l5-4 5 4M7 16l5 4 5-4" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  grid: <path d="M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" />,
  link: <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 15-5-5L5 20" />
    </>
  ),
  pdf: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
      <path d="M14 3v6h6M9 14h6M9 17h4" />
    </>
  ),
  dxf: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
      <path d="M14 3v6h6M8 17l3-6 3 6M9 15h4" />
    </>
  ),
  json: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
      <path d="M14 3v6h6M10 12c-1 0-1 .7-1 1.5S8.5 15 8 15s1 .2 1 1.5-.1 1.5 1 1.5M14 12c1 0 1 .7 1 1.5s.5.5 1 .5-1 .2-1 1.5.1 1.5-1 1.5" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  cursor: <path d="m5 3 14 8-6 1.5L10 19Z" />,
  hand: <path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V12m0-2.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.8-2.4L4 13.5a1.6 1.6 0 0 1 2.5-2L8 13" />,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  alert: (
    <>
      <path d="M12 3 2.5 20h19Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  sparkles: <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z" />,
  folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  'arrow-left': <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5" />,
  ruler: (
    <>
      <path d="M3 15.5 15.5 3 21 8.5 8.5 21Z" />
      <path d="m7 11 2 2m2-6 2 2m2-6 2 2M5 13l2 2m2-6 2 2m2-6 2 2" />
    </>
  ),
  track: (
    <>
      <path d="M7 20c-3 0-4-2.5-2.5-5L8 7c1.2-2.4 3.4-3.5 5.5-2.6 2.6 1.1 3 4.4 1.4 7.1L12.6 16c-1 1.6-.3 3.2 1.4 3.2H18" />
      <path d="M3 20h7M18 6h3" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
