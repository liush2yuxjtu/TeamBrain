# Verifier-Judge Quality Gate — Specification

___
██╗  ██╗ █████╗  ██████╗██╗  ██╗███████╗██████╗  ██████╗ ███████╗
██║  ██║██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗██╔═══██╗██╔════╝
███████║███████║██║     █████╔╝ █████╗  ██████╔╝██║   ██║███████╗
██╔══██║██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗██║   ██║╚════██║
██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██║  ██║╚██████╔╝███████║
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
___

## 1. Overview

**Purpose**: Quality gate that judges knowledge entries before they enter the team knowledge base. Runs before git commit to ensure only high-quality, safe, relevant entries are admitted.

**Type**: Deterministic JSONL processor (no LLM calls)

**Entry format** (JSONL, one entry per line):
```json
{
  "id": "uuid",
  "type": "decision|insight|pattern|context",
  "content": "raw text content",
  "author": "agent-name",
  "timestamp": "ISO8601",
  "sessionId": "session-uuid",
  "tags": ["tag1", "tag2"]
}
```

## 2. Scoring Dimensions

| Dimension | Range | Description |
|-----------|-------|-------------|
| importance | 1–5 | Value to team knowledge base (1=trivial, 5=critical) |
| relevance | 1–5 | Relevance to team's work/projects (1=irrelevant, 5=essential) |
| novelty | 1–5 | How new/redundant this information is (1=already known, 5=completely new) |
| safety | pass/fail | Does this entry contain PII, secrets, or harmful content? |

### Rejection Rules

An entry is **REJECTED** if:
- `safety === "fail"`
- `importance < 2`
- `relevance < 2`

Otherwise, it is **APPROVED**.

## 3. Verdict Output Format

```json
{
  "entry": { /* original entry object */ },
  "scores": {
    "importance": 1-5,
    "relevance": 1-5,
    "novelty": 1-5,
    "safety": "pass" | "fail"
  },
  "approved": boolean,
  "reason": "string — human-readable verdict reason"
}
```

## 4. Determinism Rules

- Same input JSONL entry MUST produce identical verdict every time
- No random values, timestamps, or external calls
- Scoring is rule-based using keyword analysis and pattern matching
- Output key order is always: `entry`, `scores`, `approved`, `reason`

## 5. Safety Check Patterns (fail if matches)

- PII patterns: email addresses, phone numbers, SSN patterns
- Secret patterns: API keys, tokens, passwords in plain text
- Harmful content: instructions for weaponization, exploitation

## 6. Scoring Heuristics

### Importance (1-5)
- Contains concrete numbers, metrics, benchmarks → higher
- Mentions specific technologies, tools, patterns → higher
- Vague or generic content → lower

### Relevance (1-5)
- References team projects, repositories, technologies → higher
- General knowledge or trivia → lower
- Matches known project tags/keywords → higher

### Novelty (1-5)
- First-seen pattern for this team → higher
- Repeated topics across recent entries → lower
- Unique insight or non-obvious solution → higher

## 7. CLI Interface

```bash
# Single entry
node scripts/verifier-judge.js --entry '{"id":"1","type":"insight",...}'

# Read from file (JSONL)
node scripts/verifier-judge.js --file entries.jsonl

# Read from stdin (JSONL)
cat entries.jsonl | node scripts/verifier-judge.js

# Exit codes
# 0 — processing succeeded (verdict output to stdout)
# 1 — rejection (verdict output to stdout with approved=false)
# 2 — invalid input / processing error (error to stderr)
```

## 8. Test Cases

| Input | Expected |
|-------|----------|
| Entry with PII (fake email) | `approved: false, safety: "fail"` |
| Entry with API key pattern | `approved: false, safety: "fail"` |
| Entry with importance=1 | `approved: false, reason: "importance below threshold"` |
| Entry with relevance=1 | `approved: false, reason: "relevance below threshold"` |
| Valid entry, importance=4, relevance=4, novelty=3 | `approved: true` |
| Empty content | `approved: false, reason: "empty content"` |