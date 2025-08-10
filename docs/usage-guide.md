# Complete Usage Guide

🟢 **Difficulty**: Beginner to Intermediate | **Read time**: 15 minutes

Learn every KODAMA Claude command with detailed examples.

## Table of Contents
- [Core Concepts](#core-concepts)
- [Command Overview](#command-overview)
- [Detailed Command Guide](#detailed-command-guide)
  - [`kc go` - Start Working](#kc-go)
  - [`kc snap` - Save Context](#kc-snap)
  - [`kc plan` - Plan Work](#kc-plan)
  - [`kc send` - Send Context](#kc-send)
  - [`kc doctor` - Check Health](#kc-doctor)
- [Working with Snapshots](#working-with-snapshots)
- [Best Practices](#best-practices)

## Core Concepts

### What is a Snapshot?

A snapshot is a saved state of your work. Think of it like a checkpoint in a video game.

```
Snapshot contains:
┌─────────────────────────────┐
│ • What you accomplished     │
│ • Decisions you made        │
│ • Next steps to do          │
│ • Current directory         │
│ • Git branch & commit       │
│ • Timestamp                 │
└─────────────────────────────┘
```

### How KODAMA Works

```
Your Brain          KODAMA              Claude CLI
    │                 │                     │
    ├── Think ──────> │                     │
    │                 ├── Save snapshot     │
    │                 ├── Load snapshot ──> │
    │                 │                     ├── Understands context
    │ <───────────────┼─────────────────────┤ Continues work
```

### The Workflow Cycle

```
   ┌──────────┐
   │   PLAN   │ ← kc plan
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │   WORK   │ ← kc go
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │   SAVE   │ ← kc snap
   └────┬─────┘
        │
        └──── Back to PLAN
```

## Command Overview

| Command | Purpose | When to use |
|---------|---------|-------------|
| `kc go` | Start or continue working | Beginning of work session |
| `kc snap` | Save your progress | End of work session |
| `kc plan` | Plan what to do | Before starting complex work |
| `kc send` | Send context manually | When `kc go` isn't enough |
| `kc doctor` | Check system health | When something seems wrong |

## Detailed Command Guide

### `kc go` - Start Working

This is your main command. It does three things:
1. Loads your last snapshot
2. Starts Claude with context
3. Saves a new snapshot when done

#### Basic Usage
```bash
# Simple start - loads last snapshot
kc go

# Start with a title
kc go -t "Working on user authentication"

# Start at specific step
kc go -s implementing
```

#### Options Explained

**`-t, --title <text>`** - Name this work session
```bash
# Good titles are specific
kc go -t "Add password reset feature"
kc go -t "Fix bug #123"
kc go -t "Refactor database queries"
```

**`-s, --step <step>`** - What phase are you in?
```bash
# Available steps:
kc go -s designing      # Planning architecture
kc go -s implementing   # Writing code
kc go -s testing        # Testing/debugging
kc go -s done           # Finished
```

**`--no-save`** - Don't save snapshot after
```bash
# Useful for quick questions
kc go --no-save
```

#### What Happens Inside

```
1. kc go
   ↓
2. Load ~/.local/share/kodama-claude/snapshots/latest.json
   ↓
3. Create prompt with:
   - Previous accomplishments
   - Decisions made
   - Next steps
   - Git information
   ↓
4. Start: claude --continue [session-id]
   ↓
5. You work with Claude
   ↓
6. Exit Claude (Ctrl+D)
   ↓
7. Auto-save new snapshot
```

#### Real Example

```bash
$ kc go -t "Adding user login"

Loading snapshot from: 2025-01-10 09:00
Starting Claude with context...

---[Context sent to Claude]---
Previous work:
- Created user database table
- Set up password hashing

Decisions:
- Use bcrypt for passwords
- Email as username

Next steps:
- Create login endpoint
- Add session management

Git: main branch at commit a1b2c3d
---

Claude CLI started. Press Ctrl+D to exit.
>
```

### `kc snap` - Save Context

Creates a snapshot of your current work state.

#### Basic Usage

```bash
# Interactive mode (recommended)
kc snap

# Quick mode with title
kc snap -t "Finished API endpoints"

# From stdin (for scripts)
echo "Completed task" | kc snap -t "Auto snapshot"
```

#### Interactive Mode Questions

When you run `kc snap`, it asks:

1. **Title**: A short description
   ```
   ? Title for this snapshot: Fixed database connection bug
   ```

2. **Step**: Current phase
   ```
   ? What step are you on?
   > designing
     implementing
     testing
     done
   ```

3. **Accomplishments**: What you did
   ```
   ? What did you accomplish? (Enter = done)
   > Added error handling
   > Improved logging
   > Fixed timeout issue
   > [press Enter]
   ```

4. **Decisions**: Important choices
   ```
   ? Decisions made? (Enter = done)
   > Use connection pooling
   > Set 30 second timeout
   > [press Enter]
   ```

5. **Next steps**: What's next
   ```
   ? Next steps? (Enter = done)
   > Write unit tests
   > Update documentation
   > [press Enter]
   ```

#### Snapshot Storage

Snapshots are saved as:
```
~/.local/share/kodama-claude/snapshots/
├── 2025-01-10T09-00-00-a1b2c3d4.json
├── 2025-01-10T14-30-00-e5f6g7h8.json
└── latest.json → (symlink to newest)
```

#### JSON Structure

```json
{
  "version": "1.0.0",
  "id": "a1b2c3d4-e5f6-g7h8-i9j0",
  "title": "Fixed database bug",
  "timestamp": "2025-01-10T09:00:00Z",
  "step": "testing",
  "context": "Added error handling...",
  "decisions": [
    "Use connection pooling",
    "Set 30 second timeout"
  ],
  "nextSteps": [
    "Write unit tests",
    "Update documentation"
  ],
  "cwd": "/home/user/project",
  "gitBranch": "feature/auth",
  "gitCommit": "a1b2c3d"
}
```

### `kc plan` - Plan Work

Helps you organize before starting.

#### Basic Usage

```bash
# Interactive planning
kc plan

# Quick plan with title
kc plan -t "Database migration plan"
```

#### Planning Process

```
kc plan
   │
   ├── 1. What are you planning?
   │      "Refactor user service"
   │
   ├── 2. Main goals?
   │      - Improve performance
   │      - Add caching
   │
   ├── 3. Specific tasks?
   │      - Profile current code
   │      - Identify bottlenecks
   │      - Implement cache layer
   │
   └── 4. Important notes?
          - Keep API compatible
          - Test with production data
```

#### Plan vs Snap

| Use `kc plan` when: | Use `kc snap` when: |
|-------------------|-------------------|
| Starting new feature | Ending work session |
| Switching context | Completed milestone |
| Need to organize thoughts | Want to save progress |
| Before complex work | After making progress |

### `kc send` - Send Context

Manually send context to existing Claude session.

#### When to Use

```bash
# Case 1: Claude is already running
$ claude  # Started Claude manually
> [working...]
> # Now need context
$ kc send  # In another terminal

# Case 2: Send specific snapshot
$ kc send a1b2c3d4

# Case 3: kc go didn't load context properly
$ kc go --no-save
> # Context missing?
$ kc send
```

#### How It Works

```
kc send
   │
   ├── Find .session file
   ├── Load snapshot
   ├── Format as prompt
   └── Send via Claude API
```

### `kc doctor` - Check Health

Diagnoses problems with your setup.

#### What It Checks

```bash
$ kc doctor

KODAMA Claude Health Check
==========================
✓ KODAMA binary: /usr/local/bin/kc      [OK]
✓ Claude CLI: /usr/local/bin/claude     [OK]
✓ Storage: ~/.local/share/kodama-claude [OK]
✓ Permissions: Read/Write                [OK]
✓ Git: /usr/bin/git                     [OK]
✓ Snapshots: 5 found                    [OK]
✓ Latest: 2025-01-10 14:30              [OK]

All systems operational!
```

#### Common Issues It Finds

| Check | Problem | Solution |
|-------|---------|----------|
| KODAMA binary | Not in PATH | Reinstall or add to PATH |
| Claude CLI | Not found | Install Claude CLI |
| Storage | Can't write | Fix permissions |
| Git | Not found | Install git |

## Working with Snapshots

### List Snapshots

```bash
# See all snapshots
ls ~/.local/share/kodama-claude/snapshots/

# See latest 5 with details
ls -lah ~/.local/share/kodama-claude/snapshots/ | head -6

# Check latest snapshot
readlink ~/.local/share/kodama-claude/snapshots/latest.json
```

### View Snapshot Content

```bash
# Pretty print latest
cat ~/.local/share/kodama-claude/snapshots/latest.json | jq .

# View specific snapshot
cat ~/.local/share/kodama-claude/snapshots/2025-01-10*.json | jq .

# See just the title and time
jq '{title, timestamp}' ~/.local/share/kodama-claude/snapshots/*.json
```

### Find Specific Snapshot

```bash
# Search by content
grep -l "user auth" ~/.local/share/kodama-claude/snapshots/*.json

# Find by date
ls ~/.local/share/kodama-claude/snapshots/2025-01-10*.json

# Find by git branch
jq -r 'select(.gitBranch=="main") | .id' ~/.local/share/kodama-claude/snapshots/*.json
```

### Manage Old Snapshots

**Automatic Management (v0.2.0+):**
```bash
# Snapshots older than 30 days are automatically archived
# Archive runs when you execute: kc snap, kc go, or kc plan
# Archived files are moved to:
~/.local/share/kodama-claude/snapshots/archive/

# To disable auto-archive:
export KODAMA_AUTO_ARCHIVE=false

# Archive happens at the start of these commands:
# - kc snap: Before saving new snapshot
# - kc go: Before loading context
# - kc plan: Before creating plan
```

**Manual Management:**
```bash
# Delete snapshots older than 30 days
find ~/.local/share/kodama-claude/snapshots/ -name "*.json" -mtime +30 -delete

# Keep only latest 10
ls -t ~/.local/share/kodama-claude/snapshots/*.json | tail -n +11 | xargs rm

# Delete specific snapshot
rm ~/.local/share/kodama-claude/snapshots/2025-01-10T09-00-00-a1b2c3d4.json

# Access archived snapshots
ls ~/.local/share/kodama-claude/snapshots/archive/
```

## Best Practices

### Daily Workflow

#### Morning Start
```bash
# 1. Check what you were doing
cat ~/.local/share/kodama-claude/snapshots/latest.json | jq '.nextSteps'

# 2. Plan if needed
kc plan  # If starting new task

# 3. Start working
kc go -t "Morning work session"
```

#### During Work
```bash
# Save checkpoint before lunch
kc snap -t "Morning progress"

# Quick context switch
kc snap -t "Stopping task A"
cd ../project-b
kc go -t "Starting task B"
```

#### End of Day
```bash
# 1. Save detailed snapshot
kc snap  # Use interactive mode

# 2. Review what you did
cat ~/.local/share/kodama-claude/snapshots/latest.json | jq '.context'

# 3. Plan tomorrow (optional)
kc plan -t "Tomorrow's tasks"
```

### Title Conventions

Good titles help you find snapshots later:

```bash
# Include ticket/issue number
kc snap -t "JIRA-123: Add user profiles"

# Include action and target
kc snap -t "Fixed: Login timeout bug"
kc snap -t "Added: Email notifications"
kc snap -t "Refactored: Database queries"

# Include milestone
kc snap -t "v1.2.0: Completed API changes"
```

### Step Progression

Follow the natural flow:

```bash
# Day 1: Research
kc go -s designing -t "Research caching options"

# Day 2: Design
kc go -s designing -t "Design cache architecture"

# Day 3-5: Build
kc go -s implementing -t "Build cache layer"

# Day 6: Test
kc go -s testing -t "Test cache performance"

# Day 7: Ship
kc go -s done -t "Deploy caching feature"
```

### Context Management

#### Smart Context Features (v0.2.0+)

**5-Decision Limit (Default Enabled):**
```bash
# Only shows latest 5 decisions to reduce cognitive load
# Full history is preserved in storage files

# To see the limitation in action:
export KODAMA_DEBUG=true
kc snap  # Will show: "Showing latest 5 of 8 decisions"

# To disable the limit:
export KODAMA_NO_LIMIT=true
```

**CLAUDE.md Integration:**
```bash
# Enable automatic CLAUDE.md updates
export KODAMA_CLAUDE_SYNC=true

# Create CLAUDE.md with markers
cp templates/CLAUDE.md.example CLAUDE.md
# Edit to add your project info

# Now every snap/plan/go updates CLAUDE.md automatically
kc snap -t "Feature complete"
# Check CLAUDE.md - KODAMA section is updated!
```

#### Keep Context Focused
```bash
# ✅ Good: Specific to current work
"Working on user authentication. 
 Completed login endpoint.
 Next: Add password reset."

# ❌ Bad: Too much unrelated info
"Working on everything.
 Fixed 10 bugs, updated docs,
 had meeting, answered emails..."
```

#### Handling Breaking Changes

When you need to pivot or make breaking changes:

```bash
# 1. Save current state
kc snap -t "Before major refactor"

# 2. Clear session if needed (optional)
rm ~/.local/share/kodama-claude/.session

# 3. Start fresh with new plan
kc plan -t "New architecture approach"

# The 5-decision limit means old decisions fade out naturally
# No need to manually clean up!
```

#### Regular Snapshots
```bash
# Create snapshot after each milestone
- After completing a feature
- Before switching tasks
- Before meetings
- End of each day
- Before risky changes
```

### Team Collaboration

When working with others:

```bash
# 1. Snapshot before pulling changes
kc snap -t "Before merge"
git pull

# 2. Snapshot after resolving conflicts
git merge
kc snap -t "Merged main branch"

# 3. Share context via git
cd ~/.local/share/kodama-claude
git init
git add snapshots/
git commit -m "Share context"
git push
```

## Advanced Tips

### Scripting with KODAMA

```bash
#!/bin/bash
# Auto-snapshot script

# Save every hour
while true; do
    echo "Auto-saving..." | kc snap -t "Hourly checkpoint"
    sleep 3600
done
```

### Integrate with Git Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash
kc snap -t "Pre-commit: $(git diff --cached --name-only | head -1)"
```

### Custom Aliases

Add to `~/.bashrc`:

```bash
# Quick shortcuts
alias kcg='kc go'
alias kcs='kc snap'
alias kcp='kc plan'

# Common workflows
alias morning='kc go -t "Morning session"'
alias evening='kc snap -t "End of day"'

# Project specific
alias proj1='cd ~/project1 && kc go'
alias proj2='cd ~/project2 && kc go'
```

---

**Next**: See real examples in [Examples](examples.md) →