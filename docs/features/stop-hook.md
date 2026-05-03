# Stop Hook — 团队 AI 记忆提取器

```
 ╔══╗ ╔══╗ ╔══╗
 ║ K ║ ║ N ║ ║ O ║
 ╚╗╔╝ ╚╗╔╝ ╚╗╔╝
  ║ STOP HOOK  ║
  ╚═╝  ╚═╝  ╚═╝
```

---

## 1. 概述

**Stop Hook** 是 Claude Code session 结束时自动触发的知识提取管道。它读取 session transcript，按主题分类提炼关键决策、发现、模式，写入 JSONL 文件供后续检索使用。

**设计目标**：知识无感流动 — 成员无需主动整理，AI 在每个 session 结束时自动将经验沉淀到共享记忆库。

---

## 2. 工作流程

```
Session 结束
    │
    ▼
Stop Hook 触发
    │
    ▼
读取 ~/.claude/transcripts/<session_id>.jsonl (最新 transcript)
    │
    ▼
LLM 提炼 → JSONL 知识块
    │
    ▼
写入 ~/.myteambrain/knowledge/{date}.jsonl
    │
    ▼
完成（Idempotent — 可安全重复运行）
```

---

## 3. 输出格式

每条知识为独立 JSONL 行：

```jsonl
{"timestamp":"2026-05-03T14:30:00+08:00","author":"claude","session_id":"019dd846","content":"决策：MVP 采用 Stop Hook → shared/daily.md → git push 技术路径","tags":["mvp","技术路径","团队记忆"],"importance":"high"}
{"timestamp":"2026-05-03T14:31:00+08:00","author":"claude","session_id":"019dd846","content":"发现：现有竞品均停在个人维度，无团队共享记忆产品","tags":["竞品分析","市场空白"],"importance":"high"}
{"timestamp":"2026-05-03T14:32:00+08:00","author":"claude","session_id":"019dd846","content":"模式：SessionStart Hook 应在启动时 pull 共享知识","tags":["架构","模式"],"importance":"medium"}
```

### 字段定义

| 字段 | 类型 | 描述 |
|------|------|------|
| `timestamp` | ISO 8601 | 知识提取时间（含时区） |
| `author` | string | `"claude"` 或用户名 |
| `session_id` | string | Claude Code session ID |
| `content` | string | 知识内容（中文，简洁） |
| `tags` | string[] | 标签数组 |
| `importance` | `"high"\|"medium"\|"low"` | 重要性等级 |

---

## 4. 目录结构

```
~/.myteambrain/
└── knowledge/
    ├── 2026-05-03.jsonl
    ├── 2026-05-02.jsonl
    └── ...
```

---

## 5. 提炼策略

### 提取内容类型

| 类型 | 触发信号 | importance |
|------|----------|------------|
| 关键决策 | "决定"、"采用"、"选择"、"不做" | high |
| 发现/洞察 | "发现"、"注意到"、"原来" | high |
| 技术模式 | "模式"、"架构"、"重构" | medium-high |
| 产品判断 | "产品方向"、"用户需求" | high |
| 代码模式 | "函数"、"类"、"实现方式" | medium |
| 风险/问题 | "风险"、"问题"、"bug" | high |
| 经验总结 | "学到"、"总结" | medium |

### Tag 规范

- `技术路径`、`架构`、`模式`、`代码`、`产品`、`竞品分析`、`风险`、`决策`、`发现`、`MVP`、`团队记忆`

---

## 6. Idempotency 保证

- 按 `session_id` 去重：同一 session 重复运行不会写入重复条目
- 读取 transcript 时记录已处理的 session_id 列表
- 文件锁机制避免并发写入冲突

---

## 7. 配置项

| 项 | 默认值 | 说明 |
|---|--------|------|
| `KNOWLEDGE_DIR` | `~/.myteambrain/knowledge` | JSONL 输出目录 |
| `TRANSCRIPT_DIR` | `~/.claude/transcripts` | transcript 源目录 |
| `LLM_MODEL` | `claude-opus-4-7` | 提炼用模型 |
| `MIN_TURNS` | `5` | 少于 N 轮不提炼 |

---

## 8. 依赖

- Node.js 18+
- `scripts/stop-hook.js`
- Claude Code transcript 文件可读
- 输出目录可写

---

## 9. 验收标准

1. Hook 触发后生成有效的 JSONL 文件
2. 每条记录包含全部 6 个字段
3. 相同 session_id 重复运行不产生重复记录
4. 文件落入 `~/.myteambrain/knowledge/{date}.jsonl`
5. 空 session（<5 turns）跳过提炼
6. PII scrubbing 集成（内容包含 email/phone 时过滤或脱敏）
