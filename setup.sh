#!/usr/bin/env bash
# MyTeamBrain Setup Script
# 安装 MyTeamBrain CLI 和 Claude Code hooks
#
#  ██████╗ ██████╗ ███████╗███╗   ██╗██╗    ██╗███╗   ██╗██╗   ██╗
#  ██╔════╝██╔═══██╗██╔════╝████╗  ██║██║     ██║████╗  ██║██║   ██║
#  ██║     ██║   ██║███████╗██╔██╗ ██║██║     ██║██╔██╗ ██║██║   ██║
#  ██║     ██║   ██║╚════██║██║╚██╗██║██║     ██║██║╚██╗██║██║   ██║
#  ╚██████╗╚██████╔╝███████║██║ ╚████║███████╗██║██║ ╚████║╚██████╔╝
#   ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝

set -e

echo "============================================"
echo "  MyTeamBrain Setup"
echo "============================================"
echo ""

HOME_DIR="${HOME:-$(eval echo ~$(whoami))}"
CONFIG_DIR="$HOME_DIR/.myteambrain"
HOOKS_DIR="$HOME_DIR/.claude/hooks"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

# 1. Create ~/.myteambrain directory structure
echo "[1/4] Creating directory structure..."
mkdir -p "$CONFIG_DIR/knowledge/daily"
mkdir -p "$CONFIG_DIR/knowledge/experts"
echo "  Created: $CONFIG_DIR"
echo "  Created: $CONFIG_DIR/knowledge/daily"
echo "  Created: $CONFIG_DIR/knowledge/experts"

# 2. Install Claude Code hooks
echo ""
echo "[2/4] Installing Claude Code hooks..."

# Create hooks directory if not exists
mkdir -p "$HOOKS_DIR"

# Copy stop-hook.js
if [ -f "$SCRIPTS_DIR/hooks/stop-hook.js" ]; then
    cp "$SCRIPTS_DIR/hooks/stop-hook.js" "$HOOKS_DIR/"
    echo "  Installed: stop-hook.js"
else
    echo "  Warning: stop-hook.js not found in $SCRIPTS_DIR/hooks/"
fi

# Copy session-start-hook.js
if [ -f "$SCRIPTS_DIR/hooks/session-start-hook.js" ]; then
    cp "$SCRIPTS_DIR/hooks/session-start-hook.js" "$HOOKS_DIR/"
    echo "  Installed: session-start-hook.js"
else
    echo "  Warning: session-start-hook.js not found in $SCRIPTS_DIR/hooks/"
fi

# 3. Link CLI to PATH (optional)
echo ""
echo "[3/4] CLI setup..."
if [ -f "$SCRIPTS_DIR/cli.js" ]; then
    chmod +x "$SCRIPTS_DIR/cli.js"
    echo "  CLI executable: $SCRIPTS_DIR/cli.js"
    echo ""
    echo "  To use CLI globally, add to your PATH:"
    echo "    export PATH=\"$SCRIPTS_DIR:\$PATH\""
fi

# 4. Git remote setup
echo ""
echo "[4/4] Git remote configuration..."
echo ""
echo "  Current remotes:"
git remote -v 2>/dev/null || echo "    No remotes configured"
echo ""
echo "  To add remotes for team sync, run:"
echo "    git remote add gitee https://gitee.com/yourname/myteambrain.git"
echo "    git remote add github https://github.com/yourname/myteambrain.git"
echo ""

echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Add git remotes (see above)"
echo "  2. Run 'myteambrain init' to initialize"
echo "  3. Run 'myteambrain status' to check status"