# KODAMA Claude

[日本語](README_ja.md) | **English**

Minimal Claude Code CLI extension for persistent dialogue memory.

## Philosophy

> "Less is more" - KODAMA only does what KODAMA can uniquely do for Claude Code CLI.

KODAMA Claude is a lightweight tool that solves one specific problem: **Claude Code CLI doesn't remember context between sessions**. We fix that with just 4 simple commands.

## Quick Start

### One-liner Installation (Ubuntu/WSL)

```bash
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

### Manual Installation

1. Download the binary for your architecture:
   - Linux x64: `kc-linux-x64`
   - Linux ARM64: `kc-linux-arm64`

2. Make it executable and add to PATH:

```bash
chmod +x kc-linux-x64
sudo mv kc-linux-x64 /usr/local/bin/kc
```

## Usage

### Just Three Commands

```bash
# 1. Save your work context
kc snap

# 2. Continue where you left off
kc go

# 3. Plan your next steps  
kc plan
```

That's it. No complex workflows, no feature creep, no cognitive overhead.

## Commands

### `kc go` - Start or Continue

The main command. Automatically:
- Loads your latest context
- Starts or continues Claude session
- Saves a snapshot for next time

```bash
kc go
kc go -t "Adding user authentication"
kc go -s implementing
```

### `kc snap` - Create Snapshot

Interactive snapshot creation to capture:
- What you've accomplished
- Key decisions made
- Next steps planned

```bash
kc snap
kc snap -t "API design complete"
```

### `kc plan` - Structure Next Steps

Plan your development workflow:
- Set goals
- Define tasks
- Note considerations

```bash
kc plan
kc plan -t "Database migration strategy"
```

### `kc send` - Send Context

Send saved context to Claude when `kc go` isn't enough:

```bash
kc send                    # Send latest snapshot
kc send <snapshot-id>      # Send specific snapshot
```

### `kc doctor` - Health Check

Verify everything is working:

```bash
kc doctor
```

## Features

### What KODAMA Does

✅ **Atomic file operations** - Never lose data, even on power loss  
✅ **Proper file locking** - Safe concurrent access  
✅ **XDG compliance** - Respects Linux directory standards  
✅ **Zero dependencies** - Single binary, no npm/pip/cargo  
✅ **Git aware** - Tracks branch and commit context  

### What KODAMA Doesn't Do

❌ No cloud sync (use Git)  
❌ No complex workflows (use existing tools)  
❌ No UI (CLI only)  
❌ No AI features (Claude does that)  
❌ No project management (use GitHub/Jira)  

## Technical Details

### Storage Location

Following XDG Base Directory specification:

```
~/.local/share/kodama-claude/
├── snapshots/          # JSON snapshots
├── events.jsonl        # Append-only event log
└── .session           # Current Claude session ID
```

### Snapshot Format

```json
{
  "version": "1.0.0",
  "id": "uuid-here",
  "title": "Feature implementation",
  "timestamp": "2024-01-01T00:00:00Z",
  "step": "implementing",
  "context": "What we've done...",
  "decisions": ["Use PostgreSQL", "..."],
  "nextSteps": ["Add tests", "..."],
  "cwd": "/home/user/project",
  "gitBranch": "feature/auth",
  "gitCommit": "abc123"
}
```

## Building from Source

Requirements:
- Bun >= 1.0.0

```bash
# Clone repository
git clone https://github.com/tsutomu-n/kodama-claude
cd kodama-claude

# Install dependencies
bun install

# Build binary
bun run build:all

# Binaries will be in dist/
ls dist/
```

## Design Principles

1. **Junior Developer First** - If a junior dev can't use it in 30 seconds, it's too complex
2. **Do One Thing Well** - Persist Claude dialogue memory, nothing else
3. **Fail Gracefully** - Multiple fallback strategies for every operation
4. **Zero Friction** - No configuration, no setup, just works

## FAQ

**Q: Why not use Claude's built-in --continue flag?**  
A: It doesn't preserve context structure, decisions, or project state.

**Q: Why Bun instead of Node.js?**  
A: Single binary distribution, faster startup, better DX.

**Q: Why not integrate with VS Code?**  
A: KODAMA is editor-agnostic. Use it with any editor.

**Q: Can I sync snapshots across machines?**  
A: Put `~/.local/share/kodama-claude` in a Git repo or use symlinks.

## License

MIT

## Author

Created for developers who value simplicity over features.

---

**Remember**: The best tool is the one you actually use. KODAMA Claude is designed to be that tool.