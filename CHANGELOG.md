# Changelog

All notable changes to KODAMA Claude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-08-12

### Added
- Safe uninstall functionality with data preservation options
- Japanese command reference documentation (`docs/command-details-ja.md`)
- "First 10 minutes" quick start guide in README_ja.md
- GitHub Actions CI/CD workflow for automated releases
- Automatic detection and removal of old versions in install.sh
- Prerequisites section in documentation

### Changed
- **BREAKING**: Reduced from 8+ commands to just 3 core commands (`go`, `save`, `status`)
- Renamed commands for clarity:
  - `snap` → `save`
  - `check` → `status`
- Integrated `send` functionality into `save` command
- Replaced unreliable token percentage with 4-value health status (🟢/🟡/🔴/❓)
- Two-stage execution pattern replacing problematic `--system` flag
- All example outputs translated to Japanese in README_ja.md
- Documentation reduced by 36% while improving clarity

### Fixed
- Security vulnerabilities in uninstall script (path validation, ShellCheck compliance)
- Install script now automatically removes v0.1.0 if detected
- Binary checksum mismatches in GitHub releases
- Hardcoded version checks preventing proper upgrades

### Removed
- Commands: `plan`, `list`, `show`, `doctor` (functionality integrated into core 3)
- Misleading token percentage displays
- `--system` flag that doesn't exist in Claude CLI

## [0.2.0] - 2025-08-10

### Added
- Smart context management features
- 5-decision limit for reducing cognitive load
- Auto-archive for snapshots older than 30 days
- CLAUDE.md integration for AI context persistence

### Changed
- Enhanced snapshot storage with atomic file operations
- Improved file locking mechanisms

## [0.1.0] - 2025-08-09

### Added
- Initial release
- Basic snapshot functionality
- Multiple commands for different operations
- Claude CLI integration

---

**Note**: For upgrading from v0.1.0, please see the [migration guide](README.md#migration-from-v010-to-v030)