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
BINARY_PATH="/usr/local/bin/kc"
DATA_DIR="$HOME/.local/share/kodama-claude"
CONFIG_DIR="$HOME/.config/kodama-claude"
BACKUP_DIR="$HOME/kodama-claude-backup-$(date +%Y%m%d-%H%M%S)"

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

# Check if KODAMA is installed
check_installation() {
    local found=false
    
    if [ -f "$BINARY_PATH" ]; then
        found=true
        log "${BLUE}Found binary:${NC} $BINARY_PATH"
    fi
    
    if [ -d "$DATA_DIR" ]; then
        found=true
        local snapshot_count=$(find "$DATA_DIR/snapshots" -name "*.json" 2>/dev/null | wc -l || echo 0)
        local data_size=$(du -sh "$DATA_DIR" 2>/dev/null | cut -f1 || echo "0")
        log "${BLUE}Found data:${NC} $DATA_DIR ($snapshot_count snapshots, $data_size)"
    fi
    
    if [ "$found" = false ]; then
        error "KODAMA Claude is not installed on this system"
    fi
}

# Calculate what will be removed
calculate_removal() {
    log "\n${BLUE}📊 Removal Summary:${NC}"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Binary
    if [ -f "$BINARY_PATH" ]; then
        local binary_size=$(du -h "$BINARY_PATH" 2>/dev/null | cut -f1 || echo "unknown")
        log "${GREEN}Will remove:${NC}"
        log "  • Binary: $BINARY_PATH ($binary_size)"
    fi
    
    # Data
    if [ "$KEEP_DATA" = false ] && [ -d "$DATA_DIR" ]; then
        local snapshot_count=$(find "$DATA_DIR/snapshots" -name "*.json" 2>/dev/null | wc -l || echo 0)
        local data_size=$(du -sh "$DATA_DIR" 2>/dev/null | cut -f1 || echo "0")
        log "  • Data directory: $DATA_DIR"
        log "    - $snapshot_count snapshot(s)"
        log "    - Total size: $data_size"
    elif [ -d "$DATA_DIR" ]; then
        log "\n${YELLOW}Will keep:${NC}"
        local snapshot_count=$(find "$DATA_DIR/snapshots" -name "*.json" 2>/dev/null | wc -l || echo 0)
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

# Remove binary
remove_binary() {
    if [ -f "$BINARY_PATH" ]; then
        if [ "$DRY_RUN" = true ]; then
            log "${BLUE}[DRY RUN]${NC} Would remove: $BINARY_PATH"
        else
            # Check if we need sudo
            if [ -w "$BINARY_PATH" ] || [ -w "$(dirname "$BINARY_PATH")" ]; then
                rm -f "$BINARY_PATH"
            else
                log "${YELLOW}Administrator access required${NC}"
                sudo rm -f "$BINARY_PATH"
            fi
            success "Binary removed"
        fi
    fi
}

# Remove data
remove_data() {
    if [ "$KEEP_DATA" = false ]; then
        if [ -d "$DATA_DIR" ]; then
            if [ "$DRY_RUN" = true ]; then
                log "${BLUE}[DRY RUN]${NC} Would remove: $DATA_DIR"
            else
                rm -rf "$DATA_DIR"
                success "Data directory removed"
            fi
        fi
        
        if [ -d "$CONFIG_DIR" ]; then
            if [ "$DRY_RUN" = true ]; then
                log "${BLUE}[DRY RUN]${NC} Would remove: $CONFIG_DIR"
            else
                rm -rf "$CONFIG_DIR"
                success "Config directory removed"
            fi
        fi
    fi
}

# Verify removal
verify_removal() {
    if [ "$DRY_RUN" = false ]; then
        local all_removed=true
        
        if [ -f "$BINARY_PATH" ]; then
            warning "Binary still exists: $BINARY_PATH"
            all_removed=false
        fi
        
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
    remove_binary
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