# AGENTS.md — rc_track_builder 项目规则

本文件是本仓库的强制协作规则，适用于所有 AI agent（含 DSH 会话）与人类贡献者。
编号从 `R-01` 起递增；新增只追加，不复用编号、不删除已生效条目。

---

## R-01 远端推送必须人工放行（最高优先级）

**结论：agent 不得自主推送。任何进入远端仓库的操作，都必须先经过人工审核，由人工提交推送。**

### 绝对禁止

- `git push`：任何分支、任何 remote，包含 `--force`、`--force-with-lease`、`--tags`、`--all`、`--mirror`；
- 推送或删除 tag、删除远端分支；
- 改写已推送历史（`rebase` / `commit --amend` / `reset`）后再强推；
- 通过 `gh`、GitHub API、网页自动化等间接手段创建或合并 PR、发布 Release、修改仓库设置或分支保护；
- 以"改动很小""只加个文档""CI 反正会跑"为理由跳过审核。

### 允许（仍需用户明确指令）

- 本地 `git add` / `git commit`；
- 本地 `git tag`（**不推送**）。

### 交付协议（每次改动结束必须执行）

1. **停在本地**：不 push，不创建远端 PR；
2. **说明改动**：给出 `git status -sb` 与 `git diff --stat`，讲清改了什么、为什么；
3. **给出命令**：列出需要人工执行的推送命令，例如

   ```bash
   git push origin main
   ```

4. **显式声明**：结尾注明「未推送，等待人工审核」，由用户本人复核 diff 后亲自执行推送。

### 违反处理

一旦发现误推（无论是否已被覆盖），立即停止后续操作并如实报告，不得用 `revert`、强推或删除远端分支自行掩盖。

**依据**：远端历史、tag 与 Release 对外公开且难以彻底撤回；审核闸门必须放在"人"这一侧，而不是依赖 agent 的自觉。本规则与 `docs/engineering.md` §2.2（改动走 PR、Squash merge、`main` 线性历史）一致。

---

## R-02 提交信息

用户要求提交时，遵循 `docs/engineering.md` §2.3 的 Conventional Commits：

```text
<type>(<scope>): <subject>
```

scope 取 `core` / `web` / `dxf` / `pdf` / `share` / `tiles` / `docs` / `repo` / `ci`。

---

## R-03 新增规则

后续规则按 `R-04`、`R-05` 递增追加到本文件；新增时说明触发场景与理由，避免写成无法执行的空话。

---

## R-04 架构边界与本地门禁

**目录归属**（完整规则见 `docs/architecture.md`）：

- 可被 MCP / CLI / CI 复用的领域逻辑 → `packages/core`，且不得 import DOM、React、Zustand；
- 浏览器专属能力（下载、剪贴板、localStorage、URL 组装）→ `apps/web/app/lib`；
- UI 与路由 → `apps/web/app`；路由模块只做取数与渲染，业务逻辑进 store 或 core。

**提交前必须在本地跑通**：

```bash
pnpm typecheck && pnpm test && pnpm build
```

三条全绿才进入人工审核环节；审核通过后仍按 R-01 由人工推送，agent 不得自行 push。
