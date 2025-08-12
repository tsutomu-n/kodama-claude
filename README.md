# Kodama for Claude Code

[🇯🇵 日本語](README.ja.md) | [🌐 English](README.md)

**Unofficial extension for Claude Code CLI** - Persistent context & smart restart for Claude Code.

> **What is Claude Code?** Anthropic's official terminal AI assistant. Writes, debugs, and refactors code using natural language. Can resume conversations with `--continue` / `--resume`, but **lacks structured storage for decisions and next steps**. Kodama solves this.

## Philosophy

> "Less is more" - Kodama only does what Kodama can uniquely do for Claude Code.

Kodama stores **human decision logs** in structured format. When `/clear` erases conversation history or sessions switch, **work context remains intact**.

## Quick Start

### One-liner Installation (Ubuntu/WSL)

```bash
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

**What it does:**
- Automatically detects and removes old versions (v0.1.0, v0.2.0)
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

> **Upgrading from older versions?** See the [Migration Guide](docs/en/migration.md)

## Uninstallation

Kodama for Claude Code provides a safe, user-friendly uninstaller that preserves your data by default.

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
sudo rm -f /usr/local/bin/kc

# Remove data (optional)  
rm -rf ~/.local/share/kodama-claude

# Remove config (optional)
rm -rf ~/.config/kodama-claude
```

## Usage

### Core 3 Commands + Uninstall

```bash
# Core workflow commands
kc go       # Start Claude (health check → inject → REPL)
kc save     # Save snapshot & paste
kc status   # Check health (🟢/🟡/🔴/❓)

# Maintenance
kc uninstall # Safe removal (preserves data by default)
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
export Kodama_LANG=ja
kc go

# Permanent
# Bash
echo 'export Kodama_LANG=ja' >> ~/.bashrc
source ~/.bashrc

# Zsh
echo 'export Kodama_LANG=ja' >> ~/.zshrc
source ~/.zshrc

# XDG compliant (systemd environments)
mkdir -p ~/.config/environment.d
echo 'Kodama_LANG=ja' >> ~/.config/environment.d/kodama.conf
# Relogin to apply
```

Auto-detects Japanese from system locale.

## Commands

Kodama for Claude Code uses just **3 simple commands**:

### `kc go` - Start Claude Session
Automatically loads your past context and starts Claude

### `kc save` - Save & Paste
Saves your work as a snapshot and copies to clipboard

### `kc status` - Health Status  
Shows session health (🟢 healthy / 🟡 warning / 🔴 danger / ❓ unknown)

📚 **[Detailed Command Reference →](docs/en/command-details.md)**
- All options and parameters
- Copy modes explained (auto/clipboard/osc52/file/none)
- Workflow steps usage
- Practical examples

## Features

### What Kodama Does

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

### What Kodama Doesn't Do

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

> 💡 **Note**: Kodama works without these packages. If unavailable, it falls back to:
> - OSC52 terminal clipboard protocol
> - Temporary files for context passing
> - Console output instead of notifications

### Storage Location

XDG Base Directory compliant:

```
~/.local/share/kodama-claude/
├── snapshots/          # JSON snapshots (1-2KB each)
│   └── archive/        # Auto-archived after 30 days
├── events.jsonl        # Append-only event log
└── .session           # Current Claude session ID
```

**Storage usage**: ~5-15 MB per year. See [Storage Management](docs/en/storage-management.md) for details.

### File Permissions

Kodama follows security best practices for file permissions:

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
export Kodama_NO_LIMIT=true        # Show all decisions (default: 5 only)
export Kodama_AUTO_ARCHIVE=false   # Disable auto-archive
export Kodama_ARCHIVE_DAYS=14      # Archive after 14 days (default: 30)
export Kodama_MAX_DECISIONS=10     # Keep 10 decisions (default: 5)
export Kodama_CLAUDE_SYNC=true     # Enable CLAUDE.md auto-update
export Kodama_DEBUG=true           # Show debug information
export Kodama_LANG=ja              # Japanese error messages
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
A: Claude doesn't reliably expose this. We use heuristic-based 4-value status (🟢/🟡/🔴/❓) instead.

**Q: Why use snapshots instead of Git?**  
A: Git and snapshots are complementary:

| Aspect | Git | Kodama Snapshots |
|--------|-----|------------------|
| Purpose | Track code changes | Save work context |
| Content | File diffs | Decisions, thoughts, next steps |
| When to use | Commit completed features | Pause/resume work |
| Persistence | Permanent | Session-based (auto-archives after 30 days) |

**Q: Why Bun instead of Node.js?**  
A: Single binary distribution, faster startup, better DX.

**Q: Why not integrate with VS Code?**  
A: Kodama is editor-agnostic. Use it with any editor.

**Q: Can I sync snapshots across machines?**  
A: Put `~/.local/share/kodama-claude` in a Git repo or use symlinks.

## License

MIT

## Author

For developers who value simplicity over features.

---

**Remember**: The best tool is the one you actually use. Kodama aims to be that tool.