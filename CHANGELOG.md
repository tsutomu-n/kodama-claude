# Changelog

All notable changes to KODAMA Claude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Zero dependencies - Single binary distribution
- Fail gracefully - Multiple fallback strategies for every operation

### Technical Stack
- TypeScript for type safety
- Bun runtime for performance and single-binary compilation
- Commander.js for CLI interface
- Zod for schema validation

[0.1.0]: https://github.com/kodama-cli/kodama-claude/releases/tag/v0.1.0