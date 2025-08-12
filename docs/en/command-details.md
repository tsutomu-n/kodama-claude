# KODAMA Claude Command Details Guide

🟢 **Difficulty**: Beginner to Intermediate | **Read time**: 10 minutes

This guide provides detailed explanations of KODAMA Claude's 3 commands, their options, and usage.

## Table of Contents
- [Terminology](#terminology)
- [kc go - Start Session Command](#kc-go---start-session-command)
- [kc save - Save & Paste Command](#kc-save---save--paste-command)
- [kc status - Health Check Command](#kc-status---health-check-command)
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

KODAMA Claude's 3 commands look simple but have rich options:

1. **`kc go`** - Start/resume work (automatically continues context)
2. **`kc save`** - Save progress (various copy methods available)
3. **`kc status`** - Check health (supports automation)

Start with basic usage and utilize options as you become familiar.

---

**Tip**: For help, use `kc --help` or `kc <command> --help` to see command help.