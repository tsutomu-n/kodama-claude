#!/bin/bash
# Local installation script for testing

set -e

echo "🏔️ KODAMA Claude Local Installer"
echo "================================"
echo ""

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Check if binary exists
if [ ! -f "dist/kc-linux-x64" ]; then
    echo "Building binary first..."
    make build
fi

# Install
echo "📂 Installing to ~/.local/bin..."
mkdir -p ~/.local/bin
cp dist/kc-linux-x64 ~/.local/bin/kc
chmod +x ~/.local/bin/kc

# Verify
if command -v kc &> /dev/null; then
    echo "✅ Installation successful!"
    kc --version
    echo ""
    kc status
else
    echo "⚠️ Installed but 'kc' not in PATH"
    echo "   Add to PATH: export PATH=~/.local/bin:\$PATH"
fi