#!/bin/bash
# Script to publish KODAMA Claude to GitHub

set -e

echo "📦 KODAMA Claude - GitHub Publishing Script"
echo "=========================================="
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️ You have uncommitted changes. Commit them first."
    exit 1
fi

echo "This script will help you publish to GitHub."
echo ""
echo "Prerequisites:"
echo "1. Create a GitHub organization: kodama-cli"
echo "2. Create a new repository: kodama-claude"
echo "3. Make it public with MIT license"
echo ""
echo "Ready? Press Enter to continue..."
read

# Add remote
echo "Adding GitHub remote..."
git remote add origin https://github.com/tsutomu-n/kodama-claude.git 2>/dev/null || {
    echo "Remote already exists, updating..."
    git remote set-url origin https://github.com/tsutomu-n/kodama-claude.git
}

# Push main branch
echo "Pushing main branch..."
git push -u origin master

# Create and push tag
VERSION="v0.1.0"
echo "Creating release tag $VERSION..."
git tag -a $VERSION -m "Release $VERSION - Initial release of KODAMA Claude"
git push origin $VERSION

echo ""
echo "✅ Published to GitHub!"
echo ""
echo "Next steps:"
echo "1. Go to https://github.com/tsutomu-n/kodama-claude/releases"
echo "2. GitHub Actions will build and attach binaries"
echo "3. Edit release notes if needed"
echo "4. Share with the community!"
echo ""
echo "Installation one-liner will work after release:"
echo "curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash"