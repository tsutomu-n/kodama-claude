#!/bin/bash
# KODAMA Claude - One-liner installation script
# Usage: curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash

# Exit on error, undefined variable, or pipe failure
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO="tsutomu-n/kodama-claude"
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="kc"
CHECKSUM_FILE="checksums.txt"
CHECKSUM_FILE_ALT="checksums.sha256"  # Alternative filename for backward compatibility

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
    
    if [ -z "${DOWNLOADER:-}" ]; then
        echo -e "${RED}❌ Neither curl nor wget found${NC}" >&2
        echo "  Please install one of them:" >&2
        echo "  Ubuntu/Debian: sudo apt-get install curl" >&2
        echo "  RHEL/Fedora:   sudo yum install curl" >&2
        echo "  Arch:          sudo pacman -S curl" >&2
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
        curl -fsSL "$url" -o "$output" || return 1
    else
        wget -q "$url" -O "$output" || return 1
    fi
}

# Verify SHA256 checksum
verify_checksum() {
    local file=$1
    local checksums_file=$2
    local binary_name=$3
    
    # Extract expected checksum for our binary
    local expected_checksum
    expected_checksum=$(grep "${binary_name}" "${checksums_file}" | awk '{print $1}') || true
    
    if [ -z "${expected_checksum}" ]; then
        echo -e "${YELLOW}⚠️  Warning: No checksum found for ${binary_name}${NC}" >&2
        echo "  Proceeding without verification (less secure)" >&2
        return 0
    fi
    
    # Calculate actual checksum
    local actual_checksum
    if command -v sha256sum &> /dev/null; then
        actual_checksum=$(sha256sum "${file}" | awk '{print $1}')
    elif command -v shasum &> /dev/null; then
        actual_checksum=$(shasum -a 256 "${file}" | awk '{print $1}')
    else
        echo -e "${YELLOW}⚠️  Warning: No SHA256 tool available${NC}" >&2
        echo "  Cannot verify download integrity" >&2
        return 0
    fi
    
    # Compare checksums
    if [ "${expected_checksum}" != "${actual_checksum}" ]; then
        echo -e "${RED}❌ Checksum verification failed!${NC}" >&2
        echo "  Expected: ${expected_checksum}" >&2
        echo "  Actual:   ${actual_checksum}" >&2
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} Checksum verified"
    return 0
}

# Main installation
main() {
    echo "🏔️ KODAMA Claude Installer"
    echo "========================="
    echo ""
    
    # Check requirements
    check_requirements
    
    # Check for existing installation
    if command -v $BINARY_NAME &> /dev/null; then
        local existing_version
        existing_version=$($BINARY_NAME --version 2>/dev/null || echo "unknown")
        
        if [ "${existing_version}" = "0.1.0" ]; then
            echo -e "${YELLOW}⚠️  Old version 0.1.0 detected${NC}"
            echo "  This version has known issues. Removing it..."
            
            # Try to remove old version
            if [ -w "$INSTALL_DIR/$BINARY_NAME" ]; then
                rm -f "$INSTALL_DIR/$BINARY_NAME"
            else
                echo "🔐 Administrator access required to remove old version"
                sudo rm -f "$INSTALL_DIR/$BINARY_NAME"
            fi
            echo "  Old version removed. Continuing with installation..."
            echo ""
        elif [ "${existing_version}" != "unknown" ]; then
            echo -e "${YELLOW}ℹ️  Existing version found: ${existing_version}${NC}"
            echo "  Installing latest version..."
            echo ""
        fi
    fi
    
    # Detect system
    local os=$(detect_os)
    local arch=$(detect_arch)
    local binary_name="kc-${os}-${arch}"
    
    echo "📍 System detected: ${os}/${arch}"
    
    # Get latest release URLs
    local latest_url="https://github.com/${REPO}/releases/latest"
    local download_url="https://github.com/${REPO}/releases/latest/download/${binary_name}"
    local checksum_url="https://github.com/${REPO}/releases/latest/download/${CHECKSUM_FILE}"
    
    echo "📦 Downloading latest release..."
    
    # Create temp directory
    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT
    
    # Download binary
    if ! download_file "$download_url" "$temp_dir/$binary_name"; then
        echo -e "${RED}❌ Failed to download binary${NC}" >&2
        echo "  URL: $download_url" >&2
        echo "" >&2
        echo "  Troubleshooting:" >&2
        echo "  1. Check your internet connection" >&2
        echo "  2. Try again in a few moments" >&2
        echo "  3. Download manually from: ${latest_url}" >&2
        exit 1
    fi
    
    # Download and verify checksum (optional but recommended)
    echo "🔐 Verifying download integrity..."
    local checksum_downloaded=false
    local checksum_local_file=""
    
    # Try primary checksum file
    if download_file "$checksum_url" "$temp_dir/${CHECKSUM_FILE}" 2>/dev/null; then
        checksum_downloaded=true
        checksum_local_file="$temp_dir/${CHECKSUM_FILE}"
    else
        # Try alternative checksum file for backward compatibility
        local checksum_url_alt="https://github.com/${REPO}/releases/latest/download/${CHECKSUM_FILE_ALT}"
        if download_file "$checksum_url_alt" "$temp_dir/${CHECKSUM_FILE_ALT}" 2>/dev/null; then
            checksum_downloaded=true
            checksum_local_file="$temp_dir/${CHECKSUM_FILE_ALT}"
        fi
    fi
    
    if [ "$checksum_downloaded" = true ]; then
        if ! verify_checksum "$temp_dir/$binary_name" "$checksum_local_file" "${binary_name}"; then
            echo "" >&2
            echo "  Security notice: The downloaded file may be corrupted or tampered with." >&2
            echo "  Please report this at: https://github.com/${REPO}/issues" >&2
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  Warning: Could not download checksums file${NC}"
        echo "  Proceeding without verification (less secure)"
        echo "  To verify manually, check: ${checksum_url}"
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
        local installed_version
        installed_version=$($BINARY_NAME --version 2>/dev/null || echo "unknown")
        
        # Warn if very old version is somehow still present
        if [ "${installed_version}" = "0.1.0" ] || [ "${installed_version}" = "0.2.0" ]; then
            echo -e "${YELLOW}⚠️  Warning: Installation may have failed${NC}"
            echo "  Detected version: ${installed_version}"
            echo "  Expected: 0.3.0 or newer"
            echo ""
            echo "  To fix, please run:"
            echo "    sudo rm -f /usr/local/bin/kc"
            echo "    wget https://github.com/tsutomu-n/kodama-claude/releases/download/v0.3.0/kc-linux-x64"
            echo "    chmod +x kc-linux-x64"
            echo "    sudo mv kc-linux-x64 /usr/local/bin/kc"
            exit 1
        fi
        
        echo -e "${GREEN}✅ KODAMA Claude installed successfully!${NC}"
        echo "   Version: ${installed_version}"
        echo ""
        
        # Run status check
        echo "🏥 Running health check..."
        if ! $BINARY_NAME status 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Some optional features may be limited${NC}"
            echo "  Run 'kc status' for details"
        fi
        
        echo ""
        echo "🚀 Quick start (only 3 commands!):"
        echo "   kc go      - Start Claude with context"
        echo "   kc save    - Save snapshot & paste"
        echo "   kc status  - Check health (🟢/🟡/🔴/❓)"
        echo ""
        echo "📚 Documentation: https://github.com/${REPO}"
        echo "🗑️  Uninstall: kc uninstall"
    else
        echo -e "${RED}❌ Installation may have succeeded but 'kc' is not in PATH${NC}" >&2
        echo "  Add $INSTALL_DIR to your PATH:" >&2
        echo "  export PATH=$INSTALL_DIR:\$PATH" >&2
        exit 1
    fi
}

# Run main installation
main "$@"