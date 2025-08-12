/**
 * Filesystem utility functions for robust I/O operations
 */

import { statSync, existsSync, readdirSync, unlinkSync } from "fs";
import { dirname, join } from "path";
import { config } from "../config";

/**
 * Check if two paths are on the same filesystem
 * Important for atomic rename operations
 */
export function isSameFilesystem(path1: string, path2: string): boolean {
  try {
    const stat1 = statSync(path1);
    const stat2 = statSync(path2);
    
    // On Unix-like systems, dev field indicates the device
    return stat1.dev === stat2.dev;
  } catch (error) {
    // If we can't determine, assume they're different (safer)
    if (config.debug) {
      console.warn("Could not determine filesystem:", error);
    }
    return false;
  }
}

/**
 * Get the parent directory that exists
 * Useful for checking filesystem before creating files
 */
export function getExistingParent(path: string): string | null {
  let current = dirname(path);
  
  while (current && current !== "/" && current !== ".") {
    if (existsSync(current)) {
      return current;
    }
    current = dirname(current);
  }
  
  return null;
}

/**
 * Clean up old tmp files (rollback mechanism)
 * Called on startup to recover from crashes
 */
export function cleanupTmpFiles(directory: string, maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  if (!existsSync(directory)) {
    return 0;
  }
  
  let cleaned = 0;
  const now = Date.now();
  
  try {
    const files = readdirSync(directory);
    
    for (const file of files) {
      // Only clean tmp files with our UUID pattern
      if (file.includes(".tmp.") && file.length > 40) {
        const filePath = join(directory, file);
        try {
          const stat = statSync(filePath);
          const age = now - stat.mtime.getTime();
          
          if (age > maxAgeMs) {
            unlinkSync(filePath);
            cleaned++;
            
            if (config.debug) {
              console.log(`♻️  Cleaned old tmp file: ${file}`);
            }
          }
        } catch (error) {
          // Individual file errors are non-critical
          if (config.debug) {
            console.warn(`Could not clean tmp file ${file}:`, error);
          }
        }
      }
    }
  } catch (error) {
    if (config.debug) {
      console.warn("Error during tmp cleanup:", error);
    }
  }
  
  return cleaned;
}

/**
 * Lock file management with timeout
 */
export class FileLock {
  private lockPath: string;
  private acquired: boolean = false;
  
  constructor(path: string) {
    this.lockPath = `${path}.lock`;
  }
  
  /**
   * Try to acquire lock with timeout
   * Returns true if acquired, false if timeout
   */
  async tryAcquire(timeoutMs: number = 500, retries: number = 3): Promise<boolean> {
    const startTime = Date.now();
    
    for (let i = 0; i < retries; i++) {
      if (Date.now() - startTime > timeoutMs) {
        return false;
      }
      
      try {
        // Try to create lock file exclusively
        const fs = require("fs");
        const fd = fs.openSync(this.lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
        fs.writeSync(fd, process.pid.toString());
        fs.closeSync(fd);
        this.acquired = true;
        return true;
      } catch (error: any) {
        if (error.code === "EEXIST") {
          // Lock exists, check if stale
          if (this.isStale()) {
            this.forceRelease();
            // Don't continue immediately, let the next iteration try
          } else {
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, Math.min(100, timeoutMs / retries)));
          }
        } else {
          // Unexpected error
          if (config.debug) {
            console.warn("Lock acquisition error:", error);
          }
          return false;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Release the lock
   */
  release(): void {
    if (this.acquired) {
      try {
        unlinkSync(this.lockPath);
        this.acquired = false;
      } catch (error) {
        // Already released or doesn't exist
        if (config.debug) {
          console.warn("Lock release error:", error);
        }
      }
    }
  }
  
  /**
   * Check if lock is stale (process doesn't exist)
   */
  private isStale(): boolean {
    try {
      const fs = require("fs");
      if (!fs.existsSync(this.lockPath)) {
        return false; // No lock to check
      }
      
      const pidStr = fs.readFileSync(this.lockPath, "utf-8").trim();
      const pid = parseInt(pidStr);
      
      if (isNaN(pid)) {
        return true; // Invalid PID
      }
      
      // Check if process exists
      try {
        process.kill(pid, 0);
        return false; // Process exists
      } catch {
        return true; // Process doesn't exist
      }
    } catch {
      return true; // Can't read lock file
    }
  }
  
  /**
   * Force release a stale lock
   */
  private forceRelease(): void {
    try {
      unlinkSync(this.lockPath);
      if (config.debug) {
        console.log("🔓 Released stale lock");
      }
    } catch {
      // Already gone
    }
  }
}