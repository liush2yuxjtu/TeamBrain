<!--
    ██████╗ ██████╗  █████╗ ██╗███╗   ██╗
    ██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║
    ██║  ██║██████╔╝███████║██║██╔██╗ ██║
    ██║  ██║██╔══██╗██╔══██║██║██║╚██╗██║
    ██████╔╝██║  ██║██║  ██║██║██║ ╚████║
    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝
    SessionStart Hook — Memory Injection SPEC
    =========================================
-->

# SessionStart Hook — Memory Injection

## 1. Problem Statement

When a new Claude Code session starts, the AI has no awareness of prior team knowledge stored in JSONL files. The SessionStart hook bridges this gap by scoring and injecting relevant memories at session start.

## 2. How It Fits in the System

```
SessionStart hook (this script)
    |
    v
reads ~/.myteambrain/knowledge/*.jsonl   (team memory archive)
    |
    v
scores relevance vs current project path  (BM25 keyword matching)
    |
    v
injects top-k memories as console output  (visible in session)
    |
    v
LLM sees memories in context naturally
```

The Stop hook (session-end) writes memories; this hook reads and injects them.

## 3. Memory File Format

Each JSONL entry (one per line):

```jsonl
{"id":"uuid","timestamp":"ISO8601","project":"optional-project-tag","tags":["tag1","tag2"],"content":"The decision was made to use Qdrant for vector storage because..."}
```

Files live at: `~/.myteambrain/knowledge/<category>.jsonl`

## 4. Relevance Scoring

Simple BM25-lite scoring:
- Extract tokens from: `currentWorkingDirectory`, `project` field, `tags` array
- Query tokens = project name + directory path segments
- Score each memory: count matching tokens / total query tokens
- Fallback: keyword overlap if no BM25 library

## 5. Injection Mechanism

The hook writes to stdout (which Claude Code displays at session start). Output format:

```
=== Team Memory (N relevant) ===
[memory-1] (score: 0.xx) content...
[memory-2] (score: 0.xx) content...
...
==========================
```

Max `k` memories injected (default: 5). Duplicates within session avoided by tracking `injected_ids` set.

## 6. Configuration

| Config | Env / Flag | Default | Description |
|--------|-----------|---------|-------------|
| Knowledge dir | `MYTEAMBRAIN_KNOWLEDGE_DIR` | `~/.myteambrain/knowledge/` | Where JSONL files live |
| Max memories | `MYTEAMBRAIN_MAX_MEMORIES` | `5` | Top-k to inject |
| Session dedup | in-memory Set | `{}` | Avoid same-session duplicates |
| Log level | `MYTEAMBRAIN_LOG_LEVEL` | `info` | debug/info/warn/error |

## 7. SessionStart Hook Registration

```json
{
  "hooks": {
    "SessionStart": {
      "command": "node /path/to/session-start-hook.js",
      "context": "currentWorkingDirectory"
    }
  }
}
```

The `context: currentWorkingDirectory` makes the hook receive CWD as argument.

## 8. Error Handling

- Missing knowledge dir: warn + exit 0 (no crash, session still starts)
- Malformed JSONL line: skip line, log warn, continue
- No relevant memories: exit 0 silently
- Scoring error: warn + skip memory

## 9. Exit Code

Always exit 0 — hook should never block session start. Errors are logged, not fatal.

## 10. File Inventory

```
scripts/
  session-start-hook.js     # Main hook implementation

docs/features/
  session-start-hook.md     # This SPEC
```