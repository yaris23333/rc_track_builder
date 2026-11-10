# 代码架构（ARCH）

> 文档编号：ARCH-1
> 版本：v0.1
> 日期：2026-11-09
> 关联：[engineering.md](engineering.md)（仓库/部署/CI）、[requirements-phase1.md](requirements-phase1.md)（功能契约）、[spec-v1.md](spec-v1.md)（v1 基线）

---

## 1. 为什么从 SPA demo 改成 Monorepo + 框架

改造前是一个 `src/` 平铺的 Vite SPA：没有路由、`App.tsx` 兼职页面与快捷键、全部领域逻辑与 UI 混在一起、`localStorage` 与 `window.location` 直接写在模型层。它能跑，但无法支撑已经写进需求文档的两件事：

1. 发布 `@rctrack/core`；用同一套几何/校验给 Web 之外的 MCP server、CLI、CI 校验器复用；
2. 把"只读分享预览 / 编辑器 / 未来的示例库"拆成真正的页面，而不是靠一个 `readOnly` 布尔量切换。

因此做了两件事，且**不改功能**：

- **工程形态**：pnpm workspace monorepo，拆出纯核心包；
- **Web 框架**：React Router v7 framework mode（`ssr: false`，SPA 模式），用文件约定（`app/`、`root.tsx`、`routes.ts`、`clientLoader`）替代手写入口与 hash 分发。

---

## 2. 仓库结构

```text
rcTrack/
├─ apps/
│  └─ web/                        # 浏览器编辑器（唯一可执行 UI）
│     ├─ react-router.config.ts   # ssr:false + basename(APP_BASE)
│     ├─ vite.config.ts           # reactRouter() 插件、~ 别名、base
│     ├─ public/                  # favicon、_redirects（Cloudflare 兜底）
│     └─ app/
│        ├─ root.tsx              # <html> 骨架、HydrateFallback、ErrorBoundary
│        ├─ routes.ts             # 路由表（index / s/:token / *）
│        ├─ routes/
│        │  ├─ editor.tsx         # clientLoader：恢复本地草稿，兼容旧 hash 分享
│        │  ├─ share.tsx          # clientLoader：解码载荷 → 只读预览
│        │  └─ not-found.tsx      # 404 页面
│        ├─ components/           # UI 部件 + EditorApp（编辑器外壳）
│        ├─ store/useStore.ts     # Zustand：文档、历史、选中、视口、Toast
│        ├─ lib/
│        │  ├─ share.ts           # URL 组装、localStorage、legacy hash
│        │  ├─ dom.ts             # 下载、输入框判定、文件名
│        │  └─ export/            # png / pdf / dxf 下载封装（依赖 DOM）
│        └─ styles.css
├─ packages/
│  └─ core/                       # @rctrack/core：纯 TypeScript 领域核心
│     └─ src/
│        ├─ types.ts              # TrackDoc / TileDef / Port / Issue…
│        ├─ geometry.ts           # 整数倍网格、吸附、碰撞、样例文档
│        ├─ tiles.ts              # 8 种瓦片几何与端口
│        ├─ ports.ts              # 端口世界坐标、法线变换
│        ├─ validate.ts           # 闭合/重叠/越界校验 + Issue 码
│        ├─ share.ts              # deflate + base64url 编解码（无 DOM）
│        ├─ export/dxf.ts         # DXF R12/R2000 字符串构建（无 DOM）
│        └─ *.test.ts             # 21 个单测
├─ docs/                          # 需求、规格、工程、架构
├─ tsconfig.base.json             # 共享 TS 配置
├─ pnpm-workspace.yaml            # workspace 与依赖构建白名单
└─ package.json                   # 根脚本：dev / build / test / typecheck
```

---

## 3. 依赖方向

```text
        ┌──────────────────────────────┐
        │ apps/web (React Router SPA)  │
        │  组件 / 路由 / store / 导出  │
        └──────────────┬───────────────┘
                       │ import（只允许单向）
        ┌──────────────▼───────────────┐
        │ packages/core (@rctrack/core)│
        │  纯函数：几何 / 端口 / 校验  │
        └──────────────────────────────┘
```

硬边界（评审时按此检查）：

| 规则 | 说明 |
|---|---|
| core 不依赖 DOM / React / Zustand | 唯一例外是 `btoa/atob` 这类通用编码函数 |
| core 不做下载、写文件、读 localStorage | 副作用一律留在 `apps/web/app/lib` |
| web 不复制领域算法 | 端口变换、碰撞、DXF 拼装只能来自 `@rctrack/core` |
| 路由模块只做"取数 + 渲染" | 业务逻辑进 store 或 core，避免 route 文件变巨石 |

依赖通过 workspace 协议表达：`"@rctrack/core": "workspace:*"`，`exports` 直接指向 `src/index.ts`，因此本地开发不需要先构建 core。等 core 要真正发 npm 时再引入打包（tsup/rollup）与 `dist` 出口。

---

## 4. 路由与数据流

| 路径 | 模块 | 行为 |
|---|---|---|
| `/` | `routes/editor.tsx` | `clientLoader` 读 localStorage；没有草稿则新建空白文档 |
| `/s/:token` | `routes/share.tsx` | `clientLoader` 解码载荷 → `bootstrap(doc, { readOnly: true })`；失败抛 400 |
| `*` | `routes/not-found.tsx` | 404 页面 |
| `/#/s/<payload>` | `routes/editor.tsx` | 旧链接兼容：识别 hash 后重定向到 `/s/<payload>` |

关键点：

- **SPA 模式仍会在构建期预渲染 root**，所以模块顶层不能碰 `window` / `localStorage`。store 的初始状态因此固定为空文档，真实文档一律在 `clientLoader` 里通过 `bootstrap()` 注入；
- `booted` 标志控制自动保存，避免"还没恢复草稿就先存了一份空文档"，覆盖用户本地数据；
- 分享链接从 hash 改为路径段（`/s/<payload>`），便于日后做 OG 预览、短链或服务端校验；旧 hash 链接不失效。

---

## 5. 构建与部署

```bash
pnpm install
pnpm dev        # react-router dev → http://127.0.0.1:5173
pnpm typecheck  # core tsc + web tsc
pnpm test       # core vitest（21 用例）
pnpm build      # react-router build → apps/web/build/client
pnpm preview    # vite preview（产物目录 build/client）
```

- 产物是 `apps/web/build/client`，纯静态；
- `APP_BASE` 同时驱动 Vite `base` 与路由 `basename`：
  - GitHub Pages 项目站：`APP_BASE=/<repo>/`（工作流已自动设置）；
  - Cloudflare Pages / 自定义域名：不设置，默认 `/`；
- SPA 深链兜底：GitHub Pages 由工作流生成 `404.html`，Cloudflare 由 `public/_redirects` 处理；
- CI：`ci.yml` 跑 PR 与分支推送；`deploy.yml` 在 `main` 上跑门禁，并由 `PAGES_READY` 变量控制是否真正发布。

---

## 6. 旧结构 → 新结构映射

| 旧 | 新 | 说明 |
|---|---|---|
| `src/types.ts` | `packages/core/src/types.ts` | 领域类型 |
| `src/model/geometry.ts` | `packages/core/src/geometry.ts` | 纯函数保留，样例数据一并迁移 |
| `src/model/tiles.ts` | `packages/core/src/tiles.ts` | — |
| `src/core/{ports,validate}.ts` | `packages/core/src/{ports,validate}.ts` | core 与 model 合并为单一核心包 |
| `src/model/share.ts` | 拆分：编解码 → `core/share.ts`；URL/存储 → `web/lib/share.ts` | 去掉模型层的浏览器副作用 |
| `src/export/dxf.ts` | 拆分：`buildDxf` → `core/export/dxf.ts`；下载 → `web/lib/export/dxf.ts` | 便于 MCP/CLI 复用 |
| `src/export/{png,pdf}.ts` | `apps/web/app/lib/export/*` | 依赖 Canvas / jsPDF，留在 Web |
| `src/App.tsx` | `apps/web/app/components/EditorApp.tsx` + `routes/editor.tsx` | 页面壳与路由入口分离 |
| `src/main.tsx` / `index.html` | `app/root.tsx` + 框架默认入口 | 由框架生成 HTML |
| `src/store/useStore.ts` | `apps/web/app/store/useStore.ts` | 初始化改为 `bootstrap()`，SSR 安全 |

---

## 7. 下一步（按优先级）

1. ESLint + Prettier 接入 CI（当前只有 tsc / vitest / build 三道门禁）；
2. 拆分 `Canvas.tsx`（637 行）与 `styles.css`，按"画布交互 / 渲染 / 样式 token"分层；
3. 新增 `packages/mcp`（stdio server），复用 `@rctrack/core` 打通 FR-11；
4. 给 store 补组件级测试（`@testing-library/react` + jsdom）；
5. 分享页 OG 预览需要 SSR 或边缘函数，届时再评估是否给 web 开启服务端渲染。
