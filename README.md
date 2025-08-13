# Kodama for Claude Code

[🇯🇵 日本語](README.ja.md) | [🌐 English](README.md)

**Unofficial extension for Claude Code CLI** - Smart restart, work tags, and one-key resume for Claude sessions.

> **What is Claude Code?** Anthropic's official terminal AI assistant. Writes, debugs, and refactors code using natural language. Can resume conversations with `--continue` / `--resume`, but **lacks structured storage for decisions and next steps**. Kodama solves this.

## Philosophy

> "Less is more" - Kodama only does what Kodama can uniquely do for Claude Code.

Kodama stores **human decision logs** in structured format. When `/clear` erases conversation history or sessions switch, **work context remains intact**.

## Quick Start

### One-liner Installation (Ubuntu/WSL)

```bash
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

> 📌 **Important**: Your snapshots and data are **fully preserved** during installation or updates.  
> Data stored in `~/.local/share/kodama-claude/` is never touched during binary updates.

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

### Core 3 Commands + Advanced Features

```bash
# Core workflow commands
kc go       # Start Claude (health check → inject → REPL)
kc save     # Save snapshot & paste
kc status   # Check health (🟢/🟡/🔴/❓)

# Advanced features (v0.4.0+)
kc restart  # Smart restart (/clear independent)
kc tags     # Manage work tags
kc resume   # One-key resume (save + go)
kc list     # List saved snapshots (v0.4.1+)

# Snapshot Management (v0.5.0+)
kc show     # Display detailed snapshot information
kc delete   # Safe snapshot deletion (with trash/restore)
kc restore  # Restore from trash (v0.5.1+)
kc search   # Full-text search across snapshots

# Maintenance
kc uninstall # Safe removal (preserves data by default)
```

Simple core, powerful when needed.

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

## New Features: Snapshot Management (v0.5.0)

### View Snapshots - `kc show`

**Basic Usage**
```bash
# Show the latest snapshot
kc show latest

# Display specific snapshot (partial ID matching)
kc show abc123  # No need to type the full UUID

# Show full details (complete context, no truncation)
kc show abc123 --verbose

# JSON output for scripts
kc show abc123 --json
```

**Junior Developer Examples**
```bash
# 🔰 Training example: Review yesterday's work
# 1. Check the latest work
$ kc show latest
📸 Snapshot: User authentication implementation
📅 Created: Aug 12, 17:30 (19 hours ago)
📊 Step: implementing
🏷️  Tags: auth, backend

📝 What we accomplished:
• Implemented JWT token generation and validation
• Created user registration and login endpoints
• Used bcrypt for password hashing

💡 Decisions made:
• Access token expiry set to 30 minutes
• Refresh tokens valid for 7 days

⚡ Next steps:
• Implement logout functionality
• Add automatic token refresh
• Create unit tests

# 2. Get more details if needed
$ kc show abc123 --verbose
# Shows complete context (no truncation)
```

### Delete Snapshots - `kc delete`

**Basic Usage**
```bash
# Delete single snapshot (moves to trash)
kc delete abc123

# Delete multiple snapshots at once
kc delete abc123 def456 ghi789

# Bulk delete old snapshots
kc delete --older-than 7d    # Older than 7 days
kc delete --older-than 2w    # Older than 2 weeks
kc delete --older-than 1m    # Older than 1 month

# Check trash contents
kc delete --list-trash

# Restore from trash
kc delete --restore abc123

# Empty trash
kc delete --empty-trash
```

**Junior Developer Examples**
```bash
# 🔰 Training example: Project cleanup after completion
# 1. Check current snapshots
$ kc list -n 10
📚 Recent snapshots (3/3 shown):

1. Project completion report
   📅 Aug 13, 18:00 (1 hour ago)
   📊 Step: done

2. Test implementation
   📅 Aug 13, 16:30 (3 hours ago)
   📊 Step: testing

3. Experimental implementation (failed)
   📅 Aug 13, 10:00 (9 hours ago)
   📊 Step: implementing

# 2. Delete the failed experimental implementation
$ kc delete c4d56789  # Use partial ID
✅ Moved snapshot 'c4d56789...' to trash

# 3. If deleted by mistake, you can restore
$ kc delete --restore c4d56789
✅ Restored snapshot 'c4d56789...' from trash

# 4. Clean up old working snapshots
$ kc delete --older-than 1w
⚠️  7 snapshots will be deleted:
- "Initial research notes" (Aug 5)
- "Environment setup trials" (Aug 6)
...
[y/N] Delete these snapshots? y
✅ Moved 7 snapshots to trash
```

### Search Snapshots - `kc search`

**Basic Usage**
```bash
# Search titles only (fast)
kc search "auth feature"

# Full-text search (includes context and decisions)
kc search "JWT" --full-text

# Search by tags
kc search --tags "auth,backend"

# Regular expression search (advanced)
kc search "API.*endpoint" --regex

# Search with time filters
kc search "bug fix" --since "1w"  # Within last week
kc search "feature" --until "2d"   # Up to 2 days ago

# JSON output for scripts
kc search "auth" --json
```

**Junior Developer Examples**
```bash
# 🔰 Training example: Learning from past work
# 1. Find authentication-related work
$ kc search "auth"
🔍 Search results for "auth" (2 matches found)

1. User authentication implementation
   📅 Aug 12, 17:30 (relevance: 95%)
   📊 Step: implementing
   🏷️  Tags: auth, backend
   
   💡 Highlight: "User authentication feature with JWT tokens..."

2. Authentication error handling improvement
   📅 Aug 10, 14:20 (relevance: 87%)
   📊 Step: done
   🏷️  Tags: auth, bugfix

# 2. More specific search (full-text)
$ kc search "JWT" --full-text
🔍 Search results for "JWT" (3 matches found)

1. User authentication implementation
   💬 Decision: "JWT token expiry set to 30 minutes"
   💬 Context: "...Chose RS256 algorithm for JWT implementation..."

# 3. Search work from specific timeframe
$ kc search "bug fix" --since "1w"
🔍 "bug fix" in the last week (1 match found)

1. Login timeout bug fix
   📅 Aug 11, 09:15
   🏷️  Tags: bugfix, auth

# 4. Multi-tag filtered search
$ kc search --tags "backend,api"
🔍 Tag search: backend,api (4 matches found)
...
```

### Enhanced List Display - `kc list`

**New Filter Features**
```bash
# Show only today's work
kc list --today

# Check yesterday's work
kc list --yesterday

# Review this week's work
kc list --this-week

# Specific time periods
kc list --since "3d"        # From 3 days ago
kc list --until "1w"        # Up to 1 week ago
kc list --since "2024-08-10" --until "2024-08-12"

# Filter by tags
kc list --tags "auth"       # Auth-related work only
kc list --tags "auth,api"   # Auth or API related

# Change sorting
kc list --sort title        # Sort by title
kc list --sort step         # Sort by workflow step
kc list --reverse           # Reverse order
```

**Junior Developer Examples**
```bash
# 🔰 Training example: Daily and weekly reviews
# 1. Review today's work
$ kc list --today
📚 Today's snapshots (3 shown):

1. Added unit tests
   📅 Aug 13, 16:45 (2 hours ago)
   📊 Step: testing
   🏷️  Tags: test, auth

2. Auth API endpoint implementation
   📅 Aug 13, 14:20 (4 hours ago)
   📊 Step: implementing
   🏷️  Tags: api, auth

3. Morning standup notes
   📅 Aug 13, 09:00 (9 hours ago)
   📊 Step: designing

# 2. Prepare weekly report
$ kc list --this-week --tags "backend"
📚 This week's backend work:
...

# 3. Track specific feature development
$ kc list --tags "auth" --sort date
📚 Authentication feature timeline:
1. Auth initial research (Aug 8)
2. JWT implementation start (Aug 9)
3. Auth tests added (Aug 10)
4. Auth completed (Aug 12)
```

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

Kodama for Claude Code starts with **3 simple commands** and adds powerful features when you need them:

### Core Commands

**`kc go`** - Start Claude Session  
Automatically loads your past context and starts Claude

**`kc save`** - Save & Paste  
Saves your work as a snapshot and copies to clipboard
```bash
kc save --tags "feature,auth"  # Add work tags
```

**`kc status`** - Health Status  
Shows session health (🟢 healthy / 🟡 warning / 🔴 danger / ❓ unknown)

### Advanced Features (v0.4.0+)

**`kc restart`** - Smart Restart  
/clear-independent restart with context preservation
```bash
kc restart          # Smart restart with context
kc restart --force  # Force restart even with warnings
```

**`kc tags`** - Work Tag Management  
Organize and filter your work with intelligent tagging
```bash
kc tags --list              # List all tags with usage counts
kc tags --filter "auth,api" # Filter snapshots by tags
kc tags --stats             # Show tag statistics
kc tags --suggest "fea"     # Suggest tags ("feature")
```

**`kc resume`** - One-Key Resume  
Quick resume with optional save (combines save + go)
```bash
kc resume                                    # Interactive resume
kc resume -m "Fixed auth bug" -t "bugfix"   # Quick resume with update
kc resume --no-save                          # Just resume, don't save
```

📚 **[Detailed Command Reference →](docs/en/command-details.md)**
- All options and parameters
- Copy modes explained (auto/clipboard/osc52/file/none)
- Workflow steps usage
- Practical examples

## Features

### What Kodama Does

✅ **Session health tracking** - Monitor token usage and get warnings  
✅ **Auto-protection** - Automatic snapshots when context usage is critical  
✅ **Smart restart** - /clear-independent restart with context preservation  
✅ **Work tags** - Organize snapshots with intelligent tagging and suggestions  
✅ **One-key resume** - Quick resume workflow (save + go in one command)  
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
  "gitCommit": "abc123",
  "tags": ["feature", "auth", "api"]
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

## What's New

### v0.5.0 (2025-08-13)
- **New `kc show` command** - Display detailed snapshot information (partial ID matching, JSON output)
- **New `kc delete` command** - Safe deletion with trash/restore functionality and bulk operations
- **New `kc search` command** - Full-text search (title, full-text, tag, regex search with time filters)
- **Enhanced `kc list`** - Time filters (today, yesterday, this week), tag filters, sorting options
- **Security hardening** - Comprehensive security measures across all new commands (DoS protection, input validation, control character removal)

### v0.4.1 (2025-08-13)
- **New `kc list` command** - View your saved snapshots with titles, timestamps, and tags
- **Security hardening** - 8 security fixes including path traversal prevention and DoS protection
- **Performance improvements** - Optimized file handling with 1000-item limit

### v0.4.0 (2025-08-12)
- **Smart Restart** - Context preservation independent of /clear command
- **Work Tags** - Organize and find your work with semantic tags
- **One-Key Resume** - Combined save + restart for rapid iteration

See [CHANGELOG.md](CHANGELOG.md) for full release history.

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

**Q: Are my snapshots deleted during installation/updates?**  
A: No. Kodama Claude is designed to never touch user data during installation or updates. All snapshots are safely stored in `~/.local/share/kodama-claude/` and are unaffected by binary updates. Data deletion requires explicit commands like `kc uninstall --remove-all`.

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