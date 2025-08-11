/**
 * CLAUDE.md manager for context synchronization
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { join } from "path";
import { config } from "./config";
import type { Snapshot } from "./types";

export class ClaudeMdManager {
  private readonly MARKER_START = '<!-- KODAMA:START -->';
  private readonly MARKER_END = '<!-- KODAMA:END -->';
  
  /**
   * Update CLAUDE.md with snapshot context
   */
  updateSection(snapshot: Snapshot, workingDir?: string, dryRun: boolean = true): boolean {
    // Check if feature is enabled (opt-in)
    if (!config.claudeMdSync) {
      if (config.debug) {
        console.log('ℹ️  CLAUDE.md sync is disabled (set KODAMA_CLAUDE_SYNC=true to enable)');
      }
      return false;
    }
    
    // Dry run by default
    if (dryRun) {
      if (config.debug) {
        console.log('ℹ️  CLAUDE.md dry-run mode - no changes will be made');
        console.log('    To actually update: set KODAMA_CLAUDE_SYNC_DRY_RUN=false');
      }
      return this.simulateUpdate(snapshot, workingDir);
    }
    
    const claudeMdPath = join(workingDir || process.cwd(), 'CLAUDE.md');
    
    // Check if we should update
    if (!this.shouldUpdate(claudeMdPath)) {
      return false;
    }
    
    try {
      const section = this.generateSection(snapshot);
      const updated = this.injectSection(claudeMdPath, section);
      
      // Create backup if file exists
      if (existsSync(claudeMdPath)) {
        const backupPath = `${claudeMdPath}.backup`;
        copyFileSync(claudeMdPath, backupPath);
        if (config.debug) {
          console.log(`📋 Created backup: ${backupPath}`);
        }
      }
      
      // Write updated content
      writeFileSync(claudeMdPath, updated, 'utf-8');
      
      if (config.debug) {
        console.log('✅ CLAUDE.md updated with latest context');
      }
      
      return true;
    } catch (error) {
      // Non-fatal error - CLAUDE.md update is optional
      if (config.debug) {
        console.warn(`⚠️  CLAUDE.md update skipped: ${error}`);
      }
      return false;
    }
  }
  
  /**
   * Check if we should update the file
   */
  private shouldUpdate(path: string): boolean {
    // If file doesn't exist, create it with markers
    if (!existsSync(path)) {
      const initialContent = this.createInitialContent();
      writeFileSync(path, initialContent, 'utf-8');
      if (config.debug) {
        console.log('📝 Created CLAUDE.md with KODAMA markers');
      }
      return true;
    }
    
    // Check if file has KODAMA markers
    const content = readFileSync(path, 'utf-8');
    if (!content.includes(this.MARKER_START)) {
      if (config.debug) {
        console.log('ℹ️  CLAUDE.md exists but no KODAMA markers found. Add markers to enable auto-update.');
        console.log('    Add these lines to your CLAUDE.md:');
        console.log(`    ${this.MARKER_START}`);
        console.log(`    ${this.MARKER_END}`);
      }
      return false;
    }
    
    return true;
  }
  
  /**
   * Generate KODAMA section content
   */
  private generateSection(snapshot: Snapshot): string {
    const lines: string[] = [
      this.MARKER_START,
      '## 📦 KODAMA Context',
      '',
      `*Last updated: ${new Date().toISOString()}*`,
      '',
    ];
    
    // Current step
    if (snapshot.step) {
      lines.push(`### Current Step: \`${snapshot.step}\``);
      lines.push('');
    }
    
    // Recent decisions (max 3 for brevity)
    if (snapshot.decisions && snapshot.decisions.length > 0) {
      lines.push('### Recent Decisions');
      snapshot.decisions.slice(-3).forEach(decision => {
        lines.push(`- ${decision}`);
      });
      lines.push('');
    }
    
    // Next steps (max 3 for brevity)
    if (snapshot.nextSteps && snapshot.nextSteps.length > 0) {
      lines.push('### Next Steps');
      snapshot.nextSteps.slice(0, 3).forEach((step, index) => {
        lines.push(`${index + 1}. ${step}`);
      });
      lines.push('');
    }
    
    // Git context
    if (snapshot.gitBranch) {
      lines.push('### Git Context');
      lines.push(`- Branch: \`${snapshot.gitBranch}\``);
      if (snapshot.gitCommit) {
        lines.push(`- Commit: \`${snapshot.gitCommit.substring(0, 7)}\``);
      }
      lines.push('');
    }
    
    lines.push(this.MARKER_END);
    
    return lines.join('\n');
  }
  
  /**
   * Inject KODAMA section into existing content
   */
  private injectSection(path: string, section: string): string {
    const content = readFileSync(path, 'utf-8');
    
    // Replace existing KODAMA section
    const regex = new RegExp(
      `${this.escapeRegex(this.MARKER_START)}[\\s\\S]*?${this.escapeRegex(this.MARKER_END)}`,
      'g'
    );
    
    if (content.match(regex)) {
      // Replace existing section
      return content.replace(regex, section);
    } else {
      // Append section at the end
      return content + '\n\n' + section;
    }
  }
  
  /**
   * Create initial CLAUDE.md content
   */
  private createInitialContent(): string {
    return `# Project Context

This file is automatically updated by KODAMA to maintain context for Claude Code.

${this.MARKER_START}
## 📦 KODAMA Context

*No context yet - run \`kc save\` to generate context*

${this.MARKER_END}
`;
  }
  
  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Simulate update without making changes (for dry-run)
   */
  private simulateUpdate(snapshot: Snapshot, workingDir?: string): boolean {
    const claudeMdPath = join(workingDir || process.cwd(), 'CLAUDE.md');
    
    try {
      // Check if file exists
      const exists = existsSync(claudeMdPath);
      
      if (!exists) {
        console.log('📝 [DRY-RUN] Would create CLAUDE.md with KODAMA markers');
      } else {
        const content = readFileSync(claudeMdPath, 'utf-8');
        const hasMarkers = content.includes(this.MARKER_START);
        
        if (hasMarkers) {
          console.log('📝 [DRY-RUN] Would update existing KODAMA section in CLAUDE.md');
        } else {
          console.log('📝 [DRY-RUN] Would add KODAMA markers to CLAUDE.md');
          console.log('    Add these lines to enable auto-update:');
          console.log(`    ${this.MARKER_START}`);
          console.log(`    ${this.MARKER_END}`);
        }
      }
      
      // Show what would be added
      if (config.debug) {
        const section = this.generateSection(snapshot);
        console.log('\n📝 [DRY-RUN] Would add this content:');
        console.log('───────────────────────────────────');
        console.log(section);
        console.log('───────────────────────────────────');
      }
      
      return true;
    } catch (error) {
      if (config.debug) {
        console.warn(`⚠️  [DRY-RUN] Would skip CLAUDE.md update: ${error}`);
      }
      return false;
    }
  }
}