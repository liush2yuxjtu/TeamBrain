#!/usr/bin/env node
/**
 * MyTeamBrain CLI - 团队 AI 集体记忆命令行工具
 *
 *   ██████╗ ██████╗ ███████╗███╗   ██╗██╗    ██╗███╗   ██╗██╗   ██╗
 *  ██╔════╝██╔═══██╗██╔════╝████╗  ██║██║     ██║████╗  ██║██║   ██║
 *  ██║     ██║   ██║███████╗██╔██╗ ██║██║     ██║██╔██╗ ██║██║   ██║
 *  ██║     ██║   ██║╚════██║██║╚██╗██║██║     ██║██║╚██╗██║██║   ██║
 *  ╚██████╗╚██████╔╝███████║██║ ╚████║███████╗██║██║ ╚████║╚██████╔╝
 *   ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝
 *
 * Usage:
 *   myteambrain init      - Initialize knowledge base
 *   myteambrain status    - Show knowledge base stats
 *   myteambrain push      - Push knowledge to remote
 *   myteambrain pull      - Pull knowledge from remote
 *   myteambrain query <text> - Search local knowledge base
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME || (require('os')).homedir();
const CONFIG_DIR = path.join(HOME, '.myteambrain');
const KNOWLEDGE_DIR = path.join(CONFIG_DIR, 'knowledge');

const commands = {
  init: async () => {
    console.log('Initializing MyTeamBrain knowledge base...');

    // Create directories
    for (const dir of [CONFIG_DIR, KNOWLEDGE_DIR, path.join(KNOWLEDGE_DIR, 'daily'), path.join(KNOWLEDGE_DIR, 'experts')]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  Created: ${dir}`);
      }
    }

    // Check git remote
    try {
      const remotes = execSync('git remote -v', { encoding: 'utf8' });
      console.log('\nGit remotes found:');
      console.log(remotes);
    } catch {
      console.log('\nNo git remote configured. To add one:');
      console.log('  git remote add gitee https://gitee.com/yourname/myteambrain.git');
      console.log('  git remote add github https://github.com/yourname/myteambrain.git');
    }

    // Check hooks installation
    const hooksDir = path.join(HOME, '.claude', 'hooks');
    const stopHook = path.join(hooksDir, 'stop-hook.js');
    const startHook = path.join(hooksDir, 'session-start-hook.js');

    console.log('\nHooks installation:');
    console.log(`  Stop hook: ${fs.existsSync(stopHook) ? 'installed' : 'not installed'}`);
    console.log(`  Start hook: ${fs.existsSync(startHook) ? 'installed' : 'not installed'}`);

    if (!fs.existsSync(stopHook) || !fs.existsSync(startHook)) {
      console.log('\nTo install hooks, run: ./setup.sh');
    }

    console.log('\nInitialization complete!');
  },

  status: async () => {
    console.log('MyTeamBrain Status');
    console.log('==================\n');

    // Knowledge base stats
    const knowledgeExists = fs.existsSync(KNOWLEDGE_DIR);
    if (!knowledgeExists) {
      console.log('Knowledge base not initialized. Run: myteambrain init');
      return;
    }

    // Count files
    let totalFiles = 0;
    let totalSize = 0;

    function countFiles(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          countFiles(fullPath);
        } else {
          totalFiles++;
          totalSize += fs.statSync(fullPath).size;
        }
      }
    }

    countFiles(KNOWLEDGE_DIR);

    console.log(`Knowledge directory: ${KNOWLEDGE_DIR}`);
    console.log(`Total files: ${totalFiles}`);
    console.log(`Total size: ${(totalSize / 1024).toFixed(2)} KB`);

    // Git status
    try {
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      console.log(`\nGit branch: ${branch}`);
      console.log(`Modified files: ${status ? status.split('\n').filter(l => l.trim()).length : 0}`);
    } catch {
      console.log('\nNot a git repository or git not available');
    }

    // Hook status
    const hooksDir = path.join(HOME, '.claude', 'hooks');
    console.log(`\nHooks directory: ${hooksDir}`);
    console.log(`Stop hook: ${fs.existsSync(path.join(hooksDir, 'stop-hook.js')) ? 'active' : 'inactive'}`);
    console.log(`Start hook: ${fs.existsSync(path.join(hooksDir, 'session-start-hook.js')) ? 'active' : 'inactive'}`);
  },

  push: async () => {
    console.log('Pushing knowledge to remote...');
    try {
      execSync('git push gitee main 2>/dev/null || git push origin main', { stdio: 'inherit' });
      execSync('git push github main 2>/dev/null || true', { stdio: 'inherit' });
      console.log('\nPush complete!');
    } catch (e) {
      console.error('Push failed. Make sure you have git remotes configured.');
    }
  },

  pull: async () => {
    console.log('Pulling knowledge from remote...');
    try {
      execSync('git pull gitee main 2>/dev/null || git pull origin main', { stdio: 'inherit' });
      console.log('\nPull complete!');
    } catch (e) {
      console.error('Pull failed. Make sure you have git remotes configured.');
    }
  },

  query: async (searchText) => {
    if (!searchText) {
      console.error('Usage: myteambrain query <search-text>');
      process.exit(1);
    }

    console.log(`Searching for: "${searchText}"`);
    console.log('');

    const results = [];

    function searchDir(dir, depth = 0) {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory() && depth < 5) {
          searchDir(fullPath, depth + 1);
        } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.toLowerCase().includes(searchText.toLowerCase())) {
              const lines = content.split('\n');
              const matchingLine = lines.find(l => l.toLowerCase().includes(searchText.toLowerCase()));
              results.push({
                file: fullPath.replace(HOME, '~'),
                match: matchingLine ? matchingLine.trim().substring(0, 100) : ''
              });
            }
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    }

    searchDir(KNOWLEDGE_DIR);

    if (results.length === 0) {
      console.log('No matches found.');
    } else {
      console.log(`Found ${results.length} match(es):\n`);
      results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.file}`);
        console.log(`   ${r.match}`);
        console.log('');
      });
    }
  }
};

// Main CLI
const args = process.argv.slice(2);
const command = args[0];
const arg = args.slice(1).join(' ');

if (!command) {
  console.log(`MyTeamBrain CLI - 团队 AI 集体记忆
Usage: myteambrain <command> [options]

Commands:
  init              Initialize knowledge base
  status            Show knowledge base stats
  push              Push knowledge to remote
  pull              Pull knowledge from remote
  query <text>      Search local knowledge base

Example:
  myteambrain init
  myteambrain status
  myteambrain query "决策"`);
  process.exit(0);
}

if (commands[command]) {
  commands[command](arg).catch(console.error);
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Run: myteambrain (without args) to see usage');
  process.exit(1);
}