/**
 * Claude Code CLI wrapper
 */

import { spawnSync } from "child_process";
import type { ClaudeResult } from "./types";

export class ClaudeCLI {
  private claudePath: string;
  
  constructor(claudePath: string = "claude") {
    this.claudePath = claudePath;
  }
  
  /**
   * Check if Claude CLI is available
   */
  isAvailable(): boolean {
    const result = spawnSync(this.claudePath, ["--version"], {
      encoding: "utf-8",
      shell: false,
    });
    
    return result.status === 0;
  }
  
  /**
   * Execute Claude command
   */
  execute(args: string[]): ClaudeResult {
    // Ensure print mode for non-interactive usage
    if (!args.includes("-p") && !args.includes("--print")) {
      args.push("-p", "");
    }
    
    // Ensure JSON output for parsing
    if (!args.includes("--output-format")) {
      args.push("--output-format", "json");
    }
    
    const result = spawnSync(this.claudePath, args, {
      encoding: "utf-8",
      shell: false,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }
    
    if (result.status !== 0) {
      return {
        success: false,
        error: result.stderr || `Process exited with code ${result.status}`,
      };
    }
    
    // Try to parse session ID from output
    let sessionId: string | undefined;
    try {
      const output = result.stdout;
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        sessionId = parsed.session_id || parsed.sessionId;
      }
    } catch {
      // Ignore parse errors
    }
    
    return {
      success: true,
      output: result.stdout,
      sessionId,
    };
  }
  
  /**
   * Start new conversation with context
   */
  startWithContext(context: string, message?: string): ClaudeResult {
    const args = [];
    
    // Add context as system message
    if (context) {
      args.push("--system", context);
    }
    
    // Add user message if provided
    if (message) {
      args.push(message);
    }
    
    return this.execute(args);
  }
  
  /**
   * Continue existing conversation
   */
  continue(sessionId: string, message?: string): ClaudeResult {
    const args = ["--continue", sessionId];
    
    if (message) {
      args.push(message);
    }
    
    return this.execute(args);
  }
  
  /**
   * Resume conversation from snapshot
   */
  resume(snapshotPath: string): ClaudeResult {
    return this.execute(["--resume", snapshotPath]);
  }
}