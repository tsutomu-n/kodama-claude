# KODAMA Claude

[日本語](README_ja.md) | **English**

Minimal Claude Code CLI extension for persistent dialogue memory.

> **What is Claude Code CLI?** Anthropic's official terminal AI assistant. Writes, debugs, and refactors code using natural language. Can resume conversations with `--continue` / `--resume`, but **lacks structured storage for decisions and next steps**. KODAMA solves this.

## Philosophy

> "Less is more" - KODAMA only does what KODAMA can uniquely do for Claude Code CLI.

KODAMA stores **human decision logs** in structured format. When `/clear` erases conversation history or sessions switch, **work context remains intact**.

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

That's it. No complex workflows. No feature creep. No cognitive overhead.

### Example: Adding an API Endpoint

```bash
# 1. Morning: Resume previous work
$ kc go
# → Claude recognizes "Auth API design, JWT tokens, 30-min expiry"

# 2. Work with Claude
$ # Claude continues implementation based on previous decisions

# 3. Save progress
$ kc snap -t "Auth API implementation complete"

# 4. Commit to Git (track actual code changes)
$ git add .
$ git commit -m "feat: Add JWT authentication endpoint"
```

Claude gets context. Git tracks code.

## Language Support

### Japanese Interface

Set language to Japanese:

```bash
# Temporary
export KODAMA_LANG=ja
kc go

# Permanent
# Bash
echo 'export KODAMA_LANG=ja' >> ~/.bashrc
source ~/.bashrc

# Zsh
echo 'export KODAMA_LANG=ja' >> ~/.zshrc
source ~/.zshrc

# XDG compliant (systemd environments)
mkdir -p ~/.config/environment.d
echo 'KODAMA_LANG=ja' >> ~/.config/environment.d/kodama.conf
# Relogin to apply
```

Auto-detects Japanese from system locale.

## Commands

### `kc go` - Start or Continue

Main command:
- Loads latest context
- Starts/continues Claude session
- Saves snapshot

```bash
kc go
kc go -t "Adding user authentication"
kc go -s implementing
```

### `kc snap` - Create Snapshot

Interactive snapshot:
- Accomplishments
- Key decisions
- Next steps

```bash
kc snap
kc snap -t "API design complete"
```

### `kc plan` - Structure Next Steps

Plan workflow:
- Goals
- Tasks
- Considerations

```bash
kc plan
kc plan -t "Database migration strategy"
```

### `kc send` - Send Context

Send saved context to existing sessions:

```bash
kc send                    # Send latest snapshot
kc send <snapshot-id>      # Send specific snapshot
```

### `kc doctor` - Health Check

Verify system:

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
✅ **Smart context management** - Auto-limits decisions to latest 5  
✅ **Auto-archive** - Automatically organizes snapshots older than 30 days  
✅ **CLAUDE.md sync** - Auto-syncs AI context (opt-in)  

### What KODAMA Doesn't Do

❌ No cloud sync (use Git)  
❌ No complex workflows (use existing tools)  
❌ No UI (CLI only)  
❌ No AI features (Claude does that)  
❌ No project management (use GitHub/Jira)  

## Technical Details

### Storage Location

XDG Base Directory compliant:

```
~/.local/share/kodama-claude/
├── snapshots/          # JSON snapshots
│   └── archive/        # Auto-archived after 30 days
├── events.jsonl        # Append-only event log
└── .session           # Current Claude session ID
```

### Environment Variables

```bash
# Smart context management controls
export KODAMA_NO_LIMIT=true        # Disable 5-decision limit
export KODAMA_AUTO_ARCHIVE=false   # Disable auto-archive  
export KODAMA_CLAUDE_SYNC=true     # Enable CLAUDE.md auto-update
export KODAMA_DEBUG=true           # Show debug information
export KODAMA_LANG=ja              # Japanese error messages
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

**Q: Why not use Claude's built-in `--continue` / `--resume` flags?**  
A: Claude Code can resume conversation history, but `/clear` erases **conversation history** (while **long-term memory** like CLAUDE.md remains). Community reports show response quality degradation in long sessions. KODAMA **structures and externally stores decisions and next steps**, preserving **human work context** even after `/clear` or session switches.

**Q: Why use snapshots instead of Git?**  
A: Git and snapshots are complementary:

| Aspect | Git | KODAMA Snapshots |
|--------|-----|------------------|
| Purpose | Track code changes | Save work context |
| Content | File diffs | Decisions, thoughts, next steps |
| When to use | Commit completed features | Pause/resume work |
| Persistence | Permanent | Session-based (auto-archives after 30 days) |

**Q: Why Bun instead of Node.js?**  
A: Single binary distribution, faster startup, better DX.

**Q: Why not integrate with VS Code?**  
A: KODAMA is editor-agnostic. Use it with any editor.

**Q: Can I sync snapshots across machines?**  
A: Put `~/.local/share/kodama-claude` in a Git repo or use symlinks.

## License

MIT

## Author

For developers who value simplicity over features.

---

**Remember**: The best tool is the one you actually use. KODAMA aims to be that tool.