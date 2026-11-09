# 项目工程说明（Engineering Handbook）

> 文档编号：ENG-1
> 版本：v0.1
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
5. 当前唯一的工程阻塞：本机 SSH key 属于 `gaohaizhao-fenrir`，目标仓库在 `yaris23333` 名下，**需要先解决账号权限**（见 §9.1）。

---

## 2. 仓库与项目管理

### 2.1 仓库信息

| 项 | 值 |
|---|---|
| 托管 | GitHub |
| 账号 | <https://github.com/yaris23333> |
| 仓库名 | `rc_track_builder` |
| 可见性 | 先 Private，稳定版后转 Public |
| 默认分支 | `main` |
| 本地目录 | `~/Desktop/rcTrack`（目录名与仓库名不同，不影响） |
| Remote | `git@github.com:yaris23333/rc_track_builder.git` |

本地已完成：

```bash
git init -b main
git add -A
git commit -m "chore: bootstrap rc_track_builder repository"
git remote add origin git@github.com:yaris23333/rc_track_builder.git
```

尚未完成：在 GitHub 创建仓库并 `git push -u origin main`（权限问题见 §9.1）。

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

### 2.6 私有 → 开源切换清单

转 Public 之前逐项确认：

- [ ] `LICENSE` 已定（对应需求文档 D8 / 附录 B Q1）；
- [ ] `README.md` 无内部信息、无未授权素材；
- [ ] `CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、Issue/PR 模板就绪；
- [ ] 全历史 secret 扫描通过（`gitleaks` 或 GitHub Secret Scanning）；
- [ ] 依赖许可证审查（`pnpm licenses list`）；
- [ ] 示例数据不含真实个人信息；
- [ ] CI 对 fork PR 正常工作；
- [ ] 分支保护、Dependabot、Security advisories 已开启；
- [ ] 首发 Release 说明与迁移指南。

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
│  dist/ 静态资源               │
└──────────────────────────────┘
```

- 没有 API、没有数据库、没有账号；
- 分享数据在 URL 里，不经过服务器；
- 所有导出在浏览器完成；
- 断网可继续编辑（首次加载后）。

### 3.2 托管选型

| 方案 | 私有仓库免费？ | 静态托管 | Serverless | 预览部署 | 结论 |
|---|---|---|---|---|---|
| **Cloudflare Pages** | 是 | 是，全球 CDN | Workers / KV / D1 / R2 | 每个 PR 一个预览 URL | **推荐** |
| GitHub Pages | **否**（私有仓库需付费计划） | 是 | 无 | 无 | 开源后再考虑 |
| Vercel | 是（Hobby） | 是 | Functions | 是 | 可选，商用条款需注意 |
| Netlify | 是 | 是 | Functions | 是 | 可选 |
| 自建 Nginx + VPS | — | 是 | 自己写 | 自己搭 | 不推荐 |

**选择 Cloudflare Pages 的理由**：

1. 私有仓库也能免费托管（GitHub Pages 在私有仓库下需要付费）；
2. 静态请求与带宽免费额度足够一个社区工具；
3. PR 预览、原子回滚、自定义域名、HTTPS 开箱即用；
4. 后续加短链/云存档时，Workers + KV/D1 与 Pages 同平台，迁移成本最低；
5. 国内访问情况需实测，必要时配自定义域名与备用托管。

### 3.3 域名与 HTTPS

- 域名可选，先可以用 `*.pages.dev` 子域；
- 正式发布建议自有域名（约 ¥70/年），便于品牌与迁移；
- HTTPS 由平台自动签发与续期，不需要自己维护证书。

---

## 4. 后端：要不要、什么时候要、怎么选

### 4.1 Git / GitHub 能做什么，不能做什么

| 能力 | Git / GitHub | 说明 |
|---|---|---|
| 版本控制、历史、回滚 | ✅ | 核心能力 |
| PR 评审、Issue、里程碑 | ✅ | 项目管理 |
| CI（构建、测试） | ✅ | GitHub Actions |
| 定时任务 | ⚠️ 有限 | Actions cron 可跑批处理，但不是请求时后端 |
| 静态网站托管 | ✅ | Pages（私有仓库需付费） |
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
| GitHub 私有仓库 | 含 Actions 免费额度 | ¥0 |
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

- 不提交 `node_modules/`、`dist/`、`.pnpm-store/`、本地 `.env`；
- 需要环境变量时提交 `.env.example`，真实值走 GitHub Secrets / 平台变量；
- 构建必须可重复：锁文件进仓库，CI 用 `--frozen-lockfile`。

---

## 6. CI/CD

### 6.1 CI（GitHub Actions）

一期流水线（`.github/workflows/ci.yml`）：

```text
push / pull_request
  → checkout
  → setup node + pnpm（带缓存）
  → pnpm install --frozen-lockfile
  → pnpm typecheck
  → pnpm test
  → pnpm build
  → 上传 dist  artifact
```

后续追加：

- `validate:examples`（用 core 校验 `examples/*.json`）；
- DXF 快照对比；
- `pnpm audit` / Dependabot；
- 文档链接检查（可选）。

私有仓库的 Actions 有月度免费分钟数；公开后不限。缓存依赖可显著降低耗时。

### 6.2 CD（部署）

- **首选**：Cloudflare Pages 的 Git 集成，`main` 推送自动构建部署，PR 自动生成预览；
- **备选**：Actions 里用 Wrangler 部署（需要 `CLOUDFLARE_API_TOKEN` Secret）；
- **回滚**：Cloudflare 控制台选择上一个部署，或 revert 对应提交后重新部署；
- **不要**在服务器上手工 `git pull` 运行。

### 6.3 质量门禁

- `main` 必须通过 CI 才能合并；
- 分支保护（公开后开启必需检查）；
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

### 9.1 GitHub 账号与 SSH Key 不匹配（阻塞 push）

现状：

- 本机 SSH key 认证到的 GitHub 账号是 `gaohaizhao-fenrir`；
- 目标仓库属于 `yaris23333`；
- `git ls-remote git@github.com:yaris23333/rc_track_builder.git` 返回 `Repository not found`（私有仓库未创建，或当前 key 无权限）。

三种解决方式（任选其一）：

1. **把公钥加到 yaris23333**（推荐）：
   - 复制 `~/.ssh/id_rsa.pub`；
   - GitHub → Settings → SSH and GPG keys → New SSH key；
   - 然后在 yaris23333 下创建私有仓库 `rc_track_builder`；
   - 本机执行 `git push -u origin main`。
2. **使用 yaris23333 的 Personal Access Token（HTTPS）**：
   - 生成 fine-grained token，仅授权该仓库；
   - `git remote set-url origin https://github.com/yaris23333/rc_track_builder.git`；
   - 用系统钥匙串或 `gh auth login` 保存，不写入仓库。
3. **改用 gaohaizhao-fenrir 账号建仓**：如果账号归属可接受，直接在该账号下创建并推送。

### 9.2 尚未完成

- [ ] 在 GitHub 创建 `yaris23333/rc_track_builder`（Private）；
- [ ] 首次 push；
- [ ] 开启 Actions；
- [ ] 接入 Cloudflare Pages；
- [ ] 配置自定义域名（可选）；
- [ ] 加 `CHANGELOG.md` 与 `.github/workflows/ci.yml`；
- [ ] 分支保护与 Dependabot（公开前）。

### 9.3 已确认的工程事实

- 本地仓库已初始化，首个提交 `a6947dd`；
- 远端已配置为 `git@github.com:yaris23333/rc_track_builder.git`；
- 仓库内无 `.env`、无私钥、无构建产物；
- 项目目录位于用户主目录的另一个 Git 仓库内（`/Users/feilang` 是仓库根），**本项目已使用独立 `.git`**，提交时注意不要误操作外层仓库。

---

## 10. 里程碑（工程视角）

| 里程碑 | 内容 | 出口 |
|---|---|---|
| **M0 仓库 bootstrap** | 本地仓库、首次提交、私有远端、CI 骨架 | `main` 可构建，推送成功 |
| **M1 P0 交付** | 端口/校验/搭建图/DXF/测量/core | 对应需求文档 P0 验收通过，Preview 可访问 |
| **M2 P1 交付** | MCP/Skill/开源脚手架 | 外部 agent 演示通过，私有 Beta |
| **M3 公开发布** | 仓库转 Public、License、文档站 | 稳定版上线，社区可贡献 |

---

## 11. 待定问题（工程侧）

| # | 问题 | 建议 | 截止 |
|---|---|---|---|
| E1 | GitHub 账号权限（§9.1） | 把公钥加到 yaris23333 | 立即 |
| E2 | 托管平台 | Cloudflare Pages | M0 |
| E3 | 域名 | 先 `*.pages.dev`，稳定后再买 | M2 |
| E4 | 开源协议 | 见需求文档 D8 / Q1 | 公开前 |
| E5 | 是否引入统计 | 默认不引入；如引入需告知并去标识化 | M2 |
| E6 | 云端功能优先级 | 短链 > 云存档 > 远程 MCP | M2 评估 |

---

## 12. 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-11-09 | v0.1 | 初稿：仓库与 Git 工作流、静态部署、后端选型、CI/CD、成本与阻塞项 |
