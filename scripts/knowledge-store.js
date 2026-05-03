#!/usr/bin/env node
/**
 * knowledge-store.js — JSONL append-only knowledge base for TeamBrain
 *
 * Usage:
 *   node knowledge-store.js append <author> <content> [sessionId] [tags...] [--importance N]
 *   node knowledge-store.js query [--year-month YYYY-MM] [--author name] [--tags tag1,tag2] [--search text] [--limit N]
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const KNOWLEDGE_DIR = path.join(process.env.HOME, '.myteambrain', 'knowledge');

function ensureKnowledgeDir() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  }
}

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getFilePath(yearMonth = getCurrentYearMonth()) {
  return path.join(KNOWLEDGE_DIR, `${yearMonth}.jsonl`);
}

/**
 * Append a knowledge entry (append-only, atomic via temp file)
 */
function appendKnowledge({ author, content, sessionId = '', tags = [], importance = 3, embedding = null }) {
  ensureKnowledgeDir();

  const entry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    author,
    session_id: sessionId,
    content,
    tags,
    importance,
  };
  if (embedding) {
    entry.embedding = embedding;
  }

  const filePath = getFilePath();
  const tmpPath = `${filePath}.tmp`;

  // Atomic write: append to temp, then rename
  fs.writeFileSync(tmpPath, JSON.stringify(entry) + '\n', { flag: 'a' });
  fs.renameSync(tmpPath, filePath);

  return entry;
}

/**
 * Query knowledge entries
 */
function queryKnowledge({ yearMonth = null, author = null, tags = [], search = null, limit = 100 } = {}) {
  const targetMonth = yearMonth || getCurrentYearMonth();
  const filePath = getFilePath(targetMonth);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  const results = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      if (author && entry.author !== author) continue;
      if (tags.length > 0 && !tags.every(t => entry.tags.includes(t))) continue;
      if (search && !entry.content.toLowerCase().includes(search.toLowerCase())) continue;

      results.push(entry);
      if (results.length >= limit) break;
    } catch {
      // Skip malformed lines
    }
  }

  return results;
}

// CLI entry point
const [,, command, ...args] = process.argv;

if (command === 'append') {
  const [author, content, sessionIdOrDash, ...rest] = args;
  let sessionId = sessionIdOrDash;
  let tags = [];
  let importance = 3;

  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--tags' && rest[i + 1]) {
      tags = rest[i + 1].split(',');
      i++;
    } else if (rest[i] === '--importance' && rest[i + 1]) {
      importance = parseInt(rest[i + 1], 10);
      i++;
    }
  }

  const entry = appendKnowledge({ author, content, sessionId, tags, importance });
  console.log(JSON.stringify(entry, null, 2));
} else if (command === 'query') {
  const opts = { limit: 100 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--year-month' && args[i + 1]) { opts.yearMonth = args[++i]; }
    else if (args[i] === '--author' && args[i + 1]) { opts.author = args[++i]; }
    else if (args[i] === '--tags' && args[i + 1]) { opts.tags = args[++i].split(','); }
    else if (args[i] === '--search' && args[i + 1]) { opts.search = args[++i]; }
    else if (args[i] === '--limit' && args[i + 1]) { opts.limit = parseInt(args[++i], 10); }
  }
  const results = queryKnowledge(opts);
  console.log(JSON.stringify(results, null, 2));
} else {
  console.error('Usage: node knowledge-store.js <append|query> ...');
  process.exit(1);
}

module.exports = { appendKnowledge, queryKnowledge };