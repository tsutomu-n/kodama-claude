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
git clone https://github.com/kodama-cli/kodama-claude
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
test("should handle edge case", () => {
  // Arrange
  const input = createTestInput();
  
  // Act
  const result = functionUnderTest(input);
  
  // Assert
  expect(result).toBe(expected);
});
```

## Questions?

Open an issue for discussion before making large changes.

Remember: The best contribution is often saying "no" to complexity.