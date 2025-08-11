# Daily Workflows & Examples

🟢 **Difficulty**: Beginner | **Read time**: 5 minutes

Real examples of using KODAMA Claude's 3 commands.

## Morning Routine

Start your day by loading yesterday's context:

```bash
# 1. Go to your project
cd ~/projects/my-app

# 2. Start with context
kc go
# Output:
# 🟢 Session status: healthy
# 📸 Last snapshot: 15h ago
# 📤 Injecting context...
# 🚀 Opening Claude REPL...

# 3. Claude remembers everything
> Good morning! Yesterday we were working on the auth system.
> We decided to use JWT tokens. Should we continue with the login endpoint?
```

## Saving Progress

### Quick Save
```bash
# After completing a task
kc save -t "Login endpoint complete"
```

### Detailed Save
```bash
# Interactive mode for important milestones
kc save
# ? Title: User authentication complete
# ? Step: testing
# ? What did you accomplish? (Ctrl+D when done)
#   > Implemented JWT tokens
#   > Added login/logout endpoints
#   > Created test suite
# ? Key decisions? (Ctrl+D when done)
#   > 30-minute token expiry
#   > Refresh tokens in httpOnly cookies
# ? Next steps? (Ctrl+D when done)
#   > Add password reset
#   > Implement 2FA
```

## Status Checks

Monitor your session health:

```bash
# Quick check
kc status
# 🟢 | basis: transcript | hint: no action needed

# After 2 hours of work
kc status
# 🟡 | basis: heuristic | hint: 2 hours since last save

# When context is critical
kc status
# 🔴 | basis: transcript | hint: Save immediately!
```

## Common Scenarios

### Feature Development
```bash
# Monday: Start new feature
kc go -t "Payment integration" -s designing

# Work with Claude on design...

# Save before lunch
kc save -t "Payment flow designed"

# After lunch
kc go  # Continues where you left off

# End of day
kc save -t "Payment API 70% complete"

# Tuesday: Continue
kc go  # Loads Monday's progress
```

### Bug Fixing
```bash
# Quick bug fix
kc go -t "Fix login timeout bug"

# Claude helps debug...
> The issue is in the token refresh logic...

# Save when fixed
kc save -t "Fixed: Login timeout bug"
```

### Code Review Prep
```bash
# Before review
kc save -t "Ready for review: PR #123"

# After review changes
kc go
> Let's address the review comments...

# Save after changes
kc save -t "Review comments addressed"
```

## Team Collaboration

### Handoff to Colleague
```bash
# Before vacation
kc save
# ? Title: Handoff to Sarah
# ? What did you accomplish?
#   > API endpoints complete
#   > Database migrations ready
# ? Next steps?
#   > Frontend integration
#   > Add error handling
#   > Deploy to staging

# Share snapshot file
ls ~/.local/share/kodama-claude/snapshots/*.json | tail -1
# Send this file to colleague
```

### Pair Programming
```bash
# Driver saves context
kc save -t "Pair session with Alex"

# Navigator takes over
kc go  # Loads shared context
```

## Automation Examples

### Git Hooks
```bash
# .git/hooks/pre-commit
#!/bin/bash
if [ "$(kc status --json | jq -r .level)" = "danger" ]; then
  echo "Auto-saving before commit..."
  echo "Pre-commit checkpoint" | kc save --stdin -y
fi
```

### CI/CD Pipeline
```yaml
# .github/workflows/build.yml
steps:
  - name: Check context health
    run: |
      if ! kc status --strict; then
        echo "Context critical" | kc save --stdin -y
      fi
```

### Cron Job
```bash
# Hourly auto-save (crontab -e)
0 * * * * cd ~/projects/my-app && echo "Hourly checkpoint" | kc save --stdin -y
```

## Tips & Tricks

### 1. Morning Standup Helper
```bash
# See what you did yesterday
kc status --json | jq '.lastSnapshot'
```

### 2. End-of-Week Summary
```bash
# List week's snapshots
ls -la ~/.local/share/kodama-claude/snapshots/*.json | grep "$(date +%Y-%m)"
```

### 3. Emergency Recovery
```bash
# If Claude crashes unexpectedly
kc save -t "Emergency save after crash"
kc go  # Restart with saved context
```

### 4. Project Switching
```bash
# Project A
cd ~/projects/project-a
kc save -t "Switching to Project B"

# Project B
cd ~/projects/project-b
kc go -t "Back to Project B"
```

## Health Status Guide

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 Healthy | < 50% context used | Keep working |
| 🟡 Warning | 50-80% used or 2+ hours | Save soon |
| 🔴 Danger | > 80% used | Save NOW |
| ❓ Unknown | No session data | Start with `kc go` |

## Workflow Patterns

### The 2-Hour Rule
```bash
# Work for 2 hours
kc go

# Check status every 2 hours
kc status
# If yellow/red, save
kc save
```

### The Milestone Pattern
```bash
# After each completed task
kc save -t "Task complete: [description]"
```

### The Daily Routine
```bash
# Morning
kc go

# Lunch
kc save -t "Lunch break"

# Afternoon
kc go

# End of day
kc save -t "EOD: $(date +%Y-%m-%d)"
```

---

**Remember**: Save early, save often. KODAMA makes it easy with just `kc save`.