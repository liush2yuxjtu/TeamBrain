#!/usr/bin/env node
/**
 * Stop Hook — 团队 AI 记忆提取器
 *
 * Claude Code session 结束时触发，从 transcript 提炼知识写入 JSONL。
 * Idempotent: 同一 session_id 重复运行不产生重复记录。
 *
 * Usage: node stop-hook.js [session_id]
 *   session_id: 可选，默认为最新 transcript
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Config ---
const KNOWLEDGE_DIR = path.join(os.homedir(), '.myteambrain', 'knowledge');
const TRANSCRIPT_DIR = path.join(os.homedir(), '.claude', 'transcripts');
const LLM_MODEL = 'claude-opus-4-7';
const MIN_TURNS = 5;

// --- Helpers ---

/** 确保目录存在 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** 获取今日日期字符串 */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** 读取最新的 transcript 文件 */
function getLatestTranscript() {
  if (!fs.existsSync(TRANSCRIPT_DIR)) return null;
  const files = fs.readdirSync(TRANSCRIPT_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(TRANSCRIPT_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime);
  if (files.length === 0) return null;
  return path.join(TRANSCRIPT_DIR, files[0].name);
}

/** 解析 transcript 行，提取 turns */
function parseTranscript(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const turns = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'user' || obj.type === 'assistant') {
        turns.push(obj);
      }
    } catch {
      // skip malformed lines
    }
  }
  return turns;
}

/** 根据 content 内容推断 tags */
function inferTags(content) {
  const tags = [];
  const lower = content.toLowerCase();

  if (lower.includes('决策') || lower.includes('决定') || lower.includes('采用') || lower.includes('选择')) {
    tags.push('决策');
  }
  if (lower.includes('发现') || lower.includes('注意到') || lower.includes('原来')) {
    tags.push('发现');
  }
  if (lower.includes('模式') || lower.includes('架构') || lower.includes('重构')) {
    tags.push('架构');
  }
  if (lower.includes('竞品') || lower.includes('augment') || lower.includes('tabnine')) {
    tags.push('竞品分析');
  }
  if (lower.includes('产品') || lower.includes('用户需求') || lower.includes('mvp')) {
    tags.push('产品');
  }
  if (lower.includes('风险') || lower.includes('问题') || lower.includes('bug')) {
    tags.push('风险');
  }
  if (lower.includes('团队记忆') || lower.includes('知识流动') || lower.includes('shared')) {
    tags.push('团队记忆');
  }
  if (lower.includes('技术路径') || lower.includes('实现方式')) {
    tags.push('技术路径');
  }
  if (tags.length === 0) {
    tags.push('通用');
  }
  return tags;
}

/** 根据 content 推断 importance */
function inferImportance(content) {
  const lower = content.toLowerCase();
  if (lower.includes('决策') || lower.includes('决定') || lower.includes('风险') || lower.includes('关键')) {
    return 'high';
  }
  if (lower.includes('发现') || lower.includes('产品') || lower.includes('竞品')) {
    return 'high';
  }
  if (lower.includes('模式') || lower.includes('架构')) {
    return 'medium';
  }
  return 'medium';
}

/** PII scrubbing */
function scrubPII(text) {
  return text
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{11,}\b/g, '[ID]');
}

/** 从 transcript 提炼知识 */
function extractKnowledge(turns, sessionId) {
  if (turns.length < MIN_TURNS) {
    console.log(`[stop-hook] Session ${sessionId} has ${turns.length} turns, skipping (min ${MIN_TURNS})`);
    return [];
  }

  const now = new Date().toISOString();
  const items = [];

  const transcriptText = turns
    .slice(-20)
    .map(t => `[${t.type}] ${t.message?.content || ''}`)
    .join('\n');

  const patterns = [
    { trigger: /决策[：:]/g, importance: 'high', tag: '决策' },
    { trigger: /发现[：:]/g, importance: 'high', tag: '发现' },
    { trigger: /采用[：:]/g, importance: 'high', tag: '技术路径' },
    { trigger: /MVP[：:]/g, importance: 'medium', tag: 'MVP' },
    { trigger: /团队记忆[：:]/g, importance: 'high', tag: '团队记忆' },
    { trigger: /Stop Hook[：:]/g, importance: 'high', tag: '技术路径' },
    { trigger: /SessionStart[：:]/g, importance: 'medium', tag: '架构' },
  ];

  const lines = transcriptText.split('\n');
  const seenContent = new Set();

  for (const line of lines) {
    for (const p of patterns) {
      if (p.trigger.test(line)) {
        const rawContent = line.replace(p.trigger, '').trim();
        const content = scrubPII(rawContent);
        if (content.length > 10 && !seenContent.has(content)) {
          seenContent.add(content);
          items.push({
            timestamp: now,
            author: 'claude',
            session_id: sessionId,
            content,
            tags: [p.tag, ...inferTags(content)].slice(0, 5),
            importance: p.importance,
          });
        }
        break;
      }
    }
  }

  if (items.length === 0) {
    const summary = scrubPII(`Session ${sessionId} 结束，共 ${turns.length} 轮对话`);
    items.push({
      timestamp: now,
      author: 'claude',
      session_id: sessionId,
      content: summary,
      tags: ['通用'],
      importance: 'low',
    });
  }

  return items;
}

/** 检查 session_id 是否已处理过（今日） */
function isSessionProcessed(sessionId) {
  const todayFile = path.join(KNOWLEDGE_DIR, `${todayStr()}.jsonl`);
  if (!fs.existsSync(todayFile)) return false;

  const content = fs.readFileSync(todayFile, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.session_id === sessionId) return true;
    } catch {
      // skip
    }
  }
  return false;
}

/** 追加写入 JSONL */
function appendJSONL(items) {
  if (items.length === 0) return;

  ensureDir(KNOWLEDGE_DIR);
  const todayFile = path.join(KNOWLEDGE_DIR, `${todayStr()}.jsonl`);
  const lines = items.map(i => JSON.stringify(i)).join('\n') + '\n';

  fs.appendFileSync(todayFile, lines, 'utf-8');
  console.log(`[stop-hook] Wrote ${items.length} knowledge items to ${todayFile}`);
}

// --- Main ---

function main() {
  const sessionIdArg = process.argv[2];

  const transcriptPath = getLatestTranscript();
  if (!transcriptPath) {
    console.log('[stop-hook] No transcript found, skipping');
    return;
  }

  const sessionId = sessionIdArg || path.basename(transcriptPath, '.jsonl');

  if (isSessionProcessed(sessionId)) {
    console.log(`[stop-hook] Session ${sessionId} already processed today, skipping`);
    return;
  }

  const turns = parseTranscript(transcriptPath);
  const items = extractKnowledge(turns, sessionId);

  appendJSONL(items);

  console.log(`[stop-hook] Done for session ${sessionId}`);
}

main();
