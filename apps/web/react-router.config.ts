import type { Config } from '@react-router/dev/config';

/**
 * SPA 模式：不做运行时服务端渲染，`react-router build` 只在构建期预渲染 root 路由，
 * 产物 build/client 可直接丢给任意静态托管（GitHub Pages / Cloudflare Pages）。
 *
 * APP_BASE 用于子路径部署：
 *   GitHub Pages 项目站 → APP_BASE=/<repo>/
 *   Cloudflare Pages / 自定义域名 → 不设置（默认 /）
 */
const base = process.env.APP_BASE ?? '/';

export default {
  ssr: false,
  basename: base,
} satisfies Config;
