/**
 * Atomic Context Pack - Fixed template format for Claude injection
 * Ensures reproducibility and consistency across sessions
 */

import { validateContent, cleanContent } from "./security/redline";
import { config } from "./config";
import type { Snapshot } from "./types";

/**
 * Context Pack configuration with validation
 */
export interface PackConfig {
  maxDecisions: number;        // Default: 5
  maxNextSteps: number;        // Default: 5
  maxLineLength: number;       // Default: 120 characters
  maxContextLength: number;    // Default: 3000 characters
  includeGitInfo: boolean;     // Default: true
  includeTimestamp: boolean;   // Default: true
  templateVersion: "A" | "B";  // Default: "A"
}

const DEFAULT_CONFIG: PackConfig = {
  maxDecisions: 5,
  maxNextSteps: 5,
  maxLineLength: 120,
  maxContextLength: 3000,
  includeGitInfo: true,
  includeTimestamp: true,
  templateVersion: "A",
};

/**
 * Validate and sanitize PackConfig values
 */
function validatePackConfig(config: Partial<PackConfig>): PackConfig {
  const validated: PackConfig = { ...DEFAULT_CONFIG };
  
  if (config.maxDecisions !== undefined) {
    validated.maxDecisions = Math.max(1, Math.min(20, Math.floor(config.maxDecisions)));
  }
  
  if (config.maxNextSteps !== undefined) {
    validated.maxNextSteps = Math.max(1, Math.min(20, Math.floor(config.maxNextSteps)));
  }
  
  if (config.maxLineLength !== undefined) {
    validated.maxLineLength = Math.max(50, Math.min(500, Math.floor(config.maxLineLength)));
  }
  
  if (config.maxContextLength !== undefined) {
    validated.maxContextLength = Math.max(100, Math.min(10000, Math.floor(config.maxContextLength)));
  }
  
  if (config.includeGitInfo !== undefined) {
    validated.includeGitInfo = Boolean(config.includeGitInfo);
  }
  
  if (config.includeTimestamp !== undefined) {
    validated.includeTimestamp = Boolean(config.includeTimestamp);
  }
  
  if (config.templateVersion === "A" || config.templateVersion === "B") {
    validated.templateVersion = config.templateVersion;
  }
  
  return validated;
}

/**
 * Template A: Standard format with clear headers
 */
const TEMPLATE_A = `# Previous Session Context

**Project**: {title}
**Status**: {status}
{timestamp}
{git_info}

## Current Context
{context}

## Key Decisions
{decisions}

## Next Steps
{next_steps}

---
*Note: Never execute destructive commands without explicit confirmation.*`;

/**
 * Template B: Alternative format (fallback if A fails)
 */
const TEMPLATE_B = `=== Previous Session Context ===

Project: {title}
Status: {status}
{timestamp}
{git_info}

### Current Context ###
{context}

### Key Decisions ###
{decisions}

### Next Steps ###
{next_steps}

---
Note: Never execute destructive commands without explicit confirmation.`;

/**
 * Build an Atomic Context Pack from a snapshot
 */
export class ContextPack {
  private config: PackConfig;
  private template: string;
  
  constructor(config?: Partial<PackConfig>) {
    this.config = validatePackConfig(config || {});
    this.template = this.config.templateVersion === "A" ? TEMPLATE_A : TEMPLATE_B;
  }
  
  /**
   * Generate context pack from snapshot
   */
  generate(snapshot: Snapshot, gitBranch?: string, gitCommit?: string): string {
    // Validate and clean the snapshot content
    const validation = validateContent(JSON.stringify(snapshot));
    
    if (!validation.safe) {
      if (config.debug) {
        console.warn("⚠️  Dangerous content in snapshot:", validation.warnings);
      }
      // Clean the dangerous parts
      snapshot = this.cleanSnapshot(snapshot);
    }
    
    // Build template variables
    const vars: Record<string, string> = {
      title: this.truncate(snapshot.title, this.config.maxLineLength),
      status: snapshot.step || "active",
      timestamp: this.config.includeTimestamp 
        ? `**Date**: ${new Date(snapshot.timestamp).toLocaleString()}`
        : "",
      git_info: this.buildGitInfo(gitBranch, gitCommit),
      context: this.truncate(cleanContent(snapshot.context || ""), this.config.maxContextLength),
      decisions: this.formatList(snapshot.decisions, this.config.maxDecisions),
      next_steps: this.formatList(snapshot.nextSteps, this.config.maxNextSteps),
    };
    
    // Replace template variables
    let pack = this.template;
    for (const [key, value] of Object.entries(vars)) {
      pack = pack.replace(`{${key}}`, value);
    }
    
    // Clean up empty sections
    pack = pack.replace(/\n\n+/g, "\n\n");
    
    return pack;
  }
  
  /**
   * Lint check a pack for valid structure
   */
  lint(pack: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required sections
    const requiredSections = [
      /Previous Session Context/i,
      /Key Decisions/i,
      /Next Steps/i,
    ];
    
    for (const section of requiredSections) {
      if (!pack.match(section)) {
        errors.push(`Missing required section: ${section}`);
      }
    }
    
    // Check for dangerous content that slipped through
    const validation = validateContent(pack);
    if (!validation.safe) {
      errors.push(...validation.warnings);
    }
    
    // Check pack size
    if (pack.length > 5000) {
      errors.push("Pack is too large (>5KB)");
    }
    
    if (pack.length < 50) {
      errors.push("Pack is too small (<50 chars)");
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Format a list with truncation
   */
  private formatList(items: string[], maxItems: number): string {
    if (!items || items.length === 0) {
      return "- None";
    }
    
    const cleaned = items.map(item => {
      const truncated = this.truncate(item, this.config.maxLineLength);
      return cleanContent(truncated);
    });
    
    const displayed = cleaned.slice(0, maxItems);
    const formatted = displayed.map(item => `- ${item}`).join("\n");
    
    if (items.length > maxItems) {
      return `${formatted}\n- ...(${items.length - maxItems} more)`;
    }
    
    return formatted;
  }
  
  /**
   * Truncate text to max length
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + "...";
  }
  
  /**
   * Build git info string
   */
  private buildGitInfo(branch?: string, commit?: string): string {
    if (!this.config.includeGitInfo) {
      return "";
    }
    
    const parts: string[] = [];
    
    if (branch) {
      parts.push(`**Branch**: ${branch}`);
    }
    
    if (commit) {
      parts.push(`**Commit**: ${commit.substring(0, 7)}`);
    }
    
    return parts.join("\n");
  }
  
  /**
   * Clean dangerous content from snapshot
   */
  private cleanSnapshot(snapshot: Snapshot): Snapshot {
    return {
      ...snapshot,
      context: cleanContent(snapshot.context || ""),
      decisions: snapshot.decisions.map(d => cleanContent(d)),
      nextSteps: snapshot.nextSteps.map(n => cleanContent(n)),
    };
  }
}

/**
 * Get the appropriate pack based on Claude's response
 * If template A fails, automatically switch to B
 */
export class AdaptiveContextPack {
  private packA: ContextPack;
  private packB: ContextPack;
  private preferredVersion: "A" | "B" = "A";
  
  constructor(config?: Partial<PackConfig>) {
    this.packA = new ContextPack({ ...config, templateVersion: "A" });
    this.packB = new ContextPack({ ...config, templateVersion: "B" });
  }
  
  /**
   * Generate pack with automatic fallback
   */
  generate(snapshot: Snapshot, gitBranch?: string, gitCommit?: string): string {
    const primaryPack = this.preferredVersion === "A" ? this.packA : this.packB;
    const fallbackPack = this.preferredVersion === "A" ? this.packB : this.packA;
    
    const pack = primaryPack.generate(snapshot, gitBranch, gitCommit);
    const lintResult = primaryPack.lint(pack);
    
    if (!lintResult.valid) {
      if (config.debug) {
        console.warn("Primary template failed lint:", lintResult.errors);
        console.log("Switching to fallback template");
      }
      
      // Switch preference for next time
      this.preferredVersion = this.preferredVersion === "A" ? "B" : "A";
      
      return fallbackPack.generate(snapshot, gitBranch, gitCommit);
    }
    
    return pack;
  }
  
  /**
   * Test Claude's response to determine which template works better
   */
  checkResponse(response: string): void {
    // Check if Claude understood the context structure
    const hasDecisionReference = response.match(/decision|decided/i);
    const hasNextStepReference = response.match(/next step|continue|proceed/i);
    
    if (!hasDecisionReference || !hasNextStepReference) {
      // Switch template for next time
      this.preferredVersion = this.preferredVersion === "A" ? "B" : "A";
      
      if (config.debug) {
        console.log(`Switching to template ${this.preferredVersion} for better recognition`);
      }
    }
  }
}