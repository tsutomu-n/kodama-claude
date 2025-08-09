#!/bin/bash
# KODAMA Claude - One-liner installation script
# Usage: curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO="tsutomu-n/kodama-claude"
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="kc"

# Detect architecture
detect_arch() {
    local arch=$(uname -m)
    case $arch in
        x86_64)
            echo "x64"
            ;;
        aarch64|arm64)
            echo "arm64"
            ;;
        *)
            echo "❌ Unsupported architecture: $arch" >&2
            exit 1
            ;;
    esac
}

# Detect OS
detect_os() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    case $os in
        linux)
            echo "linux"
            ;;
        *)
            echo "❌ Unsupported OS: $os" >&2
            echo "  KODAMA Claude currently supports Linux only" >&2
            exit 1
            ;;
    esac
}

# Check for required commands
check_requirements() {
    local missing=()
    
    for cmd in curl wget; do
        if command -v $cmd &> /dev/null; then
            DOWNLOADER=$cmd
            break
        fi
    done
    
    if [ -z "$DOWNLOADER" ]; then
        echo "❌ Neither curl nor wget found. Please install one of them." >&2
        exit 1
    fi
    
    if ! command -v tar &> /dev/null; then
        missing+=("tar")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo "❌ Missing required commands: ${missing[*]}" >&2
        echo "  Please install them and try again" >&2
        exit 1
    fi
}

# Download file
download_file() {
    local url=$1
    local output=$2
    
    if [ "$DOWNLOADER" = "curl" ]; then
        curl -fsSL "$url" -o "$output"
    else
        wget -q "$url" -O "$output"
    fi
}

# Main installation
main() {
    echo "🏔️ KODAMA Claude Installer"
    echo "========================="
    echo ""
    
    # Check requirements
    check_requirements
    
    # Detect system
    local os=$(detect_os)
    local arch=$(detect_arch)
    local binary_name="kc-${os}-${arch}"
    
    echo "📍 System detected: ${os}/${arch}"
    
    # Get latest release URL
    local latest_url="https://github.com/${REPO}/releases/latest"
    local download_url="https://github.com/${REPO}/releases/latest/download/${binary_name}"
    
    echo "📦 Downloading latest release..."
    
    # Create temp directory
    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT
    
    # Download binary
    if ! download_file "$download_url" "$temp_dir/$binary_name"; then
        echo "❌ Failed to download binary" >&2
        echo "  URL: $download_url" >&2
        exit 1
    fi
    
    # Make executable
    chmod +x "$temp_dir/$binary_name"
    
    # Check if we need sudo
    local use_sudo=""
    if [ ! -w "$INSTALL_DIR" ]; then
        if command -v sudo &> /dev/null; then
            use_sudo="sudo"
            echo "🔐 Administrator access required to install to $INSTALL_DIR"
        else
            echo "❌ Cannot write to $INSTALL_DIR and sudo not available" >&2
            echo "  Try installing to a user directory instead:" >&2
            echo "  mkdir -p ~/.local/bin" >&2
            echo "  mv $temp_dir/$binary_name ~/.local/bin/$BINARY_NAME" >&2
            echo "  export PATH=~/.local/bin:\$PATH" >&2
            exit 1
        fi
    fi
    
    # Install binary
    echo "📂 Installing to $INSTALL_DIR/$BINARY_NAME..."
    $use_sudo mv "$temp_dir/$binary_name" "$INSTALL_DIR/$BINARY_NAME"
    
    # Verify installation
    if command -v $BINARY_NAME &> /dev/null; then
        echo -e "${GREEN}✅ KODAMA Claude installed successfully!${NC}"
        echo ""
        
        # Run doctor check
        echo "🏥 Running health check..."
        $BINARY_NAME doctor || true
        
        echo ""
        echo "🚀 Quick start:"
        echo "   kc snap    - Create a snapshot of your current work"
        echo "   kc go      - Start or continue Claude session"
        echo "   kc plan    - Plan your next development steps"
        echo ""
        echo "📚 Documentation: https://github.com/${REPO}"
    else
        echo -e "${RED}❌ Installation may have succeeded but 'kc' is not in PATH${NC}" >&2
        echo "  Add $INSTALL_DIR to your PATH:" >&2
        echo "  export PATH=$INSTALL_DIR:\$PATH" >&2
        exit 1
    fi
}

# Run main installation
main "$@"