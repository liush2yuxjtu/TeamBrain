# MyTeamBrain

    _   __  ______  ______
   / | / / / / __ \/ ____/
  /  |/ / / / / / / __/
 / /|  / / / /_/ / /___
/_/ |_/ /_/_____/_____/

**AI Collective Memory for Development Teams**

MyTeamBrain captures and shares AI context across sessions — your team thinks as one, not as individuals.

---

## Quick Start

```bash
# 1. Install
npm install -g myteambrain

# 2. Initialize
myteambrain init

# 3. Code — AI remembers context automatically
claude
```

---

## How It Works

1. **Stop hook** captures session summary → JSONL on `claude` exit
2. **Git-pushed JSONL** synchronizes memory across machines and teammates
3. **SessionStart hook** loads relevant memories when new session begins

---

## Demo: Alice & Bob Share Knowledge

**Alice's session** (Day 1):
```
$ claude
# Works on user authentication flow
# Implements JWT refresh token logic
# Leaves session
[Stop hook] → /memory/alice/sessions/2026-05-03-auth-flow.jsonl
[Git push]  → syncs to shared repo
```

**Bob's session** (Day 2):
```
$ claude
[SessionStart] → loads auth-flow memory from Alice
# Already knows: JWT refresh gotcha, token rotation strategy
# No re-learning, no misalignment
```

---

## Flow Diagram

```
Session End                          Session Start
    |                                      |
    v                                      v
+-------+    JSONL    +-------+    +------------+
| Stop  | ----------> |  Git  | -> | SessionStart|
| hook  |   push     |  push  |    |   hook      |
+-------+            +-------+    +------------+
     Alice's context                  Bob's context
     becomes shared                   loads relevant
     knowledge                         memories
```

---

## Requirements

- **Node.js** 18+
- **Claude Code CLI** (latest)
- **Git** repository for memory synchronization

---

## First Time Setup

```bash
# Clone your team's shared memory repo
git clone https://github.com/your-team/myteambrain-memory.git
cd myteambrain-memory

# Initialize MyTeamBrain
myteambrain init

# Push to share with team
git add .
git commit -m "Initialize shared memory"
git push
```

## Team Setup

```bash
# Each team member clones and initializes
git clone https://github.com/your-team/myteambrain-memory.git
cd myteambrain-memory
myteambrain init

# Now everyone sees each other's session context
```

## Configuration

`.myteambrain.json` in your project:

```json
{
  "memoryDir": "./memory",
  "sessionHooks": true,
  "autoPush": true
}
```

## Learn More

- `docs/architecture.md` — system design
- `docs/rules/` — team conventions
- `docs/rules/duckplan.md` — planning methodology