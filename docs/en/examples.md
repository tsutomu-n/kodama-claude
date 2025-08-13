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

## Recovery & Restore

### Quick Recovery from Accidents
```bash
# Accidentally deleted important context
kc restore
# Shows available snapshots:
# [1] 2024-03-15 14:30 - API design session
# [2] 2024-03-15 13:15 - Database schema
# [3] 2024-03-15 12:00 - Feature planning
# ? Which snapshot to restore? 1

# Restore specific snapshot by name
kc restore "API design session"
```

### Safe Restore with Verification
```bash
# Check what would be restored (no changes made)
kc restore --dry-run
# Would restore: [2024-03-15 14:30] API design session
# Current context would be replaced
# Files that would be loaded: 3 files, 2.4KB

# Proceed with actual restore
kc restore "API design session"
```

### Bulk Restore Operations
```bash
# Restore from multiple snapshots (merges contexts)
kc restore --bulk
# ? Select snapshots to merge (space to select, enter to confirm):
#   [x] API endpoints design
#   [ ] Database schema
#   [x] Authentication flow
#   [ ] Error handling

# Restore with safety checks
kc restore --verify
# Verifies snapshot integrity before restore
# Checks for corrupted or incomplete snapshots
```

### Integration with Daily Workflow
```bash
# Morning routine with recovery option
kc go || {
  echo "Session corrupted, restoring from yesterday..."
  kc restore "$(date -d yesterday +%Y-%m-%d)"
}

# End-of-day backup with recovery point
kc save -t "EOD checkpoint $(date +%Y-%m-%d)"
echo "Recovery point created. Use 'kc restore' if needed tomorrow."
```

## Snapshot Management

### List Command Advanced Options
```bash
# Machine-readable output for scripting
kc list --machine
# Output (TSV format):
# 2024-03-15T14:30:22Z    API design session    designing    3    2847
# 2024-03-15T13:15:11Z    Database schema       planning     2    1923
# 2024-03-15T12:00:45Z    Feature planning      ideation     1    856

# Clean output for automation (no headers)
kc list --no-header
# 2024-03-15 14:30 - API design session [designing]
# 2024-03-15 13:15 - Database schema [planning]
# 2024-03-15 12:00 - Feature planning [ideation]

# Combine for data processing
kc list --machine --no-header | awk -F'\t' '{print $2}' | sort
# API design session
# Database schema
# Feature planning
```

### Pipeline Usage Examples
```bash
# Find snapshots by step
kc list --machine --no-header | grep "designing" | cut -f2

# Count snapshots by month
kc list --machine --no-header | cut -f1 | cut -d'T' -f1 | cut -d'-' -f1,2 | sort | uniq -c

# Find large snapshots (>5KB)
kc list --machine --no-header | awk -F'\t' '$5 > 5000 {print $2 " (" $5 " bytes)"}

# Export snapshot metadata to CSV
echo "timestamp,title,step,files,size" > snapshots.csv
kc list --machine --no-header | tr '\t' ',' >> snapshots.csv
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

### Daily Cleanup Scripts
```bash
#!/bin/bash
# daily-cleanup.sh - Clean old snapshots and verify backups

# Delete snapshots older than 30 days
echo "Cleaning snapshots older than 30 days..."
find ~/.local/share/kodama-claude/snapshots -name "*.json" -mtime +30 -delete

# Verify recent snapshots
echo "Verifying recent snapshots..."
kc list --machine --no-header | head -5 | while IFS=$'\t' read -r timestamp title step files size; do
  if [ "$files" -eq 0 ] || [ "$size" -eq 0 ]; then
    echo "WARNING: Potentially corrupted snapshot: $title"
  else
    echo "✓ Verified: $title ($files files, ${size}B)"
  fi
done

# Create daily backup
echo "Creating daily backup..."
kc save -t "Daily backup $(date +%Y-%m-%d)"
```

### Backup Verification Script
```bash
#!/bin/bash
# verify-backups.sh - Check snapshot integrity and completeness

# Count snapshots per day for the last week
echo "Snapshot frequency (last 7 days):"
for i in {0..6}; do
  date_check=$(date -d "$i days ago" +%Y-%m-%d)
  count=$(kc list --machine --no-header | grep "$date_check" | wc -l)
  echo "$date_check: $count snapshots"
done

# Find gaps in daily backups
echo "\nChecking for backup gaps..."
last_backup=$(kc list --machine --no-header | head -1 | cut -f1 | cut -d'T' -f1)
hours_since=$(( ($(date +%s) - $(date -d "$last_backup" +%s)) / 3600 ))

if [ "$hours_since" -gt 24 ]; then
  echo "⚠️  WARNING: Last backup was $hours_since hours ago"
  echo "Consider running: kc save -t 'Automated backup'"
else
  echo "✅ Recent backup found ($hours_since hours ago)"
fi
```

### Git Hooks Integration
```bash
# .git/hooks/pre-commit
#!/bin/bash
# Enhanced pre-commit hook with recovery options

echo "Checking KODAMA context health..."
status_level=$(kc status --json 2>/dev/null | jq -r .level || echo "unknown")

case "$status_level" in
  "danger")
    echo "🔴 Critical context - auto-saving before commit..."
    echo "Pre-commit checkpoint $(date)" | kc save --stdin -y
    ;;
  "warning")
    echo "🟡 Context warning - creating checkpoint..."
    echo "Pre-commit checkpoint $(date)" | kc save --stdin -y
    ;;
  "healthy")
    echo "🟢 Context healthy - proceeding with commit"
    ;;
  *)
    echo "❓ Unable to check context status"
    ;;
esac

# Create restore point for easy rollback
echo "Creating restore point..."
kc save -t "Before commit: $(git log -1 --oneline || echo 'initial commit')"
```

### CI/CD Pipeline Integration
```yaml
# .github/workflows/kodama-integration.yml
name: KODAMA Context Management

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  context-management:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install KODAMA
        run: |
          curl -sSL https://install.kodama.dev | bash
          echo "$HOME/.local/bin" >> $GITHUB_PATH
      
      - name: Context Health Check
        run: |
          if ! kc status --strict 2>/dev/null; then
            echo "Creating CI checkpoint..."
            echo "CI build checkpoint - ${{ github.sha }}" | kc save --stdin -y
          fi
      
      - name: Export Context Metrics
        run: |
          echo "## KODAMA Metrics" >> $GITHUB_STEP_SUMMARY
          echo "| Metric | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|--------|-------|" >> $GITHUB_STEP_SUMMARY
          
          snapshot_count=$(kc list --machine --no-header | wc -l)
          echo "| Total Snapshots | $snapshot_count |" >> $GITHUB_STEP_SUMMARY
          
          latest_snapshot=$(kc list --no-header | head -1 || echo "None")
          echo "| Latest Snapshot | $latest_snapshot |" >> $GITHUB_STEP_SUMMARY
          
          total_size=$(kc list --machine --no-header | awk -F'\t' '{sum+=$5} END {print sum}' || echo 0)
          echo "| Total Size | ${total_size}B |" >> $GITHUB_STEP_SUMMARY
      
      - name: Archive Context Data
        if: github.ref == 'refs/heads/main'
        run: |
          # Export snapshot list for archival
          kc list --machine > context-export-${{ github.sha }}.tsv
          # Note: In production, you might upload this to artifact storage
```

### Development Tool Integration
```bash
# IDE integration script (ide-kodama.sh)
#!/bin/bash
# Integrate KODAMA with your development environment

case "$1" in
  "start")
    echo "Starting development session..."
    cd "${2:-$(pwd)}"
    kc go
    ;;
  "save-and-exit")
    echo "Saving progress and exiting..."
    kc save -t "IDE session end $(date +%H:%M)"
    ;;
  "quick-save")
    echo "Quick save..."
    kc save -t "Quick save $(date +%H:%M)"
    ;;
  "status-bar")
    # For status bar integration
    status=$(kc status --json 2>/dev/null | jq -r .level || echo "unknown")
    case "$status" in
      "healthy") echo "🟢 KC" ;;
      "warning") echo "🟡 KC" ;;
      "danger") echo "🔴 KC" ;;
      *) echo "❓ KC" ;;
    esac
    ;;
esac
```

### Monitoring and Alerting
```bash
#!/bin/bash
# monitor-kodama.sh - Monitor KODAMA usage and send alerts

# Check for stale contexts (no activity > 24h)
stale_threshold=86400  # 24 hours in seconds
current_time=$(date +%s)

kc list --machine --no-header | while IFS=$'\t' read -r timestamp title step files size; do
  snapshot_time=$(date -d "$timestamp" +%s 2>/dev/null || echo 0)
  age=$((current_time - snapshot_time))
  
  if [ "$age" -gt "$stale_threshold" ]; then
    echo "🚨 ALERT: Stale context detected"
    echo "   Title: $title"
    echo "   Age: $((age / 3600)) hours"
    echo "   Consider archiving or creating fresh context"
    
    # Optional: Send to monitoring system
    # curl -X POST "$MONITORING_WEBHOOK" -d "Stale KODAMA context: $title"
  fi
done

# Check disk usage
kodama_dir="$HOME/.local/share/kodama-claude"
if [ -d "$kodama_dir" ]; then
  size_mb=$(du -sm "$kodama_dir" | cut -f1)
  if [ "$size_mb" -gt 100 ]; then  # Alert if > 100MB
    echo "💾 NOTICE: KODAMA using ${size_mb}MB of disk space"
    echo "   Consider running cleanup script"
  fi
fi
```

### Data Analysis Examples
```bash
# Generate development insights from KODAMA data

# Most productive hours (when most snapshots are created)
echo "Most productive hours:"
kc list --machine --no-header | cut -f1 | cut -d'T' -f2 | cut -d':' -f1 | sort | uniq -c | sort -nr

# Average session length (time between snapshots)
echo "\nAverage time between snapshots:"
kc list --machine --no-header | cut -f1 | sort | while read -r current; do
  if [ -n "$previous" ]; then
    current_sec=$(date -d "$current" +%s)
    previous_sec=$(date -d "$previous" +%s)
    diff=$((current_sec - previous_sec))
    echo "$diff"
  fi
  previous="$current"
done | awk '{sum+=$1; count++} END {if(count>0) print "Average: " sum/count/60 " minutes"}'

# Step distribution analysis
echo "\nDevelopment step distribution:"
kc list --machine --no-header | cut -f3 | sort | uniq -c | sort -nr

# Context size trends
echo "\nSnapshot size trends (last 10):"
kc list --machine --no-header | head -10 | awk -F'\t' '{print $1 "\t" $5}' | 
  awk '{print strftime("%m-%d %H:%M", mktime(gensub(/[-T:]/, " ", "g", substr($1,1,19)))) "\t" $2"B"}'
```

### Cron Job Automation
```bash
# Advanced cron job setup (crontab -e)

# Hourly context health check
0 * * * * cd ~/projects && /path/to/check-kodama-health.sh >> ~/kodama.log 2>&1

# Daily cleanup at 2 AM
0 2 * * * /path/to/daily-cleanup.sh >> ~/kodama-cleanup.log 2>&1

# Weekly backup verification (Sundays at 3 AM)
0 3 * * 0 /path/to/verify-backups.sh | mail -s "KODAMA Weekly Report" your-email@example.com

# End-of-workday auto-save (6 PM weekdays)
0 18 * * 1-5 cd ~/projects && echo "End of workday - $(date)" | kc save --stdin -y
```

## Tips & Tricks

### 1. Morning Standup Helper
```bash
# See what you did yesterday
kc status --json | jq '.lastSnapshot'

# Quick yesterday summary
kc list --no-header | grep "$(date -d yesterday +%Y-%m-%d)" | head -3
```

### 2. End-of-Week Summary
```bash
# List week's snapshots with details
kc list --machine --no-header | grep "$(date +%Y-%m)" | \
  awk -F'\t' '{print $1 "\t" $2 "\t" $5}' | column -t

# Generate weekly report
echo "Week of $(date +%Y-%m-%d):" > weekly-report.txt
kc list --no-header | head -10 >> weekly-report.txt
```

### 3. Emergency Recovery
```bash
# If Claude crashes unexpectedly
kc save -t "Emergency save after crash"

# Multiple recovery options
kc restore --dry-run  # Check what's available
kc restore "$(kc list --no-header | head -1 | cut -d' ' -f4-)"  # Restore latest
kc go  # Restart with restored context
```

### 4. Project Switching with Context
```bash
# Project A - save with project info
cd ~/projects/project-a
kc save -t "Project A: Switching to Project B"

# Project B - restore with verification
cd ~/projects/project-b
kc restore --dry-run | grep "Project B"  # Check if Project B context exists
kc go -t "Back to Project B"

# Or use project-specific snapshots
kc list --no-header | grep "Project B" | head -1  # Find Project B snapshots
```

### 5. Smart Restore Workflows
```bash
# Find snapshots by keyword
kc list --no-header | grep -i "bug\|fix" | head -5

# Restore specific development phase
kc list --machine --no-header | awk -F'\t' '$3=="testing" {print $2}' | head -1 | xargs kc restore

# Chain operations safely
kc restore --dry-run "API design" && kc restore "API design" && kc go
```

### 6. Automation-Friendly Commands
```bash
# Machine-readable status for scripts
status_level=$(kc status --json 2>/dev/null | jq -r .level)
[ "$status_level" = "danger" ] && kc save -t "Auto-save: critical"

# Export for external tools
kc list --machine --no-header | while IFS=$'\t' read timestamp title step files size; do
  echo "$timestamp,$title,$step,$files,$size" >> snapshots.csv
done

# Integration with other tools
kc list --no-header | fzf --preview 'kc restore --dry-run {4..}'  # Interactive restore with preview
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