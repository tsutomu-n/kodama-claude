# API Reference

🔴 **Difficulty**: Advanced | **Read time**: 3 minutes

Complete technical reference for KODAMA Claude's 3 commands.

## Command Reference

### `kc go`

Start or continue Claude session with context injection.

```bash
kc go [options]
```

**Options:**
| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--title <title>` | `-t` | Session title | Previous title |
| `--step <step>` | `-s` | Workflow step | Previous step |
| `--no-send` | | Skip context injection | false |
| `--debug` | `-d` | Debug output | false |

**Workflow steps:**
- `designing` - Planning phase
- `implementing` - Coding phase
- `testing` - Testing phase
- `done` - Completed

**Exit codes:**
- `0` - Success
- `1` - Claude not found
- `2` - Context injection failed

### `kc save`

Save snapshot and optionally paste to clipboard.

```bash
kc save [options]
```

**Options:**
| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--title <title>` | `-t` | Snapshot title | Interactive prompt |
| `--step <step>` | `-s` | Workflow step | Interactive prompt |
| `--stdin` | | Read from stdin | false |
| `--file <path>` | | Read from file | Interactive mode |
| `--yes` | `-y` | Skip prompts | false |
| `--copy <mode>` | | Copy mode | auto |

**Copy modes:**
- `auto` - Detect best method
- `clipboard` - System clipboard
- `osc52` - Terminal protocol
- `file` - Temp file
- `none` - No copy

**Exit codes:**
- `0` - Success
- `1` - Save failed
- `2` - Copy failed (save succeeded)

### `kc status`

Check session health status.

```bash
kc status [options]
```

**Options:**
| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--json` | `-j` | JSON output | false |
| `--strict` | `-s` | Exit 1 on danger | false |

**Output format (default):**
```
<emoji> | basis: <source> | hint: <message>
```

**JSON output:**
```json
{
  "level": "healthy|warning|danger|unknown",
  "basis": "transcript|heuristic|no_session",
  "lastSnapshot": {
    "id": "uuid",
    "title": "string",
    "ageHours": 2.5
  },
  "suggestion": "string",
  "autoAction": "snapshot|none"
}
```

**Health levels:**
| Level | Emoji | Condition | Action |
|-------|-------|-----------|--------|
| `healthy` | 🟢 | < 50% context | Keep working |
| `warning` | 🟡 | 50-80% or 2+ hours | Save soon |
| `danger` | 🔴 | > 80% context | Save immediately |
| `unknown` | ❓ | No session data | Start with `kc go` |

## Environment Variables

### Language & Debug
```bash
export KODAMA_LANG=ja           # Japanese messages
export KODAMA_DEBUG=true        # Debug output
```

### Smart Features
```bash
export KODAMA_NO_LIMIT=true     # Show all decisions (not just 5)
export KODAMA_AUTO_ARCHIVE=false # Disable 30-day auto-archive
export KODAMA_CLAUDE_SYNC=true  # Enable CLAUDE.md sync
```

## File Structure

```
~/.local/share/kodama-claude/
├── snapshots/              # JSON snapshot files
│   ├── <uuid>.json        # Individual snapshots
│   └── archive/           # Auto-archived (30+ days)
├── events.jsonl           # Append-only event log
└── .session              # Current session ID
```

### Snapshot JSON Schema

```typescript
interface Snapshot {
  version: "1.0.0";
  id: string;           // UUID v4
  title: string;
  timestamp: string;    // ISO 8601
  step?: "designing" | "implementing" | "testing" | "done";
  context?: string;
  decisions: string[];
  nextSteps: string[];
  cwd?: string;         // Working directory
  gitBranch?: string;
  gitCommit?: string;
}
```

### Event Log Schema

```typescript
interface Event {
  timestamp: string;    // ISO 8601
  type: "snapshot" | "start" | "protect" | "archive";
  data: {
    snapshotId?: string;
    title?: string;
    autoAction?: boolean;
  };
}
```

## File Permissions

All files created with secure permissions:

| Type | Permission | Octal |
|------|------------|-------|
| Directories | `drwx------` | 700 |
| Files | `-rw-------` | 600 |

## Integration Examples

### Bash Function
```bash
kc-morning() {
  cd ~/projects/"$1"
  kc go -t "Morning: $1"
}
```

### Git Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit
if [ "$(kc status --json | jq -r .level)" = "danger" ]; then
  echo "Auto-saving" | kc save --stdin -y
fi
```

### CI/CD
```yaml
- name: Save context if critical
  run: kc status --strict || echo "CI" | kc save --stdin -y
```

## Error Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Claude not found |
| 3 | Storage error |
| 4 | Permission denied |
| 127 | Command not found |

---

**Note**: This reference covers v0.3.0 with the simplified 3-command structure.