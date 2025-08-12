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
    
    # Function to check if a binary is Kodama
    is_kodama_binary() {
        local binary="$1"
        
        # Check if binary exists and is executable
        if [ ! -x "$binary" ]; then
            return 1
        fi
        
        # Check for Kodama in help output
        if "$binary" --help 2>&1 | grep -qi "kodama.*claude"; then
            return 0
        fi
        
        # Check for Kodama-specific subcommands
        if "$binary" go --help 2>&1 | grep -qi "claude.*context"; then
            return 0
        fi
        
        return 1
    }
    
    # Check for existing installations in multiple locations
    local found_binaries=()
    local kodama_binaries=()
    local other_kc_found=false
    
    # Check common installation locations
    for check_path in "$HOME/.local/bin/$BINARY_NAME" "/usr/local/bin/$BINARY_NAME" "/usr/bin/$BINARY_NAME"; do
        if [ -f "$check_path" ]; then
            found_binaries+=("$check_path")
        fi
    done
    
    # Also check using which -a to find all instances
    if command -v which &> /dev/null; then
        while IFS= read -r binary_path; do
            if [ -n "$binary_path" ] && [[ ! " ${found_binaries[@]} " =~ " ${binary_path} " ]]; then
                found_binaries+=("$binary_path")
            fi
        done < <(which -a $BINARY_NAME 2>/dev/null || true)
    fi
    
    # Check each found binary
    if [ ${#found_binaries[@]} -gt 0 ]; then
        echo "📍 Found existing 'kc' installations:"
        for binary_path in "${found_binaries[@]}"; do
            local version="unknown"
            local is_kodama=false
            
            if [ -x "$binary_path" ]; then
                version=$("$binary_path" --version 2>/dev/null | head -1 || echo "unknown")
                if is_kodama_binary "$binary_path"; then
                    is_kodama=true
                    kodama_binaries+=("$binary_path")
                fi
            fi
            
            if [ "$is_kodama" = true ]; then
                echo "   $binary_path (Kodama: $version)"
                
                # Remove old Kodama versions
                if [[ "$version" =~ (0\.1\.0|0\.2\.0) ]]; then
                    echo -e "   ${YELLOW}→ Removing old Kodama version...${NC}"
                    if [ -w "$binary_path" ]; then
                        rm -f "$binary_path"
                    elif command -v sudo &> /dev/null; then
                        sudo rm -f "$binary_path"
                    else
                        echo -e "   ${RED}❌ Cannot remove $binary_path (no write permission)${NC}"
                    fi
                fi
            else
                echo -e "   ${YELLOW}$binary_path (OTHER TOOL - NOT KODAMA)${NC}"
                other_kc_found=true
            fi
        done
        echo ""
        
        if [ "$other_kc_found" = true ]; then
            echo -e "${YELLOW}⚠️  Warning: Found other 'kc' command(s) that are NOT Kodama${NC}"
            echo "  Kodama will be installed to $INSTALL_DIR/$BINARY_NAME"
            echo "  You may need to adjust your PATH or use full path to run Kodama"
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
    
    # Verify installation and check for PATH issues
    if command -v $BINARY_NAME &> /dev/null; then
        local installed_version
        local actual_path
        actual_path=$(command -v $BINARY_NAME)
        installed_version=$($BINARY_NAME --version 2>/dev/null || echo "unknown")
        
        # Check if the correct version is being executed
        if [ "$actual_path" != "$INSTALL_DIR/$BINARY_NAME" ]; then
            echo -e "${YELLOW}⚠️  Warning: Wrong binary in PATH${NC}"
            echo "  Executing: $actual_path (version: $installed_version)"
            echo "  Installed: $INSTALL_DIR/$BINARY_NAME"
            
            # Try to get version of newly installed binary
            local new_version="unknown"
            if [ -x "$INSTALL_DIR/$BINARY_NAME" ]; then
                new_version=$("$INSTALL_DIR/$BINARY_NAME" --version 2>/dev/null || echo "unknown")
            fi
            echo "  New version: $new_version"
            echo ""
            
            # Suggest fix
            if [ "$actual_path" = "$HOME/.local/bin/$BINARY_NAME" ]; then
                echo "  To fix this issue:"
                echo "    rm -f $HOME/.local/bin/$BINARY_NAME"
                echo "    hash -r  # Clear command cache"
                echo ""
                echo "  Or use the new version directly:"
                echo "    $INSTALL_DIR/$BINARY_NAME"
            fi
        fi
        
        # Warn if very old version is somehow still present
        if [ "${installed_version}" = "0.1.0" ] || [ "${installed_version}" = "0.2.0" ]; then
            echo -e "${RED}❌ Installation completed but old version still in PATH${NC}"
            echo "  Please remove the old version:"
            echo "    rm -f $actual_path"
            echo "    hash -r  # Clear command cache"
            echo ""
            echo "  Then verify:"
            echo "    which kc  # Should show: $INSTALL_DIR/$BINARY_NAME"
            echo "    kc --version  # Should show: 0.3.0 or newer"
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
        
        # Detect language for documentation
        local doc_lang="en"
        if [[ "${LANG:-}" == ja* ]] || [[ "${LANGUAGE:-}" == ja* ]]; then
            doc_lang="ja"
        fi
        
        echo ""
        echo "🚀 Quick start (only 3 commands!):"
        echo "   kc go      - Start Claude with context"
        echo "   kc save    - Save snapshot & paste"
        echo "   kc status  - Check health (🟢/🟡/🔴/❓)"
        echo ""
        if [ "$doc_lang" = "ja" ]; then
            echo "📚 ドキュメント: https://github.com/${REPO}/blob/main/README.ja.md"
            echo "   詳細: https://github.com/${REPO}/tree/main/docs/ja"
        else
            echo "📚 Documentation: https://github.com/${REPO}"
            echo "   Details: https://github.com/${REPO}/tree/main/docs/en"
        fi
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