# API Reference

🟡 **Difficulty**: Intermediate to Advanced | **Read time**: 10 minutes

Complete reference for all KODAMA Claude commands and options.

## Table of Contents
- [Command Overview](#command-overview)
- [Global Options](#global-options)
- [Commands](#commands)
  - [`kc go`](#kc-go)
  - [`kc snap`](#kc-snap)
  - [`kc plan`](#kc-plan)
  - [`kc send`](#kc-send)
  - [`kc doctor`](#kc-doctor)
- [Exit Codes](#exit-codes)
- [Environment Variables](#environment-variables)
- [File Formats](#file-formats)
- [Scripting API](#scripting-api)

## Command Overview

```
kc [global-options] <command> [command-options]
```

### Available Commands

| Command | Short Description | Usage |
|---------|------------------|-------|
| `go` | Start or continue work with Claude | `kc go [-t title] [-s step]` |
| `snap` | Save current context snapshot | `kc snap [-t title]` |
| `plan` | Plan next steps | `kc plan [-t title]` |
| `send` | Send context to Claude | `kc send [snapshot-id]` |
| `doctor` | Check system health | `kc doctor` |

## Global Options

These options work with all commands:

| Option | Description | Example |
|--------|-------------|---------|
| `--help`, `-h` | Show help message | `kc --help` |
| `--version`, `-V` | Show version | `kc --version` |
| `--debug`, `-d` | Enable debug output | `kc --debug go` |

## Commands

### `kc go`

Start or continue working with Claude, loading previous context.

#### Synopsis

```bash
kc go [options]
```

#### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `-t, --title <text>` | string | Session title | Previous title or prompt |
| `-s, --step <step>` | enum | Workflow step (requirements/designing/implementing/testing) | Previous step |

#### Steps (for `-s, --step`)

| Step | Description | When to use |
|------|-------------|-------------|
| `requirements` | Gathering requirements | Understanding what to build |
| `designing` | Planning and architecture | Starting new feature |
| `implementing` | Writing code | Building functionality |
| `testing` | Testing and debugging | Verifying code works |

#### Examples

```bash
# Simple start
kc go

# With title
kc go -t "Fix login bug"

# At specific step
kc go -s testing

# With both title and step
kc go -t "API development" -s implementing
```

#### Behavior

1. Loads latest snapshot (or specified)
2. Formats context for Claude
3. Starts Claude CLI with `--continue` flag
4. Waits for session to end
5. Auto-saves new snapshot (unless `--no-save`)

#### Output

```
Loading snapshot from: 2025-01-10 09:00:00
Starting Claude CLI with context...
[Claude session starts]
```

### `kc snap`

Create a snapshot of current work context.

#### Synopsis

```bash
kc snap [options]
```

#### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `-t, --title <text>` | string | Snapshot title | Interactive prompt |
| `--stdin` | flag | Read from stdin | false |
| `--json` | flag | Output JSON | false |
| `--no-git` | flag | Skip git info | false |

#### Interactive Mode

When run without options, prompts for:

1. **Title** - Short description
2. **Step** - Current phase (designing/implementing/testing/done)
3. **Accomplishments** - What you did (multi-line)
4. **Decisions** - Choices made (multi-line)
5. **Next steps** - What's next (multi-line)

#### Examples

```bash
# Interactive mode
kc snap

# Quick snapshot with title
kc snap -t "Lunch break"

# From script/pipeline
echo "Automated checkpoint" | kc snap -t "CI build" --stdin

# Output JSON (for processing)
kc snap --json > snapshot.json

# Without git information
kc snap --no-git
```

#### Input Format (stdin)

When using `--stdin`, provide text in this format:
```
What you accomplished
Decisions made
Next steps
```

#### Output

Normal mode:
```
✓ Snapshot saved: a1b2c3d4-e5f6-g7h8-i9j0
```

JSON mode (`--json`):
```json
{
  "id": "a1b2c3d4-e5f6-g7h8-i9j0",
  "path": "/home/user/.local/share/kodama-claude/snapshots/2025-01-10T09-00-00-a1b2c3d4.json"
}
```

### `kc plan`

Plan and organize upcoming work.

#### Synopsis

```bash
kc plan [options]
```

#### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `-t, --title <text>` | string | Plan title | Interactive prompt |
| `--template <type>` | string | Use template | none |
| `--stdin` | flag | Read from stdin | false |

#### Templates (for `--template`)

| Template | Description | Fields |
|----------|-------------|--------|
| `feature` | New feature planning | Goals, tasks, risks |
| `bugfix` | Bug fix planning | Issue, cause, solution |
| `refactor` | Refactoring plan | Current, target, steps |
| `research` | Research planning | Questions, resources, outcomes |

#### Examples

```bash
# Interactive planning
kc plan

# Quick plan
kc plan -t "Database migration"

# Use template
kc plan --template feature

# From script
echo "Research caching options" | kc plan --stdin
```

#### Interactive Prompts

1. What are you planning?
2. Main goals?
3. Specific tasks?
4. Important considerations?

#### Output

```
✓ Plan saved: p1q2r3s4-t5u6-v7w8-x9y0
```

### `kc send`

Send context to existing Claude session.

#### Synopsis

```bash
kc send [snapshot-id]
```

#### Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `snapshot-id` | Specific snapshot to send | latest |

#### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--session <id>` | string | Target Claude session | Current/active |
| `--format <type>` | enum | Output format | prompt |

#### Formats (for `--format`)

| Format | Description |
|--------|-------------|
| `prompt` | Human-readable context |
| `json` | Raw JSON data |
| `minimal` | Just next steps |

#### Examples

```bash
# Send latest snapshot
kc send

# Send specific snapshot
kc send a1b2c3d4

# Send to specific session
kc send --session claude-123456

# Minimal format
kc send --format minimal
```

#### Use Cases

1. Claude already running, need context
2. Lost context mid-session
3. Sharing context between sessions
4. Manual context injection

#### Output

```
✓ Context sent to Claude session: claude-123456
```

### `kc doctor`

Diagnose and verify system configuration.

#### Synopsis

```bash
kc doctor [options]
```

#### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--verbose` | flag | Detailed output | false |
| `--fix` | flag | Attempt auto-fix | false |
| `--json` | flag | JSON output | false |

#### Checks Performed

| Check | Description | Auto-fixable |
|-------|-------------|--------------|
| Binary | KODAMA executable found | No |
| Claude CLI | Claude command available | No |
| API Key | ANTHROPIC_API_KEY set | No |
| Storage | Directory exists and writable | Yes |
| Permissions | Correct file permissions | Yes |
| Git | Git command available | No |
| Snapshots | Valid snapshot files | Partial |
| Lock files | No stale locks | Yes |

#### Examples

```bash
# Basic check
kc doctor

# Verbose output
kc doctor --verbose

# Auto-fix issues
kc doctor --fix

# JSON output for scripts
kc doctor --json
```

#### Output (Normal)

```
KODAMA Claude Health Check
==========================
✓ KODAMA binary: /usr/local/bin/kc
✓ Claude CLI: Found at /usr/local/bin/claude
✓ API key: Set
✓ Storage: ~/.local/share/kodama-claude
✓ Permissions: OK
✓ Git: Available
✓ Snapshots: 12 found
✓ Latest: 2025-01-10 14:30

All systems operational!
```

#### Output (JSON)

```json
{
  "status": "healthy",
  "checks": {
    "binary": {"status": "pass", "path": "/usr/local/bin/kc"},
    "claude": {"status": "pass", "path": "/usr/local/bin/claude"},
    "api_key": {"status": "pass"},
    "storage": {"status": "pass", "path": "~/.local/share/kodama-claude"},
    "permissions": {"status": "pass"},
    "git": {"status": "pass", "version": "2.34.1"},
    "snapshots": {"status": "pass", "count": 12},
    "latest": {"status": "pass", "timestamp": "2025-01-10T14:30:00Z"}
  }
}
```

## Environment Variables

### Core Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `KODAMA_LANG` | Set language for messages (ja/en) | `en` | `export KODAMA_LANG=ja` |
| `HOME` | Required for storage paths | System | System default |
| `XDG_DATA_HOME` | Override data directory | `~/.local/share` | `export XDG_DATA_HOME=/custom/data` |
| `XDG_CONFIG_HOME` | Override config directory | `~/.config` | `export XDG_CONFIG_HOME=/custom/config` |
| `KODAMA_DEBUG` | Enable debug output | `false` | `export KODAMA_DEBUG=true` |

### Smart Context Management (v0.2.0+)

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `KODAMA_NO_LIMIT` | Show all decisions (no 5-decision limit) | `false` (limit enabled) | `export KODAMA_NO_LIMIT=true` |
| `KODAMA_AUTO_ARCHIVE` | Enable automatic archiving (30 days) | `true` (enabled) | `export KODAMA_AUTO_ARCHIVE=false` |
| `KODAMA_CLAUDE_SYNC` | Enable CLAUDE.md auto-update | `false` (disabled) | `export KODAMA_CLAUDE_SYNC=true` |

**Details:**
- **KODAMA_NO_LIMIT**: 
  - `false` (default): Shows only the latest 5 decisions to reduce cognitive load
  - `true`: Shows all decisions without limit
  - Full history is always preserved in storage files
- **KODAMA_AUTO_ARCHIVE**: 
  - `true` (default): Automatically archives snapshots older than 30 days during `kc snap`, `kc go`, or `kc plan` execution
  - `false`: Disables automatic archiving
  - Archived files are moved to `~/.local/share/kodama-claude/snapshots/archive/`
- **KODAMA_CLAUDE_SYNC**: 
  - `false` (default): CLAUDE.md is not updated automatically
  - `true`: Updates CLAUDE.md file with latest context after each command
  - Requires KODAMA markers (`<!-- KODAMA:START -->` and `<!-- KODAMA:END -->`) in the file

## Exit Codes

KODAMA uses standard exit codes:

| Code | Meaning | Description |
|------|---------|-------------|
| 0 | Success | Command completed successfully |
| 1 | General error | Unspecified error occurred |
| 2 | Misuse | Invalid command syntax |
| 3 | Cannot execute | Binary/permission issue |
| 64 | Usage error | Command line usage error |
| 65 | Data error | Input data incorrect |
| 66 | No input | Input file missing |
| 69 | Unavailable | Service unavailable |
| 70 | Software error | Internal software error |
| 73 | Cannot create | Can't create output file |
| 74 | IO error | Input/output error |
| 75 | Temp failure | Temporary failure, retry |
| 77 | Permission denied | Permission denied |
| 78 | Configuration | Configuration error |
| 126 | Not executable | Command not executable |
| 127 | Not found | Command not found |

### Checking Exit Codes

```bash
# In scripts
kc go
if [ $? -eq 0 ]; then
    echo "Success"
else
    echo "Failed with code: $?"
fi

# One-liner
kc snap && echo "Saved" || echo "Failed"
```

## File Formats

### Snapshot JSON

Location: `~/.local/share/kodama-claude/snapshots/*.json`

```json
{
  "version": "1.0.0",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Implemented user authentication",
  "timestamp": "2025-01-10T09:00:00.000Z",
  "step": "implementing",
  "context": "Added login and registration endpoints...",
  "decisions": [
    "Use JWT for sessions",
    "bcrypt for passwords"
  ],
  "nextSteps": [
    "Add password reset",
    "Implement 2FA"
  ],
  "environment": {
    "cwd": "/home/user/projects/app",
    "user": "user",
    "hostname": "dev-machine"
  },
  "git": {
    "branch": "feature/auth",
    "commit": "abc123def456",
    "status": "clean",
    "remote": "origin/feature/auth"
  },
  "metadata": {
    "claudeSession": "claude-789xyz",
    "previousSnapshot": "449e7300-d18a-30c3-9605-335544330000"
  }
}
```

### Event Log

Location: `~/.local/share/kodama-claude/events.jsonl`

Each line is a JSON object:

```json
{"timestamp":"2025-01-10T09:00:00Z","event":"snapshot_created","data":{"id":"550e8400","title":"Morning work"}}
{"timestamp":"2025-01-10T09:01:00Z","event":"claude_started","data":{"session":"claude-123"}}
{"timestamp":"2025-01-10T10:00:00Z","event":"claude_ended","data":{"session":"claude-123","duration":3540}}
{"timestamp":"2025-01-10T10:00:30Z","event":"snapshot_created","data":{"id":"660f9500","title":"Auto-save"}}
```

### Session File

Location: `~/.local/share/kodama-claude/.session`

Plain text file containing current Claude session ID:
```
claude-20250110-093045-a1b2c3
```

### Lock File

Location: `~/.local/share/kodama-claude/.lock`

Contains PID of process holding lock:
```
12345
```

## Scripting API

### Basic Usage in Scripts

```bash
#!/bin/bash
# Example: Automated context manager

# Function to safely snapshot
safe_snapshot() {
    local title="$1"
    if kc snap -t "$title" --stdin < /dev/null; then
        echo "Snapshot created: $title"
        return 0
    else
        echo "Failed to create snapshot"
        return 1
    fi
}

# Function to check health
check_health() {
    if kc doctor --json | jq -e '.status == "healthy"' > /dev/null; then
        return 0
    else
        echo "System unhealthy"
        kc doctor
        return 1
    fi
}

# Main workflow
main() {
    # Check system
    check_health || exit 1
    
    # Create morning snapshot
    safe_snapshot "Morning: $(date '+%Y-%m-%d')"
    
    # Work with Claude
    kc go -t "Daily work"
    
    # Evening snapshot
    safe_snapshot "Evening: $(date '+%Y-%m-%d')"
}

main "$@"
```

### Advanced Integration

```bash
#!/bin/bash
# Integration with project workflow

# Parse snapshot JSON
get_last_step() {
    jq -r '.step' ~/.local/share/kodama-claude/snapshots/latest.json 2>/dev/null || echo "designing"
}

# Get next step
next_step() {
    case "$1" in
        designing) echo "implementing" ;;
        implementing) echo "testing" ;;
        testing) echo "done" ;;
        done) echo "designing" ;;
        *) echo "implementing" ;;
    esac
}

# Workflow automation
auto_workflow() {
    local current_step=$(get_last_step)
    local next=$(next_step "$current_step")
    
    echo "Current step: $current_step"
    echo "Moving to: $next"
    
    kc go -s "$next" -t "Auto workflow: $next"
}

# Context-aware git commit
smart_commit() {
    local context=$(jq -r '.context' ~/.local/share/kodama-claude/snapshots/latest.json)
    local title=$(jq -r '.title' ~/.local/share/kodama-claude/snapshots/latest.json)
    
    git add -A
    git commit -m "$title" -m "$context"
}

# Snapshot with git info
git_snapshot() {
    local branch=$(git branch --show-current)
    local status=$(git status --porcelain | wc -l)
    local commit=$(git rev-parse --short HEAD)
    
    echo "Branch: $branch ($status changes) at $commit" | \
        kc snap -t "$1" --stdin
}
```

### Python Integration

```python
#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path
from datetime import datetime

class KodamaClient:
    def __init__(self):
        self.data_dir = Path.home() / ".local/share/kodama-claude"
        
    def get_latest_snapshot(self):
        """Get the latest snapshot as dict"""
        latest = self.data_dir / "snapshots/latest.json"
        if latest.exists():
            return json.loads(latest.read_text())
        return None
    
    def create_snapshot(self, title, context="", decisions=None, next_steps=None):
        """Create snapshot programmatically"""
        snapshot = {
            "version": "1.0.0",
            "id": str(uuid.uuid4()),
            "title": title,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "step": "implementing",
            "context": context,
            "decisions": decisions or [],
            "nextSteps": next_steps or []
        }
        
        # Save snapshot
        filename = f"{datetime.now():%Y-%m-%dT%H-%M-%S}-{snapshot['id'][:8]}.json"
        path = self.data_dir / f"snapshots/{filename}"
        path.write_text(json.dumps(snapshot, indent=2))
        
        # Update latest symlink
        latest = self.data_dir / "snapshots/latest.json"
        if latest.exists():
            latest.unlink()
        latest.symlink_to(path)
        
        return snapshot['id']
    
    def run_command(self, command, *args):
        """Run kc command"""
        cmd = ["kc", command] + list(args)
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr

# Usage
client = KodamaClient()

# Get latest context
snapshot = client.get_latest_snapshot()
if snapshot:
    print(f"Last worked on: {snapshot['title']}")
    print(f"Next steps: {', '.join(snapshot['nextSteps'])}")

# Create new snapshot
snapshot_id = client.create_snapshot(
    title="Python integration test",
    context="Testing KODAMA from Python",
    decisions=["Use Python API"],
    next_steps=["Complete integration", "Add tests"]
)

# Run doctor
success, output, error = client.run_command("doctor", "--json")
if success:
    health = json.loads(output)
    print(f"System status: {health['status']}")
```

### Node.js Integration

```javascript
#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class KodamaClient {
    constructor() {
        this.dataDir = path.join(
            process.env.HOME,
            '.local/share/kodama-claude'
        );
    }
    
    async getLatestSnapshot() {
        try {
            const data = await fs.readFile(
                path.join(this.dataDir, 'snapshots/latest.json'),
                'utf8'
            );
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }
    
    async runCommand(command, ...args) {
        const cmd = `kc ${command} ${args.join(' ')}`;
        try {
            const { stdout, stderr } = await execAsync(cmd);
            return { success: true, stdout, stderr };
        } catch (error) {
            return { success: false, error };
        }
    }
    
    async createSnapshot(title, options = {}) {
        const input = [
            options.context || '',
            ...(options.decisions || []),
            ...(options.nextSteps || [])
        ].join('\n');
        
        const cmd = `echo "${input}" | kc snap -t "${title}" --stdin`;
        return this.runCommand(cmd);
    }
}

// Usage
(async () => {
    const client = new KodamaClient();
    
    // Check latest work
    const snapshot = await client.getLatestSnapshot();
    if (snapshot) {
        console.log(`Last: ${snapshot.title}`);
        console.log(`Next: ${snapshot.nextSteps.join(', ')}`);
    }
    
    // Run doctor
    const health = await client.runCommand('doctor', '--json');
    if (health.success) {
        const status = JSON.parse(health.stdout);
        console.log(`Health: ${status.status}`);
    }
})();
```

---

**Next**: Understand internals in [Internals](internals.md) →