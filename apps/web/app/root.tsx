import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from 'react-router';
import stylesheet from '~/styles.css?url';

export const links = () => [
  { rel: 'icon', href: `${import.meta.env.BASE_URL}favicon.svg`, type: 'image/svg+xml' },
  { rel: 'stylesheet', href: stylesheet },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0b0d12" />
        <meta
          name="description"
          content="RC 赛道网格设计器：物理尺寸优先、严格整数倍网格，支持 PNG / PDF / DXF / 分享链接。"
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/** 构建期写入 index.html 的首屏占位，避免白屏。 */
export function HydrateFallback() {
  return (
    <div className="boot-screen">
      <div className="boot-mark">RC</div>
      <p>正在加载 RC Track Designer…</p>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let title = '出错了';
  let detail = '页面遇到未预期的问题，请返回编辑器重试。';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText || ''}`.trim();
    const payload = error.data as { message?: string } | null;
    detail = payload?.message ?? '请求的页面无法打开。';
  } else if (error instanceof Error) {
    detail = error.message;
  }

  return (
    <div className="boot-screen">
      <div className="boot-mark">RC</div>
      <h1 className="boot-title">{title}</h1>
      <p>{detail}</p>
      <a className="boot-link" href={import.meta.env.BASE_URL}>
        返回编辑器
      </a>
    </div>
  );
}
