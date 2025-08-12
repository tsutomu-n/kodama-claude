# Storage Management

🟢 **Difficulty**: Beginner | **Read time**: 10 minutes

Complete guide to KODAMA Claude's storage system, capacity planning, and optimization.

## Overview

KODAMA Claude uses an efficient storage system designed to:
- Keep your context history accessible
- Prevent storage bloat automatically
- Maintain fast performance
- Preserve important work

## Storage Size Estimates

### Per Snapshot
- **Average size**: 1-2 KB per snapshot
- **With heavy context**: 3-5 KB
- **Maximum recommended**: 10 KB

### Daily Usage
- **Light use** (2-3 saves/day): ~5 KB/day
- **Normal use** (5-10 saves/day): ~15 KB/day
- **Heavy use** (20+ saves/day): ~40 KB/day

### Monthly & Yearly Projections
| Usage Pattern | Per Month | Per Year | 
|--------------|-----------|----------|
| Light | ~150 KB | ~1.8 MB |
| Normal | ~450 KB | ~5.4 MB |
| Heavy | ~1.2 MB | ~14 MB |

**Bottom line**: Even with heavy usage, KODAMA uses less than 15 MB per year.

## Auto-Archive System

KODAMA automatically manages old snapshots to prevent bloat.

### How It Works

1. **Automatic trigger**: Runs when you use `kc go` or `kc save`
2. **Age check**: Finds snapshots older than 30 days
3. **Non-destructive move**: Moves to `archive/` subdirectory
4. **Preserves access**: Archived files remain readable

### Archive Location
```
~/.local/share/kodama-claude/snapshots/
├── current-snapshot.json      # Active snapshots
├── yesterday-snapshot.json    # Recent work
└── archive/                   # Auto-archived (30+ days)
    └── old-snapshot.json      # Still accessible
```

### Customizing Archive Threshold

```bash
# Default: 30 days
export KODAMA_ARCHIVE_DAYS=30

# Archive after 14 days
export KODAMA_ARCHIVE_DAYS=14

# Archive after 60 days
export KODAMA_ARCHIVE_DAYS=60
```

### Disabling Auto-Archive

```bash
# Disable auto-archive completely
export KODAMA_AUTO_ARCHIVE=false

# Re-enable (default)
unset KODAMA_AUTO_ARCHIVE
# or
export KODAMA_AUTO_ARCHIVE=true
```

## Decision Limit System

KODAMA limits stored decisions to prevent snapshot bloat.

### Default Behavior
- Stores only the **5 most recent** decisions
- Older decisions are automatically trimmed
- Keeps snapshots small and focused

### Why This Matters
- Prevents context from becoming overwhelming
- Reduces storage usage by ~70%
- Improves Claude's response time

### Customizing Decision Limit

```bash
# Default: 5 decisions
export KODAMA_MAX_DECISIONS=5

# Store 10 decisions
export KODAMA_MAX_DECISIONS=10

# Store only 3 decisions
export KODAMA_MAX_DECISIONS=3

# Unlimited decisions (not recommended)
export KODAMA_NO_LIMIT=true
```

**Warning**: Unlimited decisions can cause:
- Large snapshot files (10-50 KB each)
- Slower Claude responses
- Storage bloat over time

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `KODAMA_AUTO_ARCHIVE` | `true` | Enable/disable auto-archive |
| `KODAMA_ARCHIVE_DAYS` | `30` | Days before archiving |
| `KODAMA_MAX_DECISIONS` | `5` | Number of decisions to keep |
| `KODAMA_NO_LIMIT` | `false` | Disable decision limit |
| `XDG_DATA_HOME` | `~/.local/share` | Base data directory |

## Storage Locations

### Default Paths
```
~/.local/share/kodama-claude/
├── snapshots/              # Active snapshots
│   ├── *.json             # Current work (< 30 days)
│   └── archive/           # Old snapshots (30+ days)
├── events.jsonl           # Event log (append-only)
└── .session              # Current session tracking
```

### Custom Storage Location

```bash
# Use XDG standard
export XDG_DATA_HOME=/custom/path

# KODAMA will use:
# /custom/path/kodama-claude/
```

## Manual Cleanup Procedures

### Check Storage Usage

```bash
# Total size
du -sh ~/.local/share/kodama-claude/

# Breakdown by directory
du -sh ~/.local/share/kodama-claude/*/

# Count snapshots
ls ~/.local/share/kodama-claude/snapshots/*.json | wc -l

# Count archived
ls ~/.local/share/kodama-claude/snapshots/archive/*.json | wc -l
```

### Manual Archive

```bash
# Archive snapshots older than 14 days
find ~/.local/share/kodama-claude/snapshots -name "*.json" -mtime +14 \
  -exec mv {} ~/.local/share/kodama-claude/snapshots/archive/ \;
```

### Compress Archives

```bash
# Compress old archives (reduces size by ~80%)
cd ~/.local/share/kodama-claude/snapshots/archive/
gzip *.json

# To read compressed file
zcat snapshot.json.gz | jq .
```

### Delete Very Old Archives

```bash
# Delete archives older than 90 days
find ~/.local/share/kodama-claude/snapshots/archive/ \
  -name "*.json*" -mtime +90 -delete

# With confirmation
find ~/.local/share/kodama-claude/snapshots/archive/ \
  -name "*.json*" -mtime +90 -exec rm -i {} \;
```

## Best Practices

### 1. Let Auto-Management Work
- Default settings work for 99% of users
- Auto-archive keeps storage clean
- Decision limit prevents bloat

### 2. Monitor Periodically
```bash
# Quick health check
kc status

# Storage check (add to weekly routine)
du -sh ~/.local/share/kodama-claude/
```

### 3. Adjust for Your Workflow

**For Long Projects** (months):
```bash
export KODAMA_ARCHIVE_DAYS=60  # Keep context longer
```

**For Quick Tasks** (days):
```bash
export KODAMA_ARCHIVE_DAYS=14  # Archive sooner
export KODAMA_MAX_DECISIONS=3  # Smaller snapshots
```

**For CI/CD**:
```bash
export KODAMA_AUTO_ARCHIVE=false  # Predictable state
export KODAMA_MAX_DECISIONS=1     # Minimal storage
```

### 4. Backup Important Work

```bash
# Backup entire KODAMA data
tar -czf kodama-backup-$(date +%Y%m%d).tar.gz \
  ~/.local/share/kodama-claude/

# Backup specific project snapshots
cp ~/.local/share/kodama-claude/snapshots/important-*.json \
  ~/project-backups/
```

## Troubleshooting Storage Issues

### Problem: Storage Growing Too Large

**Check what's using space**:
```bash
# Find large snapshots
find ~/.local/share/kodama-claude -name "*.json" -size +10k -ls

# Check if auto-archive is working
echo "Auto-archive: ${KODAMA_AUTO_ARCHIVE:-true}"
echo "Archive days: ${KODAMA_ARCHIVE_DAYS:-30}"
```

**Fix**:
```bash
# Force archive run
kc status  # Triggers auto-archive

# Manual cleanup
find ~/.local/share/kodama-claude/snapshots -name "*.json" \
  -mtime +30 -exec mv {} ~/.local/share/kodama-claude/snapshots/archive/ \;
```

### Problem: Snapshots Too Large

**Check snapshot sizes**:
```bash
ls -lh ~/.local/share/kodama-claude/snapshots/*.json | head -5
```

**Fix**:
```bash
# Limit decisions
export KODAMA_MAX_DECISIONS=3

# Check current limit
echo "Max decisions: ${KODAMA_MAX_DECISIONS:-5}"
echo "No limit: ${KODAMA_NO_LIMIT:-false}"
```

### Problem: Can't Find Old Snapshots

**Check archive**:
```bash
ls ~/.local/share/kodama-claude/snapshots/archive/
```

**Restore from archive**:
```bash
# Copy back to active directory
cp ~/.local/share/kodama-claude/snapshots/archive/old-snapshot.json \
   ~/.local/share/kodama-claude/snapshots/
```

## Performance Impact

| Snapshot Count | Performance | Recommendation |
|---------------|-------------|----------------|
| < 100 | Excellent | No action needed |
| 100-500 | Good | Normal auto-archive sufficient |
| 500-1000 | Slower | Consider manual archive |
| > 1000 | Degraded | Clean up recommended |

## Storage Capacity Planning

### Small Projects (Personal)
- **Duration**: 1-3 months
- **Expected storage**: < 1 MB
- **Settings**: Defaults work perfectly

### Medium Projects (Team)
- **Duration**: 3-12 months  
- **Expected storage**: 2-5 MB
- **Recommended settings**:
  ```bash
  export KODAMA_ARCHIVE_DAYS=45
  export KODAMA_MAX_DECISIONS=5
  ```

### Large Projects (Enterprise)
- **Duration**: 12+ months
- **Expected storage**: 5-15 MB
- **Recommended settings**:
  ```bash
  export KODAMA_ARCHIVE_DAYS=60
  export KODAMA_MAX_DECISIONS=3
  # Set up monthly backup routine
  ```

## Summary

KODAMA's storage system is designed to be zero-maintenance for most users:

1. **Automatic management** - Archives old snapshots after 30 days
2. **Smart limits** - Keeps only 5 recent decisions
3. **Tiny footprint** - Uses ~5-15 MB per year
4. **Customizable** - Adjust via environment variables
5. **Non-destructive** - Never deletes, only archives

The default settings will work perfectly for 99% of users. Only adjust if you have specific needs.

---

**Remember**: KODAMA is designed to be simple. Trust the defaults, and it will manage storage for you.