#!/usr/bin/env node
/**
 * setup.js — postinstall script for myteambrain
 * Creates ~/.myteambrain/knowledge directory and prints hook setup instructions.
 */

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(process.env.HOME, '.myteambrain', 'knowledge');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created: ${dir}`);
  } else {
    console.log(`Exists: ${dir}`);
  }
}

function main() {
  console.log('\n=== myteambrain setup ===\n');

  ensureDir(KNOWLEDGE_DIR);

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