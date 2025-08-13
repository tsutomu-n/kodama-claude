# Changelog

All notable changes to KODAMA Claude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-08-13

### Added
- **New `kc show` command** - Display detailed snapshot information
  - Partial ID matching for user convenience (e.g., `kc show abc123` matches full UUID)
  - Multiple output formats: human-readable and JSON (`--json`)
  - Verbose mode with `--verbose` for full context display
  - Context truncation for long content (200 chars) unless verbose mode
  - Comprehensive security validation and sanitization

- **New `kc delete` command** - Smart snapshot deletion with safety features
  - Multiple deletion modes: single snapshot, multiple IDs, pattern matching
  - Age-based deletion: `--older-than` for cleanup (e.g., "7d", "2w", "1m")
  - Soft delete with trash/recycle bin functionality
  - Restore capability with detailed trash management
  - Batch operations with confirmation prompts
  - DoS protection and input validation

- **New `kc search` command** - Powerful full-text search across snapshots
  - Multiple search modes: title-only, full-text, tag-based, regex patterns
  - Advanced filtering: date ranges, tags, workflow steps
  - Smart ranking and relevance scoring
  - Search result highlighting and context snippets
  - JSON output for script integration
  - Case-insensitive search with accent folding

- **Enhanced `kc list` command** - Extended filtering and sorting capabilities
  - Time-based filters: `--since`, `--until`, `--today`, `--yesterday`, `--this-week`
  - Tag filtering with `--tags` for workflow organization
  - Flexible sorting options: date, title, step, tags
  - Reverse sorting with `--reverse` flag
  - Improved performance for large snapshot collections

### Security
- Comprehensive security hardening across all new commands:
  - Path traversal prevention with strict validation
  - DoS protection with configurable limits (1000 items max)
  - File size limits (10MB) to prevent memory exhaustion
  - Control character sanitization in all outputs
  - Input validation and sanitization for all parameters
  - Safe error messages to prevent information disclosure
  - Atomic file operations to prevent corruption
  - Regular file type checking to prevent symlink attacks

### Changed
- Enhanced search infrastructure with in-memory indexing for improved performance
- Improved error handling with context-aware messages across all commands
- Standardized CLI option patterns across all snapshot management commands
- Enhanced trash management system with automatic cleanup and restoration

### Performance
- Optimized file processing for large snapshot collections
- Improved memory usage with streaming JSON parsing
- Enhanced caching for frequently accessed snapshots
- Reduced I/O operations through smart file filtering

## [0.4.1] - 2025-08-13

### Added
- New `kc list` command to display saved snapshots
  - Shows title, timestamp, step, and tags for each snapshot
  - Supports JSON output format with `--json` flag
  - Verbose mode with `--verbose` for additional details
  - Customizable limit with `-n` or `--limit` option

### Security
- Added comprehensive security measures to `kc list` command:
  - Path traversal prevention with strict filename validation
  - DoS protection with 1000 item limit
  - File size limits (10MB max) to prevent memory exhaustion
  - Control character escaping in output
  - Sanitized error messages to prevent information disclosure
  - Regular file type checking to prevent symlink attacks
  - Input validation for all parameters
  - Tag count (10) and length (50 chars) limits

### Changed
- Improved error handling in list command with proper XDG path resolution

## [0.4.0] - 2025-08-12

### Added
- **Smart Restart** (`kc restart`) - Intelligent context preservation when Claude restarts
  - No dependency on /clear command
  - Automatic detection of session state
  - Process management with PID/PGID tracking
- **Work Tags** (`kc tags`) - Organize work with semantic tags
  - Tag normalization and validation
  - Levenshtein distance for similarity suggestions
  - Filter and search snapshots by tags
- **One-Key Resume** (`kc resume`) - Quick save and restart workflow
  - Combines save + restart in one command
  - Optional save with `--no-save` flag
  - Force resume with `-f` or `--force`

### Security
- Fixed TOCTOU race condition vulnerability with atomic operations
- Prevented ReDoS attacks with bounded regex patterns
- Eliminated memory leaks from dynamic imports
- Added comprehensive input validation for all configuration values
- Implemented information leakage prevention in error messages
- Added stale lock cleanup on startup

### Changed
- Implemented atomic file operations with two-stage fsync (file → dir → rename → dir)
- Enhanced Context Pack with A/B template fallback system
- Improved XDG Base Directory compliance
- Added auto-archive for snapshots older than 30 days

### Fixed
- Missing tags fields in multiple TypeScript files
- Arithmetic issue in integration tests
- Version inconsistencies in documentation

## [0.3.1] - 2025-08-12

### Security
- Fixed command injection vulnerabilities in git.ts, go.ts, and save.ts
- Replaced all unsafe `execSync` with string interpolation to safe `spawnSync` with array arguments
- Enhanced binary identification to prevent accidental deletion of other 'kc' tools
- Added `is_kodama_binary()` function to verify Kodama binaries by version string
- Improved PATH conflict detection and resolution in installers

### Added
- SECURITY.md with vulnerability reporting guidelines
- Dependabot configuration for automated dependency updates
- GitHub topics configuration guide (TOPICS.md)
- Japanese translations for root documentation files

### Changed
- Rebranded to "Kodama for Claude Code" for clarity and searchability
- Updated all version strings to include "Kodama for Claude Code" signature
- Enhanced installer to detect and warn about PATH priority conflicts
- Improved error messages with actionable solutions

### Fixed
- Security vulnerabilities where user input could be injected into shell commands
- Installer detecting wrong version due to PATH priority issues
- Uninstaller potentially affecting non-Kodama 'kc' commands

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
- `--system` flag that doesn't exist in Claude

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
- Claude integration

---

**Note**: For upgrading from v0.1.0, please see the [migration guide](README.md#migration-from-v010-to-v030)