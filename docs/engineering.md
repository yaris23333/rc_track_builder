# 项目工程说明（Engineering Handbook）

> 文档编号：ENG-1
> 版本：v0.2
> 状态：初稿（随工程实践更新）
> 日期：2026-11-09
> 关联：[requirements-phase1.md](requirements-phase1.md)（产品需求）、[spec-v1.md](spec-v1.md)（v1 基线）、[feasibility.md](feasibility.md)（参考站分析）

---

## 0. 文档定位

本文只回答**工程与运维**问题：仓库怎么管、代码怎么合、网站放哪、要不要后端、花多少钱、出问题怎么回滚。

| 文档 | 负责 | 不负责 |
|---|---|---|
| `requirements-phase1.md` | 产品功能、交互规则、验收标准 | 部署、服务器、账号、CI |
| `engineering.md`（本文） | 仓库、Git 工作流、托管、后端选型、CI/CD、运维 | 功能细节、交互设计 |
| `spec-v1.md` | v1 历史规格 | 后续规划 |
| `feasibility.md` | 参考站分析 | 本项目的工程决策 |

**原则**：需求文档不写"服务器怎么买"，工程文档不写"按钮点了之后发生什么"。

---

## 1. 结论先行

1. **Git 不是后端**。GitHub 能存代码、跑 CI、托管静态文件，但不能按请求执行你的程序、不能当数据库、不能做用户登录。
2. **一期不需要后端**。当前产品是纯静态 SPA：分享用 URL hash，数据在浏览器本地。托管到 Cloudflare Pages 即可，零服务器、零数据库、零月费（域名除外）。
3. **不要租 VPS，更不要长期开一台电脑当生产服务器**。等真正出现"短链、云存档、账号、远程 MCP"需求时，用 Serverless（Cloudflare Workers + KV/D1）按需加，成本从 0 开始。
4. **GitHub 负责"代码与协作"，Cloudflare 负责"运行与分发"**，两者职责分离。
5. 仓库已公开并完成首次推送（`main`），账号隔离已解决；下一步是 `LICENSE`、CI 与托管接入（见 §9）。

---

## 2. 仓库与项目管理

### 2.1 仓库信息

| 项 | 值 |
|---|---|
| 托管 | GitHub |
| 账号 | <https://github.com/yaris23333> |
| 仓库名 | `rc_track_builder` |
| 可见性 | **Public**（2026-11-09 提前开放；原计划稳定后公开） |
| 默认分支 | `main` |
| 本地目录 | `~/Desktop/rcTrack`（目录名与仓库名不同，不影响） |
| Remote | `git@github-yaris:yaris23333/rc_track_builder.git` |

本地已完成：

```bash
git init -b main
git add -A
git commit -m "chore: bootstrap rc_track_builder repository"
git remote add origin git@github-yaris:yaris23333/rc_track_builder.git
git push -u origin main
```

已完成首次 push（2026-11-09）；仓库地址：<https://github.com/yaris23333/rc_track_builder>。

### 2.2 分支模型

采用 trunk-based，不引入 develop/release 长期分支：

| 分支 | 用途 | 生命周期 |
|---|---|---|
| `main` | 始终可构建、可部署 | 长期 |
| `feat/<slug>` | 新功能 | 合并即删 |
| `fix/<slug>` | 缺陷修复 | 合并即删 |
| `docs/<slug>` | 文档调整 | 合并即删 |
| `chore/<slug>` | 构建、依赖、配置 | 合并即删 |

规则：

- 所有改动走 PR，即使是单人开发（用于自审、CI、变更记录）；
- PR 合并用 **Squash merge**，保持 `main` 线性历史；
- 合并后删除远端分支；
- 紧急修复可直接提交 `main`，但需在当天补一条变更记录。

### 2.3 提交信息

采用 Conventional Commits：

```text
<type>(<scope>): <subject>

<body 可选>

<footer 可选>
```

| type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | 缺陷 |
| `docs` | 文档 |
| `refactor` | 重构（不改行为） |
| `test` | 测试 |
| `chore` | 构建、依赖、配置 |
| `ci` | CI/CD |

scope 建议：`core`、`web`、`mcp`、`dxf`、`pdf`、`share`、`tiles`、`docs`、`repo`。

示例：

```text
feat(core): add port model and connection validation
fix(dxf): keep block outline closed after rotation
docs(requirements): clarify FR-04 issue codes
```

### 2.4 文档与需求的 Git 管理

- **需求变更**：改 `requirements-phase1.md` 的 FR 条目 + §12 修订记录，作为一个 `docs(requirements): ...` 提交；
- **工程决策**：改本文，或新增 `docs/adr/NNNN-<title>.md`（架构决策记录，可选）；
- **禁止**：在需求文档里混入部署/账号/服务器内容；在工程文档里复制功能验收标准；
- **追溯**：PR 描述里引用 FR 编号（如 `Implements FR-03, FR-04`），便于从代码反查需求。

### 2.5 版本与发布

| 对象 | 版本策略 |
|---|---|
| Web 应用 | 跟随里程碑 `v0.x.y`，`x` 对应阶段，`y` 对应修复 |
| `@rctrack/core` | SemVer，独立发布 |
| `@rctrack/mcp` | 与 core 同步 |
| 文档 | 文档内版本号（FR-1 v1.0、ENG-1 v0.1） |
| 赛道数据 | `schemaVersion` / `tileSetVersion`，与代码版本解耦 |

发布流程：

1. 更新 `CHANGELOG.md`；
2. 打 tag：`git tag -a v0.1.0 -m "..."`；
3. push tag；
4. CI 构建产物，创建 GitHub Release（附构建说明）；
5. Cloudflare Pages 自动部署 `main`，或按 tag 手动回滚。

### 2.6 公开仓库检查清单

仓库已于 2026-11-09 提前公开（原计划稳定版后公开）。以下项按紧急程度补齐：

- [ ] **`LICENSE`（最高优先）**：未声明协议时默认保留所有权利，与"开源免费"目标冲突；需在需求文档 D8 / 附录 B Q1 中拍板后立刻添加；
- [x] `README.md` 无内部信息、无未授权素材；
- [x] 全历史 secret 扫描通过（本地规则扫描；建议再开 GitHub Secret Scanning）；
- [ ] `CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、Issue/PR 模板就绪；
- [ ] 依赖许可证审查（`pnpm licenses list`）；
- [ ] 示例数据不含真实个人信息；
- [ ] CI 对 fork PR 正常工作；
- [ ] 分支保护、Dependabot、Security advisories 已开启；
- [ ] 首发 Release 说明与迁移指南。

### 2.7 代码架构（2026-11-09 起）

仓库已从单包 Vite SPA 迁移为 **pnpm workspace monorepo + React Router 7 framework mode（SPA）**：

| 包/目录 | 职责 | 约束 |
|---|---|---|
| `apps/web` | 编辑器 UI、路由、导出下载、浏览器能力 | 不复制领域算法 |
| `packages/core` | 几何、瓦片、端口、校验、分享编解码、DXF 构建 | 禁止依赖 DOM / React / Zustand |

- core 通过 `exports` 直接暴露 `src/index.ts`，本地开发无需预构建；真正发布 npm 时再补打包产物；
- 完整的目录说明、路由表、数据流与"旧结构 → 新结构"映射见 [architecture.md](architecture.md)；
- 新增领域逻辑先判断归属：能被 MCP/CLI/CI 复用 → `packages/core`；只在浏览器里成立 → `apps/web/app/lib`。


---

## 3. 部署架构（一期）

### 3.1 当前形态：纯静态

```text
┌──────────────────────────────┐
│ Browser                      │
│  React SPA (Vite build)      │
│  ├─ localStorage / IndexedDB │
│  ├─ URL hash (#/s/...)       │
│  └─ 本地导出 PNG/PDF/DXF/JSON │
└──────────────┬───────────────┘
               │ HTTPS（仅取静态文件）
┌──────────────▼───────────────┐
│ Cloudflare Pages（CDN）       │
│  build/client 静态资源        │
└──────────────────────────────┘
```

- 没有 API、没有数据库、没有账号；
- 分享数据在 URL 里，不经过服务器；
- 所有导出在浏览器完成；
- 断网可继续编辑（首次加载后）。

### 3.2 托管选型

| 方案 | 公开仓库免费？ | 静态托管 | Serverless | 预览部署 | 结论 |
|---|---|---|---|---|---|
| **Cloudflare Pages** | 是 | 是，全球 CDN | Workers / KV / D1 / R2 | 每个 PR 一个预览 URL | **推荐** |
| GitHub Pages | 是（公开仓库免费） | 是 | 无 | 无 | 可选；无 Functions / 预览 |
| Vercel | 是（Hobby） | 是 | Functions | 是 | 可选，商用条款需注意 |
| Netlify | 是 | 是 | Functions | 是 | 可选 |
| 自建 Nginx + VPS | — | 是 | 自己写 | 自己搭 | 不推荐 |

**选择 Cloudflare Pages 的理由**：

1. 公开仓库下 GitHub Pages 也免费，但 Cloudflare 多了 PR 预览与同平台 Workers，后续加后端不用换厂商；
2. 静态请求与带宽免费额度足够一个社区工具；
3. PR 预览、原子回滚、自定义域名、HTTPS 开箱即用；
4. 后续加短链/云存档时，Workers + KV/D1 与 Pages 同平台，迁移成本最低；
5. 国内访问情况需实测，必要时配自定义域名与备用托管。

### 3.3 域名与 HTTPS

- 域名可选，先可以用 `*.pages.dev` 子域；
- 正式发布建议自有域名（约 ¥70/年），便于品牌与迁移；
- HTTPS 由平台自动签发与续期，不需要自己维护证书。

### 3.4 已落地的部署流水线（GitHub Pages 通道）

`.github/workflows/deploy.yml` 已就绪，采用**发布闸门**设计：

- `push main` 触发，先跑 `install --frozen-lockfile → typecheck → test → build`，即 CI 门禁；
- 配置 Pages、上传产物、`deploy-pages` 三步由仓库变量 `PAGES_READY == 'true'` 控制，未发布前自动跳过，提交记录保持绿色；
- 产物目录改为 `apps/web/build/client`（React Router SPA 模式）；`APP_BASE` 同时驱动 Vite `base` 与路由 `basename`，GitHub Pages 项目站由工作流自动设为 `/<repo>/`，自定义域名不设置即可；
- GitHub Pages 没有 SPA rewrite，工作流会把 `index.html` 复制为 `404.html`，保证 `/s/<payload>` 深链可用。

正式发布（选 GitHub Pages 时）只需两步，均需仓库所有者操作：

1. `Settings → Pages → Build and deployment → Source` 选 **GitHub Actions**；
2. `Settings → Secrets and variables → Actions → Variables` 新建 `PAGES_READY = true`。

之后每次 `git push main` 自动构建并发布，地址形如 `https://<user>.github.io/<repo>/`。

若最终改选 Cloudflare Pages：可直接在控制台连接 GitHub 仓库（构建命令 `pnpm install && pnpm build`，产物目录 `apps/web/build/client`），SPA 深链由 `apps/web/public/_redirects` 兜底。

**时间成本提醒**：面向国内用户的正式发布，域名注册 + ICP 备案是 1–3 周的串行流程，应在发布节点前启动，而不是发布当天。

---

## 4. 后端：要不要、什么时候要、怎么选

### 4.1 Git / GitHub 能做什么，不能做什么

| 能力 | Git / GitHub | 说明 |
|---|---|---|
| 版本控制、历史、回滚 | ✅ | 核心能力 |
| PR 评审、Issue、里程碑 | ✅ | 项目管理 |
| CI（构建、测试） | ✅ | GitHub Actions |
| 定时任务 | ⚠️ 有限 | Actions cron 可跑批处理，但不是请求时后端 |
| 静态网站托管 | ✅ | Pages（公开仓库免费） |
| 按请求执行 API | ❌ | 没有常驻运行时 |
| 数据库 / 文件存储 | ❌ | 仓库不适合存业务数据与大文件 |
| 用户登录 / 权限 | ❌ | 需外部服务 |
| 实时协作 / WebSocket | ❌ | 需常驻服务 |

**不要**把 JSON 提交进仓库当数据库、用 Issue 当存储、用 Actions 当 API——这些做法在数据量、并发、权限、审计上都会失控。

### 4.2 什么时候才需要后端

出现以下任一需求时再立项，不要提前建：

| 触发需求 | 为什么静态做不了 | 优先级 |
|---|---|---|
| 短链 / 固定二维码 | URL hash 太长，无法稳定短址 | P2（需求文档 Q4） |
| 云存档 / 多设备同步 | 需要账号与持久化存储 | 未排期 |
| 分享页 OG 预览 | 爬虫不执行 JS，需要服务端渲染 meta | P2 |
| 访问统计 / 错误上报 | 需要收集端 | P2 |
| 远程 MCP（网页版 AI 客户端） | 需要 HTTPS 端点 | P2（Q5） |
| 社区瓦片市场 / 审核 | 需要存储、检索、审核 | P3 |
| 多人实时协作 | 需要 WebSocket / CRDT 服务 | 未排期 |

**判断标准**：如果功能在浏览器本地能完成，就不加后端。

### 4.3 方案对比

| 方案 | 形态 | 成本 | 运维负担 | 适合 |
|---|---|---|---|---|
| 纯静态 | Pages/CDN | 0 | 极低 | 一期，当前 |
| Serverless | Workers/Functions + KV/D1/R2 | 免费额度起步，按量计费 | 低（无服务器） | 短链、云存档、OG、远程 MCP |
| BaaS | Supabase / Firebase | 免费额度 | 低 | 需要账号/DB 且不想写后端 |
| VPS | Hetzner / Fly / DO | $5–20/月 | 高（系统、TLS、备份、扩容） | 长任务、WebSocket、特殊依赖 |
| 家用电脑 + Tunnel | Cloudflare Tunnel | 电费 | 极高（可用性、安全、断网） | 仅本地演示，不做生产 |

### 4.4 推荐路径

```text
一期（现在）      纯静态 + Cloudflare Pages
   │
   ├─ 需要短链     Workers + KV（只加一个函数）
   ├─ 需要云存档   Workers + D1（或 Supabase）
   ├─ 需要文件     R2（导出物、瓦片包）
   └─ 需要实时协作 再评估 Durable Objects / 专门服务
```

原则：

- **按需增量**：一次只加一个后端能力，能回退；
- **同平台优先**：Cloudflare 内部组合，减少跨厂商鉴权与网络；
- **数据可导出**：任何云端数据必须提供导出，避免锁定；
- **VPS 最后考虑**：只有出现长连接、常驻进程、特殊二进制依赖时才用。

### 4.5 成本估算

| 项 | 现阶段 | 费用 |
|---|---|---|
| 域名 | 可选 | ≈ ¥70/年 |
| Cloudflare Pages | 静态托管 | ¥0 |
| GitHub 公开仓库 | Actions 分钟数不限 | ¥0 |
| Serverless（未来） | 免费额度内 | ¥0 起 |
| BaaS（未来，可选） | 免费额度 | ¥0 起 |
| VPS（不推荐） | — | $5–20/月 |
| 监控（Sentry 等） | 免费额度 | ¥0 |

一个开源免费项目的可持续成本，基本只有域名；若流量增长，优先用平台免费额度与静态缓存，而不是买服务器。

---

## 5. 本地开发环境

| 项 | 要求 |
|---|---|
| Node.js | ≥ 20（建议 22 LTS） |
| 包管理 | pnpm（仓库含 `pnpm-lock.yaml`） |
| 系统 | macOS / Linux / Windows（WSL 亦可） |
| 浏览器 | Chrome / Edge / Safari 最近两个大版本 |

常用命令：

```bash
pnpm install
pnpm dev        # 本地开发 http://127.0.0.1:5173
pnpm test       # 单元测试
pnpm typecheck  # 类型检查
pnpm build      # 生产构建
pnpm preview    # 预览构建产物
```

约定：

- 不提交 `node_modules/`、`build/`、`.react-router/`、`.pnpm-store/`、本地 `.env`；
- 需要环境变量时提交 `.env.example`，真实值走 GitHub Secrets / 平台变量；
- 构建必须可重复：锁文件进仓库，CI 用 `--frozen-lockfile`。

---

## 6. CI/CD

### 6.1 CI（GitHub Actions）

两条工作流：

| 文件 | 触发 | 作用 |
|---|---|---|
| `.github/workflows/ci.yml` | `pull_request`、非 `main` 分支 push | `install → typecheck → test → build`，PR 门禁 |
| `.github/workflows/deploy.yml` | `push main`、手动 | 同上，并在 `PAGES_READY=true` 时发布 Pages |

```text
→ checkout
→ setup node + pnpm（带缓存）
→ pnpm install --frozen-lockfile
→ pnpm typecheck   # core tsc + web tsc
→ pnpm test        # @rctrack/core vitest
→ pnpm build       # react-router build → apps/web/build/client
→ （deploy）SPA fallback + 上传 Pages artifact
```

后续追加：

- `validate:examples`（用 core 校验 `examples/*.json`）；
- DXF 快照对比；
- `pnpm audit` / Dependabot；
- 文档链接检查（可选）。

公开仓库的 Actions 分钟数不限。缓存依赖可显著降低耗时。

### 6.2 CD（部署）

- **首选**：Cloudflare Pages 的 Git 集成，`main` 推送自动构建部署，PR 自动生成预览；
- **备选**：Actions 里用 Wrangler 部署（需要 `CLOUDFLARE_API_TOKEN` Secret）；
- **回滚**：Cloudflare 控制台选择上一个部署，或 revert 对应提交后重新部署；
- **不要**在服务器上手工 `git pull` 运行。

### 6.3 质量门禁

- `main` 必须通过 CI 才能合并；
- 分支保护（公开仓库可免费开启必需检查）；
- 发布前跑一次 `pnpm build` + 手工冒烟（导出 PNG/PDF/DXF/分享链接）。

---

## 7. 安全、隐私与合规

| 项 | 现状 | 要求 |
|---|---|---|
| 用户数据 | 无账号，数据在浏览器 | 不收集 PII；清理浏览器数据即删除 |
| 分享链接 | 设计数据编码在 URL | 文档提示"拿到链接即可查看"，聊天软件可能缓存 |
| 第三方脚本 | 无 | 不引入分析/广告脚本，除非明确告知 |
| 依赖安全 | 锁文件 | Dependabot + 定期 `pnpm audit` |
| Secret | 无 | 禁止入库；泄露即轮换 |
| MCP | 本地 stdio | 文件写入限制在 `out/`，拒绝路径穿越 |
| 后端（未来） | 未建 | 先定隐私政策、数据导出与删除路径，再上线 |

开源后的额外要求：

- `SECURITY.md` 说明漏洞上报方式；
- GitHub Security Advisories 开启；
- 许可证与第三方素材来源清晰（参考站分析已注明 clean-room）。

---

## 8. 运维与监控

一期（纯静态）几乎没有运维：

| 项 | 做法 |
|---|---|
| 可用性 | 平台 SLA + 外部 uptime 检查（可选） |
| 错误 | 浏览器 console + 用户反馈；后续接 Sentry 免费额度 |
| 性能 | Cloudflare 缓存；构建产物体积监控 |
| 备份 | GitHub 即源码备份；本地保留 clone |
| 数据备份 | 一期无服务端数据；未来 D1 需定时导出 |
| 故障处理 | 回滚部署 → 定位提交 → 修复 → 重新发布 |

注意：**Git 不是数据库备份**。未来有云端数据后，备份策略要单独设计（导出到 R2/对象存储，定期演练恢复）。

---

## 9. 当前状态与阻塞项

### 9.1 GitHub 账号隔离（已解决）

背景：

- `gaohaizhao-fenrir` 是**公司账号**，本机原有 SSH key 属于它；
- `yaris23333` 是**个人账号**，本项目仓库放在该账号下；
- 已为个人账号生成专用 key，两个身份互不共用。

原则：**两个身份不共用 key**。不要把公司 key 加到个人账号，也不要把个人 key 用于公司仓库，否则权限回收或离职时会互相牵连。

推荐做法：为个人账号生成专用 key，并用 SSH host alias 与公司身份并存。

```bash
ssh-keygen -t ed25519 -C "yaris23333@personal" -f ~/.ssh/id_ed25519_yaris23333
```

`~/.ssh/config` 追加：

```sshconfig
Host github-yaris
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_yaris23333
  IdentitiesOnly yes
```

个人仓库的 remote 使用别名：

```bash
git remote set-url origin git@github-yaris:yaris23333/rc_track_builder.git
ssh -T git@github-yaris   # 期望输出：Hi yaris23333!
```

已在 GitHub 个人账号添加公钥、创建公开仓库，并完成首次 push。

备选：使用个人账号的 fine-grained PAT 走 HTTPS，token 存系统钥匙串，不写入仓库。

当前进度（2026-11-09）：

- [x] 生成 `~/.ssh/id_ed25519_yaris23333`（ed25519，无口令，指纹 `SHA256:AXCOyu9p4sZIx0eiYhEsMrLVxZ9xgKda4FuL6C52Vgg`）
- [x] `~/.ssh/config` 增加 `github-yaris` 别名，公司账号配置保持不变
- [x] 加入 ssh-agent / 钥匙串
- [x] remote 切换为 `git@github-yaris:yaris23333/rc_track_builder.git`
- [x] 将公钥添加到 yaris23333 个人账号
- [x] 在个人账号创建**公开**仓库 `rc_track_builder`
- [x] 首次 push（`main` → `origin/main`）

### 9.2 尚未完成

- [ ] 添加 `LICENSE`（最高优先，见 §2.6）；
- [x] 开启 Actions（`deploy.yml` 已跑通，CI 门禁生效）；
- [ ] 接入 Pages 托管（流水线已就绪，等待发布时开启开关，见 §3.4）；
- [ ] 配置自定义域名（可选）；
- [ ] 加 `CHANGELOG.md`；
- [ ] 分支保护与 Dependabot（尽快）。

### 9.3 已确认的工程事实

- 本地仓库已初始化，首个提交 `a6947dd`，并已推送到公开仓库；
- 仓库地址：<https://github.com/yaris23333/rc_track_builder>（Public，`main` 已同步）；
- 远端已配置为 `git@github-yaris:yaris23333/rc_track_builder.git`（通过 `github-yaris` 别名使用个人专用 key）；
- 仓库内无 `.env`、无私钥、无构建产物；
- **提交身份按仓库隔离**：本仓库在 `.git/config` 里使用署名 `yaris23` 与 noreply 邮箱 `263910765+yaris23333@users.noreply.github.com`（可关联 GitHub 账号，不暴露真实邮箱）；全局 `~/.gitconfig` 仍为 `GaoHZ <gaohaizhao@fenrir-tec.com>`，公司仓库与外层 `~/` 仓库不受影响。新克隆时需手动设置一次；
- **历史已按上述身份重写**（2026-11-09）：`git filter-branch --env-filter` 将全部提交的作者与提交者统一为 `yaris23`，随后 `--force-with-lease` 强推并清理 `refs/original`、reflog 与不可达对象；改写前后 HEAD 的 tree 哈希一致，内容未变；
- GUI 客户端使用 Sourcetree 4.2.19（system git `/usr/bin/git`）；remote 保持 SSH 别名 `github-yaris`，**不要让 Sourcetree 的 GitHub 账号/OAuth 接管该仓库**，否则 remote 会被改写为 HTTPS；
- 项目目录位于用户主目录的另一个 Git 仓库内（`/Users/feilang` 是仓库根），**本项目已使用独立 `.git`**，提交时注意不要误操作外层仓库。

---

## 10. 里程碑（工程视角）

| 里程碑 | 内容 | 出口 |
|---|---|---|
| **M0 仓库 bootstrap** | 本地仓库、首次提交、公开远端、首个 push | `main` 推送成功（已完成） |
| **M1 P0 交付** | 端口/校验/搭建图/DXF/测量/core | 对应需求文档 P0 验收通过，Preview 可访问 |
| **M2 P1 交付** | MCP/Skill/开源脚手架 | 外部 agent 演示通过，邀请制 Beta |
| **M3 公开发布** | License、文档站、稳定版 | 稳定版上线，社区可贡献 |

---

## 11. 待定问题（工程侧）

| # | 问题 | 建议 | 截止 |
|---|---|---|---|
| E1 | GitHub 账号权限（§9.1） | ✅ 已完成：专用 SSH key + `github-yaris` 别名 | 已完成 |
| E2 | 托管平台 | Cloudflare Pages | M0 |
| E3 | 域名 | 先 `*.pages.dev`，稳定后再买 | M2 |
| E4 | 开源协议 | 见需求文档 D8 / Q1 | 尽快（仓库已公开） |
| E5 | 是否引入统计 | 默认不引入；如引入需告知并去标识化 | M2 |
| E6 | 云端功能优先级 | 短链 > 云存档 > 远程 MCP | M2 评估 |

---

## 12. 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-11-09 | v0.1 | 初稿：仓库与 Git 工作流、静态部署、后端选型、CI/CD、成本与阻塞项 |
| 2026-11-09 | v0.2 | 仓库改为公开并完成首次 push；账号隔离、托管选型与检查清单同步更新 |
| 2026-11-09 | v0.3 | 新增 §3.4：GitHub Pages 部署流水线（`PAGES_READY` 发布闸门）、`base` 改相对路径；上线动作推迟到发布节点 |
| 2026-11-09 | v0.4 | 提交身份统一为 `yaris23`，并按此重写全部历史（内容不变，仅元数据） |
| 2026-11-09 | v0.5 | 迁移为 monorepo + React Router 7 SPA：新增 `packages/core`、路由化 Web、`APP_BASE`、`ci.yml`；详见 architecture.md |
