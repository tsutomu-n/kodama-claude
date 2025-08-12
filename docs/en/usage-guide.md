# KODAMA Claude - 3 Commands Guide

🟢 **Difficulty**: Beginner | **Read time**: 5 minutes

Master KODAMA Claude with just 3 commands.

## The Only 3 Commands You Need

```bash
kc go       # Start Claude with context
kc save     # Save snapshot & paste
kc status   # Check health (🟢/🟡/🔴/❓)
```

That's it. No complexity. No confusion.

## Command Details

### `kc go` - Start Working

Starts a new Claude session with your saved context.

```bash
# Basic usage
kc go

# With title
kc go -t "Adding user authentication"

# With workflow step
kc go -s implementing
```

**What it does:**
1. Checks session health
2. Injects context with `claude -c -p`
3. Opens Claude REPL with `claude --continue`

**Options:**
- `-t, --title <title>` - Session title
- `-s, --step <step>` - Workflow step (designing/implementing/testing/done)
- `--no-send` - Skip context injection (check only)

### `kc save` - Save Your Work

Creates a snapshot and optionally pastes to clipboard.

```bash
# Interactive mode (default)
kc save

# With title
kc save -t "API endpoints complete"

# From stdin (for automation)
echo "Progress update" | kc save --stdin -y

# Skip clipboard
kc save --copy none
```

**What it does:**
1. Prompts for context (or reads from stdin/file)
2. Saves snapshot
3. Offers to paste to clipboard

**Options:**
- `-t, --title <title>` - Snapshot title
- `-s, --step <step>` - Workflow step
- `--stdin` - Read from stdin
- `--file <path>` - Read from file
- `-y, --yes` - Skip prompts
- `--copy <mode>` - Clipboard mode (auto/clipboard/osc52/file/none)

### `kc status` - Check Health

Shows session health in one line.

```bash
# Basic check
kc status
# Output: 🟢 | basis: transcript | hint: no action needed

# JSON output (for scripts)
kc status --json

# Strict mode (exits 1 if dangerous)
kc status --strict
```

**Health indicators:**
- 🟢 **Healthy** - Keep working
- 🟡 **Warning** - Consider saving soon
- 🔴 **Danger** - Save immediately
- ❓ **Unknown** - No session data

**Options:**
- `-j, --json` - JSON output
- `-s, --strict` - Exit code 1 on danger (for CI/CD)

## Daily Workflow

### Morning Start
```bash
kc go
# Claude opens with yesterday's context
# Work on your project...
```

### During Work
```bash
# Check if you need to save
kc status
# 🟡 | basis: heuristic | hint: 2 hours since last save

# Save progress
kc save -t "Completed authentication"
```

### End of Day
```bash
kc save -t "End of day"
# Saves everything for tomorrow
```

## Keyboard Shortcuts

### In Interactive Mode
- **Enter twice** - Finish input
- **Ctrl+D** - End input (Unix/Mac)
- **Ctrl+Z** - End input (WSL)
- **Ctrl+C** - Cancel

## Environment Variables

```bash
# Language
export KODAMA_LANG=ja           # Japanese messages

# Debugging
export KODAMA_DEBUG=true        # Show debug output

# Smart features
export KODAMA_NO_LIMIT=true     # Show all decisions (not just 5)
export KODAMA_AUTO_ARCHIVE=false # Disable 30-day auto-archive
```

## File Locations

```
~/.local/share/kodama-claude/
├── snapshots/          # Your saved work
│   └── archive/        # Old snapshots (30+ days)
├── events.jsonl        # Event log
└── .session           # Current session
```

## Tips

1. **Save often** - Every 1-2 hours or major milestone
2. **Use titles** - Makes finding snapshots easier
3. **Check status** - Before long breaks
4. **Trust auto-save** - `kc go` protects you when critical

## Common Issues

| Problem | Solution |
|---------|----------|
| "Claude not found" | Install Claude first |
| "No snapshots" | Create first with `kc save` |
| Red status (🔴) | Run `kc save` immediately |
| Clipboard not working | Falls back to temp file automatically |

## Examples

### Feature Development
```bash
# Morning: Start feature
kc go -t "Add payment processing"

# Work with Claude...

# Lunch: Save progress
kc save -t "Payment API 50% done"

# Afternoon: Continue
kc go

# Evening: Final save
kc save -t "Payment feature complete"
```

### Quick Bug Fix
```bash
# Start
kc go -t "Fix login bug"

# Fix with Claude...

# Save when done
kc save -t "Login bug fixed"
```

### CI/CD Integration
```bash
# In your CI script
if ! kc status --strict; then
  echo "Context critical, saving..."
  echo "CI checkpoint" | kc save --stdin -y
fi
```

---

**Remember**: Less is more. Just 3 commands is all you need.