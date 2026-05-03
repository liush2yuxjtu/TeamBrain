<!--
 ██████╗███████╗ ██████╗     ██████╗ ██╗      █████╗ ███╗   ██╗
██╔════╝██╔════╝██╔═══██╗    ██╔══██╗██║     ██╔══██╗████╗  ██║
██║     █████╗  ██║   ██║    ██████╔╝██║     ███████║██╔██╗ ██║
██║     ██╔══╝  ██║   ██║    ██╔═══╝ ██║     ██╔══██║██║╚██╗██║
╚██████╗███████╗╚██████╔╝    ██║     ███████╗██║  ██║██║ ╚████║
 ╚═════╝╚══════╝ ╚═════╝     ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝
         产品方向 → 调研结论 → 下一步行动
-->

# CEO PLAN — MyTeamBrain

**索引（一句话）**：终结"技术分享"——让团队每个人的 AI 同时拥有全团队经验，知识无感流动，无需任何人主动整理。

---

## Summary

### 产品愿景

> 昨天你踩的坑，今天团队里所有人 + 他们的 AI 都自动知道。
> 知识不再需要人来分享、人来学习，它实时地、无感地流动在每个人的 Claude Code session 里。

### 核心判断（CEO 级）

| 维度 | 结论 |
|------|------|
| 市场空白 | **真实且大**：所有现有产品停在「个人维度」，无人做到跨成员共享 |
| 技术可行性 | **已验证**：Claude Code hooks + JSONL + git 路径社区已跑通 |
| 竞争窗口 | **现在**：Anthropic 官方无原生方案，GitHub Issue 明确是最大痛点 |
| 最大风险 | **知识质量**：垃圾 session 会污染团队知识库，需要门控机制 |
| AI Memory 市场 | $30.79 亿（2025），CAGR 63.5% |

### 差异化（别人没有的）

```
团队多人共享记忆     ← 所有竞品都只做了个人维度
非代码类知识流入     ← 竞品 100% 针对代码库
知识从对话自动提炼   ← 没有产品做到无感
CEO/PM 可用界面     ← 全部产品面向工程师
```

### 执行原则（来自 CLAUDE.md）

1. **先 dogfeed**：用 Claude Code CLI 自己先跑起来，自己团队先用
2. **MVP 2 天**：Stop hook → 提炼 → git push → SessionStart 注入
3. **质量门控**：PR review + verifier-judge，防止垃圾知识入库
4. **worktree 开发**：所有功能开发在 worktree，不直接改 main

### 行动路径

```
Week 1：MVP dogfeed（自己团队内跑 Stop hook + git sync）
Week 2：验证知识质量（verifier-judge 读 raw JSON 裁判）
Week 3：扩展到 2-3 个外部团队（真实用户）
Week 4+：根据 dogfeed 反馈决定是否产品化
```

---

## Detail（原始来源）

- **深度调研报告**：`docs/research/team-ai-memory-research.md`
- **Git commit**：`62886ee` — research: 团队AI集体记忆产品深度调研报告
- **会话日期**：2026-05-03
- **关键竞品**：
  - [claude-mem-sync](https://github.com/lopadova/claude-mem-sync) — 最接近团队方案
  - [claude-memory-compiler](https://github.com/coleam00/claude-memory-compiler) — Stop hook 三段架构
  - [Augment Code](https://www.augmentcode.com) — 最强竞品但停在个人维度
  - [GitHub Issue #38536](https://github.com/anthropics/claude-code/issues/38536) — 社区最强需求信号
- **技术文档**：[Claude Code Hooks 官方文档](https://code.claude.com/docs/en/hooks)
