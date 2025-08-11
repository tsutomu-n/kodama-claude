# Troubleshooting Guide

🟢 **Difficulty**: Beginner to Advanced | **Read time**: 15 minutes

Solutions for common problems and errors.

## Table of Contents
- [Quick Diagnosis](#quick-diagnosis)
- [Installation Issues](#installation-issues)
- [Claude CLI Problems](#claude-cli-problems)
- [Storage and Permission Errors](#storage-and-permission-errors)
- [Snapshot Issues](#snapshot-issues)
- [Session Problems](#session-problems)
- [Performance Issues](#performance-issues)
- [Error Messages](#error-messages)
- [Recovery Procedures](#recovery-procedures)

## Quick Diagnosis

### Run Doctor First

Always start with:
```bash
kc status
```

This checks:
- ✅ KODAMA installation
- ✅ Claude CLI availability  
- ✅ Storage permissions
- ✅ Git installation
- ✅ Snapshot integrity

### Common Quick Fixes

| Symptom | Try This First |
|---------|----------------|
| "command not found" | `export PATH=$PATH:/usr/local/bin` |
| "permission denied" | `sudo chmod +x /usr/local/bin/kc` |
| "Claude not found" | Install Claude CLI |
| "API key error" | `export ANTHROPIC_API_KEY="sk-ant-..."` |
| Can't save snapshots | `chmod 755 ~/.local/share/kodama-claude` |

## Installation Issues

### Problem: "kc: command not found"

**Diagnosis**:
```bash
# Check if installed
ls -la /usr/local/bin/kc

# Check PATH
echo $PATH | grep -q /usr/local/bin && echo "PATH OK" || echo "PATH missing"
```

**Solution 1: Add to PATH**
```bash
# Temporary fix
export PATH=$PATH:/usr/local/bin

# Permanent fix (add to ~/.bashrc)
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc
```

**Solution 2: Reinstall**
```bash
# Download and install again
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

**Solution 3: Manual fix**
```bash
# Find where kc is installed
find / -name "kc" 2>/dev/null

# Create symlink
sudo ln -s /path/to/kc /usr/local/bin/kc
```

### Problem: "Permission denied" when running kc

**Diagnosis**:
```bash
ls -la /usr/local/bin/kc
# Should show: -rwxr-xr-x (executable)
```

**Solution**:
```bash
# Make executable
sudo chmod +x /usr/local/bin/kc

# If still doesn't work, check ownership
sudo chown $USER:$USER /usr/local/bin/kc
```

### Problem: Wrong architecture binary

**Symptoms**:
```
bash: /usr/local/bin/kc: cannot execute binary file: Exec format error
```

**Diagnosis**:
```bash
# Check your architecture
uname -m
# x86_64 = need x64 version
# aarch64 = need arm64 version

# Check binary type
file /usr/local/bin/kc
```

**Solution**:
```bash
# Remove wrong version
sudo rm /usr/local/bin/kc

# Download correct version
# For x64:
wget https://github.com/tsutomu-n/kodama-claude/releases/latest/download/kc-linux-x64
# For ARM64:
wget https://github.com/tsutomu-n/kodama-claude/releases/latest/download/kc-linux-arm64

# Install
chmod +x kc-linux-*
sudo mv kc-linux-* /usr/local/bin/kc
```

## Claude CLI Problems

### Problem: "Claude CLI not found"

**Diagnosis**:
```bash
# Check if Claude is installed
which claude
claude --version
```

**Solution**:
```bash
# Install Claude Code CLI (official method)
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

### Problem: "Claude Code authentication required"

**Symptoms**:
```
Error: Not authenticated. Please run 'claude' to authenticate.
```

**Solution**:
```bash
# First time setup - Claude Code uses OAuth authentication
claude

# Follow the prompts to:
# 1. Open browser for authentication
# 2. Login with Claude.ai account or Anthropic Console
# 3. Authorize Claude Code access

# Verify authentication
claude --version
```

**Note**: Claude Code uses OAuth authentication, not API keys directly. The authentication is stored in your system's credential manager.

### Problem: "Claude Code session expired"

**Symptoms**:
```
Error: Authentication expired. Please re-authenticate.
```

**Solution**:
```bash
# Re-authenticate
claude --auth

# Or simply run claude and it will prompt if needed
claude
```

**Note**: Claude Code sessions may expire after extended periods. Re-authentication is quick and preserves your settings.

### Problem: Claude Code hangs or times out

**Diagnosis**:
```bash
# Check network
ping api.anthropic.com

# Check proxy settings
echo $HTTP_PROXY $HTTPS_PROXY

# Test with timeout
timeout 10 claude "test"
```

**Solutions**:

1. **Behind proxy**:
```bash
export HTTPS_PROXY="http://proxy.company.com:8080"
export HTTP_PROXY="http://proxy.company.com:8080"
```

2. **Firewall blocking**:
```bash
# Check if port 443 is open
nc -zv api.anthropic.com 443
```

3. **DNS issues**:
```bash
# Try different DNS
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
```

## Storage and Permission Errors

### Problem: Can't write snapshots

**Symptoms**:
```
Error: Cannot write to ~/.local/share/kodama-claude/snapshots
Permission denied
```

**Diagnosis**:
```bash
# Check directory exists
ls -la ~/.local/share/kodama-claude/

# Check permissions
stat -c %a ~/.local/share/kodama-claude/

# Check disk space
df -h ~
```

**Solutions**:

1. **Fix permissions**:
```bash
# Create directory if missing
mkdir -p ~/.local/share/kodama-claude/snapshots

# Fix ownership
chown -R $USER:$USER ~/.local/share/kodama-claude

# Fix permissions
chmod -R 755 ~/.local/share/kodama-claude
```

2. **Disk full**:
```bash
# Check space
du -sh ~/.local/share/kodama-claude/

# Clean old snapshots
find ~/.local/share/kodama-claude/snapshots -mtime +30 -delete

# Or keep only last 20
ls -t ~/.local/share/kodama-claude/snapshots/*.json | tail -n +21 | xargs rm
```

### Problem: File lock errors

**Symptoms**:
```
Error: Cannot acquire lock on storage directory
Another process may be using KODAMA
```

**Diagnosis**:
```bash
# Check for lock file
ls -la ~/.local/share/kodama-claude/.lock

# Check if another kc is running
ps aux | grep kc
```

**Solutions**:

1. **Remove stale lock**:
```bash
# If no kc process is running
rm ~/.local/share/kodama-claude/.lock
```

2. **Kill stuck process**:
```bash
# Find and kill
pkill -f kc
# or
kill $(ps aux | grep '[k]c' | awk '{print $2}')
```

## Snapshot Issues

### Problem: Corrupted snapshot

**Symptoms**:
```
Error: Invalid JSON in snapshot file
```

**Diagnosis**:
```bash
# Validate JSON
jq . ~/.local/share/kodama-claude/snapshots/latest.json

# Check file size
ls -lh ~/.local/share/kodama-claude/snapshots/latest.json
```

**Solutions**:

1. **Use previous snapshot**:
```bash
# List all snapshots
ls -t ~/.local/share/kodama-claude/snapshots/*.json

# Use second newest
ln -sf $(ls -t ~/.local/share/kodama-claude/snapshots/*.json | sed -n '2p') \
       ~/.local/share/kodama-claude/snapshots/latest.json
```

2. **Fix JSON manually**:
```bash
# Open in editor
nano ~/.local/share/kodama-claude/snapshots/latest.json

# Common fixes:
# - Add missing closing brace }
# - Remove trailing comma
# - Escape quotes in strings
```

3. **Recreate from event log**:
```bash
# Check event log
tail -n 20 ~/.local/share/kodama-claude/events.jsonl | jq .
```

### Problem: Lost snapshots

**Recovery options**:

1. **Check backups**:
```bash
# System backup
find /var/backups -name "*kodama*" 2>/dev/null

# Check /tmp
find /tmp -name "*.json" -mtime -7 2>/dev/null
```

2. **Recover from git** (if versioned):
```bash
cd ~/.local/share/kodama-claude
git log --oneline
git checkout HEAD~1 snapshots/
```

3. **Rebuild from Claude history**:
```bash
# List Claude sessions
claude --list-sessions

# Export session
claude --export-session <session-id> > recovered.json
```

## Session Problems

### Problem: Can't continue Claude session

**Symptoms**:
```
Error: Session not found or expired
```

**Diagnosis**:
```bash
# Check session file
cat ~/.local/share/kodama-claude/.session

# List available sessions
claude --list-sessions
```

**Solutions**:

1. **Start fresh session**:
```bash
# Remove old session
rm ~/.local/share/kodama-claude/.session

# Start new
kc go
```

2. **Recover session ID**:
```bash
# Find in snapshots
grep -h sessionId ~/.local/share/kodama-claude/snapshots/*.json | tail -1

# Use specific session
claude --continue <session-id>
```

### Problem: Multiple sessions conflict

**Symptoms**:
```
Warning: Multiple Claude sessions detected
```

**Solution**:
```bash
# List all sessions
claude --list-sessions

# Clean old sessions
claude --cleanup-sessions

# Or manually close
claude --close-session <old-session-id>
```

## Performance Issues

### Problem: Slow snapshot loading

**Diagnosis**:
```bash
# Check snapshot count
ls ~/.local/share/kodama-claude/snapshots/*.json | wc -l

# Check sizes
du -sh ~/.local/share/kodama-claude/snapshots/
```

**Solutions**:

1. **Archive old snapshots**:
```bash
# Move old snapshots
mkdir -p ~/.local/share/kodama-claude/archive
find ~/.local/share/kodama-claude/snapshots -mtime +30 \
     -exec mv {} ~/.local/share/kodama-claude/archive/ \;
```

2. **Optimize storage**:
```bash
# Compress old snapshots
gzip ~/.local/share/kodama-claude/archive/*.json
```

3. **Clean event log**:
```bash
# Rotate event log
mv ~/.local/share/kodama-claude/events.jsonl \
   ~/.local/share/kodama-claude/events.jsonl.old
touch ~/.local/share/kodama-claude/events.jsonl
```

### Problem: High memory usage

**Solutions**:

1. **Limit snapshot size**:
```bash
# Truncate large contexts
jq '.context = .context[:1000]' snapshot.json > snapshot-trimmed.json
```

2. **Clear cache**:
```bash
# Clear any temp files
rm -rf /tmp/kodama-*
```

## Error Messages

### Complete Error Reference

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `kc: command not found` | Not installed or not in PATH | Add to PATH or reinstall |
| `Permission denied` | No execute permission | `chmod +x /usr/local/bin/kc` |
| `Claude CLI not found` | Claude not installed | Install Claude CLI |
| `Missing API key` | ANTHROPIC_API_KEY not set | Set environment variable |
| `Invalid JSON` | Corrupted snapshot | Use previous snapshot |
| `Cannot acquire lock` | Another process running | Remove `.lock` file |
| `Session expired` | Old Claude session | Start new with `kc go` |
| `Storage directory not found` | First run or deleted | `mkdir -p ~/.local/share/kodama-claude` |
| `Git not found` | Git not installed | `sudo apt install git` |
| `No snapshots found` | Fresh install | Create first with `kc save` |

## Recovery Procedures

### Complete Reset

When nothing else works:

```bash
#!/bin/bash
# Full KODAMA reset

echo "⚠️  This will delete all KODAMA data!"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backup first
    tar -czf ~/kodama-backup-$(date +%Y%m%d).tar.gz \
        ~/.local/share/kodama-claude/
    
    # Remove all data
    rm -rf ~/.local/share/kodama-claude/
    
    # Reinstall
    curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
    
    # Verify
    kc status
    
    echo "✅ Reset complete. Backup saved to ~/kodama-backup-*.tar.gz"
fi
```

### Restore from Backup

```bash
#!/bin/bash
# Restore KODAMA from backup

BACKUP_FILE="$1"

if [[ -z "$BACKUP_FILE" ]]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Extract
tar -xzf "$BACKUP_FILE" -C ~/

# Fix permissions
chmod -R 755 ~/.local/share/kodama-claude

# Verify
kc status

echo "✅ Restored from $BACKUP_FILE"
```

### Emergency Context Recovery

When you lose context but need to continue:

```bash
#!/bin/bash
# Emergency context recovery

echo "🚨 Emergency Context Recovery"

# 1. Check git for recent work
echo "Recent git commits:"
git log --oneline -10

# 2. Check shell history for kc commands
echo "Recent KODAMA commands:"
history | grep "kc " | tail -20

# 3. Check Claude sessions
echo "Available Claude sessions:"
claude --list-sessions

# 4. Create emergency snapshot
cat << EOF | kc save -t "Emergency recovery" --stdin -y
Recovered from system crash.
Check git log for recent commits.
Current branch: $(git branch --show-current)
Last commit: $(git log -1 --oneline)
EOF

echo "✅ Emergency snapshot created"
```

### Debug Mode

Enable detailed debugging:

```bash
# Run with debug output
KODAMA_DEBUG=1 kc go

# Trace execution
bash -x $(which kc) go

# Check system calls
strace -e open,read,write kc go 2>&1 | grep kodama

# Monitor file access
inotifywait -m ~/.local/share/kodama-claude/
```

## Smart Context Management Issues (v0.2.0+)

### Problem: Too many decisions shown

**Symptom**: "I see more than 5 decisions"

**Diagnosis**:
```bash
# Check if limit is disabled
echo $KODAMA_NO_LIMIT
```

**Solution**:
```bash
# Enable the limit (default behavior)
unset KODAMA_NO_LIMIT
# or
export KODAMA_NO_LIMIT=false
```

### Problem: Can't find archived snapshots

**Symptom**: "My old snapshots disappeared"

**Solution**:
```bash
# Check archive directory
ls ~/.local/share/kodama-claude/snapshots/archive/

# Restore from archive if needed
cp ~/.local/share/kodama-claude/snapshots/archive/old-snapshot.json \
   ~/.local/share/kodama-claude/snapshots/
```

### Problem: CLAUDE.md not updating

**Symptoms**: "CLAUDE.md exists but doesn't update"

**Diagnosis**:
```bash
# Check if feature is enabled
echo $KODAMA_CLAUDE_SYNC

# Check for markers in file
grep "KODAMA:START" CLAUDE.md
```

**Solutions**:

1. **Enable the feature**:
```bash
export KODAMA_CLAUDE_SYNC=true
```

2. **Add markers to CLAUDE.md**:
```markdown
<!-- KODAMA:START -->
<!-- KODAMA:END -->
```

3. **Use the template**:
```bash
cp templates/CLAUDE.md.example CLAUDE.md
# Edit as needed
```

### Problem: Archive not working

**Symptom**: "Old snapshots not being archived"

**Diagnosis**:
```bash
# Check if disabled (empty = enabled by default)
echo "KODAMA_AUTO_ARCHIVE=$KODAMA_AUTO_ARCHIVE"

# Check permissions
ls -ld ~/.local/share/kodama-claude/snapshots/

# Check snapshot ages
find ~/.local/share/kodama-claude/snapshots -name "*.json" -mtime +30 | wc -l
```

**Solution**:
```bash
# Enable auto-archive (default behavior)
unset KODAMA_AUTO_ARCHIVE
# or explicitly enable
export KODAMA_AUTO_ARCHIVE=true

# Fix permissions
chmod 755 ~/.local/share/kodama-claude/snapshots/

# Trigger archive manually by running any command
kc status  # This will trigger the archive process
```

**Note**: Archive runs automatically when you use `kc save` or `kc go`.

## Getting More Help

### Information to Provide

When asking for help, include:

```bash
# Generate debug report
(
    echo "=== System Info ==="
    uname -a
    echo "=== KODAMA Version ==="
    kc --version
    echo "=== Claude CLI ==="
    claude --version
    echo "=== Doctor Output ==="
    kc status
    echo "=== Storage ==="
    ls -la ~/.local/share/kodama-claude/
    echo "=== Recent Errors ==="
    tail -20 ~/.local/share/kodama-claude/events.jsonl | jq '.error'
) > kodama-debug.txt

echo "Debug report saved to kodama-debug.txt"
```

### Support Channels

1. **GitHub Issues**: https://github.com/tsutomu-n/kodama-claude/issues
2. **Documentation**: Check other sections of this guide
3. **Community**: Search existing issues first

### Last Resort

If completely stuck:

1. Backup your snapshots
2. Completely uninstall KODAMA
3. Fresh install
4. Restore snapshots from backup

Remember: Your snapshots are just JSON files. You can always read them manually and continue your work even without KODAMA.

---

**Next**: See complete command reference in [API Reference](api-reference.md) →