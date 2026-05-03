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

## 4. Relevance Scoring Strategy

### BM25 (Default)

Okapi BM25 with weighted field extraction:

| Field | Weight | Notes |
|-------|--------|-------|
| `topic` | 2.0 | Highest — main subject line |
| `tags` | 1.5 | Array of string tags |
| `summary` | 1.0 | Brief description |
| `details` | 0.5 | Full context paragraph |

Parameters: `k1=1.5`, `b=0.75`

### Keyword Match (Fallback)

When corpus < 50 documents, fall back to weighted keyword intersection:

```
score = sum(weight[field] for field in matched_fields)
```

Query terms extracted from:
- Current working directory path segments (e.g., `["src", "auth", "jwt"]`)
- Active git branch name
- Recent commit messages (last 5, from `git log -5 --oneline`)

### Scoring Inputs

The scorer receives session context:

| Input | Source | Example |
|-------|--------|---------|
| `cwd` | Claude Code `currentWorkingDirectory` | `/Users/alice/project/src/auth` |
| `branch` | `git rev-parse --abbrev-ref HEAD` | `feat/jwt-refresh` |
| `recent_commits` | `git log -5 --oneline` | `abc123 fix: token rotation bug` |

### Min Score Threshold

Memories scoring below `minScore` (default: `0.1`) are excluded, even if within top-k.

## 5. Output Format

### Injected Memory Entry Schema

```json
{
  "id": "uuid-v4",
  "source": "alice",
  "timestamp": "2026-05-03T10:00:00Z",
  "topic": "JWT refresh token gotcha",
  "tags": ["auth", "security", "tokens"],
  "summary": "Always rotate refresh tokens on use; old tokens must be invalidated immediately to prevent replay attacks.",
  "details": "Full paragraph of context, decisions made, caveats...",
  "confidence": 0.92
}
```

### Injected String Format (via stdout)

```
=== Team Memory (3 entries) ===

[alice@2026-05-03] JWT refresh token gotcha
Tags: auth, security, tokens
Summary: Always rotate refresh tokens on use; old tokens must be invalidated immediately to prevent replay attacks.
Details: The old refresh token flow allowed reuse within the grace window...
---
[carol@2026-05-02] Database migration ordering
Tags: postgres, migrations, rollback
Summary: Always run destructive migrations last; add migrate:down procedures before migrate:up.
Details: We learned this after the incident where the users table was dropped before the backup completed...
---
```

## 6. Configuration

### Config File: `.myteambrain.json`

```json
{
  "sessionStart": {
    "enabled": true,
    "knowledgeDir": "~/.myteambrain/knowledge",
    "topK": 5,
    "scorer": "bm25",
    "injectVia": "env",
    "injectFile": "/tmp/myteambrain-inject.json",
    "minScore": 0.1
  }
}
```

### Config Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable SessionStart hook |
| `knowledgeDir` | string | `~/.myteambrain/knowledge` | Directory containing JSONL memory files |
| `topK` | number | `5` | Max memories to inject per session |
| `scorer` | string | `"bm25"` | Scoring strategy: `"bm25"` or `"keyword"` |
| `injectVia` | string | `"env"` | Injection method: `"env"` or `"file"` |
| `injectFile` | string | `/tmp/myteambrain-inject.json` | File path when `injectVia: "file"` |
| `minScore` | number | `0.1` | Minimum relevance score threshold |

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

## 9. Idempotency

Same session must not receive duplicate injections.

| Mechanism | Implementation |
|-----------|----------------|
| In-memory tracking | `Set<memoryId>` cleared on session end |
| Session state file | `~/.myteambrain/state/session-{id}.json` persists injected IDs |

If the hook is called mid-session (e.g., manual refresh), it skips already-injected IDs.

## 10. Exit Code

Always exit 0 — hook should never block session start. Errors are logged, not fatal.

## 11. Acceptance Criteria

### AC-1: Hook fires on session start
- [ ] Hook registered as `SessionStart` in Claude Code hooks config
- [ ] Hook executes within 2s of session start

### AC-2: Knowledge base is read
- [ ] All `*.jsonl` files in `knowledgeDir` are parsed
- [ ] Malformed lines are skipped with warning logged

### AC-3: Relevance scoring works
- [ ] BM25 returns ranked list of memories with scores
- [ ] Keyword fallback triggers when corpus < 50 docs

### AC-4: Top-k injection
- [ ] No more than `topK` memories are selected
- [ ] Memories below `minScore` threshold are excluded

### AC-5: Idempotency within session
- [ ] Re-running SessionStart in same session does not duplicate injected memories
- [ ] Session state file is cleaned up on session end

### AC-6: Output format correct
- [ ] Injected string contains all required fields (topic, tags, summary, details)
- [ ] Source and timestamp are present for each entry

### AC-7: Configuration respected
- [ ] All config fields are read and applied
- [ ] Invalid config falls back to defaults gracefully

### AC-8: Graceful degradation
- [ ] If `knowledgeDir` does not exist, hook succeeds with 0 memories injected
- [ ] If no memories meet `minScore`, session starts normally without injection

## 12. File Inventory

```
scripts/
  session-start-hook.js     # Main hook implementation

docs/features/
  session-start-hook.md     # This SPEC
```