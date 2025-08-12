# Contributing to KODAMA Claude

Thank you for your interest in contributing to KODAMA Claude! 

## Philosophy

Before contributing, please understand our core philosophy:
- **Less is more** - We intentionally keep features minimal
- **Junior developer first** - If it takes more than 30 seconds to learn, it's too complex
- **Do one thing well** - Persist Claude dialogue memory, nothing else

## What We Accept

✅ **Bug fixes** - Always welcome  
✅ **Performance improvements** - Making it faster or more efficient  
✅ **Documentation improvements** - Making it clearer  
✅ **Test coverage** - More tests are always good  

## What We Don't Accept

❌ **New features** - Unless they directly support the core mission  
❌ **UI/UX additions** - This is a CLI tool  
❌ **Cloud sync** - Use Git for that  
❌ **Complex workflows** - Use existing tools  

## Development Setup

1. Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
```

2. Clone and install:
```bash
git clone https://github.com/tsutomu-n/kodama-claude
cd kodama-claude
bun install
```

3. Run tests:
```bash
bun test
```

4. Build binaries:
```bash
make build
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b fix/amazing-fix`)
3. Make your changes
4. Run tests (`bun test`)
5. Run type check (`bun run typecheck`)
6. Commit with clear message
7. Push to your fork
8. Open a Pull Request

## Code Style

- TypeScript with strict mode
- Prettier for formatting
- Clear variable names over comments
- Functional over OOP where possible

## Testing

Every new feature or fix should include tests:

```typescript
test("should handle edge case", async () => {
  // Arrange
  const input = createTestInput();
  
  // Act
  const result = await functionUnderTest(input);
  
  // Assert
  expect(result).toBe(expected);
});
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test guardian.test.ts

# Run with coverage
bun test --coverage
```

## Translation Guidelines

### Current Languages
- **English** (`en`) - Primary language
- **Japanese** (`ja`) - 日本語

### File Structure
```
docs/
├── en/           # English documentation
│   └── *.md
└── ja/           # Japanese documentation
    └── *.md

README.md         # English (default)
README.ja.md      # Japanese
```

### How to Contribute Translations

1. **For new translations:**
   - Copy the English file to the target language folder
   - Translate the content
   - Keep the same file name and structure
   - Update internal links to use relative paths

2. **For updating translations:**
   - Check `.github/translation-status.yml` for outdated translations
   - Compare with the English version
   - Update the translation
   - Mark status as `translated` in the status file

3. **Translation conventions:**
   - Keep code blocks and examples in English
   - Translate comments within code blocks
   - Keep command names (`kc go`, `kc save`) unchanged
   - Use native number formats and date formats

### Translation Status

Check `.github/translation-status.yml` to see which files need translation or updates.

Status values:
- `translated` - Fully translated and up-to-date
- `placeholder` - Auto-generated placeholder, needs translation
- `outdated` - Translation exists but English version has changed

### Adding a New Language

1. Create a new folder under `docs/` with the language code
2. Add README file with language selector at top
3. Update all existing READMEs with the new language option
4. Add language to `package.json` configuration
5. Update `src/i18n.ts` if adding UI translations

## Questions?

Open an issue for discussion before making large changes.

Remember: The best contribution is often saying "no" to complexity.