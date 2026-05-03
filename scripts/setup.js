#!/usr/bin/env node
/**
 * setup.js — postinstall script for myteambrain
 * Creates ~/.myteambrain/knowledge directory and prints hook setup instructions.
 */

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(process.env.HOME, '.myteambrain', 'knowledge');
const CONFIG_FILE = path.join(process.env.HOME, '.myteambrain', 'config.json');

const DEFAULT_CONFIG = {
  sessionStart: {
    enabled: true,
    knowledgeDir: "~/.myteambrain/knowledge",
    topK: 5,
    scorer: "bm25",
    injectVia: "env",
    injectFile: "/tmp/myteambrain-inject.json",
    minScore: 0.1
  },
  stopHook: {
    enabled: true,
    extractKeywords: true,
    minImportance: 2
  },
  gitSync: {
    autoPush: true,
    autoPull: true,
    remotes: ["gitee", "github"]
  }
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created: ${dir}`);
  } else {
    console.log(`Exists: ${dir}`);
  }
}

function ensureConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(`Created: ${CONFIG_FILE}`);
  } else {
    console.log(`Exists: ${CONFIG_FILE}`);
  }
}

function main() {
  console.log('\n=== myteambrain setup ===\n');

  ensureDir(KNOWLEDGE_DIR);
  ensureConfig();

  console.log('\n--- Hook setup (Claude Code) ---');
  console.log('Add to your .claude/settings.json:');
  console.log(JSON.stringify({
    hooks: {
      SessionStart: {
        command: 'node',
        args: ['{CLAUDE_CWD}/.claude/hooks/session-start-hook.js']
      },
      Stop: {
        command: 'node',
        args: ['{CLAUDE_CWD}/.claude/hooks/stop-hook.js']
      }
    }
  }, null, 2));

  console.log('\n--- Post-install complete ---');
  console.log(`Knowledge dir: ${KNOWLEDGE_DIR}`);
  console.log('Run: myteambrain --help\n');
}

main();