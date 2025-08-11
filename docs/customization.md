# Customization and Configuration

🟡 **Difficulty**: Intermediate | **Read time**: 12 minutes

Configure KODAMA Claude to work exactly how you want.

## Table of Contents
- [Environment Variables](#environment-variables)
- [Storage Locations](#storage-locations)
- [Shell Configuration](#shell-configuration)
- [Claude CLI Integration](#claude-cli-integration)
- [Git Integration](#git-integration)
- [Advanced Customization](#advanced-customization)

## Environment Variables

### Claude Code Configuration

KODAMA Claude works with Claude Code CLI, which uses OAuth authentication:

```bash
# Claude Code uses OAuth, not API keys
# Authentication is handled via browser on first run
claude

# Optional: Skip permission prompts (use with caution)
claude --dangerously-skip-permissions

# Optional: Specify model
claude --model claude-sonnet-4-20250514
```

**Note**: Claude Code stores authentication in your system's credential manager, not environment variables.

### Language Settings (i18n)

KODAMA Claude supports multiple languages for messages and prompts:

```bash
# Set language to Japanese
export KODAMA_LANG=ja

# Set language to English (default)
export KODAMA_LANG=en

# Language detection priority:
# 1. KODAMA_LANG environment variable
# 2. LANG environment variable
# 3. LC_ALL environment variable
# 4. Default to English
```

**Supported Languages**:
- `en` - English (default)
- `ja` - Japanese (日本語)

**Setting permanently**:
```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export KODAMA_LANG=ja' >> ~/.bashrc
source ~/.bashrc
```

### KODAMA-Specific Variables

```bash
# Change storage location (default: ~/.local/share/kodama-claude)
export KODAMA_DATA_DIR="/custom/path/kodama"

# Set default editor for snapshots (default: system editor)
export KODAMA_EDITOR="vim"

# Enable debug output
export KODAMA_DEBUG="1"

# Disable colors in output
export NO_COLOR="1"

# Custom Claude CLI path
export CLAUDE_CLI_PATH="/usr/local/bin/claude"
```

### Smart Context Management (v0.2.0+)

KODAMA now includes intelligent context management to reduce cognitive load:

```bash
# Check current settings (empty means default)
echo "KODAMA_NO_LIMIT=$KODAMA_NO_LIMIT"        # empty = false
echo "KODAMA_AUTO_ARCHIVE=$KODAMA_AUTO_ARCHIVE" # empty = true
echo "KODAMA_CLAUDE_SYNC=$KODAMA_CLAUDE_SYNC"   # empty = false

# Decision limiting (default: false = limit to 5 decisions)
export KODAMA_NO_LIMIT="true"        # Show ALL decisions (disable limit)
export KODAMA_NO_LIMIT="false"       # Show ONLY 5 decisions (default)

# Auto-archive (default: true = archive after 30 days)
export KODAMA_AUTO_ARCHIVE="true"    # Enable archiving (default)
export KODAMA_AUTO_ARCHIVE="false"   # Disable archiving

# CLAUDE.md sync (default: false = no sync)
export KODAMA_CLAUDE_SYNC="true"     # Enable CLAUDE.md updates
export KODAMA_CLAUDE_SYNC="false"    # Disable CLAUDE.md updates (default)
```

**Why these features?**
- **5-decision limit**: Reduces cognitive load for junior developers
- **Auto-archive**: Keeps your workspace clean automatically
- **CLAUDE.md sync**: Maintains AI context across sessions

**Example custom setup**:

```bash
# ~/.bashrc additions for KODAMA
export KODAMA_DATA_DIR="$HOME/Documents/kodama-snapshots"
export KODAMA_EDITOR="code --wait"   # Use VS Code
export KODAMA_DEBUG="0"               # Quiet mode
export KODAMA_NO_LIMIT="false"        # Keep 5-decision limit (recommended)
export KODAMA_AUTO_ARCHIVE="true"     # Auto-clean old snapshots (recommended)
export KODAMA_CLAUDE_SYNC="true"      # Enable CLAUDE.md updates
```

## Storage Locations

### Default Structure

```
~/.local/share/kodama-claude/
├── snapshots/          # JSON snapshot files
│   ├── 2025-01-10T09-00-00-abc123.json
│   ├── 2025-01-10T14-30-00-def456.json
│   ├── latest.json    # Symlink to newest
│   └── archive/       # Auto-archived snapshots (30+ days old)
│       └── 2024-12-01T10-00-00-xyz789.json
├── events.jsonl       # Event log
├── .session           # Current Claude session ID
└── .lock              # File lock for safety
```

**Note**: Archived snapshots are automatically moved to the `archive/` subdirectory after 30 days. They remain accessible but don't clutter your main snapshot list.

### Changing Storage Location

**Method 1: Environment Variable**

```bash
# Use different location
export KODAMA_DATA_DIR="/mnt/shared/kodama"
kc go  # Now uses /mnt/shared/kodama
```

**Method 2: Symlink**

```bash
# Move existing data
mv ~/.local/share/kodama-claude /mnt/backup/kodama

# Create symlink
ln -s /mnt/backup/kodama ~/.local/share/kodama-claude

# Verify
ls -la ~/.local/share/kodama-claude
# Should show: kodama-claude -> /mnt/backup/kodama
```

**Method 3: Per-Project Storage**

```bash
# Project-specific function
project_kodama() {
    export KODAMA_DATA_DIR="$(pwd)/.kodama"
    mkdir -p "$KODAMA_DATA_DIR/snapshots"
    kc "$@"
}

# Use in project
cd ~/projects/web-app
project_kodama go  # Uses ~/projects/web-app/.kodama
```

### Backup Strategies

**Automatic backup with cron**:

```bash
# Add to crontab (crontab -e)
# Daily backup at 2 AM
0 2 * * * tar -czf ~/backups/kodama-$(date +\%Y\%m\%d).tar.gz ~/.local/share/kodama-claude/

# Weekly cleanup (keep last 30 days)
0 3 * * 0 find ~/backups -name "kodama-*.tar.gz" -mtime +30 -delete
```

**Git-based backup**:

```bash
# Initialize git in storage directory
cd ~/.local/share/kodama-claude
git init
echo ".lock" >> .gitignore
echo ".session" >> .gitignore

# Auto-commit function
kodama_backup() {
    cd ~/.local/share/kodama-claude
    git add .
    git commit -m "Auto-backup: $(date '+%Y-%m-%d %H:%M')"
    git push origin main 2>/dev/null || true
    cd - > /dev/null
}

# Add to your kc wrapper
alias kc='command kc "$@" && kodama_backup'
```

## Shell Configuration

### Aliases and Functions

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# ===== KODAMA Shortcuts =====

# Quick commands
alias kcg='kc go'
alias kcs='kc save'
alias kcg='kc go'
alias kcst='kc status'

# Morning routine
morning() {
    echo "🌅 Good morning! Loading yesterday's context..."
    kc go -t "Morning session: $(date '+%A %B %d')"
}

# Evening routine
evening() {
    echo "🌙 Wrapping up the day..."
    kc save -t "End of day: $(date '+%Y-%m-%d')"
    echo "📊 Today's progress:"
    jq '.context' ~/.local/share/kodama-claude/snapshots/latest.json
}

# Quick status check
kcstatus() {
    echo "📍 Current Context:"
    jq '{title, timestamp, step, gitBranch}' \
        ~/.local/share/kodama-claude/snapshots/latest.json 2>/dev/null || \
        echo "No snapshots yet"
}

# List recent snapshots
kclist() {
    echo "📚 Recent Snapshots:"
    ls -t ~/.local/share/kodama-claude/snapshots/*.json 2>/dev/null | \
        head -10 | \
        xargs -I {} sh -c 'echo "---"; jq "{id: .id, title: .title, time: .timestamp}" {}'
}

# Search snapshots
kcsearch() {
    local query="$1"
    echo "🔍 Searching for: $query"
    grep -l "$query" ~/.local/share/kodama-claude/snapshots/*.json | \
        xargs -I {} jq '{file: "'{}'", title: .title, match: .context}' {} | \
        jq -s '.'
}

# Project switcher
kcproject() {
    local project="$1"
    case "$project" in
        web)
            cd ~/projects/web-app
            echo "📁 Web App Project"
            ;;
        api)
            cd ~/projects/api-server
            echo "📁 API Server Project"
            ;;
        mobile)
            cd ~/projects/mobile-app
            echo "📁 Mobile App Project"
            ;;
        *)
            echo "Unknown project: $project"
            echo "Available: web, api, mobile"
            return 1
            ;;
    esac
    kcstatus
    kc go -t "$project: $(date '+%H:%M')"
}

# Clean old snapshots (keep last N)
kcclean() {
    local keep="${1:-20}"
    echo "🧹 Keeping last $keep snapshots..."
    ls -t ~/.local/share/kodama-claude/snapshots/*.json | \
        tail -n +$((keep + 1)) | \
        xargs -r rm -v
}
```

### Auto-completion

**Bash completion**:

```bash
# Add to ~/.bash_completion or ~/.bashrc
_kc_completion() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    local commands="go snap plan send doctor --help --version"
    
    case "${COMP_WORDS[1]}" in
        go)
            COMPREPLY=($(compgen -W "-t --title -s --step --no-save" -- "$cur"))
            ;;
        snap|plan)
            COMPREPLY=($(compgen -W "-t --title" -- "$cur"))
            ;;
        send)
            # Complete with snapshot IDs
            local snapshots=$(ls ~/.local/share/kodama-claude/snapshots/*.json 2>/dev/null | \
                xargs -I {} basename {} .json)
            COMPREPLY=($(compgen -W "$snapshots" -- "$cur"))
            ;;
        *)
            COMPREPLY=($(compgen -W "$commands" -- "$cur"))
            ;;
    esac
}

complete -F _kc_completion kc
```

**Zsh completion**:

```bash
# Add to ~/.zshrc
autoload -U compinit && compinit

_kc() {
    local -a commands
    commands=(
        'go:Start or continue working'
        'snap:Save current context'
        'plan:Plan next steps'
        'send:Send context to Claude'
        'doctor:Check system health'
    )
    
    _arguments \
        '1:command:->commands' \
        '*::arg:->args'
    
    case $state in
        commands)
            _describe 'command' commands
            ;;
        args)
            case $words[1] in
                go)
                    _arguments \
                        '-t[Title]:title:' \
                        '--title[Title]:title:' \
                        '-s[Step]:step:(designing implementing testing done)' \
                        '--step[Step]:step:(designing implementing testing done)' \
                        '--no-save[Do not save snapshot]'
                    ;;
                snap|plan)
                    _arguments \
                        '-t[Title]:title:' \
                        '--title[Title]:title:'
                    ;;
            esac
            ;;
    esac
}

compdef _kc kc
```

## Claude CLI Integration

### Custom Claude Configuration

```bash
# ~/.claude/config.json
{
  "api_key_env": "ANTHROPIC_API_KEY",
  "default_model": "claude-3-opus-20240229",
  "max_tokens": 4096,
  "temperature": 0.7,
  "session_timeout": 3600,
  "auto_save": true,
  "history_file": "~/.claude/history.json"
}
```

### Wrapper Script

Create enhanced Claude+KODAMA integration:

```bash
#!/bin/bash
# Save as ~/bin/claude-kodama

# Auto-snapshot before Claude
pre_snapshot() {
    if [[ ! "$*" =~ "--continue" ]]; then
        echo "📸 Creating pre-Claude snapshot..."
        kc save -t "Before: $*" </dev/null
    fi
}

# Auto-snapshot after Claude
post_snapshot() {
    echo "📸 Creating post-Claude snapshot..."
    kc save -t "After Claude session" </dev/null
}

# Trap exit
trap post_snapshot EXIT

# Run
pre_snapshot "$@"
claude "$@"
```

### Session Management

```bash
# List all Claude sessions
list_sessions() {
    echo "📝 Claude Sessions:"
    claude --list-sessions | while read -r session; do
        echo "  • $session"
        # Try to find matching snapshot
        grep -l "$session" ~/.local/share/kodama-claude/snapshots/*.json 2>/dev/null | \
            xargs -I {} jq '.title' {} 2>/dev/null | \
            sed 's/^/    → /'
    done
}

# Resume specific session with context
resume_session() {
    local session_id="$1"
    echo "🔄 Resuming session: $session_id"
    
    # Find snapshot with this session
    local snapshot=$(grep -l "$session_id" ~/.local/share/kodama-claude/snapshots/*.json | head -1)
    
    if [[ -n "$snapshot" ]]; then
        echo "📋 Found context: $(jq '.title' "$snapshot")"
        ln -sf "$(basename "$snapshot")" ~/.local/share/kodama-claude/snapshots/latest.json
    fi
    
    claude --continue "$session_id"
}
```

## Git Integration

### Git Hooks

**Pre-commit hook** (`.git/hooks/pre-commit`):

```bash
#!/bin/bash
# Auto-snapshot before commit

# Check if KODAMA is installed
if command -v kc >/dev/null 2>&1; then
    echo "📸 Creating pre-commit snapshot..."
    
    # Get commit message preview
    COMMIT_MSG=$(git diff --cached --name-status | head -5)
    
    # Create snapshot
    echo "Pre-commit checkpoint" | kc save -t "Pre-commit: $(date '+%Y-%m-%d %H:%M')" --stdin -y 2>/dev/null
fi
```

**Post-merge hook** (`.git/hooks/post-merge`):

```bash
#!/bin/bash
# Remind to update context after merge

echo "⚠️  Branch merged. Remember to update KODAMA context:"
echo "   kc save -t 'After merge: $(git branch --show-current)'"
```

### Branch-Aware Context

```bash
# Auto-switch context based on git branch
git_branch_context() {
    local branch=$(git branch --show-current 2>/dev/null)
    if [[ -n "$branch" ]]; then
        local branch_snapshot=~/.local/share/kodama-claude/snapshots/branch-$branch.json
        if [[ -f "$branch_snapshot" ]]; then
            echo "🔀 Loading context for branch: $branch"
            ln -sf "branch-$branch.json" ~/.local/share/kodama-claude/snapshots/latest.json
        fi
    fi
}

# Add to prompt command
PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }git_branch_context"
```

## Advanced Customization

### Custom Snapshot Format

Create wrapper for custom fields:

```bash
#!/bin/bash
# Save as ~/bin/kc-custom

kc_snap_extended() {
    # Gather extra information
    local ticket=$(git branch --show-current | grep -oE '[A-Z]+-[0-9]+' || echo "N/A")
    local files_changed=$(git diff --name-only | wc -l)
    local test_status=$(npm test 2>&1 | tail -1)
    
    # Create snapshot with extra context
    (
        echo "Ticket: $ticket"
        echo "Files changed: $files_changed"
        echo "Tests: $test_status"
        echo "---"
        cat
    ) | kc save --stdin -y "$@"
}

alias kcs='kc_snap_extended'
```

### Notification Integration

```bash
# Desktop notifications
notify_snapshot() {
    kc save "$@"
    notify-send "KODAMA Claude" "Snapshot saved: $1" -i dialog-information
}

# Slack notification
slack_snapshot() {
    local title="$1"
    kc save -t "$title"
    curl -X POST $SLACK_WEBHOOK -d "{\"text\": \"🎯 Snapshot: $title\"}"
}

# Email summary
email_daily_summary() {
    local summary=$(jq -s '[.[] | {title, timestamp}]' \
        ~/.local/share/kodama-claude/snapshots/$(date +%Y-%m-%d)*.json)
    
    echo "$summary" | mail -s "KODAMA Daily Summary" you@example.com
}
```

### Integration with Task Managers

**JIRA Integration**:

```bash
# Extract JIRA ticket from branch
get_jira_ticket() {
    git branch --show-current | grep -oE '[A-Z]+-[0-9]+'
}

# Add JIRA context to snapshot
kc_jira() {
    local ticket=$(get_jira_ticket)
    if [[ -n "$ticket" ]]; then
        local jira_info=$(curl -s "$JIRA_API/issue/$ticket" | jq '.fields.summary')
        echo "JIRA $ticket: $jira_info" | kc save -t "JIRA-$ticket: $1" --stdin -y
    else
        kc save "$@"
    fi
}
```

**GitHub Issues**:

```bash
# Link snapshot to GitHub issue
kc_github() {
    local issue="$1"
    shift
    local issue_title=$(gh issue view "$issue" --json title -q .title)
    kc save -t "Issue #$issue: $issue_title" "$@"
    
    # Add comment to issue
    gh issue comment "$issue" -b "Working on this. Context saved in KODAMA."
}
```

### Performance Optimization

```bash
# Limit snapshot size
compact_snapshots() {
    find ~/.local/share/kodama-claude/snapshots -name "*.json" -size +10k -exec \
        jq 'del(.context) | .context = (.context[:500] + "...")' {} \; -exec \
        mv {} {}.bak \; -exec \
        jq '.' {}.bak > {} \; -exec \
        rm {}.bak \;
}

# Archive old snapshots
archive_old() {
    local archive_dir=~/.local/share/kodama-claude/archive
    mkdir -p "$archive_dir"
    
    find ~/.local/share/kodama-claude/snapshots -name "*.json" -mtime +30 -exec \
        mv {} "$archive_dir/" \;
    
    # Compress archive
    tar -czf "$archive_dir/archive-$(date +%Y%m).tar.gz" "$archive_dir"/*.json
    rm "$archive_dir"/*.json
}
```

### Custom Themes

```bash
# Colorful output
export KODAMA_COLORS=1

# Custom prompt symbols
export KODAMA_PROMPT_SUCCESS="✨"
export KODAMA_PROMPT_ERROR="💥"
export KODAMA_PROMPT_LOADING="🔄"

# Emoji mode
export KODAMA_EMOJI=1

# Quiet mode
export KODAMA_QUIET=1
```

---

**Next**: Fix problems in [Troubleshooting](troubleshooting.md) →