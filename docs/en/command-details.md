# KODAMA Claude Command Details Guide

🟢 **Difficulty**: Beginner to Intermediate | **Read time**: 10 minutes

This guide provides detailed explanations of KODAMA Claude's commands, their options, and usage.

## Table of Contents
- [Terminology](#terminology)
- [Core Commands](#core-commands)
  - [kc go - Start Session Command](#kc-go---start-session-command)
  - [kc save - Save & Paste Command](#kc-save---save--paste-command)
  - [kc status - Health Check Command](#kc-status---health-check-command)
- [Advanced Features (v0.4.0+)](#advanced-features-v040)
  - [kc restart - Smart Restart Command](#kc-restart---smart-restart-command)
  - [kc tags - Work Tag Management](#kc-tags---work-tag-management)
  - [kc resume - One-Key Resume](#kc-resume---one-key-resume)
- [Practical Examples](#practical-examples)

## Terminology

For those new to KODAMA Claude, here are common terms explained:

| Term | Meaning | Example |
|------|---------|---------|
| **REPL** | Read-Eval-Print Loop. Interactive command-line environment | Claude's conversation interface |
| **Context** | Past work content and decisions | "Yesterday I implemented the login feature" |
| **Context Injection** | Process of passing past work to Claude | `claude -c -p "content"` |
| **Snapshot** | Saved state of work at a point in time | "Record when login feature was completed" |
| **Session** | A series of conversations with Claude | Work from morning to evening |
| **Workflow Step** | Stage of work | design→implement→test→done |
| **EOF** | End Of File. Marks end of input | Ctrl+D or Ctrl+Z |

## Core Commands

## `kc go` - Start Session Command

### Basic Operation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1. Health   │ --> │ 2. Inject   │ --> │ 3. Start    │
│    Check    │     │   Context   │     │    REPL     │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. **Health Check & Auto-protection**
   - Checks memory usage status
   - Auto-creates snapshot if critical
   - Shows status: 🟢 (healthy) 🟡 (warning) 🔴 (danger)

2. **Context Injection** (`claude -c -p`)
   - Loads context from past snapshots
   - Tells Claude "what you were working on"
   - Includes decisions and next steps

3. **Start REPL** (`claude --continue`)
   - Opens interactive session
   - Continues work from last time
   - Exit with Ctrl+D (or Ctrl+Z on WSL)

### Option Details

#### `-t, --title <title>` - Session Title

**Purpose**: Name your work session

```bash
# Example: New feature development
kc go -t "User authentication implementation"

# Example: Bug fix
kc go -t "Fix login screen bug"
```

**Benefits**:
- Easy to review later
- Clear when sharing with team
- Helpful for organizing snapshots

#### `-s, --step <step>` - Workflow Step

**Purpose**: Record current work stage

| Step | Meaning | When to Use |
|------|---------|-------------|
| `designing` | Design phase | When planning specifications |
| `implementing` | Implementation phase | When writing code |
| `testing` | Testing phase | When verifying or fixing bugs |
| `done` | Completed | When feature is finished |

```bash
# Design phase
kc go -s designing -t "API design"

# Implementation phase
kc go -s implementing -t "API endpoint implementation"

# Testing phase
kc go -s testing -t "API integration testing"
```

#### `--no-send` - Skip Context Injection

**Purpose**: Health check only (doesn't start Claude)

```bash
# When you just want to check status
kc go --no-send

# Example output:
# 🟢 Session status: healthy
# 📸 Last snapshot: 2h ago
# ℹ️ Skipping context injection (--no-send flag)
```

## `kc save` - Save & Paste Command

### Basic Operation

1. Input work content (interactive)
2. Save as snapshot
3. Offer to paste to clipboard

### Option Details

#### `--copy <mode>` - Copy Mode Selection

Specifies how to copy to clipboard:

| Mode | Description | Use Case | Requirements |
|------|-------------|----------|--------------|
| `auto` | Auto-select (recommended) | Usually OK with this | None |
| `clipboard` | System clipboard | Local work | xclip/pbcopy |
| `osc52` | Terminal protocol | Over SSH | Compatible terminal |
| `file` | Via temp file | When you need certainty | None |
| `none` | Don't copy | Just want to save | None |

```bash
# Auto-select (recommended)
kc save --copy auto

# When working over SSH
kc save --copy osc52

# When copy not needed
kc save --copy none
```

**What is OSC52?**
- Uses terminal escape sequences
- Can copy to local clipboard even over SSH
- Supported by iTerm2, Windows Terminal, modern gnome-terminal

#### `--stdin` - Read from Standard Input

**Purpose**: Use in scripts or pipelines

```bash
# Save git log
git log --oneline -10 | kc save --stdin -t "This week's work"

# Save command output
echo "Deployment complete" | kc save --stdin -y

# Save file contents
cat progress.txt | kc save --stdin
```

#### `--file <path>` - Read from File

**Purpose**: Read from prepared text file

```bash
# From pre-written notes
kc save --file ~/work-notes.txt

# From markdown file
kc save --file ./docs/decisions.md -t "Design decisions"
```

#### `--tags <tags>` - Work Tags

**Purpose**: Add tags to organize your work

```bash
# Save with tags
kc save --tags "feature,auth,login"

# Mix with other options
kc save -t "Login implementation" --tags "auth,frontend"
```

#### `-y, --yes` - Skip Confirmations

**Purpose**: Use in automation or scripts

```bash
# Save without confirmation
echo "Auto save" | kc save --stdin -y

# Use in cron job
0 * * * * echo "Periodic save" | kc save --stdin -y -t "Auto backup"
```

### Interactive Mode Details

By default, interactively prompts for:

1. **Title** - Name for this work
2. **Step** - designing/implementing/testing/done
3. **Accomplishments** - What you completed
4. **Decisions** - What choices you made
5. **Next Steps** - What to do next

**How to end input**:
- **Unix/Mac**: Ctrl+D
- **WSL (Windows)**: Ctrl+Z
- **Universal**: Press Enter twice (empty line)

## `kc status` - Health Check Command

### Reading the Output

```
🟢 | basis: transcript | hint: no action needed
```

| Part | Meaning | Example |
|------|---------|---------|
| Emoji | Health status | 🟢=healthy, 🟡=warning, 🔴=danger, ❓=unknown |
| basis | Judgment source | transcript=accurate, heuristic=estimated, no_session=no data |
| hint | Recommended action | "no action needed", "save recommended" |

### Option Details

#### `-j, --json` - JSON Format Output

**Purpose**: For processing with scripts or tools

```bash
# JSON output
kc status --json

# Example output:
{
  "level": "healthy",
  "basis": "transcript",
  "lastSnapshot": {
    "id": "abc123",
    "title": "Login feature implementation",
    "ageHours": 2.5
  },
  "suggestion": "Continue working"
}

# Get specific value with jq
kc status --json | jq -r '.level'
# Output: healthy
```

#### `-s, --strict` - Strict Mode

**Purpose**: Use in CI/CD pipelines

```bash
# Returns exit code 1 if dangerous
if ! kc status --strict; then
  echo "Context is critical! Need to save"
  kc save -t "CI auto save"
fi
```

## Practical Examples

### Scenario 1: Morning Start

```bash
# 1. Continue from yesterday
kc go

# Claude responds:
# "Yesterday we were working on the user authentication API.
#  We decided to set JWT token expiry to 30 minutes.
#  Let's start with refresh token implementation today."

# 2. Work progresses...

# 3. Save before break
kc save -t "Refresh token implementation complete"
```

### Scenario 2: Working Over SSH

```bash
# Connected to remote server via SSH
ssh user@server

# Copy to clipboard with OSC52 protocol
kc save --copy osc52

# Content is copied to local machine's clipboard
```

### Scenario 3: Periodic Auto-save

```bash
# Add to crontab
crontab -e

# Auto-save every 2 hours
0 */2 * * * cd ~/project && echo "Periodic save $(date)" | kc save --stdin -y -t "Auto save"
```

### Scenario 4: CI/CD Pipeline

```yaml
# .github/workflows/check.yml
steps:
  - name: Check KODAMA status
    run: |
      # Check status
      STATUS=$(kc status --json | jq -r '.level')
      
      # Save if dangerous
      if [ "$STATUS" = "danger" ]; then
        echo "Pre-build checkpoint" | kc save --stdin -y
      fi
      
      # Strict check
      kc status --strict
```

## Advanced Features (v0.4.0+)

These powerful features are available when you need them, while keeping the core simple.

## `kc restart` - Smart Restart Command

### Purpose

Restart Claude session with context preservation, independent of `/clear` command.

### Basic Operation

```bash
# Smart restart with context
kc restart

# Force restart even with warnings
kc restart --force

# Restart without context injection
kc restart --no-inject
```

### How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1. Check    │ --> │ 2. Kill     │ --> │ 3. Restart  │
│   Process   │     │   Safely    │     │  + Context  │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. **Process Detection**: Checks if Claude is running in current project
2. **Safe Termination**: Gracefully stops existing session
3. **Context Restart**: Starts new session with latest context

### Option Details

#### `--force` - Force Restart
Forces restart even when warnings exist (critical context usage, etc.)

```bash
# Restart despite warnings
kc restart --force
```

#### `--no-inject` - Skip Context Injection
Restart without loading previous context (fresh start)

```bash
# Clean restart
kc restart --no-inject
```

#### `--verify` - Verify Context Recognition
Check that Claude properly recognized the injected context

```bash
# Restart with verification
kc restart --verify
```

### Use Cases

- **Context Too Large**: When `/clear` would lose important context
- **Session Stuck**: When Claude becomes unresponsive  
- **Project Switch**: When switching between different projects
- **Memory Issues**: When session needs fresh memory but with context

## `kc tags` - Work Tag Management

### Purpose

Organize and filter your work with intelligent tagging system.

### Basic Operations

```bash
# List all tags with usage counts
kc tags --list

# Filter snapshots by tags
kc tags --filter "auth,api"

# Show tag statistics
kc tags --stats

# Get tag suggestions
kc tags --suggest "fea"  # Suggests "feature"
```

### Tag Management Features

#### Automatic Tagging
- Git branch names become tags
- Date-based tags for temporal organization
- Auto-suggested tags based on history

#### Intelligent Suggestions
- Levenshtein distance for similarity matching
- Frequency-based recommendations
- Typo detection and correction suggestions

### Option Details

#### `--list` - List All Tags
Shows all tags with usage frequency

```bash
kc tags --list

# Output:
# 🏷️  Tags in use:
# 
#    feature  ████████████ (12)
#    auth     ████████ (8)
#    api      ██████ (6)
#    bugfix   ████ (4)
```

#### `--filter <tags>` - Filter by Tags
Find snapshots that match specified tags

```bash
# Find auth-related work
kc tags --filter "auth"

# Multiple tags (OR logic)
kc tags --filter "auth,api,feature"
```

#### `--stats` - Show Statistics
Display comprehensive tag analytics

```bash
kc tags --stats

# Output includes:
# - Total unique tags
# - Most used tags
# - Recently used tags
```

#### `--suggest <partial>` - Tag Suggestions
Get suggestions based on partial input

```bash
# Get suggestions for "fea"
kc tags --suggest "fea"
# Output: feature, feat, refactor

# Get top 10 most used tags
kc tags --suggest
```

#### `--merge` - Suggest Tag Merges
Find similar tags that might be typos

```bash
kc tags --merge

# Output:
# 🔀 Suggested tag merges (potential typos):
# 
#    "featuer" → "feature" (85% similar)
#    "auht" → "auth" (75% similar)
```

### Integration with Save

Tags work seamlessly with the save command:

```bash
# Save with tags
kc save --tags "feature,auth,login"

# Interactive mode prompts for tags
kc save  # Will ask for tags during input
```

## `kc resume` - One-Key Resume

### Purpose

Quick resume workflow that combines save + go in a single operation.

### Basic Operations

```bash
# Interactive resume (with optional save)
kc resume

# Quick resume with message
kc resume -m "Fixed auth bug"

# Resume with tags
kc resume -m "API update" -t "api,feature"

# Resume without saving (just restart)
kc resume --no-save
```

### How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1. Quick    │ --> │ 2. Health   │ --> │ 3. Smart    │
│   Save      │     │   Check     │     │   Restart   │
│ (optional)  │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. **Quick Save**: Optionally save current progress with brief message
2. **Health Check**: Verify session state and context usage
3. **Smart Restart**: Resume with full context loaded

### Option Details

#### `-m, --message <msg>` - Quick Update Message
Save progress with a brief update message

```bash
# Quick save and resume
kc resume -m "Completed user registration"
```

#### `-t, --tags <tags>` - Tags for Quick Save
Add tags when saving quick update

```bash
# Resume with tagged save
kc resume -m "Bug fix complete" -t "bugfix,auth"
```

#### `--no-save` - Skip Saving
Resume without saving (just restart with context)

```bash
# Just resume, don't save
kc resume --no-save
```

#### `--no-inject` - Skip Context Injection
Resume without loading context (fresh start)

```bash
# Resume without context
kc resume --no-inject
```

#### `--force` - Force Resume
Resume even with warnings (critical context usage, etc.)

```bash
# Force resume despite warnings
kc resume --force
```

### Interactive Mode

When called without message, prompts for optional update:

```bash
kc resume

# Prompts:
# ⚡ Quick Resume - What have you done since last session?
# 📝 Update (optional, Enter to skip): [your input]
# 🏷️  Tags (optional): [your tags]
```

### Use Cases

- **Break Return**: Coming back from lunch/meeting
- **Day Start**: Beginning work with optional progress note
- **Context Switch**: Moving between different features
- **Quick Checkpoint**: Save + restart in one command

## Troubleshooting

### Clipboard Not Working

```bash
# 1. Check available methods
kc save --copy clipboard  # Try system clipboard
kc save --copy osc52      # Try terminal protocol
kc save --copy file       # Via file (most reliable)

# 2. Install required tools
# Ubuntu/Debian
sudo apt install xclip

# macOS (pbcopy already available)
# Windows WSL (clip.exe available)
```

### Don't Know How to Input EOF

| Environment | Method | Note |
|-------------|--------|------|
| Linux/Mac Terminal | Ctrl+D | Standard method |
| Windows WSL | Ctrl+Z | Windows specification |
| Any environment | Enter twice | End with empty line |

### Choosing Workflow Steps

```bash
# At project start
kc go -s designing    # Plan specifications

# Start coding
kc go -s implementing # Implement

# Verify operation
kc go -s testing      # Test

# Complete
kc save -s done       # Record completion
```

## Summary

KODAMA Claude starts with 3 simple commands and adds powerful features when needed:

### Core Commands
1. **`kc go`** - Start/resume work (automatically continues context)
2. **`kc save`** - Save progress (various copy methods, tags support)
3. **`kc status`** - Check health (supports automation)

### Advanced Features (v0.4.0+)
4. **`kc restart`** - Smart restart with context preservation
5. **`kc tags`** - Intelligent work tag management
6. **`kc resume`** - One-key resume (save + go combined)
7. **`kc list`** - List saved snapshots (v0.4.1+)

Start with the core 3 commands, then discover advanced features as your workflow matures.

## kc list

**Purpose**: Display a list of saved snapshots to review your work history.

### Basic Usage

```bash
# Show recent 10 snapshots (default)
kc list

# Show more snapshots
kc list -n 20
kc list --limit 50

# JSON output for scripting
kc list --json

# Verbose mode with IDs and filenames
kc list --verbose
kc list -v
```

### Output Format

#### Standard Output
```
📚 Recent Snapshots (showing 3/3):

1. Implemented user authentication
   📅 Aug 13 14:30 (2h ago)
   📊 Step: testing
   🏷️  Tags: auth, backend

2. Fixed login timeout bug
   📅 Aug 13 10:15 (6h ago)
   📊 Step: done

3. Morning standup notes
   📅 Aug 13 09:00 (7h ago)
```

#### Verbose Output
```
📚 Recent Snapshots (showing 3/3):

1. Implemented user authentication
   📅 Aug 13 14:30 (2h ago)
   📊 Step: testing
   🏷️  Tags: auth, backend
   🆔 ID: abc123def456
   📁 File: 2025-08-13T14-30-00-abc123.json
```

#### JSON Output
```json
{
  "snapshots": [
    {
      "id": "abc123def456",
      "title": "Implemented user authentication",
      "timestamp": "2025-08-13T14:30:00Z",
      "step": "testing",
      "tags": ["auth", "backend"],
      "file": "2025-08-13T14-30-00-abc123.json"
    }
  ]
}
```

### Options

#### `-n, --limit <number>` - Limit Results

Control how many snapshots to display:

```bash
# Show last 5 snapshots
kc list -n 5

# Show last 100 snapshots
kc list --limit 100
```

**Note**: Maximum limit is 1000 for performance reasons.

#### `--json` - JSON Output

Output in JSON format for scripting:

```bash
# Get all snapshot titles
kc list --json | jq -r '.snapshots[].title'

# Find snapshots with specific tag
kc list --json | jq '.snapshots[] | select(.tags | contains(["auth"]))'

# Count total snapshots
kc list --json | jq '.snapshots | length'
```

#### `-v, --verbose` - Verbose Mode

Show additional details including snapshot IDs and filenames:

```bash
kc list --verbose

# Useful for:
# - Debugging
# - Finding specific snapshot files
# - Verifying snapshot IDs
```

### Practical Examples

#### Review Today's Work
```bash
# List recent work
kc list -n 20

# Find what you were working on this morning
kc list --json | jq '.snapshots[] | select(.timestamp | startswith("2025-08-13"))'
```

#### Find Specific Work
```bash
# Search by title (using grep)
kc list --json | jq -r '.snapshots[] | "\(.title) - \(.timestamp)"' | grep -i "auth"

# Find by tag
kc list --json | jq '.snapshots[] | select(.tags | contains(["backend"]))'
```

#### Generate Work Report
```bash
# Create a simple work report
echo "## Work Report - $(date +%Y-%m-%d)" > report.md
echo "" >> report.md
kc list --json | jq -r '.snapshots[] | "- \(.title) (\(.step))"' >> report.md
```

#### Cleanup Old Snapshots
```bash
# List snapshots older than 7 days (for review before deletion)
kc list --json | jq '.snapshots[] | select(
  (now - (.timestamp | fromdate)) > (7 * 24 * 3600)
) | .file'
```

### Security Features

The `kc list` command includes multiple security measures:

- **Path Traversal Protection**: Only valid snapshot files are processed
- **DoS Protection**: Maximum 1000 items can be listed at once
- **File Size Limits**: Skips files larger than 10MB
- **Control Character Filtering**: Removes control characters from output
- **Safe Error Messages**: Sanitized error messages prevent information leakage

---

**Tip**: For help, use `kc --help` or `kc <command> --help` to see command help.