# KODAMA Claude v0.3.0 Release Notes

## 🎯 Major Breaking Changes - Simplified to 3 Commands

This release completely redesigns KODAMA Claude based on extensive user feedback and senior engineering review. The entire CLI has been reduced from 8+ commands to just 3 core commands for maximum simplicity and junior developer friendliness.

### ⚡ Command Changes

**Old Commands (v0.1.0) → New Commands (v0.3.0)**
- `kc snap` → `kc save` (better name)
- `kc check` → `kc status` (clearer purpose)
- `kc send` → Integrated into `kc save` paste prompt
- `kc plan` → Auto-displayed, no separate command
- `kc doctor` → Merged into `kc status`
- `kc list/show` → Removed (use filesystem directly)

### 🚀 New Core Commands

1. **`kc go`** - Start Claude with context
   - Health check with auto-protection
   - Two-stage execution: inject with `claude -c -p`, then REPL with `claude --continue`
   - No more misleading token percentages

2. **`kc save`** - Save snapshot & paste
   - Interactive prompts for context
   - Integrated clipboard paste functionality
   - Smart EOF guidance (Ctrl+D for Unix/Mac, Ctrl+Z for WSL)

3. **`kc status`** - Check health
   - Simple 4-value status: 🟢/🟡/🔴/❓
   - One-line output format
   - `--strict` mode for CI/CD

### 🔒 New Uninstall Feature

- **`kc uninstall`** - Safe removal with data preservation by default
- Interactive confirmation with visual feedback
- Options: `--remove-all`, `--backup`, `--dry-run`, `--force`
- Standalone uninstall script available via curl

## 🛠️ Technical Improvements

### Two-Stage Execution Pattern
- Replaced problematic `--system` flag approach
- First stage: `claude -c -p "<context>"` to inject context
- Second stage: `claude --continue` to open REPL
- More reliable per official Claude documentation

### Security Enhancements
- Path validation for all rm operations
- ShellCheck compliance (fixed SC2155 warnings)
- Proper error handling in uninstall script
- Validates binary paths match expected patterns

### Health Status Redesign
- Removed unreliable token percentage displays
- Heuristic-based 4-value status indicators
- Clear, actionable hints for each status level

## 📚 Documentation Updates

- **36% reduction** in documentation size (5,900 → 3,786 lines)
- Focused on 3-command workflow
- Added migration guide from v0.1.0
- Japanese documentation fully updated
- Comprehensive troubleshooting for new structure

## 🔄 Migration Guide

If you have v0.1.0 installed:
```bash
# 1. Uninstall old version
sudo rm /usr/local/bin/kc

# 2. Install new version
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash

# 3. Verify version
kc --version  # Should show 0.3.0
```

## ⚠️ Known Issues

- If you see error `unknown option '--system'`, you have v0.1.0 installed. Please upgrade.

## 🙏 Acknowledgments

Special thanks to the senior engineering team for their comprehensive review and guidance on simplifying the interface for junior developers.

---

**Philosophy**: Less is more. KODAMA Claude now does exactly what it needs to do with just 3 commands.