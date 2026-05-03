<!--
   ██╗ ██████╗ ██████╗ ███████╗
  ███║██╔═══██╗██╔══██╗██╔════╝
  ╚██║██║   ██║██║  ██║███████╗
   ██║██║   ██║██║  ██║╚════██║
   ██║╚██████╔╝██████╔╝███████║
   ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
  knowledge-store — JSONL knowledge base for team memories
-->

# Knowledge Store — SPEC

## 概述

TeamBrain 的知识沉淀子系统。基于 JSONL 的 append-only 日志存储，配套 git sync机制，实现团队记忆的持久化和跨成员共享。

---

## 目录结构

```
~/.myteambrain/knowledge/
└── {YYYY-MM}.jsonl        # 按月归档的知识条目

scripts/
├── knowledge-store.js      # 核心：append-only JSONL读/写/查询
└── git-sync.js             # git push/pull 同步逻辑
```

---

## 数据格式

### 每行 JSONL 条目

```json
{
  "id": "uuid-v4",
  "timestamp": "ISO-8601",
  "author": "user-name",
  "session_id": "claude-session-id",
  "content": "知识条目正文",
  "tags": ["tag1", "tag2"],
  "importance": 1-5,
  "embedding": [0.123, ...]   // 可选，向量
}
```

---

## 知识库脚本接口 (knowledge-store.js)

### `appendKnowledge(options)` — 追加条目

```js
{
  author: string,
  content: string,
  sessionId: string,
  tags?: string[],
  importance?: 1|2|3|4|5,   // 默认 3
  embedding?: number[]
}
```

- 自动生成 uuid + timestamp
- 写入 `~/.myteambrain/knowledge/{YYYY-MM}.jsonl`
- 使用 append-only 原子写入（先 temp 再 rename）
- 返回写入的完整条目对象

### `queryKnowledge(options)` — 查询

```js
{
  yearMonth?: "YYYY-MM",       // 空则查当月
  author?: string,
  tags?: string[],
  search?: string,             // 模糊匹配 content
  limit?: number               // 默认 100
}
```

---

## Git Sync 脚本 (git-sync.js)

### 行为

- **启动时**：`git pull --ff-only` 拉取远程变更
- **写入后**：自动 `git push` 推送新条目
- **冲突处理**：若 pull 失败则跳过推送，输出警告
- **远端**：使用 gitee 和 github 双端推送（按 AGENTS.md 规则）

### 环境要求

- 在 MyTeamBrain repo 内运行
- 已配置 gitee/github 两个 remote
- 知识库文件位于 repo 内或通过 git submodule 引用

---

## 验收标准

1. 追加条目到当月 `YYYY-MM.jsonl`，每行一个 JSON 对象
2. 查询返回匹配条目，支持按 author/tags/search 过滤
3. git-sync 在 append 成功后自动 push 到 gitee + github
4. git-sync 启动时自动 pull 合并远程变更
5. append 使用原子写入（tmp file + rename）防止数据损坏