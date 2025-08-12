/**
 * Process management utilities for Smart Restart
 * Handles PID tracking, process verification, and safe termination
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import { getStoragePaths } from "../types";
import { config } from "../config";
import { createHash } from "crypto";

export interface ProcessInfo {
  pid: number;
  pgid?: number;
  cmd: string;
  cwd: string;
  startTime: number;
  projectId: string;
}

/**
 * Get project ID based on repository root
 */
export function getProjectId(cwd: string = process.cwd()): string {
  // Try to find git root
  const gitRoot = findGitRoot(cwd);
  if (gitRoot) {
    return createHash("sha256").update(gitRoot).digest("hex").substring(0, 16);
  }
  
  // Fallback to current directory
  return createHash("sha256").update(cwd).digest("hex").substring(0, 16);
}

/**
 * Find git repository root
 */
function findGitRoot(dir: string): string | null {
  let current = dir;
  
  while (current && current !== "/" && current !== ".") {
    if (existsSync(join(current, ".git"))) {
      return current;
    }
    
    const parent = join(current, "..");
    if (parent === current) break;
    current = parent;
  }
  
  return null;
}

/**
 * Process manager for Claude instances
 */
export class ProcessManager {
  private pidFile: string;
  
  constructor() {
    const paths = getStoragePaths();
    this.pidFile = join(paths.data, "claude.pid");
  }
  
  /**
   * Save process info
   */
  saveProcess(cmd: string, pid?: number): ProcessInfo {
    const info: ProcessInfo = {
      pid: pid || process.pid,
      pgid: process.pid, // Parent group ID
      cmd,
      cwd: process.cwd(),
      startTime: Date.now(),
      projectId: getProjectId(),
    };
    
    try {
      writeFileSync(this.pidFile, JSON.stringify(info, null, 2), "utf-8");
      
      if (config.debug) {
        console.log(`💾 Saved process info: PID=${info.pid}, Project=${info.projectId}`);
      }
    } catch (error) {
      console.warn("Failed to save process info:", error);
    }
    
    return info;
  }
  
  /**
   * Load saved process info
   */
  loadProcess(): ProcessInfo | null {
    if (!existsSync(this.pidFile)) {
      return null;
    }
    
    try {
      const data = readFileSync(this.pidFile, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if (config.debug) {
        console.warn("Failed to load process info:", error);
      }
      return null;
    }
  }
  
  /**
   * Check if a process is still running
   */
  isProcessAlive(pid: number): boolean {
    try {
      // Signal 0 checks if process exists without killing it
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Verify process ownership (same command and cwd)
   */
  verifyProcessOwnership(info: ProcessInfo): boolean {
    // Check if process is alive
    if (!this.isProcessAlive(info.pid)) {
      return false;
    }
    
    // On Linux, we can check /proc/PID/cmdline and /proc/PID/cwd
    if (process.platform === "linux") {
      try {
        // Check command line
        const cmdlinePath = `/proc/${info.pid}/cmdline`;
        if (existsSync(cmdlinePath)) {
          const cmdline = readFileSync(cmdlinePath, "utf-8");
          if (!cmdline.includes("claude")) {
            return false;
          }
        }
        
        // Check if it's in the same project
        const currentProjectId = getProjectId();
        if (info.projectId !== currentProjectId) {
          if (config.debug) {
            console.log(`🔍 Project mismatch: ${info.projectId} !== ${currentProjectId}`);
          }
          return false;
        }
        
        return true;
      } catch {
        return false;
      }
    }
    
    // For other platforms, just check if alive and same project
    return info.projectId === getProjectId();
  }
  
  /**
   * Find existing Claude process
   */
  findClaudeProcess(): ProcessInfo | null {
    const saved = this.loadProcess();
    if (!saved) {
      return null;
    }
    
    // Verify it's still valid
    if (!this.verifyProcessOwnership(saved)) {
      // Clean up stale PID file
      this.clearProcess();
      return null;
    }
    
    return saved;
  }
  
  /**
   * Kill existing Claude process safely
   */
  async killClaude(force: boolean = false): Promise<boolean> {
    const existing = this.findClaudeProcess();
    if (!existing) {
      return false;
    }
    
    try {
      // Try graceful termination first
      process.kill(existing.pid, "SIGTERM");
      
      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if still alive
      if (this.isProcessAlive(existing.pid)) {
        if (force) {
          // Force kill if requested
          process.kill(existing.pid, "SIGKILL");
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.warn("⚠️  Process still alive after SIGTERM");
          return false;
        }
      }
      
      // Clean up PID file
      this.clearProcess();
      
      if (config.debug) {
        console.log(`🔫 Killed Claude process: PID=${existing.pid}`);
      }
      
      return true;
    } catch (error) {
      if (config.debug) {
        console.warn("Failed to kill process:", error);
      }
      return false;
    }
  }
  
  /**
   * Clear saved process info
   */
  clearProcess(): void {
    try {
      if (existsSync(this.pidFile)) {
        unlinkSync(this.pidFile);
      }
    } catch {
      // Best effort
    }
  }
  
  /**
   * Execute Claude with process tracking
   */
  spawnClaude(args: string[]): number | null {
    try {
      // Use spawn to start Claude in background
      const { spawn } = require("child_process");
      const claude = spawn("claude", args, {
        detached: true,
        stdio: "inherit",
        cwd: process.cwd(),
      });
      
      // Save process info
      this.saveProcess(`claude ${args.join(" ")}`, claude.pid);
      
      // Don't wait for it
      claude.unref();
      
      return claude.pid;
    } catch (error) {
      console.error("Failed to spawn Claude:", error);
      return null;
    }
  }
  
  /**
   * Get Claude process status
   */
  getStatus(): { alive: boolean; info: ProcessInfo | null; sameProject: boolean } {
    const info = this.loadProcess();
    
    if (!info) {
      return { alive: false, info: null, sameProject: false };
    }
    
    const alive = this.isProcessAlive(info.pid);
    const sameProject = info.projectId === getProjectId();
    
    return { alive, info, sameProject };
  }
}