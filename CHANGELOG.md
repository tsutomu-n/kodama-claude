# Changelog

All notable changes to KODAMA Claude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-08-11

### Added
- **Health Monitoring System** - Real-time session health tracking for junior developers
  - `kc check` command: Monitor token usage and session health
  - Three health levels: 🟢 healthy / 🟡 warning / 🔴 danger
  - JSON output support for automation (`--json` flag)
  - Detailed health reports (`--detailed` flag)
- **Auto-Protection** - Automatic safeguards against context loss
  - Auto-snapshot when context usage is critical (<10% remaining)
  - Integrated into `kc go` command for seamless protection
  - Configurable thresholds via Guardian module
- **Transcript Analysis** - Efficient Claude transcript monitoring
  - Token usage extraction from transcript files
  - Optimized to read only last 64KB for performance
  - Context window percentage tracking
- **Performance Optimizations**
  - Lazy loading of heavy modules
  - Improved file I/O with streaming for large files
  - Reduced memory footprint in transcript analysis

### Changed
- `kc go` now includes automatic health checking at startup
- Updated command ordering in documentation (go → snap → check → plan)
- Enhanced documentation to clarify health monitoring features
- Improved Japanese translations for health-related messages

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
- Core commands: `kc go`, `kc snap`, `kc send`, `kc plan`, `kc doctor`
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