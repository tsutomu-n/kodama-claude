# Changelog

All notable changes to KODAMA Claude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-08-11

### 🔥 Breaking Changes
- **Simplified to 3 commands only** - Optimized for junior developer simplicity
  - Removed: `snap`, `check`, `send`, `plan`, `doctor`, `list`, `show` commands
  - Renamed: `snap` → `save`, `check` → `status`
  - Integrated: `send` functionality into `save` command with paste prompt

### Added
- **Two-stage execution** - Reliable context injection following official Claude CLI docs
  - Stage 1: `claude -c -p "<context>"` to inject context
  - Stage 2: `claude --continue` to open REPL
- **Health Monitoring** - Simple 4-value status system
  - `kc status`: Shows 🟢/🟡/🔴/❓ with hint
  - No misleading token percentages (Claude CLI doesn't reliably expose)
  - Auto-protection when critical
- **Paste integration** - `kc save` now prompts to paste after saving
  - Clipboard fallback hierarchy: WSL→clip.exe, Wayland→wl-copy, X11→xclip, OSC52, temp file
  - Interactive prompts with clear EOF guidance (Ctrl+D on Unix/Mac, Ctrl+Z on WSL)

### Changed
- **Only 3 commands**: `go`, `save`, `status`
- `kc go` now uses two-stage execution for reliability
- `kc save` combines snapshot + paste functionality
- `kc status` provides simple one-line health status
- Removed complex workflows in favor of automation

### Fixed
- TypeScript async/await consistency in storage module
- Test suite properly handles async operations
- Documentation accuracy regarding "real-time" claims (now "session tracking")

## [0.2.0] - 2025-08-10

### Added
- **Smart Context Management** - Intelligent features to reduce cognitive load for junior developers
  - 5-decision limit: Shows only the latest 5 decisions by default (configurable via `KODAMA_NO_LIMIT`)
  - Auto-archive: Automatically moves snapshots older than 30 days to `archive/` directory (configurable via `KODAMA_AUTO_ARCHIVE`)
  - CLAUDE.md sync: Auto-updates project context file for AI consistency (opt-in via `KODAMA_CLAUDE_SYNC`)
- **Internationalization (i18n)** - Multi-language support
  - Japanese error messages and prompts (via `KODAMA_LANG=ja`)
  - Automatic language detection from system locale
- **ClaudeMdManager** - New module for managing CLAUDE.md integration
  - Marker-based section updates
  - Automatic backup before updates
  - Template file (`CLAUDE.md.example`) for easy setup
- **Comprehensive test suite** - Added `smart-context.test.ts` for new features

### Changed
- Improved documentation clarity for environment variables
- Moved `CLAUDE.md.example` to `templates/` directory for better organization
- Enhanced Git utility functions with better error handling

### Fixed
- Documentation inconsistencies in environment variable descriptions
- Archive execution timing now clearly documented

## [0.1.0] - 2024-08-09

### Added
- Initial release of KODAMA Claude
- Core commands: `kc go`, `kc save`, `kc status` (only 3 commands!)
- Atomic file operations with fsync for data integrity
- XDG Base Directory specification compliance
- Multi-level clipboard fallback (OSC52, system clipboard, temp files)
- Schema validation with Zod
- Git integration for context tracking
- Binary distribution via Bun compile
- One-liner installation script
- Comprehensive test suite
- GitHub Actions workflow for automated releases

### Design Principles
- "Less is more" - Minimal feature set focused on core functionality
- Junior developer first - 30-second learning curve
- Single binary distribution - No runtime dependencies for core features
- Fail gracefully - Multiple fallback strategies for every operation

### Technical Stack
- TypeScript for type safety
- Bun runtime for performance and single-binary compilation
- Commander.js for CLI interface
- Zod for schema validation

[0.2.0]: https://github.com/tsutomu-n/kodama-claude/releases/tag/v0.2.0
[0.1.0]: https://github.com/tsutomu-n/kodama-claude/releases/tag/v0.1.0