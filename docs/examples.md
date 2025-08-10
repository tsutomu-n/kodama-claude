# Real-World Examples and Workflows

🟢 **Difficulty**: Beginner | **Read time**: 20 minutes

See how to use KODAMA Claude in real development scenarios.

## Table of Contents
- [Daily Workflows](#daily-workflows)
  - [Morning Workflow](#morning-workflow)
  - [Evening Workflow](#evening-workflow)
  - [Weekend Catch-up](#weekend-catch-up)
- [Project Scenarios](#project-scenarios)
  - [Starting New Feature](#starting-new-feature)
  - [Bug Fixing Session](#bug-fixing-session)
  - [Code Review Preparation](#code-review-preparation)
- [Multiple Projects](#multiple-projects)
- [Team Collaboration](#team-collaboration)
- [Special Situations](#special-situations)

## Daily Workflows

### Morning Workflow

**Scenario**: You arrive at work and need to continue yesterday's task.

```bash
# 1. Check what you were doing yesterday
$ cd ~/projects/web-app
$ cat ~/.local/share/kodama-claude/snapshots/latest.json | jq '.title, .nextSteps'
"Implementing user dashboard"
[
  "Add chart component",
  "Connect to API",
  "Handle loading states"
]

# 2. Review git status
$ git status
On branch feature/dashboard
Your branch is up to date with 'origin/feature/dashboard'.

# 3. Start working with context
$ kc go -t "Morning: Continue dashboard"

Loading snapshot from: 2025-01-09 17:30
Context includes:
- Completed dashboard layout
- Set up data fetching hooks
- Next: Add chart component

Starting Claude CLI...
> Good morning! I see we're continuing the dashboard. 
> Yesterday we completed the layout and data hooks.
> Let's add the chart component next.

> [Claude helps you implement the chart...]

# 4. Mid-morning checkpoint (before meeting)
[Ctrl+D to exit Claude]

Auto-saving snapshot...
✓ Snapshot saved: b2c3d4e5

# 5. After meeting, continue
$ kc go
Loading latest snapshot...
> Let's continue with the API connection...
```

**Visual Timeline**:
```
09:00 ─── kc go ──────────► Work on charts
10:30 ─── [Auto-save] ────► Meeting
11:00 ─── kc go ──────────► Continue API work
12:00 ─── kc snap ────────► Lunch break
```

### Evening Workflow

**Scenario**: Wrapping up your day properly.

```bash
# 1. Finish current task
> [Working with Claude...]
> Great! The feature is working now.
[Ctrl+D]

# 2. Create detailed end-of-day snapshot
$ kc snap

? Title for this snapshot: Dashboard MVP complete
? What step are you on? testing
? What did you accomplish? (Enter when done)
  > Implemented chart component
  > Connected to real API
  > Added loading states
  > Fixed responsive layout
  > 
? Decisions made? (Enter when done)
  > Use Chart.js for graphs
  > Cache API responses for 5 minutes
  > Show skeleton during load
  >
? Next steps? (Enter when done)
  > Write unit tests
  > Add error boundaries
  > Get UX review
  >

✓ Snapshot saved: f6g7h8i9

# 3. Review the day
$ jq '{title, context}' ~/.local/share/kodama-claude/snapshots/$(date +%Y-%m-%d)*.json

# 4. Quick plan for tomorrow
$ kc plan -t "Thursday plan"

What are you planning? Testing dashboard and UX review
Main goals:
- Complete unit tests
- Fix any UX issues
- Prepare for demo

✓ Plan saved

# 5. Commit your work
$ git add .
$ git commit -m "Complete dashboard MVP with charts and API"
$ git push
```

### Weekend Catch-up

**Scenario**: Returning after days off.

```bash
# See what you were doing
$ cd ~/projects/web-app

# View recent snapshots
$ ls -la ~/.local/share/kodama-claude/snapshots/ | tail -5
-rw-r--r-- 1 user 2.1K Jan  5 17:30 2025-01-05T17-30-00-abc123.json
-rw-r--r-- 1 user 2.3K Jan  5 18:45 2025-01-05T18-45-00-def456.json
-rw-r--r-- 1 user 1.9K Jan  8 09:00 2025-01-08T09-00-00-ghi789.json

# Read last Friday's summary
$ jq '.title, .nextSteps' ~/.local/share/kodama-claude/snapshots/2025-01-05T18-45*.json
"Completed authentication flow"
[
  "Add password reset",
  "Implement remember me",
  "Security review"
]

# Start with full context
$ kc go -t "Monday: Continue auth features"

Loading snapshot from: 2025-01-05 18:45
⚠️ Note: Snapshot is 3 days old

Context from last session:
- Completed login/logout
- Added JWT tokens
- Next: Password reset

Starting Claude CLI...
> I see we completed authentication on Friday.
> Let's start with the password reset feature.
> First, let me check the current code structure...
```

## Project Scenarios

### Starting New Feature

**Complete workflow from planning to implementation**:

```bash
# PHASE 1: Planning
$ kc plan

? What are you planning? Add email notification system
? Main goals? (Enter when done)
  > Send welcome emails
  > Password reset emails
  > Daily digest option
  >
? Specific tasks? (Enter when done)  
  > Research email services
  > Design email templates
  > Create email queue
  > Add user preferences
  >
? Important considerations? (Enter when done)
  > GDPR compliance
  > Rate limiting
  > Template testing
  >

✓ Plan saved: j9k0l1m2

# PHASE 2: Research and Design
$ kc go -s designing -t "Research email services"

Starting Claude with planning context...
> Let's research email service options.
> For Node.js, we have SendGrid, AWS SES, and Postmark...
> [Discussion about options...]

[Ctrl+D]
✓ Auto-saved

# PHASE 3: Implementation
$ kc go -s implementing -t "Build email system"

Loading context from design phase...
> Based on our decision to use SendGrid,
> let's implement the email service...

> // First, install dependencies
> npm install @sendgrid/mail bull

> // Create email service
> [Claude helps write code...]

# PHASE 4: Testing
$ kc go -s testing -t "Test email system"

> Let's write tests for our email system...
> [Creates test files...]

# PHASE 5: Completion
$ kc snap
? Title: Email system complete
? Step: done
✓ Feature complete!
```

**Progress Tracking**:
```
Day 1: designing ─────► Research options
Day 2: designing ─────► Create templates  
Day 3: implementing ──► Build service
Day 4: implementing ──► Add queue
Day 5: testing ───────► Write tests
Day 6: done ──────────► Deploy
```

### Bug Fixing Session

**Scenario**: Systematic bug investigation and fix.

```bash
# Start with bug report
$ kc go -t "Fix: Users can't login after password reset"

No previous context. Starting fresh.
> Investigating login issue after password reset.
> Let me check the auth flow...

> cat src/auth/reset-password.js
> [Reviews code]
> 
> I found the issue: the password reset doesn't
> clear the old session tokens. Let's fix it...

[After fixing]
[Ctrl+D]

# Document the fix
$ kc snap

? Title: Fixed post-reset login bug  
? What did you accomplish?
  > Found root cause: stale session tokens
  > Added token cleanup after reset
  > Tested with multiple scenarios
  >
? Decisions made?
  > Clear all sessions on password reset
  > Add audit log entry
  >
? Next steps?
  > Deploy to staging
  > Monitor for 24 hours
  >

# Create git commit with context
$ git add -A
$ git commit -m "Fix: Clear sessions after password reset

Issue: Users couldn't login after resetting password
Cause: Old session tokens were not invalidated
Solution: Clear all user sessions on password reset

Fixes #456"
```

### Code Review Preparation

**Scenario**: Preparing code for review.

```bash
# Summarize changes for reviewers
$ kc snap

? Title: Ready for review: User profile feature
? What did you accomplish?
  > Created profile model and API
  > Added avatar upload
  > Implemented privacy settings
  > Added comprehensive tests
  >
? Decisions made?
  > Store avatars in S3
  > Limit file size to 5MB
  > Use UUID for image names
  > Cache profiles for 1 hour
  >
? Next steps?
  > Address review feedback
  > Update documentation
  > Deploy to staging
  >

# Generate PR description
$ cat ~/.local/share/kodama-claude/snapshots/latest.json | \
  jq -r '"## Summary\n\(.context)\n\n## Decisions\n\(.decisions | map("- " + .) | join("\n"))\n\n## Testing\n\(.nextSteps | map("- " + .) | join("\n"))"' \
  > pr-description.md

# Create pull request
$ gh pr create --title "Feature: User profiles with avatar support" \
               --body-file pr-description.md
```

## Multiple Projects

### Project Switching

**Managing context across different projects**:

```bash
# Project A: Morning work
$ cd ~/projects/project-a
$ kc go -t "Project A: API updates"
> Working on API...
[Ctrl+D]

# Switch to Project B
$ cd ~/projects/project-b
$ kc go -t "Project B: Bug fix"
> Different project context loaded...
[Ctrl+D]

# Back to Project A with context
$ cd ~/projects/project-a
$ kc go  # Continues with Project A context
```

### Project Organization

**Directory structure for multiple projects**:

```bash
# Setup project-specific aliases
$ cat >> ~/.bashrc << 'EOF'
# Project shortcuts with KODAMA
proj_web() {
    cd ~/projects/web-app
    echo "=== Web App Project ==="
    jq '.title' ~/.local/share/kodama-claude/snapshots/latest.json 2>/dev/null || echo "No context"
    kc go -t "Web app: $1"
}

proj_api() {
    cd ~/projects/api-server  
    echo "=== API Server Project ==="
    jq '.title' ~/.local/share/kodama-claude/snapshots/latest.json 2>/dev/null || echo "No context"
    kc go -t "API: $1"
}

proj_mobile() {
    cd ~/projects/mobile-app
    echo "=== Mobile App Project ==="
    jq '.title' ~/.local/share/kodama-claude/snapshots/latest.json 2>/dev/null || echo "No context"
    kc go -t "Mobile: $1"
}
EOF

$ source ~/.bashrc

# Now switch projects easily
$ proj_web "Continue dashboard"
=== Web App Project ===
"Dashboard MVP complete"
Loading context...

$ proj_api "Fix database query"
=== API Server Project ===
"Optimized user queries"
Loading context...
```

## Team Collaboration

### Sharing Context with Team

**Scenario**: Handing off work to teammate.

```bash
# 1. Create detailed handoff snapshot
$ kc snap

? Title: Handoff to Sarah: Payment integration
? What did you accomplish?
  > Set up Stripe SDK
  > Created payment models
  > Built checkout flow (70% done)
  >
? Decisions made?
  > Use Stripe Elements for card input
  > Store customer ID, not card details
  > Implement webhooks for async events
  >
? Next steps?
  > Complete webhook handlers
  > Add subscription management
  > Test with Stripe CLI
  > Add error handling
  >

# 2. Export snapshot for sharing
$ cp ~/.local/share/kodama-claude/snapshots/latest.json \
     ~/shared/handoff-payment-$(date +%Y%m%d).json

# 3. Share via Slack/email
$ echo "Payment integration handoff ready. 
Context file: handoff-payment-20250110.json
Key decisions: Use Stripe Elements, webhooks for events
Next: Complete webhook handlers" | slack-cli send

# 4. Teammate imports context
[On Sarah's machine]
$ cp ~/shared/handoff-payment-20250110.json \
     ~/.local/share/kodama-claude/snapshots/
$ ln -sf handoff-payment-20250110.json \
     ~/.local/share/kodama-claude/snapshots/latest.json
$ kc go
> I see I'm taking over the payment integration...
```

### Pair Programming with KODAMA

```bash
# Driver saves context before switching
[Driver's machine]
$ kc snap -t "Pair programming checkpoint"

# Navigator takes over
[Navigator's machine]  
$ kc go -t "Continue pairing: refactoring"

# End of session
$ kc snap
? Title: Pair session complete
? What did you accomplish?
  > Refactored user service
  > Improved test coverage to 85%
  > Fixed 3 edge cases
```

## Special Situations

### Emergency Debugging

**When production is down**:

```bash
# Quick start without previous context
$ kc go -t "URGENT: Production down - 500 errors"

> Production emergency. Investigating 500 errors.
> Show me the recent error logs...

> tail -f /var/log/app/error.log
> [Identifies issue]
> 
> The database connection pool is exhausted.
> Let's increase the pool size and restart...

[After fix]
$ kc snap -t "Fixed: Production DB pool exhaustion"
```

### Long-Running Tasks

**Working on something for days/weeks**:

```bash
# Week 1: Research
$ kc go -s designing -t "Week 1: Architecture research"
[Daily work with regular snapshots]

# Week 2: Prototype
$ kc go -s implementing -t "Week 2: Build prototype"
[Daily work with regular snapshots]

# Week 3: Production code
$ kc go -s implementing -t "Week 3: Production implementation"

# Review weekly progress
$ for week in 1 2 3; do
    echo "=== Week $week ==="
    jq '.title' ~/.local/share/kodama-claude/snapshots/*Week-$week*.json 2>/dev/null | sort -u
done

=== Week 1 ===
"Week 1: Architecture research"
"Week 1: Chose microservices"
"Week 1: Designed API schema"

=== Week 2 ===
"Week 2: Build prototype"
"Week 2: Basic CRUD working"
"Week 2: Added authentication"

=== Week 3 ===
"Week 3: Production implementation"
"Week 3: Added monitoring"
"Week 3: Performance optimization"
```

### Context Recovery

**When something goes wrong**:

```bash
# Accidentally deleted snapshots?
# Check the event log
$ cat ~/.local/share/kodama-claude/events.jsonl | \
  jq 'select(.event == "snapshot_created") | {time: .timestamp, title: .data.title}'

# Check archive folder (v0.2.0+)
$ ls ~/.local/share/kodama-claude/snapshots/archive/
# Old snapshots are auto-archived after 30 days

# Restore from archive
$ cp ~/.local/share/kodama-claude/snapshots/archive/old-snapshot.json \
     ~/.local/share/kodama-claude/snapshots/

# Restore from git (if you version snapshots)
$ cd ~/.local/share/kodama-claude
$ git log --oneline snapshots/
$ git checkout HEAD~1 snapshots/

# Recover from Claude's history
$ claude --list-sessions
$ claude --continue <old-session-id>
```

### Breaking Changes Workflow (v0.2.0+)

**Scenario**: Junior developer frequently pivoting and making breaking changes.

```bash
# Initial approach - implementing with Redux
$ kc go -t "Add state management"
> Let's implement Redux for state management...
> [Work for a while...]
[Ctrl+D]

# Realize Redux is overkill, pivot to Context API
$ kc snap
? Title: Pivoting from Redux to Context API
? What did you accomplish?
  > Set up Redux store (removing)
  > Realized it's too complex
  >
? Decisions made?
  > Redux is overkill for this app
  > Context API is sufficient
  > Will use Context + useReducer
  >
? Next steps?
  > Remove Redux dependencies
  > Implement Context API
  >

# Continue with new approach
$ kc go -t "Implement Context API instead"

# KODAMA only shows latest 5 decisions by default
# Old Redux decisions automatically fade from view
# Reducing cognitive load from abandoned approaches
Loading snapshot...
Decisions (latest 5):
- Context API is sufficient
- Will use Context + useReducer
- Keep state close to components
- Add localStorage persistence
- Create custom hooks

> Good, we're using Context API now.
> Let me help you implement the new approach...

# After several pivots, check decision history
$ export KODAMA_DEBUG=true
$ kc go
ℹ️  Showing latest 5 of 12 decisions
# Only relevant recent decisions shown

# If you need full history
$ export KODAMA_NO_LIMIT=true
$ kc go
# Now shows all 12 decisions
```

### CLAUDE.md Integration Example (v0.2.0+)

**Scenario**: Maintaining consistent AI context across multiple sessions.

```bash
# Initial setup
$ export KODAMA_CLAUDE_SYNC=true

# Create CLAUDE.md from template (in your project root)
$ cd ~/my-project
$ cp /path/to/kodama-claude/templates/CLAUDE.md.example CLAUDE.md
$ cat CLAUDE.md
# Project Context

This project is a task management application.

## Tech Stack
- React 18
- TypeScript
- Tailwind CSS

<!-- KODAMA:START -->
<!-- KODAMA:END -->

## Conventions
- Use functional components
- Prefer hooks over HOCs

# Work on feature
$ kc go -t "Add task filtering"
> I see this is a React/TypeScript task management app...
> [Work on filtering...]
[Ctrl+D]

# CLAUDE.md is automatically updated
$ cat CLAUDE.md
# Project Context

This project is a task management application.

## Tech Stack
- React 18
- TypeScript
- Tailwind CSS

<!-- KODAMA:START -->
## Current Context (KODAMA)
**Last Updated**: 2025-01-10T14:30:00Z
**Current Step**: implementing

### Previous Work
Added task filtering functionality

### Recent Decisions
- Use React Query for data fetching
- Implement client-side filtering
- Add debounce to search input
- Cache filter results
- Show count badges

### Next Steps
- Add filter persistence
- Implement advanced filters
- Add filter presets
<!-- KODAMA:END -->

## Conventions
- Use functional components
- Prefer hooks over HOCs

# Next day, different terminal/session
$ claude
> [Claude reads CLAUDE.md automatically]
> I see you're working on task filtering with React Query.
> You've implemented client-side filtering with debouncing.
> Should we continue with filter persistence?
```

### Integration with CI/CD

**Automated context on deployments**:

```bash
# .github/workflows/deploy.yml
name: Deploy with Context
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Create deployment snapshot
        run: |
          echo "Deployment to production" | \
          kc snap -t "Deploy: ${{ github.sha }}"
      
      - name: Deploy
        run: ./deploy.sh
      
      - name: Save deployment context
        run: |
          echo "Deployment complete" | \
          kc snap -t "Deployed: ${{ github.sha }}"
```

## Workflow Patterns

### The Daily Loop
```
┌─────────────────────────────────────┐
│  Morning: kc go                      │
│     ↓                                │
│  Work with Claude (context loaded)   │
│     ↓                                │
│  Checkpoint: Auto-save on exit       │
│     ↓                                │
│  Lunch: kc snap (detailed)           │
│     ↓                                │
│  Afternoon: kc go                    │
│     ↓                                │
│  Evening: kc snap (very detailed)    │
└─────────────────────────────────────┘
```

### The Feature Flow
```
Plan ──► Research ──► Design ──► Build ──► Test ──► Ship
 │         │           │          │         │        │
 └─────────┴───────────┴──────────┴─────────┴────────┘
           Each step: kc go -s [step]
           Each end: kc snap
```

### The Debug Dance
```
Bug Report ──► Reproduce ──► Investigate ──► Fix ──► Verify
    │             │              │           │         │
    └─────────────┴──────────────┴───────────┴─────────┘
                 kc go -t "Bug: [description]"
                 Document each finding in context
```

---

**Next**: Learn to customize in [Customization](customization.md) →