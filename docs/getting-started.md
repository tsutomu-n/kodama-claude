# Getting Started with KODAMA Claude

🟢 **Difficulty**: Beginner | **Read time**: 10 minutes

This guide helps you install and start using KODAMA Claude.

## Table of Contents
- [What is KODAMA Claude?](#what-is-kodama-claude)
- [Before You Start](#before-you-start)
- [Installation](#installation)
- [First Time Setup](#first-time-setup)
- [Your First Command](#your-first-command)
- [Next Steps](#next-steps)

## What is KODAMA Claude?

KODAMA Claude helps Claude CLI remember your work between sessions.

### The Problem
When you close Claude CLI, it forgets everything:
- What you were working on
- What decisions you made
- What to do next

### The Solution
KODAMA Claude saves your context so you can:
```
Day 1: Work on feature → Save with KODAMA
Day 2: KODAMA loads context → Continue exactly where you stopped
```

### Simple Workflow Diagram
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   You work  │ --> │  kc save    │ --> │   Context   │
│ with Claude │     │ (save work) │     │   saved!    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Continue   │ <-- │   kc go     │ <-- │ Next day... │
│   working   │     │(load & start)│     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Before You Start

### Requirements

You need these things on your computer:

| What | Version | How to check | How to install |
|------|---------|--------------|----------------|
| **Linux/WSL** | Any | `uname -a` | [WSL Guide](https://docs.microsoft.com/windows/wsl/install) |
| **Claude CLI** | Latest | `claude --version` | [Claude Docs](https://claude.ai/cli) |
| **Bash** | 4.0+ | `bash --version` | Usually pre-installed |
| **curl** | Any | `curl --version` | `sudo apt install curl` |

### Check Your System

Run this command to check everything:
```bash
# Check all requirements at once
uname -a && claude --version && bash --version && curl --version
```

✅ **Good output** looks like:
```
Linux hostname 5.15.0 ...
Claude CLI version 0.x.x
GNU bash, version 5.x.x ...
curl 7.x.x ...
```

❌ **If something is missing**, install it first.

## Optional Dependencies

While KODAMA works standalone, these packages enhance the experience:

### Clipboard Support

For better clipboard integration, install one of these:

**Ubuntu/Debian (X11)**:
```bash
sudo apt install xclip
# or
sudo apt install xsel
```

**Ubuntu/Debian (Wayland)**:
```bash
sudo apt install wl-clipboard
```

**Fedora/RHEL**:
```bash
sudo dnf install xclip    # For X11
sudo dnf install wl-clipboard  # For Wayland
```

**Arch Linux**:
```bash
sudo pacman -S xclip    # For X11
sudo pacman -S wl-clipboard  # For Wayland
```

**macOS**: Built-in `pbcopy` is already available.

**Windows (WSL)**: `clip.exe` is already available.

### Desktop Notifications

For desktop notifications (optional):
```bash
# Ubuntu/Debian
sudo apt install libnotify-bin

# Fedora/RHEL
sudo dnf install libnotify

# Arch Linux
sudo pacman -S libnotify
```

### File Opening Support

For opening files with default applications:
```bash
# Usually pre-installed, but if missing:
sudo apt install xdg-utils  # Ubuntu/Debian
sudo dnf install xdg-utils  # Fedora
```

> 💡 **Note**: KODAMA works without these packages. It will:
> - Use OSC52 terminal protocol for clipboard (works in most modern terminals)
> - Show messages in console instead of desktop notifications
> - Print file paths instead of opening them

## Installation

### Method 1: Quick Install (Recommended)

Copy and paste this one line:
```bash
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

What happens:
1. Downloads the installer
2. Gets the right version for your computer
3. Installs to `/usr/local/bin/kc`
4. Makes it executable
5. Checks it works

💡 **Tip**: The installer shows each step as it runs.

### Method 2: Manual Install

If you prefer to see what you're installing:

1. **Go to releases page**:
   ```bash
   # Open in browser
   xdg-open https://github.com/tsutomu-n/kodama-claude/releases/latest
   ```

2. **Download the right file**:
   - For most computers: `kc-linux-x64`
   - For ARM (Raspberry Pi, etc.): `kc-linux-arm64`
   
   Not sure which one?
   ```bash
   # Check your architecture
   uname -m
   # x86_64 = use x64
   # aarch64 = use arm64
   ```

3. **Install the file**:
   ```bash
   # Make it executable
   chmod +x kc-linux-x64
   
   # Move to system path
   sudo mv kc-linux-x64 /usr/local/bin/kc
   ```

4. **Check it works**:
   ```bash
   kc --version
   ```

### Method 3: Build from Source

🟡 For developers who want the latest code:

```bash
# Get the code
git clone https://github.com/tsutomu-n/kodama-claude
cd kodama-claude

# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Build
bun run build:all

# Install
sudo cp dist/kc-linux-x64 /usr/local/bin/kc
```

## First Time Setup

### Step 1: Check Installation

Check the status:
```bash
kc status
```

✅ **Good output**:
```
🟢 | basis: no_session | hint: no action needed
```

⚠️ **If you see errors**, check [Troubleshooting](troubleshooting.md).

### Step 2: Set Up Claude CLI

Claude Code uses OAuth authentication instead of API keys:
```bash
# First time setup - opens browser for authentication
claude

# Follow the prompts to:
# 1. Open browser and authenticate
# 2. Login with Claude.ai account or Anthropic Console
# 3. Authorize Claude Code access

# Test that it works
claude "Say hello"
```

**Note**: Claude Code stores authentication in your system's credential manager, not environment variables.

### Step 3: Understanding Storage

KODAMA saves files here:
```
~/.local/share/kodama-claude/
├── snapshots/        # Your saved contexts
│   └── archive/      # Auto-archived old snapshots (30+ days)
├── events.jsonl      # Activity log
└── .session          # Current Claude session
```

📝 **Note**: This follows Linux standards (XDG Base Directory).

### Step 4: Configure Smart Features (Optional)

KODAMA v0.2.0+ includes smart context management features:

```bash
# Check current settings (empty means default)
echo "KODAMA_NO_LIMIT=$KODAMA_NO_LIMIT"        # empty = false (5-decision limit ON)
echo "KODAMA_AUTO_ARCHIVE=$KODAMA_AUTO_ARCHIVE" # empty = true (archiving ON)
echo "KODAMA_CLAUDE_SYNC=$KODAMA_CLAUDE_SYNC"   # empty = false (sync OFF)

# Display with defaults shown
echo "Decision limit: ${KODAMA_NO_LIMIT:-false (shows only 5)}"
echo "Auto-archive: ${KODAMA_AUTO_ARCHIVE:-true (archives after 30 days)}"
echo "CLAUDE.md sync: ${KODAMA_CLAUDE_SYNC:-false (disabled)}"

# Optional: Enable CLAUDE.md integration
export KODAMA_CLAUDE_SYNC=true

# Create CLAUDE.md from template (in your project root)
cd ~/my-project  # Go to your project directory
cp /path/to/kodama-claude/templates/CLAUDE.md.example CLAUDE.md
# Or if you have KODAMA source code:
# cp ~/projects/kodama-claude/templates/CLAUDE.md.example ./CLAUDE.md

# Add to ~/.bashrc to persist settings
echo 'export KODAMA_CLAUDE_SYNC=true' >> ~/.bashrc
```

**What these features do:**
- **5-decision limit**: Reduces cognitive load by showing only recent decisions
- **Auto-archive**: Keeps workspace clean by archiving old snapshots
- **CLAUDE.md sync**: Maintains AI context across sessions automatically

## Your First Command

Let's try KODAMA with a simple example:

### 1. Start your first session
```bash
# Go to any project
cd ~/my-project

# Start KODAMA + Claude
kc go
```

What you'll see:
```
No previous context found. Starting fresh.
Starting Claude CLI...
```

### 2. Work with Claude
```bash
# Now you're in Claude. Try something:
> Help me create a README file
```

### 3. Save your work
When done, exit Claude (Ctrl+D), then:
```bash
# Save a snapshot
kc save
```

It will ask you questions:
```
? Title for this snapshot: Created README
? What step are you on? (designing/implementing/testing/done): implementing
? What did you accomplish? (Press Enter when done)
  > Created basic README structure
  > Added project description
  > 
? Decisions made? (Press Enter when done)
  > Use markdown format
  > Keep it simple
  >
? Next steps? (Press Enter when done)
  > Add installation section
  > Add usage examples
  >

✓ Snapshot saved: a1b2c3d4
```

### 4. Continue tomorrow
```bash
# Next day, just run:
kc go

# KODAMA loads your context and tells Claude:
# - What you did yesterday
# - What decisions you made  
# - What to do next
```

## Uninstalling KODAMA

If you need to uninstall KODAMA Claude:

### Method 1: Using Uninstall Command (Recommended)
```bash
# Keep your data (default)
kc uninstall

# Remove everything including data
kc uninstall --remove-all
```

### Method 2: Manual Uninstall
```bash
# Remove binary
sudo rm -f /usr/local/bin/kc

# Remove data (optional)
rm -rf ~/.local/share/kodama-claude

# Remove config (optional)
rm -rf ~/.config/kodama-claude
```

## Verify Everything Works

Run this test sequence:
```bash
# 1. Check version
kc --version

# 2. Check status
kc status

# 3. Create a test snapshot
echo "Test project" | kc save -t "Test snapshot" --stdin -y

# 4. Load it
kc go

# 5. Exit Claude (Ctrl+D)
```

If all commands work, you're ready! 🎉

## Next Steps

Now that KODAMA Claude is installed:

1. **Learn all commands** → [Usage Guide](usage-guide.md)
2. **See real examples** → [Examples](examples.md)
3. **Customize settings** → [Customization](customization.md)

## Quick Reference Card

Print this and keep it nearby:

```
┌─────────────────────────────────────────┐
│        KODAMA CLAUDE QUICK CARD         │
├─────────────────────────────────────────┤
│ kc go     - Start/continue work         │
│ kc save   - Save & paste snapshot       │
│ kc status - Check health (🟢/🟡/🔴/❓)   │
├─────────────────────────────────────────┤
│ Exit Claude: Ctrl+D                     │
│ Get help: kc --help                     │
└─────────────────────────────────────────┘
```

## Common First-Day Issues

| Problem | Solution |
|---------|----------|
| "kc: command not found" | Add `/usr/local/bin` to PATH |
| "Permission denied" | Use `sudo` for install commands |
| "Claude CLI not found" | Install Claude CLI first |
| "Authentication required" | Run `claude` to authenticate via browser |
| "Too many old decisions shown" | 5-decision limit is default in v0.2.0+ |

💡 **Remember**: Check health status with `kc status` to diagnose issues.

---

**Ready to learn more?** Continue to [Usage Guide](usage-guide.md) →