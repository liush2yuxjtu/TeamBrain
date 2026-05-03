#!/usr/bin/env node
/**
 * verifier-judge.js — Knowledge entry quality gate
 * Runs before git commit to judge entries: safety, importance, relevance, novelty
 * Deterministic: same input = same output, no random, no external calls
 */

const fs = require('fs');

// ── Safety patterns ───────────────────────────────────────────────────────────
const SAFETY_PATTERNS = [
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, label: 'email' },
  // Phone numbers (US/international)
  { pattern: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, label: 'phone' },
  // SSN patterns
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, label: 'ssn' },
  // API keys / tokens
  { pattern: /\b(secret|password|passwd|pwd|token|apikey|api_key|auth)[_\-]?[a-zA-Z0-9]{16,}/gi, label: 'secret_keyword' },
  // AWS keys
  { pattern: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g, label: 'aws_key' },
  // GitHub tokens
  { pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g, label: 'github_token' },
  // Slack/Discord tokens
  { pattern: /\b[xX][a-zA-Z0-9]{20,}\b/g, label: 'slack_token' },
  // Private keys
  { pattern: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/g, label: 'private_key' },
  // Harmful content hints
  { pattern: /\b(hack|exploit|weaponize|inject.*sql|xss|csrf)\b/gi, label: 'harmful_keyword' },
];

// ── Importance heuristics ──────────────────────────────────────────────────────
function scoreImportance(entry) {
  const content = entry.content || '';
  let score = 3; // default middle

  const hasMetrics = /\d+(\.\d+)?[%°pxemk]|\d+\s*(users?|files?|lines?|hours?|days?|weeks?)/i.test(content);
  if (hasMetrics) score += 1;

  const techIndicators = /\b(React|Vue|Angular|Node|Python|Go|Rust|Kubernetes|Docker|Postgres|MongoDB|Redis|Claude|GPT|LLM|API)\b/i.test(content);
  if (techIndicators) score += 1;

  const projectIndicators = /\b(BiomedParse|UAHP|medflow|medsam|monai|SAM|Augment|Claude Code|Codex)\b/i.test(content);
  if (projectIndicators) score += 1;

  const vagueIndicators = /\b(stuff|things|somehow|whatever|etc|kinda|sort of)\b/i.test(content);
  if (vagueIndicators) score -= 1;

  if (content.split(/\s+/).length < 5) score -= 1;

  return Math.max(1, Math.min(5, score));
}

// ── Relevance heuristics ──────────────────────────────────────────────────────
const TEAM_PROJECT_KEYWORDS = [
  'MyTeamBrain', 'team', 'memory', 'knowledge', 'shared',
  'claude', 'code', 'agent', 'hook', 'session', 'transcript',
  'BiomedParse', 'UAHP', 'medflow', 'medsam', 'monai', 'SAM',
  'Claude Code', 'Codex', 'project', 'repository', 'repo',
];

function scoreRelevance(entry) {
  const content = (entry.content || '').toLowerCase();
  const tags = (entry.tags || []).map(t => t.toLowerCase());
  const type = (entry.type || '').toLowerCase();

  let score = 3;

  let matches = 0;
  for (const kw of TEAM_PROJECT_KEYWORDS) {
    if (content.includes(kw.toLowerCase())) matches++;
  }
  if (matches >= 3) score += 2;
  else if (matches >= 1) score += 1;

  for (const tag of tags) {
    if (TEAM_PROJECT_KEYWORDS.some(kw => tag.includes(kw.toLowerCase()))) {
      score += 1;
      break;
    }
  }

  if (type === 'decision' || type === 'pattern') score += 1;

  return Math.max(1, Math.min(5, score));
}

// ── Novelty heuristics ────────────────────────────────────────────────────────
function scoreNovelty(entry, seenTopics = new Set()) {
  const content = (entry.content || '').toLowerCase();
  const tags = (entry.tags || []);

  let score = 3;

  const tagKey = tags.slice().sort().join('|');
  if (!seenTopics.has(tagKey) && tags.length > 0) score += 1;

  if (content.split(/\s+/).length < 10) score -= 1;

  const genericPhrases = /\b(yes|no|ok|okay|sure|great|good idea|agreed|sounds good)\b/gi;
  const genericCount = (content.match(genericPhrases) || []).length;
  if (genericCount >= 3) score -= 1;

  return Math.max(1, Math.min(5, score));
}

// ── Safety check ──────────────────────────────────────────────────────────────
function checkSafety(entry) {
  const content = entry.content || '';

  for (const { pattern, label } of SAFETY_PATTERNS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      const filtered = matches.filter(m => {
        if (/\b\d{4}[-\/]\d{2}[-\/]\d{2}\b/.test(m)) return false;
        if (/^\d+\.\d+(\.\d+)?$/.test(m)) return false;
        if (/\bnode\d*\b/i.test(m)) return false;
        if (/\bpostgres\d*\b/i.test(m)) return false;
        return true;
      });
      if (filtered.length > 0) {
        return { pass: false, reason: `safety pattern matched: ${label}`, matched: filtered[0] };
      }
    }
  }

  return { pass: true };
}

// ── Main judge function ───────────────────────────────────────────────────────
function judgeEntry(entry) {
  const scores = {
    importance: scoreImportance(entry),
    relevance: scoreRelevance(entry),
    novelty: scoreNovelty(entry),
    safety: 'pass',
  };

  const safetyResult = checkSafety(entry);
  if (!safetyResult.pass) {
    scores.safety = 'fail';
    return {
      entry,
      scores,
      approved: false,
      reason: `rejected: ${safetyResult.reason} — "${safetyResult.matched}"`,
    };
  }

  if (scores.importance < 2) {
    return {
      entry,
      scores,
      approved: false,
      reason: `rejected: importance below threshold (${scores.importance} < 2)`,
    };
  }

  if (scores.relevance < 2) {
    return {
      entry,
      scores,
      approved: false,
      reason: `rejected: relevance below threshold (${scores.relevance} < 2)`,
    };
  }

  return {
    entry,
    scores,
    approved: true,
    reason: `approved: importance=${scores.importance}, relevance=${scores.relevance}, novelty=${scores.novelty}`,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  let inputData = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--entry' && args[i + 1]) {
      try {
        inputData = JSON.parse(args[i + 1]);
      } catch {
        console.error('Error: Invalid JSON in --entry argument');
        process.exit(2);
      }
      break;
    }
    if (args[i] === '--file' && args[i + 1]) {
      try {
        const content = fs.readFileSync(args[i + 1], 'utf8');
        inputData = content.trim().split('\n').map(line => JSON.parse(line));
      } catch (e) {
        console.error(`Error: Cannot read file ${args[i + 1]}: ${e.message}`);
        process.exit(2);
      }
      break;
    }
  }

  if (!inputData) {
    const chunks = [];
    process.stdin.on('data', chunk => chunks.push(chunk));
    process.stdin.on('end', () => {
      const content = chunks.join('');
      if (!content.trim()) {
        console.error('Error: No input provided');
        process.exit(2);
      }
      const lines = content.trim().split('\n');
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const verdict = judgeEntry(entry);
          process.stdout.write(JSON.stringify(verdict) + '\n');
        } catch (e) {
          console.error(`Error parsing line: ${e.message}`);
          process.exit(2);
        }
      }
    });
    return;
  }

  const entries = Array.isArray(inputData) ? inputData : [inputData];
  for (const entry of entries) {
    const verdict = judgeEntry(entry);
    process.stdout.write(JSON.stringify(verdict) + '\n');
  }
}

main();