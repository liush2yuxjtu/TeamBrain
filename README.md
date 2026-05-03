# MyTeamBrain

    _   __  ______  ______
   / | / / / / __ \/ ____/
  /  |/ / / / / / / __/
 / /|  / / / /_/ / /___
//_/ |_/ /_/_____/_____/

**AI Collective Memory for Development Teams**

MyTeamBrain captures and shares AI context across sessions — your team thinks as one, not as individuals.

[![npm version](https://img.shields.io/npm/v/myteambrain)](https://www.npmjs.com/package/myteambrain)
[![Node.js](https://img.shields.io/badge/node-18%2B-green)](https://nodejs.org/)

---

## Quick Start

```bash
# 1. Install
npm install -g myteambrain

# 2. Initialize in your project
cd /path/to/your/project
myteambrain init

# 3. Start coding — AI remembers context automatically
claude
```

### First Time Setup (Team)

```bash
# Clone your team's shared memory repo
git clone https://github.com/your-team/myteambrain-memory.git
cd myteambrain-memory

# Initialize MyTeamBrain
myteambrain init

# Push to share with team
git add .
git commit -m "Initialize shared memory"
git push gitee main && git push github main
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        MyTeamBrain Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Session End                      Session Start                 │
│       │                                 │                         │
│       ▼                                 ▼                         │
│  ┌────────┐    JSONL    ┌────────┐    ┌──────────────┐         │
│  │ Stop   │ ──────────► │  Git   │ ──►│ SessionStart │         │
│  │ Hook   │   push      │  Sync  │    │   Hook       │         │
│  └────────┘             └────────┘    └──────────────┘         │
│       │                                      │                   │
│       ▼                                      ▼                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Knowledge Store (JSONL)                │        │
│  │   ~/.myteambrain/knowledge/{date}.jsonl            │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│   Alice's context          Shared Memory          Bob's context │
│   gets extracted          ──────────────          gets loaded  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Description |
|------------|-------------|
| **Stop Hook** | Triggers on Claude Code exit, extracts knowledge from transcript |
| **Knowledge Store** | Append-only JSONL storage with git sync |
| **SessionStart Hook** | Loads relevant memories when new session begins |
| **Verifier Judge** | Quality gate for knowledge entries |
| **Git Sync** | Synchronizes memory across team machines |

### Knowledge Flow

1. **Session End**: Stop Hook reads transcript, LLM extracts key decisions/insights
2. **Processing**: Verifier Judge validates quality and safety
3. **Storage**: Entry appended to JSONL file with tags and importance
4. **Sync**: Git push shares new entries with team
5. **Session Start**: SessionStart Hook loads relevant memories from team pool
6. **Context**: AI sees past decisions automatically, no re-learning needed

---

## Demo: Alice & Bob Share Knowledge

**Alice's session** (Day 1):
```
$ claude
# Works on user authentication flow
# Implements JWT refresh token logic
# Leaves session
[Stop Hook] → Extracts: JWT refresh gotcha, token rotation strategy
[Git Push]   → syncs to shared repo
```

**Bob's session** (Day 2):
```
$ claude
[SessionStart] → Loads auth-flow memory from Alice
# Already knows: JWT refresh gotcha, token rotation strategy
# No re-learning, no misalignment
```

---

## Configuration

`.myteambrain.json` in your project root:

```json
{
  "memoryDir": "./.myteambrain/knowledge",
  "sessionHooks": true,
  "autoPush": true,
  "stopHook": {
    "enabled": true,
    "minTurns": 5
  },
  "sessionStart": {
    "enabled": true,
    "topK": 5,
    "scorer": "bm25",
    "minScore": 0.1
  },
  "verifierJudge": {
    "enabled": true,
    "rejectOnLowQuality": true
  }
}
```

### Config Fields

| Field | Default | Description |
|-------|---------|-------------|
| `memoryDir` | `./.myteambrain/knowledge` | Local knowledge storage path |
| `sessionHooks` | `true` | Enable/disable all hooks |
| `autoPush` | `true` | Auto-push to git remotes |
| `stopHook.minTurns` | `5` | Min turns before extraction |
| `sessionStart.topK` | `5` | Max memories to inject |
| `sessionStart.scorer` | `"bm25"` | Relevance scoring method |

---

## Project Structure

```
myteambrain/
├── hooks/
│   └── stop-hook.js          # Session stop hook implementation
├── scripts/
│   ├── cli.js                # CLI entry point
│   ├── setup.js              # Initialization script
│   ├── stop-hook.js          # Stop hook (legacy)
│   ├── session-start-hook.js # Session start hook
│   ├── knowledge-store.js    # JSONL read/write/query
│   ├── git-sync.js           # Git sync logic
│   └── verifier-judge.js     # Quality gate
├── docs/
│   └── features/            # Feature specifications
│       ├── stop-hook.md
│       ├── session-start-hook.md
│       ├── knowledge-store.md
│       └── verifier-judge.md
└── README.md
```

---

## Troubleshooting

### Common Issues

**Q: Hooks not triggering on session end/start**
```bash
# Verify hooks are registered
claude hooks list

# Re-register hooks if needed
myteambrain init --force
```

**Q: Knowledge not syncing to team**
```bash
# Check git remotes
git remote -v

# Manual push
git push gitee main && git push github main
```

**Q: "No transcript found" error**
```bash
# Ensure transcripts are enabled
export CLAUDE_TRANSCRIPT_DIR=~/.claude/transcripts
```

**Q: Memory injection seems slow**
- Reduce `topK` in config (default: 5)
- Increase `minScore` threshold to filter low-relevance entries

---

## Contributing

Contributions welcome! Please follow these guidelines:

### Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make changes with tests
4. Run the judge harness: `npm run judge`
5. Commit with clear messages
6. Push to both remotes: `git push gitee main && git push github main`
7. Open a Pull Request

### Code Style

- Use Chinese comments for user-facing strings
- Keep functions under 50 lines
- Test every scoring dimension
- Idempotent operations only

### Docs

- Update `docs/features/*.md` for any behavior changes
- Add ASCII art diagrams for visual clarity
- Keep READMEs under 200 lines

---

## Changelog

All notable changes will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

### [Unreleased]

#### Added
- Initial release
- Stop Hook for session knowledge extraction
- SessionStart Hook for memory injection
- Knowledge Store with JSONL storage
- Verifier Judge quality gate
- Git Sync for team collaboration

---

## Links

- [Documentation](./docs/)
- [Architecture](./docs/architecture.md)
- [Feature Specs](./docs/features/)
- [npm Package](https://www.npmjs.com/package/myteambrain)

---

## License

MIT
