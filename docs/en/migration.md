# Migration Guide

This guide covers version migrations for KODAMA Claude.

## Migration from v0.1.0 to v0.3.0

**Breaking Changes:** v0.3.0 completely redesigned the command structure to be simpler and more intuitive.

### Command Changes

The following commands have been renamed or restructured:

| Old Command (v0.1.0) | New Command (v0.3.0) | Notes |
|---------------------|---------------------|-------|
| `kc snap` | `kc save` | Better name that clearly indicates saving work |
| `kc check` | `kc status` | Clearer intent - checking session status |
| `kc send` | Integrated into `kc save` | Simplified workflow - save and send in one |
| `kc plan` | Auto-displayed | Plans are now shown automatically in `go` and `save` |
| `kc doctor` | `kc status` | Unified health checking |

### Upgrade Process

If you have v0.1.0 installed:

#### Option 1: Use the Installer (Recommended)

The installer automatically detects and removes old versions:

```bash
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

#### Option 2: Manual Upgrade

```bash
# 1. Uninstall old version
sudo rm /usr/local/bin/kc

# 2. Install new version
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash

# 3. Verify version
kc --version  # Should show 0.3.0 or later
```

### Troubleshooting

**Known Issue with v0.1.0**

If you see the error `unknown option '--system'`, you have v0.1.0 installed. Please upgrade using the steps above.

### Data Compatibility

- Your snapshots from v0.1.0 are fully compatible with v0.3.0
- No data migration is required
- All existing snapshots will continue to work

### Why the Changes?

v0.3.0 focused on the "Less is more" philosophy:
- Reduced from 5+ commands to just 3 core commands
- Simplified mental model for users
- Better alignment with typical workflows
- Automatic features instead of manual commands

## Future Migrations

This document will be updated with migration guides for future versions as needed.

For general troubleshooting, see the [Troubleshooting Guide](troubleshooting.md).