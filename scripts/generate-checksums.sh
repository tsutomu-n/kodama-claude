#!/bin/bash
# Generate SHA256 checksums for all binaries in dist/

set -euo pipefail

# Change to dist directory
cd "$(dirname "$0")/../dist" || exit 1

# Generate checksums
echo "Generating SHA256 checksums..."

# Create checksums file
{
    for file in kc-*; do
        if [ -f "$file" ]; then
            if command -v sha256sum &> /dev/null; then
                sha256sum "$file"
            elif command -v shasum &> /dev/null; then
                shasum -a 256 "$file"
            else
                echo "Error: No SHA256 tool available" >&2
                exit 1
            fi
        fi
    done
} > checksums.txt

echo "✅ Generated checksums.txt"
cat checksums.txt