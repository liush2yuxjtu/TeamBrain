# MyTeamBrain Architecture

```
    ╔═══════════════════════════════════════════════════════════════════════╗
    ║                         MyTeamBrain Architecture                     ║
    ╠═══════════════════════════════════════════════════════════════════════╣
    ║                                                                        ║
    ║   ┌─────────────┐                              ┌─────────────┐        ║
    ║   │   Claude    │                              │   Git Hub   │        ║
    ║   │    Code    │                              │  Gitee     │        ║
    ║   │  Session   │                              │  Remote    │        ║
    ║   └──────┬──────┘                              └──────▲──────┘        ║
    ║          │                                            │               ║
    ║          │ Session Start                    Git Push  │               ║
    ║          ▼                                            │               ║
    ║   ┌──────────────┐      ┌───────────┐      ┌─────────┴─────┐        ║
    ║   │  SessionStart│─────►│ Knowledge │◄─────│   Git Sync    │        ║
    ║   │    Hook      │load  │  Store    │      │   Module      │        ║
    ║   └──────────────┘      └─────┬─────┘      └───────────────┘        ║
    ║                               │                                  ║
    ║                               │ write                            ║
    ║                               ▼                                  ║
    ║   ┌──────────────┐      ┌───────────┐      ┌───────────────┐        ║
    ║   │   Stop Hook  │─────►│ Verifier  │─────►│    JSONL      │        ║
    ║   │  (extract)   │send  │  Judge    │check │   Files       │        ║
    ║   └──────────────┘      └───────────┘      └───────────────┘        ║
    ║                               │                                  ║
    ║                               │ reject bad entries               ║
    ║                               ▼                                  ║
    ║                    ┌──────────────────┐                          ║
    ║                    │   Rejected       │                          ║
    ║                    │   Entries Log     │                          ║
    ║                    └──────────────────┘                          ║
    ║                                                                        ║
    ╚═══════════════════════════════════════════════════════════════════════╝
```

---

## Component Overview

| Component | File | Type | Description |
|-----------|------|------|-------------|
| **Stop Hook** | `hooks/stop-hook.js` | Hook | Extracts knowledge on session end |
| **SessionStart Hook** | `scripts/session-start-hook.js` | Hook | Injects memories on session start |
| **Knowledge Store** | `scripts/knowledge-store.js` | Module | JSONL append-only storage |
| **Git Sync** | `scripts/git-sync.js` | Module | Team memory synchronization |
| **Verifier Judge** | `scripts/verifier-judge.js` | Quality Gate | Validates entries before storage |

---

## Data Flow

### Session End Flow

```
1. User types "exit" or closes terminal
       │
       ▼
2. Stop Hook triggers automatically
       │
       ▼
3. Read transcript from ~/.claude/transcripts/<session_id>.jsonl
       │
       ▼
4. LLM extracts key decisions/insights/patterns
       │
       ▼
5. Send to Verifier Judge for quality check
       │
       ├─── PASS ───► Append to ~/.myteambrain/knowledge/{YYYY-MM}.jsonl
       │
       └─── FAIL ───► Log rejected entry, discard
       │
       ▼
6. Git Sync pushes to gitee + github remotes
```

### Session Start Flow

```
1. User runs "claude" command
       │
       ▼
2. SessionStart Hook triggers automatically
       │
       ▼
3. Read all JSONL files from ~/.myteambrain/knowledge/
       │
       ▼
4. Score memories using BM25 relevance algorithm
       │
       ▼
5. Filter by minScore threshold
       │
       ▼
6. Select top-K most relevant entries
       │
       ▼
7. Inject as console output (visible in session)
       │
       ▼
8. AI sees memories in context naturally
```

---

## Component Details

### Stop Hook (`hooks/stop-hook.js`)

**Purpose**: Captures session knowledge on Claude Code exit.

**Input**: Transcript file (`~/.claude/transcripts/current.jsonl`)

**Output**: Markdown session summary to `~/.myteambrain/knowledge/daily/{date}.md`

**Key Features**:
- Idempotent execution (safe to run multiple times)
- Minimum turn threshold (skip short sessions)
- Automatic git push after extraction

---

### SessionStart Hook (`scripts/session-start-hook.js`)

**Purpose**: Injects relevant team memories at session start.

**Input**: Team knowledge JSONL files

**Scoring Methods**:
- BM25 (default): Okapi BM25 with weighted field extraction
- Keyword fallback: When corpus < 50 docs

**Output**: Console output with top-K relevant memories

---

### Knowledge Store (`scripts/knowledge-store.js`)

**Purpose**: Append-only JSONL storage for team knowledge.

**Interface**:
```javascript
// Append new knowledge
knowledgeStore.append({ author, content, sessionId, tags, importance })

// Query knowledge
knowledgeStore.query({ yearMonth, author, tags, search, limit })
```

**Features**:
- Atomic writes (temp file + rename)
- Per-month归档
- Fuzzy search on content

---

### Git Sync (`scripts/git-sync.js`)

**Purpose**: Synchronize knowledge across team machines.

**Remotes**:
- `gitee` — Primary (HPC/China network)
- `github` — Secondary (global access)

**Operations**:
- On init: `git pull --ff-only`
- After write: `git push gitee main && git push github main`
- Conflict handling: Skip push if pull fails

---

### Verifier Judge (`scripts/verifier-judge.js`)

**Purpose**: Quality gate for knowledge entries.

**Scoring Dimensions**:
| Dimension | Range | Reject if |
|-----------|-------|----------|
| importance | 1-5 | < 2 |
| relevance | 1-5 | < 2 |
| novelty | 1-5 | - |
| safety | pass/fail | fail |

**Safety Check Patterns**:
- PII (emails, phones, SSN)
- Secrets (API keys, tokens, passwords)
- Harmful content

**Output**: JSON verdict with scores and reason

---

## Extension Points

### Custom Scoring

Implement custom scorer in `scripts/session-start-hook.js`:

```javascript
// Add new scorer
const scorers = {
  bm25: BM25Scorer,
  keyword: KeywordScorer,
  custom: CustomScorer  // Your implementation
};
```

### Additional Hooks

Hooks follow Claude Code hook registration format:

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

### Knowledge Filters

Add pre-processing filters in knowledge-store.js:

```javascript
// Example: Add PII scrubbing
async function appendKnowledge(options) {
  options.content = scrubPII(options.content);
  // ... rest of implementation
}
```

---

## File Inventory

```
myteambrain/
├── hooks/
│   └── stop-hook.js              # Session stop hook
├── scripts/
│   ├── cli.js                    # CLI commands
│   ├── setup.js                  # Init script
│   ├── stop-hook.js              # Stop hook (duplicate, legacy)
│   ├── session-start-hook.js     # Session start hook
│   ├── knowledge-store.js        # JSONL storage module
│   ├── git-sync.js               # Git sync module
│   └── verifier-judge.js         # Quality gate
├── docs/
│   ├── architecture.md           # This file
│   └── features/
│       ├── stop-hook.md
│       ├── session-start-hook.md
│       ├── knowledge-store.md
│       └── verifier-judge.md
├── README.md
├── setup.sh
└── package.json
```

---

## Security Considerations

1. **PII Scrubbing**: Verifier Judge rejects entries with PII patterns
2. **No Secrets**: Knowledge store filters API keys and tokens
3. **Git Auth**: Use SSH keys or token-based auth for remotes
4. **Local Storage**: Knowledge stored in `~/.myteambrain/` with user-only permissions
