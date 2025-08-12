#!/bin/bash
# KODAMA Claude - Uninstaller Script
# Safe and user-friendly uninstallation with data preservation options

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BINARY_NAME="kc"
DATA_DIR="$HOME/.local/share/kodama-claude"
CONFIG_DIR="$HOME/.config/kodama-claude"
BACKUP_DIR="$HOME/kodama-claude-backup-$(date +%Y%m%d-%H%M%S)"

# Binary paths will be detected dynamically
BINARY_PATHS=()

# Default options
KEEP_DATA=true
DRY_RUN=false
FORCE=false
CREATE_BACKUP=false
QUIET=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --remove-all|--purge)
            KEEP_DATA=false
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force|-f)
            FORCE=true
            shift
            ;;
        --backup)
            CREATE_BACKUP=true
            shift
            ;;
        --quiet|-q)
            QUIET=true
            shift
            ;;
        --help|-h)
            cat << EOF
🗑️  KODAMA Claude Uninstaller

Usage: $0 [OPTIONS]

Options:
  --remove-all, --purge  Remove all data including snapshots
  --dry-run             Show what would be removed without removing
  --force, -f           Skip confirmation prompts
  --backup              Create backup before removing data
  --quiet, -q           Suppress non-error output
  --help, -h            Show this help message

By default, only the binary is removed and your data is preserved.

Examples:
  $0                    # Interactive uninstall (keeps data)
  $0 --remove-all       # Remove everything including snapshots
  $0 --dry-run          # Preview what will be removed
  $0 --backup --purge   # Backup data then remove everything

Data locations:
  Binary:     $BINARY_PATH
  Snapshots:  $DATA_DIR/snapshots/
  Event log:  $DATA_DIR/events.jsonl
  Config:     $CONFIG_DIR

EOF
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Run '$0 --help' for usage information"
            exit 1
            ;;
    esac
done

# Utility functions
log() {
    if [ "$QUIET" = false ]; then
        echo -e "$1"
    fi
}

error() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    exit 1
}

warning() {
    if [ "$QUIET" = false ]; then
        echo -e "${YELLOW}⚠️  Warning: $1${NC}"
    fi
}

success() {
    if [ "$QUIET" = false ]; then
        echo -e "${GREEN}✅ $1${NC}"
    fi
}

# Function to check if a binary is Kodama
is_kodama_binary() {
    local binary="$1"
    
    # Check if binary exists and is executable
    if [ ! -x "$binary" ]; then
        return 1
    fi
    
    # Check version output for Kodama signature
    local version_output
    version_output=$("$binary" --version 2>&1 | head -1 || true)
    if [[ "$version_output" =~ ^Kodama\ for\ Claude\ Code ]]; then
        return 0
    fi
    
    # Legacy check for old versions
    if [[ "$version_output" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        # Plain version number might be old Kodama
        # Check for Kodama-specific subcommands
        if "$binary" go --help 2>&1 | grep -qi "claude.*context" && \
           "$binary" save --help 2>&1 | grep -qi "snapshot" && \
           "$binary" status --help 2>&1 | grep -qi "health"; then
            return 0
        fi
    fi
    
    return 1
}

# Check if KODAMA is installed
check_installation() {
    local found=false
    
    # Find all kc binaries
    local check_paths=(
        "$HOME/.local/bin/$BINARY_NAME"
        "/usr/local/bin/$BINARY_NAME"
        "/usr/bin/$BINARY_NAME"
    )
    
    # Check each path
    for path in "${check_paths[@]}"; do
        if [ -f "$path" ] && is_kodama_binary "$path"; then
            BINARY_PATHS+=("$path")
            found=true
            local version
            version=$("$path" --version 2>/dev/null | head -1 || echo "unknown")
            log "${BLUE}Found Kodama binary:${NC} $path (version: $version)"
        elif [ -f "$path" ]; then
            log "${YELLOW}Found non-Kodama 'kc':${NC} $path (will NOT remove)"
        fi
    done
    
    # Also check using which
    if command -v which &> /dev/null; then
        while IFS= read -r binary_path; do
            if [ -n "$binary_path" ] && [[ ! " ${BINARY_PATHS[@]} " =~ " ${binary_path} " ]]; then
                if is_kodama_binary "$binary_path"; then
                    BINARY_PATHS+=("$binary_path")
                    found=true
                    local version
                    version=$("$binary_path" --version 2>/dev/null | head -1 || echo "unknown")
                    log "${BLUE}Found Kodama binary:${NC} $binary_path (version: $version)"
                fi
            fi
        done < <(which -a $BINARY_NAME 2>/dev/null || true)
    fi
    
    if [ -d "$DATA_DIR" ]; then
        found=true
        local snapshot_count
        local data_size
        snapshot_count=$(find "$DATA_DIR/snapshots" -name "*.json" 2>/dev/null | wc -l || echo 0)
        data_size=$(du -sh "$DATA_DIR" 2>/dev/null | cut -f1 || echo "0")
        log "${BLUE}Found data:${NC} $DATA_DIR ($snapshot_count snapshots, $data_size)"
    fi
    
    if [ "$found" = false ]; then
        error "Kodama for Claude Code is not installed on this system"
    fi
}

# Calculate what will be removed
calculate_removal() {
    log "\n${BLUE}📊 Removal Summary:${NC}"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Binaries
    if [ ${#BINARY_PATHS[@]} -gt 0 ]; then
        log "${GREEN}Will remove:${NC}"
        for binary_path in "${BINARY_PATHS[@]}"; do
            local binary_size
            binary_size=$(du -h "$binary_path" 2>/dev/null | cut -f1 || echo "unknown")
            log "  • Binary: $binary_path ($binary_size)"
        done
    fi
    
    # Data
    if [ "$KEEP_DATA" = false ] && [ -d "$DATA_DIR" ]; then
        local snapshot_count
        local data_size
        snapshot_count=$(find "$DATA_DIR/snapshots" -name "*.json" 2>/dev/null | wc -l || echo 0)
        data_size=$(du -sh "$DATA_DIR" 2>/dev/null | cut -f1 || echo "0")
        log "  • Data directory: $DATA_DIR"
        log "    - $snapshot_count snapshot(s)"
        log "    - Total size: $data_size"
    elif [ -d "$DATA_DIR" ]; then
        log "\n${YELLOW}Will keep:${NC}"
        local snapshot_count
        snapshot_count=$(find "$DATA_DIR/snapshots" -name "*.json" 2>/dev/null | wc -l || echo 0)
        log "  • Snapshots: $DATA_DIR/snapshots/ ($snapshot_count files)"
        log "  • Event log: $DATA_DIR/events.jsonl"
        log "\n  ${BLUE}ℹ️  Use --remove-all to delete data${NC}"
    fi
    
    # Config
    if [ "$KEEP_DATA" = false ] && [ -d "$CONFIG_DIR" ]; then
        log "  • Config directory: $CONFIG_DIR"
    fi
    
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Create backup
create_backup() {
    if [ "$CREATE_BACKUP" = true ] && [ -d "$DATA_DIR" ]; then
        log "\n${BLUE}📦 Creating backup...${NC}"
        mkdir -p "$BACKUP_DIR"
        
        if cp -r "$DATA_DIR" "$BACKUP_DIR/data" 2>/dev/null; then
            success "Backup created: $BACKUP_DIR"
            
            # Create restore script
            cat > "$BACKUP_DIR/restore.sh" << 'RESTORE_EOF'
#!/bin/bash
echo "🔄 Restoring KODAMA Claude data..."
mkdir -p "$HOME/.local/share"
cp -r data "$HOME/.local/share/kodama-claude"
echo "✅ Data restored successfully!"
RESTORE_EOF
            chmod +x "$BACKUP_DIR/restore.sh"
            log "  Run ${GREEN}$BACKUP_DIR/restore.sh${NC} to restore"
        else
            warning "Failed to create backup"
        fi
    fi
}

# Confirm removal
confirm_removal() {
    if [ "$FORCE" = true ]; then
        return 0
    fi
    
    echo
    if [ "$KEEP_DATA" = false ]; then
        echo -e "${YELLOW}⚠️  WARNING: This will permanently delete all your snapshots!${NC}"
    fi
    
    read -p "Do you want to continue? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "\n${YELLOW}Uninstall cancelled${NC}"
        exit 0
    fi
}

# Remove binaries
remove_binaries() {
    for binary_path in "${BINARY_PATHS[@]}"; do
        if [ "$DRY_RUN" = true ]; then
            log "${BLUE}[DRY RUN]${NC} Would remove: $binary_path"
        else
            # Double-check it's still Kodama (safety)
            if ! is_kodama_binary "$binary_path"; then
                warning "Skipping $binary_path - not a Kodama binary"
                continue
            fi
            
            # Validate binary path
            if [[ "$binary_path" != */kc ]]; then
                error "Unexpected binary path: $binary_path"
                continue
            fi
            
            # Check if we need sudo
            if [ -w "$binary_path" ] || [ -w "$(dirname "$binary_path")" ]; then
                rm -f "$binary_path" || warning "Failed to remove $binary_path"
            else
                log "${YELLOW}Administrator access required for $binary_path${NC}"
                if command -v sudo &> /dev/null; then
                    sudo rm -f "$binary_path" || warning "Failed to remove $binary_path with sudo"
                else
                    warning "Cannot remove $binary_path without sudo access"
                    continue
                fi
            fi
            
            # Verify removal
            if [ ! -f "$binary_path" ]; then
                success "Removed: $binary_path"
            else
                warning "May not have removed: $binary_path"
            fi
        fi
    done
}

# Validate path safety
validate_path() {
    local path="$1"
    
    # Check if path is not empty and not root
    if [ -z "$path" ] || [ "$path" = "/" ] || [ "$path" = "$HOME" ]; then
        error "Refusing to remove unsafe path: $path"
        return 1
    fi
    
    # Check if path contains kodama-claude
    if [[ "$path" != *"kodama-claude"* ]]; then
        warning "Path does not contain 'kodama-claude': $path"
        read -p "Are you sure you want to remove this? [y/N]: " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    return 0
}

# Remove data
remove_data() {
    if [ "$KEEP_DATA" = false ]; then
        if [ -d "$DATA_DIR" ]; then
            if [ "$DRY_RUN" = true ]; then
                log "${BLUE}[DRY RUN]${NC} Would remove: $DATA_DIR"
            else
                if validate_path "$DATA_DIR"; then
                    rm -rf "$DATA_DIR"
                    success "Data directory removed"
                else
                    warning "Skipped removing data directory"
                fi
            fi
        fi
        
        if [ -d "$CONFIG_DIR" ]; then
            if [ "$DRY_RUN" = true ]; then
                log "${BLUE}[DRY RUN]${NC} Would remove: $CONFIG_DIR"
            else
                if validate_path "$CONFIG_DIR"; then
                    rm -rf "$CONFIG_DIR"
                    success "Config directory removed"
                else
                    warning "Skipped removing config directory"
                fi
            fi
        fi
    fi
}

# Verify removal
verify_removal() {
    if [ "$DRY_RUN" = false ]; then
        local all_removed=true
        
        for binary_path in "${BINARY_PATHS[@]}"; do
            if [ -f "$binary_path" ]; then
                warning "Binary still exists: $binary_path"
                all_removed=false
            fi
        done
        
        if [ "$KEEP_DATA" = false ] && [ -d "$DATA_DIR" ]; then
            warning "Data directory still exists: $DATA_DIR"
            all_removed=false
        fi
        
        if [ "$all_removed" = true ]; then
            echo
            if [ "$KEEP_DATA" = true ]; then
                success "KODAMA Claude uninstalled successfully!"
                log "${BLUE}ℹ️  Your snapshots are preserved in: $DATA_DIR${NC}"
                log "${BLUE}   To remove them later, run: rm -rf $DATA_DIR${NC}"
            else
                success "KODAMA Claude completely removed!"
            fi
        fi
    fi
}

# Main execution
main() {
    log "${BLUE}🗑️  KODAMA Claude Uninstaller${NC}"
    log "═══════════════════════════════════════"
    
    # Check installation
    check_installation
    
    # Show what will be removed
    calculate_removal
    
    # Confirm with user
    confirm_removal
    
    # Create backup if requested
    create_backup
    
    # Perform removal
    log "\n${BLUE}🔧 Uninstalling...${NC}"
    remove_binaries
    remove_data
    
    # Verify
    verify_removal
    
    if [ "$DRY_RUN" = true ]; then
        log "\n${BLUE}ℹ️  This was a dry run. No files were actually removed.${NC}"
        log "   Run without --dry-run to perform actual uninstall."
    fi
    
    log "\n${GREEN}Thank you for using KODAMA Claude!${NC}"
}

# Run main function
main