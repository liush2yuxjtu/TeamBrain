#!/usr/bin/env node
/**
 * session-start-hook.js - Claude Code Session Start Hook
 *
 * Triggered when a Claude Code session starts.
 * Pulls latest knowledge from remote and injects into context.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME || (require('os')).homedir();
const CONFIG_DIR = path.join(HOME, '.myteambrain');
const KNOWLEDGE_DIR = path.join(CONFIG_DIR, 'knowledge');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[session-start-hook] ${timestamp}: ${message}`);
}

async function injectKnowledge() {
  log('Session starting, loading knowledge...');

  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    log('Knowledge base not initialized, skipping');
    return;
  }

  try {
    execSync('git pull gitee main 2>/dev/null || git pull origin main 2>/dev/null || true', {
      cwd: KNOWLEDGE_DIR,
      stdio: 'ignore',
      timeout: 10000
    });
    log('Pulled latest knowledge from remote');
  } catch (e) {
    log('Git pull skipped (may not be configured)');
  }

  const dailyDir = path.join(KNOWLEDGE_DIR, 'daily');
  if (!fs.existsSync(dailyDir)) {
    log('No daily knowledge found');
    return;
  }

  const files = fs.readdirSync(dailyDir).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 7);

  if (files.length === 0) {
    log('No knowledge files found');
    return;
  }

  log(`Found ${files.length} recent knowledge file(s)`);

  const contextFile = path.join(CONFIG_DIR, 'session-context.md');
  let context = `# Recent Team Knowledge (Last 7 Days)\n\n`;

  for (const file of files) {
    const content = fs.readFileSync(path.join(dailyDir, file), 'utf8');
    context += `## ${file.replace('.md', '')}\n${content}\n\n`;
  }

  fs.writeFileSync(contextFile, context);
  log(`Context saved to: ${contextFile}`);

  console.log('\n[MyTeamBrain] Knowledge loaded. Type /query to search the knowledge base.\n');
}

injectKnowledge().catch(e => log(`Error: ${e.message}`));