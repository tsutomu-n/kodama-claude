# Next Steps for KODAMA Claude
*Session Resume Point: 2025-08-13*

## Immediate Actions (When Resuming)

### 1. Test Current Release
```bash
# Install latest version
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash

# Verify version
kc --version  # Should show 0.4.1

# Test new list command
kc list
kc list --json | jq '.'
kc list --verbose
```

### 2. Monitor User Feedback
- Check GitHub Issues: https://github.com/tsutomu-n/kodama-claude/issues
- Review any bug reports
- Note feature requests

## Next Implementation: v0.5.0 Snapshot Management

### Phase 1: `kc show` Command
**Estimated Time**: 2-3 hours

#### Implementation Plan
1. Create `src/commands/show.ts`
2. Add command to `bin/kc.ts`
3. Implement display logic:
   - Load specific snapshot by ID
   - Format output nicely
   - Handle missing snapshots gracefully
4. Add tests `src/commands/show.test.ts`
5. Update documentation

#### Code Structure
```typescript
// src/commands/show.ts
export async function show(snapshotId: string, options: ShowOptions): Promise<void> {
  // 1. Validate snapshot ID
  // 2. Find snapshot file (partial match support)
  // 3. Load and parse JSON
  // 4. Format and display
  // 5. Handle errors gracefully
}
```

### Phase 2: `kc delete` Command
**Estimated Time**: 3-4 hours

#### Implementation Plan
1. Create `src/commands/delete.ts`
2. Implement soft delete (move to `.trash/`)
3. Add confirmation prompts
4. Support multiple deletion modes:
   - Single ID
   - Multiple IDs
   - Age-based (`--older-than`)
   - Pattern matching (`--match`)
5. Add recovery mechanism
6. Comprehensive testing

#### Safety Features
- Always require confirmation
- Implement 7-day trash retention
- Log all deletions
- Provide undo instructions

### Phase 3: `kc search` Command
**Estimated Time**: 4-5 hours

#### Implementation Plan
1. Create `src/commands/search.ts`
2. Implement search strategies:
   - Title search (simple)
   - Full-text search (all fields)
   - Tag filtering
   - Regex support
3. Consider SQLite FTS5 for performance
4. Add result ranking
5. Implement highlighting

#### Technical Decisions
- Start with in-memory search (simple)
- Add SQLite index if performance issues
- Lazy index building on first search

### Phase 4: Enhanced `kc list` Filters
**Estimated Time**: 2-3 hours

#### Implementation Plan
1. Extend `src/commands/list.ts`
2. Add time-based filters:
   - `--since`
   - `--today`
   - `--yesterday`
   - `--this-week`
3. Add tag filters:
   - `--tag`
   - `--tags` (AND)
   - `--any-tag` (OR)
4. Add step filter:
   - `--step`
5. Update tests and docs

## Testing Checklist for v0.5.0

### Unit Tests
- [ ] `show.test.ts` - ID validation, partial matching, error handling
- [ ] `delete.test.ts` - Soft delete, confirmation, recovery
- [ ] `search.test.ts` - Query parsing, result ranking
- [ ] `list.test.ts` - New filter options

### Integration Tests
- [ ] Show non-existent snapshot
- [ ] Delete with recovery
- [ ] Search with 1000+ snapshots
- [ ] Combined filters in list

### Security Tests
- [ ] Path traversal in show/delete
- [ ] Injection in search queries
- [ ] File permission preservation
- [ ] Safe deletion only

### Performance Tests
- [ ] Search 10,000 snapshots < 200ms
- [ ] List with filters < 100ms
- [ ] Delete confirmation < 50ms

## Documentation Updates for v0.5.0

1. **README.md / README.ja.md**
   - Add new commands to usage section
   - Update feature list
   - Add v0.5.0 to What's New

2. **docs/en/command-details.md**
   - Add sections for show, delete, search
   - Update list with new filters
   - Add practical examples

3. **docs/ja/command-details.md**
   - Japanese translations
   - Cultural adaptations

4. **CHANGELOG.md**
   - v0.5.0 entry with all changes
   - Breaking changes (if any)
   - Migration notes

## Git Workflow for v0.5.0

```bash
# Create feature branch
git checkout -b feature/v0.5.0-snapshot-management

# Implement Phase 1
git add src/commands/show.*
git commit -m "feat: Add 'kc show' command for viewing specific snapshots"

# Implement Phase 2  
git add src/commands/delete.*
git commit -m "feat: Add 'kc delete' with soft delete and recovery"

# Implement Phase 3
git add src/commands/search.*
git commit -m "feat: Add 'kc search' for full-text snapshot search"

# Implement Phase 4
git add src/commands/list.ts
git commit -m "feat: Enhance 'kc list' with time and tag filters"

# Final preparations
git add docs/ README* CHANGELOG.md
git commit -m "docs: Update documentation for v0.5.0"

# Merge to main
git checkout main
git merge --no-ff feature/v0.5.0-snapshot-management
git tag v0.5.0
git push origin main --tags
```

## Release Process for v0.5.0

1. **Pre-release Checklist**
   - [ ] All tests passing
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   - [ ] Version bumped in package.json

2. **Build Release**
   ```bash
   bun run build:all
   ./scripts/generate-checksums.sh
   ```

3. **Create GitHub Release**
   ```bash
   gh release create v0.5.0 \
     --title "v0.5.0: Snapshot Management Suite" \
     --notes "..." \
     dist/kc-linux-x64 \
     dist/kc-linux-arm64 \
     dist/install.sh \
     dist/uninstall.sh \
     dist/checksums.txt
   ```

4. **Post-release Testing**
   ```bash
   # Test installation
   curl -fsSL .../install.sh | bash
   kc --version
   kc show
   kc delete
   kc search
   ```

## Risk Mitigation

### Potential Issues
1. **Data Loss from Delete**: Implement soft delete with recovery
2. **Performance with Large Datasets**: Add indexing and pagination
3. **Breaking Changes**: Maintain backward compatibility
4. **Security Vulnerabilities**: Extensive input validation

### Contingency Plans
- Hotfix process ready
- Rollback instructions documented
- Backup recommendations for users
- Clear communication channels

## Notes for Next Session

- Current version: v0.4.1 (fully released and documented)
- All 151 tests passing
- Documentation complete in English and Japanese
- GitHub release has all assets
- Ready to start v0.5.0 development
- This roadmap and plan saved for easy resumption

---

**To Resume Development**:
1. Read this file and ROADMAP.md
2. Check for new issues/feedback
3. Start with Phase 1 (kc show)
4. Follow implementation plan above

*Remember: "Less is More" - Keep it simple and focused*