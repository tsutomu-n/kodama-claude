# Complete Usage Guide

🟢 **Difficulty**: Beginner to Intermediate | **Read time**: 15 minutes

Learn every KODAMA Claude command with detailed examples.

## Table of Contents
- [Core Concepts](#core-concepts)
- [Command Overview](#command-overview)
- [Detailed Command Guide](#detailed-command-guide)
  - [`kc go` - Start Working](#kc-go)
  - [`kc snap` - Save Context](#kc-snap)
  - [`kc check` - Monitor Health](#kc-check)
  - [`kc plan` - Plan Work](#kc-plan)
  - [`kc send` - Send Context](#kc-send)
  - [`kc doctor` - Check System](#kc-doctor)
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
| `kc snap` | Save your progress | End of work session or important milestone |
| `kc check` | Monitor session health | During long sessions to check token usage |
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
- **Purpose**: Provides context for your work session
- **Format**: Short, descriptive text (2-10 words recommended)
- **When to use**: Starting new feature, switching tasks, or documenting progress

```bash
# Good titles are specific and action-oriented
kc go -t "Add password reset feature"      # Clear feature description
kc go -t "Fix bug #123: login timeout"     # Bug with context
kc go -t "Refactor database queries"       # Technical task
kc go -t "Review PR feedback"              # Code review task

# Bad titles (too vague)
kc go -t "work"                            # ❌ No context
kc go -t "stuff"                           # ❌ Not descriptive
kc go -t "continue"                        # ❌ Doesn't say what
```

**`-s, --step <step>`** - Define your workflow phase
- **Purpose**: Tells Claude what kind of help you need
- **Format**: One of: `requirements`, `designing`, `implementing`, `testing`
- **Default**: Uses previous step or `requirements` if first time

```bash
# Step progression and their purposes:
kc go -s requirements   # Gathering requirements, understanding the problem
                       # Claude will ask clarifying questions
                       
kc go -s designing     # Planning architecture, choosing approach
                       # Claude will discuss design patterns, trade-offs
                       
kc go -s implementing  # Writing actual code
                       # Claude will write code, suggest implementations
                       
kc go -s testing       # Testing, debugging, optimization
                       # Claude will help write tests, fix bugs

# Smart step usage:
kc go -s requirements -t "User auth system"  # Start new feature
kc go -s implementing                        # Continue coding
kc go -s testing -t "Fix auth edge cases"    # Debug specific issue
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

#### Options Explained

**`-t, --title <text>`** - Quick snapshot with title only
- **Purpose**: Fast save without interactive prompts
- **When to use**: Quick checkpoints, before meetings, end of day
- **Tip**: Other fields use defaults from previous snapshot

```bash
# Quick saves for different situations
kc snap -t "Before lunch break"           # Time-based checkpoint
kc snap -t "API endpoints working"        # Feature milestone
kc snap -t "Before refactoring"          # Safety checkpoint
kc snap -t "Meeting notes added"          # Documentation update
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

### `kc check` - Monitor Health

Monitor your Claude session's token usage and health status to prevent context loss.

#### Basic Usage

```bash
# Quick 3-line status
kc check

# Detailed health report
kc check --detailed

# JSON output for automation
kc check --json
```

#### Understanding the Output

**Quick Status (default)**:
```
🟢 Session healthy (85% remaining)
📝 Last snapshot: 0.5 hours ago
💡 All systems operational
```

**Health Levels**:
- 🟢 **Healthy** (>40% remaining) - Continue working normally
- 🟡 **Warning** (20-40% remaining) - Consider taking a snapshot soon
- 🔴 **Danger** (<20% remaining) - Take a snapshot immediately

#### Options Explained

**`--detailed, -d`** - Comprehensive health report
- Shows exact token counts
- Lists recent snapshots
- Provides specific recommendations

```bash
$ kc check --detailed
╭─────────────────────────────────────╮
│ 🏥 Claude Session Health Report     │
├─────────────────────────────────────┤
│ Status: 🟢 HEALTHY                  │
│                                     │
│ 📊 Token Usage:                     │
│   Used: 32,768 / 200,000           │
│   Remaining: 167,232 (83.6%)       │
│                                     │
│ 📝 Last Snapshot:                   │
│   Title: "API implementation"       │
│   Age: 1.2 hours                   │
│                                     │
│ 💡 Recommendation:                  │
│   Continue working normally         │
╰─────────────────────────────────────╯
```

**`--json, -j`** - Machine-readable output
- For CI/CD pipelines
- For custom scripts
- For monitoring tools

```bash
$ kc check --json
{
  "status": "healthy",
  "level": "healthy",
  "tokenUsage": {
    "used": 32768,
    "total": 200000,
    "percentUsed": 16.4,
    "percentRemaining": 83.6
  },
  "lastSnapshot": {
    "title": "API implementation",
    "ageHours": 1.2,
    "timestamp": "2025-01-10T14:30:00Z"
  },
  "suggestion": "Continue working normally",
  "autoAction": null
}
```

#### Automation Examples

**Auto-snapshot when critical**:
```bash
#!/bin/bash
# Check health and auto-save if needed
status=$(kc check --json | jq -r .status)
if [[ "$status" == "danger" ]]; then
  echo "⚠️ Context usage critical - auto-saving..."
  kc snap -t "Auto-save: context critical"
fi
```

**CI/CD pipeline check**:
```bash
# In your GitHub Actions or Jenkins pipeline
- name: Check Claude session health
  run: |
    if [[ $(kc check --json | jq -r .level) == "danger" ]]; then
      kc snap -t "CI auto-snapshot"
    fi
```

**Monitoring script**:
```bash
# monitor.sh - Run with cron every 30 minutes
#!/bin/bash
health=$(kc check --json)
remaining=$(echo $health | jq .tokenUsage.percentRemaining)

if (( $(echo "$remaining < 20" | bc -l) )); then
  notify-send "KODAMA Warning" "Token usage critical: ${remaining}% left"
fi
```

#### When to Use

- **During long sessions**: Check every 1-2 hours
- **Before complex work**: Ensure enough context space
- **In automation**: Prevent context loss in CI/CD
- **Team handoffs**: Check before passing work

### `kc plan` - Plan Work

Helps you organize before starting.

#### Basic Usage

```bash
# Interactive planning
kc plan

# Quick plan with title
kc plan -t "Database migration plan"
```

#### Options Explained

**`-t, --title <text>`** - Quick planning with title
- **Purpose**: Fast planning capture without prompts
- **When to use**: Quick task planning, meeting outcomes, brainstorming results
- **Note**: Creates a special "planning" type snapshot

```bash
# Different planning scenarios
kc plan -t "Sprint planning outcomes"      # Team planning
kc plan -t "Refactoring strategy"         # Technical planning
kc plan -t "Bug investigation plan"       # Problem solving
kc plan -t "Feature roadmap v2"           # Product planning
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

#### Basic Usage

```bash
# Send latest snapshot to current session
kc send

# Send specific snapshot by ID
kc send a1b2c3d4-e5f6-7890-abcd
```

#### Arguments Explained

**`[snapshot-id]`** - Optional snapshot identifier
- **Purpose**: Send a specific snapshot instead of latest
- **Format**: UUID from snapshot filename or list
- **Default**: Latest snapshot if not specified

```bash
# List available snapshots
ls ~/.local/share/kodama-claude/snapshots/
2025-01-10T09-00-00-a1b2c3d4.json
2025-01-10T14-30-00-e5f6g7h8.json

# Send specific snapshot
kc send a1b2c3d4   # Can use partial ID
kc send e5f6g7h8   # Matches most recent with this prefix
```

#### When to Use

```bash
# Case 1: Claude is already running
$ claude  # Started Claude manually
> [working...]
> # Now need context
$ kc send  # In another terminal

# Case 2: Send older context
$ kc send a1b2c3d4  # Send yesterday's context

# Case 3: kc go didn't load context properly
$ kc go --no-save
> # Context missing?
$ kc send

# Case 4: Recover from cleared session
> /clear  # Accidentally cleared
$ kc send  # Restore context
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