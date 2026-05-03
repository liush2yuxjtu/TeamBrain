#!/usr/bin/env node
/**
 * git-sync.js — git push/pull sync for TeamBrain knowledge files
 *
 * Usage:
 *   node git-sync.js pull    # pull remote changes on startup
 *   node git-sync.js push    # push new entries after append
 *   node git-sync.js status  # show sync status
 */

const { execSync } = require('child_process');
const path = require('path');

const KNOWLEDGE_DIR = path.join(process.env.HOME, '.myteambrain', 'knowledge');
const REMOTES = ['gitee', 'github'];

function run(cmd) {
  try {
    return execSync(cmd, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
  } catch {
    return null;
  }
}

function getGitRoot() {
  return run('git rev-parse --show-toplevel 2>/dev/null');
}

function pull() {
  const gitRoot = getGitRoot();
  if (!gitRoot) {
    console.error('Not in a git repository');
    return false;
  }

  let success = true;
  for (const remote of REMOTES) {
    const remoteUrl = run(`git remote get-url ${remote} 2>/dev/null`);
    if (!remoteUrl) {
      console.warn(`Remote ${remote} not configured, skipping`);
      continue;
    }

    const result = run(`git pull --ff-only ${remote} main 2>&1`);
    if (result === null) {
      console.warn(`Pull from ${remote} failed`);
      success = false;
    } else {
      console.log(`Pulled from ${remote}`);
    }
  }
  return success;
}

function push() {
  const gitRoot = getGitRoot();
  if (!gitRoot) {
    console.error('Not in a git repository');
    return false;
  }

  try {
    execSync(`git add ${KNOWLEDGE_DIR}/*.jsonl 2>/dev/null`, { encoding: 'utf-8' });
  } catch {
    // No files to add
  }

  const staged = run('git diff --cached --name-only 2>/dev/null');
  if (!staged) {
    console.log('Nothing new to push');
    return true;
  }

  try {
    execSync('git commit -m "chore: sync knowledge entries [skip ci]" 2>/dev/null', { encoding: 'utf-8' });
  } catch {
    // Already committed or nothing to commit
  }

  let success = true;
  for (const remote of REMOTES) {
    const remoteUrl = run(`git remote get-url ${remote} 2>/dev/null`);
    if (!remoteUrl) {
      console.warn(`Remote ${remote} not configured, skipping`);
      continue;
    }

    const result = run(`git push ${remote} main 2>&1`);
    if (result === null) {
      console.error(`Push to ${remote} failed`);
      success = false;
    } else {
      console.log(`Pushed to ${remote}`);
    }
  }
  return success;
}

function status() {
  const gitRoot = getGitRoot();
  if (!gitRoot) {
    console.error('Not in a git repository');
    return;
  }

  const remoteInfo = REMOTES.map(r => {
    const url = run(`git remote get-url ${r} 2>/dev/null`);
    return url ? `${r}: ${url}` : `${r}: not configured`;
  }).join('\n');

  console.log('=== Git Sync Status ===');
  console.log(`Git root: ${gitRoot}`);
  console.log(`Knowledge dir: ${KNOWLEDGE_DIR}`);
  console.log('Remotes:\n' + remoteInfo);

  const ahead = run('git log origin/main..main --oneline 2>/dev/null') || '';
  const behind = run('git log main..origin/main --oneline 2>/dev/null') || '';
  console.log(`Ahead: ${ahead.split('\n').filter(Boolean).length}`);
  console.log(`Behind: ${behind.split('\n').filter(Boolean).length}`);
}

// CLI entry point
const [,, command] = process.argv;

switch (command) {
  case 'pull':
    pull();
    break;
  case 'push':
    push();
    break;
  case 'status':
    status();
    break;
  default:
    console.error('Usage: node git-sync.js <pull|push|status>');
    process.exit(1);
}

module.exports = { pull, push, status };