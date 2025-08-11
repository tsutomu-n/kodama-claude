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

**What it does:**
- Downloads correct binary for your architecture
- Verifies SHA256 checksum
- Installs to `/usr/local/bin/kc`
- Shows 3 commands to get started

### Manual Installation

1. Download the binary for your architecture:
   - Linux x64: `kc-linux-x64`
   - Linux ARM64: `kc-linux-arm64`

2. Make it executable and add to PATH:

```bash
chmod +x kc-linux-x64
sudo mv kc-linux-x64 /usr/local/bin/kc
```

## ⚠️ Migration from v0.1.0 to v0.3.0

**Breaking Changes:** v0.3.0 completely redesigned the command structure.

### Old Commands (v0.1.0) → New Commands (v0.3.0)
```bash
# Old → New
kc snap     → kc save
kc check    → kc status
kc send     → (integrated into kc save)
kc plan     → (removed - auto-displayed)
kc doctor   → kc status
```

### If you have v0.1.0 installed
```bash
# 1. Uninstall old version
sudo rm /usr/local/bin/kc

# 2. Install new version
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash

# 3. Verify version
kc --version  # Should show 0.3.0
```

### Known Issue with v0.1.0
If you see error `unknown option '--system'`, you have v0.1.0. Please upgrade.

## Uninstallation

KODAMA Claude provides a safe, user-friendly uninstaller that preserves your data by default.

### Quick Uninstall (keeps your snapshots)
```bash
kc uninstall
# or
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/uninstall.sh | bash
```

### Complete Removal (including all data)
```bash
kc uninstall --remove-all
# or
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/uninstall.sh | bash -s -- --remove-all
```

### Uninstall Options
- `--remove-all` - Remove all data including snapshots
- `--backup` - Create backup before removing data
- `--dry-run` - Preview what will be removed
- `--force` - Skip confirmation prompts

### What Gets Removed
```
Default (safe mode):
✓ Binary: /usr/local/bin/kc
✗ Kept: ~/.local/share/kodama-claude/ (your snapshots)

With --remove-all:
✓ Binary: /usr/local/bin/kc
✓ Data: ~/.local/share/kodama-claude/
✓ Config: ~/.config/kodama-claude/
```

### Manual Uninstall
```bash
# Remove binary
sudo rm /usr/local/bin/kc

# Remove data (optional)
rm -rf ~/.local/share/kodama-claude
```

## Usage

### Only 3 Commands

```bash
kc go       # Start Claude (health check → inject → REPL)
kc save     # Save snapshot & paste
kc status   # Check health (🟢/🟡/🔴/❓)
```

That's it. No complex workflows. No feature creep. No cognitive overhead.

### Example: Adding an API Endpoint

```bash
# 1. Morning: Resume work
$ kc go
# → Automatically checks health: 🟢 Healthy
# → Loads context: "Auth API design, JWT tokens, 30-min expiry"
# → Starts Claude session with protection enabled

# 2. Work with Claude
$ # Claude continues implementation based on previous decisions

# 3. After 2 hours: Check if snapshot needed (optional)
$ kc status
# → 🟡 Warning: Consider taking a snapshot

# 4. Save progress
$ kc save -t "Auth API implementation complete"

# 5. Commit to Git (track actual code changes)
$ git add .
$ git commit -m "feat: Add JWT authentication endpoint"
```

### When to Use Each Command

- **`kc go`**: Starting work for the day or resuming after a break (full auto)
- **`kc save`**: When switching tasks, taking breaks, or prompted
- **`kc status`**: Check health state (use --strict in CI/CD)

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

### `kc go` - Start Claude Session

```bash
kc go [options]
  -t, --title <title>    Session title
  -s, --step <step>      Workflow step (designing/implementing/testing/done)
  --no-send              Skip context injection (check only)
```

**Actions:**
1. Health check with auto-protection
2. Inject context with `claude -c -p`
3. Open REPL with `claude --continue`

### `kc save` - Save & Paste

```bash
kc save [options]
  -t, --title <title>    Snapshot title
  -s, --step <step>      Workflow step
  --stdin                Read from stdin
  --file <path>          Read from file
  -y, --yes              Skip prompts
  --copy <mode>          auto|clipboard|osc52|file|none (default: auto)
```

**Interactive mode** (default):
- Title, step, accomplishments, decisions, next steps
- EOF: Unix/Mac = Ctrl+D, WSL = Ctrl+Z
- Prompts to paste after saving

### `kc status` - Health Status

```bash
kc status [options]
  -j, --json             JSON output
  -s, --strict           Exit 1 when dangerous (for CI/CD)
```

**Output:** `🟢 | basis: transcript | hint: no action needed`

## Features

### What KODAMA Does

✅ **Session health tracking** - Monitor token usage and get warnings  
✅ **Auto-protection** - Automatic snapshots when context usage is critical  
✅ **Atomic file operations** - Never lose data, even on power loss  
✅ **Proper file locking** - Safe concurrent access  
✅ **XDG compliance** - Respects Linux directory standards  
✅ **Single binary** - No runtime dependencies for core features  
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

### Runtime Dependencies

**Required**: None (single binary runs standalone)

**Optional** (for enhanced features):
- **Clipboard integration**: 
  - Linux X11: `xclip` or `xsel`
  - Linux Wayland: `wl-clipboard`
  - macOS: `pbcopy` (built-in)
  - Windows/WSL: `clip.exe`
- **Desktop integration**:
  - Linux: `xdg-utils` (for opening files)
  - All: `notify-send` (for desktop notifications)

> 💡 **Note**: KODAMA works without these packages. If unavailable, it falls back to:
> - OSC52 terminal clipboard protocol
> - Temporary files for context passing
> - Console output instead of notifications

### Storage Location

XDG Base Directory compliant:

```
~/.local/share/kodama-claude/
├── snapshots/          # JSON snapshots
│   └── archive/        # Auto-archived after 30 days
├── events.jsonl        # Append-only event log
└── .session           # Current Claude session ID
```

### File Permissions

KODAMA follows security best practices for file permissions:

| Path | Permission | Description |
|------|------------|-------------|
| `~/.local/share/kodama-claude/` | `700` (drwx------) | Main data directory |
| `snapshots/` | `700` (drwx------) | Snapshots directory |
| `snapshots/archive/` | `700` (drwx------) | Archive directory |
| `*.json` files | `600` (-rw-------) | Snapshot files |
| `events.jsonl` | `600` (-rw-------) | Event log |
| `.session` | `600` (-rw-------) | Session ID |

**Security notes:**
- All directories are created with `700` (owner-only access)
- All files are created with `600` (owner read/write only)
- No group or world permissions are granted
- Files are written atomically with fsync for data integrity

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

**Q: Why only 3 commands?**  
A: Junior developers need simplicity. Everything else is automated or integrated.

**Q: Where did snap/check/send/plan go?**  
A: Integrated into the 3 core commands:
- `snap` → `save` (better name)
- `check` → `status` (clearer)
- `send` → integrated into `save`'s paste prompt
- `plan` → auto-displayed in `go` and `save`

**Q: What is two-stage execution?**  
A: `kc go` uses `claude -c -p "<context>"` to inject, then `claude --continue` to open REPL. Most reliable method per official docs.

**Q: Why no token percentages?**  
A: Claude CLI doesn't reliably expose this. We use heuristic-based 4-value status (🟢/🟡/🔴/❓) instead.

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