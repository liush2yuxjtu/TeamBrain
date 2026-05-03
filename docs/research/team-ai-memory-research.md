<!--
 ████████╗███████╗ █████╗ ███╗   ███╗    ██████╗ ██████╗  █████╗ ██╗███╗   ██╗
    ██╔══╝██╔════╝██╔══██╗████╗ ████║    ██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║
    ██║   █████╗  ███████║██╔████╔██║    ██████╔╝██████╔╝███████║██║██╔██╗ ██║
    ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║    ██╔══██╗██╔══██╗██╔══██║██║██║╚██╗██║
    ██║   ███████╗██║  ██║██║ ╚═╝ ██║    ██████╔╝██║  ██║██║  ██║██║██║ ╚████║
    ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝
                research → plan → annotate → implement → report
-->

# 团队 AI 集体记忆产品 — 深度研究报告

**索引（一句话）**：现有方案均停留在「个人维度」，团队多人共享 AI 记忆是 2026 年最大的未填空白。

---

## Summary

**产品方向**：让团队每个人的 AI 同时拥有全团队所有人的经验，知识无感流动在每个 Claude Code session 里，无需任何人主动整理或分享。

**研究结论（3 句话）**：
1. 技术路径完全可行：Claude Code hooks（Stop/SessionStart）+ JSONL transcript + Git transport 已有开源社区方案。
2. 市场空白真实存在：所有现有产品（Augment、claude-mem、OpenMemory）均停在个人维度，无人做到跨成员真正共享。
3. 最大风险不是技术，是知识质量控制（垃圾进/垃圾出）和团队 review 习惯建立。

---

## 竞品格局（Diff Only）

```
+--------------------+--------+---------+--------+--------+--------+
| 能力               |我们要做|AugmentCd|claude- |OpenMem |Tabnine |
|                    |        |         |mem     |ory MCP |Entpr   |
+--------------------+--------+---------+--------+--------+--------+
| 个人session记忆    |  ✓     |  ✓      |  ✓     |  ✓     |  ✓     |
| 团队多人共享记忆   |  ✓     |  ✗      |  ✗     |  ✗     |  部分  |
| 非代码类知识流动   |  ✓     |  ✗      |  ✗     |  ✗     |  ✗     |
| 对话→知识自动提炼  |  ✓     |  ✗      |  部分  |  ✗     |  ✗     |
| CEO/PM可用界面     |  ✓     |  ✗      |  ✗     |  ✗     |  ✗     |
| 知识权限+版本管理  |  ✓     |  ✗      |  ✗     |  ✗     |  ✗     |
+--------------------+--------+---------+--------+--------+--------+
```

**我们独有**（what-we-dont-have-yet 反过来就是我们的差异化）：
- 真正的跨成员知识共享（不只是跨 session）
- 非代码类知识（会议决策、产品判断）自动注入 Claude Code
- 无需人工整理的全自动流动

---

## 技术路径（三层 MVP → 完整）

### MVP（2天可跑通）
```
Stop Hook → claude -p 提炼 → shared/daily.md → git push
其他成员 SessionStart → git pull → CLAUDE.md 注入
```

### 进阶（1-2周）
```
claude-mem（个人压缩）+ claude-mem-sync（团队 PR review）
GitHub Actions 自动 merge+dedup → shared-knowledge/
```

### 完整（4-8周）
```
Qdrant 向量存储 + attention decay + HyDE 语义检索
→ 按任务类型 TOP-K 注入 → verifier-judge 质量门控
```

---

## 关键技术风险

| 风险 | 缓解 |
|------|------|
| Transcript 含敏感数据 | Stop hook 提炼前 PII scrubbing |
| 知识质量退化 | PR review 门控 + verifier-judge |
| git merge 冲突 | 按 topic 分文件 + semantic merge |
| 成本失控 | 只在 >20 turns session 时提炼 |

---

## 市场信号

- GitHub Issue #38536「Shared Team Memory」被描述为「团队使用 Claude Code 最大单一效率瓶颈」
- AI Memory 市场 2025 年规模 $30.79 亿，CAGR 63.5%（2033）
- Anthropic 官方无原生团队记忆方案，全靠社区

---

## Detail（原始来源）

- [claude-mem-sync](https://github.com/lopadova/claude-mem-sync) — 最完整团队方案
- [claude-memory-compiler](https://github.com/coleam00/claude-memory-compiler) — Stop hook 三段架构
- [claude-brain](https://github.com/toroleapinc/claude-brain) — 跨成员 semantic merge
- [OpenMemory MCP (mem0ai)](https://github.com/mem0ai/mem0) — 跨工具本地共享
- [GitHub Issue #38536](https://github.com/anthropics/claude-code/issues/38536) — 官方功能请求
- [Augment Code Team Memory](https://www.augmentcode.com/blog/meet-augment-code-developer-ai-for-teams) — 竞品官方
- [Claude Code Hooks 文档](https://code.claude.com/docs/en/hooks) — 技术基础
- 研究日期：2026-05-03 | Session：当前会话
