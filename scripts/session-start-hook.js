#!/usr/bin/env node
/**
 * SessionStart Hook — Memory Injection
 *
 * Runs when a Claude Code session starts. Reads team memory JSONL files,
 * scores relevance to current project, and injects top-k memories.
 *
 * Usage: node session-start-hook.js <currentWorkingDirectory>
 * Environment:
 *   MYTEAMBRAIN_KNOWLEDGE_DIR  - directory containing JSONL files (default: ~/.myteambrain/knowledge/)
 *   MYTEAMBRAIN_MAX_MEMORIES   - max memories to inject (default: 5)
 *   MYTEAMBRAIN_LOG_LEVEL      - debug|info|warn|error (default: info)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Configuration ---
const CONFIG = {
  knowledgeDir: process.env.MYTEAMBRAIN_KNOWLEDGE_DIR || path.join(os.homedir(), '.myteambrain', 'knowledge'),
  maxMemories: parseInt(process.env.MYTEAMBRAIN_MAX_MEMORIES || '5', 10),
  logLevel: process.env.MYTEAMBRAIN_LOG_LEVEL || 'info',
};

// In-memory dedup set for current session (avoids same memory injected twice)
const injectedIds = new Set();

// --- Logging ---
function log(level, ...args) {
  const levels = ['debug', 'info', 'warn', 'error'];
  if (levels.indexOf(level) >= levels.indexOf(CONFIG.logLevel)) {
    console.error(`[session-start-hook][${level}]`, ...args);
  }
}

// --- Tokenization ---
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

// --- BM25-lite scoring ---
function scoreMemory(memory, queryTokens) {
  if (!queryTokens.length || !memory.content) return 0;

  const contentTokens = tokenize(memory.content);
  const tagsTokens = memory.tags ? memory.tags.flatMap(t => tokenize(t)) : [];
  const projectTokens = memory.project ? tokenize(memory.project) : [];

  const allMemoryTokens = [...contentTokens, ...tagsTokens, ...projectTokens];

  let matches = 0;
  for (const qt of queryTokens) {
    if (allMemoryTokens.some(t => t.includes(qt) || qt.includes(t))) {
      matches++;
    }
  }

  if (!matches) return 0;
  const tf = matches / allMemoryTokens.length;
  const idf = Math.log((allMemoryTokens.length + 1) / (matches + 1));
  return tf * idf;
}

// Build query tokens from project path
function buildQueryTokens(cwd) {
  const tokens = [];

  // Project name (last segment of path)
  const basename = path.basename(cwd);
  if (basename) tokens.push(...tokenize(basename));

  // Parent directory names (up to 2 levels)
  const parts = cwd.split(path.sep).filter(Boolean);
  for (let i = Math.max(0, parts.length - 3); i < parts.length; i++) {
    tokens.push(...tokenize(parts[i]));
  }

  return [...new Set(tokens)]; // deduplicate
}

// --- Read JSONL files ---
function readKnowledgeFiles() {
  const memories = [];

  if (!fs.existsSync(CONFIG.knowledgeDir)) {
    log('warn', `Knowledge dir not found: ${CONFIG.knowledgeDir}`);
    return memories;
  }

  let files;
  try {
    files = fs.readdirSync(CONFIG.knowledgeDir);
  } catch (err) {
    log('warn', `Cannot read knowledge dir: ${err.message}`);
    return memories;
  }

  for (const file of files) {
    if (!file.endsWith('.jsonl')) continue;

    const filePath = path.join(CONFIG.knowledgeDir, file);
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      log('warn', `Cannot read file ${file}: ${err.message}`);
      continue;
    }

    const lines = content.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const memory = JSON.parse(line);
        memories.push(memory);
      } catch (err) {
        log('warn', `Malformed JSON line in ${file}: ${err.message}`);
      }
    }
  }

  return memories;
}

// --- Main ---
function main() {
  const cwd = process.argv[2] || process.cwd();

  log('debug', `Running SessionStart hook for: ${cwd}`);

  // Read all memories
  const memories = readKnowledgeFiles();
  log('debug', `Loaded ${memories.length} memory entries`);

  if (!memories.length) {
    log('info', 'No memories found, exiting silently');
    return;
  }

  // Build query and score
  const queryTokens = buildQueryTokens(cwd);
  log('debug', `Query tokens: ${queryTokens.join(', ')}`);

  const scored = memories
    .filter(m => !injectedIds.has(m.id))
    .map(m => ({ memory: m, score: scoreMemory(m, queryTokens) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const topK = scored.slice(0, CONFIG.maxMemories);

  if (!topK.length) {
    log('info', 'No relevant memories found, exiting silently');
    return;
  }

  // Inject memories via stdout
  const lines = [];
  lines.push('');
  lines.push('=== Team Memory (' + topK.length + ' relevant) ===');
  lines.push('');

  for (const item of topK) {
    const m = item.memory;
    injectedIds.add(m.id);
    const timestamp = m.timestamp ? new Date(m.timestamp).toISOString().split('T')[0] : 'unknown';
    const tags = m.tags && m.tags.length ? `[${m.tags.join(', ')}]` : '';
    lines.push(`[${timestamp}] ${tags} ${m.content}`);
    lines.push('');
  }

  lines.push('==========================');
  lines.push('');

  console.log(lines.join('\n'));
}

// Always exit 0 — never block session start
try {
  main();
} catch (err) {
  log('error', `Fatal error: ${err.message}`);
}

process.exit(0);