# KODAMA Claude - Development Makefile

.PHONY: help install dev test build clean release doctor

# Default target
help:
	@echo "KODAMA Claude - Development Commands"
	@echo "===================================="
	@echo ""
	@echo "  make install    - Install dependencies"
	@echo "  make dev        - Run in development mode"
	@echo "  make test       - Run tests"
	@echo "  make build      - Build binaries for all platforms"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make release    - Create release (requires tag)"
	@echo "  make doctor     - Run health check"
	@echo ""

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	@if command -v bun >/dev/null 2>&1; then \
		bun install; \
	else \
		echo "⚠️ Bun not found, using npm..."; \
		npm install; \
	fi

# Development mode
dev:
	@echo "🔧 Running in development mode..."
	@bun run bin/kc.ts $(ARGS)

# Run tests
test:
	@echo "🧪 Running tests..."
	@bun test

# Build binaries
build: clean
	@echo "🔨 Building binaries..."
	@mkdir -p dist
	
	@echo "  Building Linux x64..."
	@bun build ./bin/kc.ts \
		--compile \
		--target=bun-linux-x64-baseline \
		--outfile dist/kc-linux-x64
	
	@echo "  Building Linux ARM64..."
	@bun build ./bin/kc.ts \
		--compile \
		--target=bun-linux-arm64 \
		--outfile dist/kc-linux-arm64
	
	@echo "  Setting permissions..."
	@chmod +x dist/kc-linux-*
	
	@echo "  Generating checksums..."
	@cd dist && sha256sum kc-linux-* > checksums.sha256
	
	@echo "✅ Build complete! Binaries in dist/"
	@ls -lh dist/

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf dist/
	@rm -f kc-linux-* kc-darwin-* kc-windows-*
	@echo "✅ Clean complete"

# Create release (for CI)
release:
	@if [ -z "$(VERSION)" ]; then \
		echo "❌ VERSION not set. Usage: make release VERSION=v0.1.0"; \
		exit 1; \
	fi
	@echo "📦 Creating release $(VERSION)..."
	@git tag -a $(VERSION) -m "Release $(VERSION)"
	@git push origin $(VERSION)
	@echo "✅ Release tag pushed. GitHub Actions will build and publish."

# Run doctor check
doctor:
	@echo "🏥 Running health check..."
	@if [ -f dist/kc-linux-x64 ]; then \
		./dist/kc-linux-x64 doctor; \
	elif command -v bun >/dev/null 2>&1; then \
		bun run bin/kc.ts doctor; \
	else \
		echo "❌ No binary found. Run 'make build' first."; \
	fi

# Quick test commands
test-snap:
	@bun run bin/kc.ts snap -t "Test snapshot"

test-go:
	@bun run bin/kc.ts go

test-plan:
	@bun run bin/kc.ts plan -t "Test plan"

test-send:
	@bun run bin/kc.ts send

# Install locally for testing
install-local: build
	@echo "📂 Installing locally..."
	@mkdir -p ~/.local/bin
	@cp dist/kc-linux-x64 ~/.local/bin/kc
	@chmod +x ~/.local/bin/kc
	@echo "✅ Installed to ~/.local/bin/kc"
	@echo "   Add to PATH: export PATH=~/.local/bin:\$$PATH"