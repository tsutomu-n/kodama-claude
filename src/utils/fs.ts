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
 * Clean up old tmp files and stale locks (rollback mechanism)
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
      const filePath = join(directory, file);
      
      // Clean tmp files with our UUID pattern
      if (file.includes(".tmp.") && file.length > 40) {
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
      
      // Also clean stale lock files (.lock extension)
      if (file.endsWith(".lock")) {
        try {
          const stat = statSync(filePath);
          const age = now - stat.mtime.getTime();
          
          // Check if lock is stale (older than 1 hour)
          if (age > 60 * 60 * 1000) {
            // Try to read PID and check if process exists
            try {
              const pidStr = require("fs").readFileSync(filePath, "utf-8").trim();
              const pid = parseInt(pidStr);
              
              if (!isNaN(pid)) {
                try {
                  process.kill(pid, 0);
                  // Process exists, don't remove
                  continue;
                } catch {
                  // Process doesn't exist, safe to remove
                }
              }
            } catch {
              // Can't read PID, remove if old enough
            }
            
            unlinkSync(filePath);
            cleaned++;
            
            if (config.debug) {
              console.log(`♻️  Cleaned stale lock: ${file}`);
            }
          }
        } catch (error) {
          if (config.debug) {
            console.warn(`Could not clean lock file ${file}:`, error);
          }
        }
      }
      
      // Clean .stale.* files from atomic lock removal
      if (file.includes(".stale.")) {
        try {
          unlinkSync(filePath);
          cleaned++;
          if (config.debug) {
            console.log(`♻️  Cleaned stale lock remnant: ${file}`);
          }
        } catch {
          // Best effort
        }
      }
    }
  } catch (error) {
    if (config.debug) {
      console.warn("Error during cleanup:", error);
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
          // Lock exists, check if stale and try atomic removal
          if (await this.tryRemoveStaleAtomic()) {
            // Stale lock removed, try again in next iteration
            continue;
          } else {
            // Active lock, wait a bit before retry
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
   * Try to remove stale lock atomically
   * Returns true if stale lock was removed, false if lock is active
   */
  private async tryRemoveStaleAtomic(): Promise<boolean> {
    const fs = require("fs");
    
    try {
      // Read lock file to check PID
      if (!fs.existsSync(this.lockPath)) {
        return false; // No lock, nothing to remove
      }
      
      const pidStr = fs.readFileSync(this.lockPath, "utf-8").trim();
      const pid = parseInt(pidStr);
      
      if (isNaN(pid)) {
        // Invalid PID, safe to remove
        try {
          fs.unlinkSync(this.lockPath);
          if (config.debug) {
            console.log("🔓 Removed invalid lock");
          }
          return true;
        } catch {
          return false; // Someone else removed it
        }
      }
      
      // Check if process exists
      try {
        process.kill(pid, 0);
        return false; // Process exists, lock is active
      } catch {
        // Process doesn't exist, try to remove atomically
        try {
          // Use rename to move lock aside first (atomic check)
          const stalePath = `${this.lockPath}.stale.${Date.now()}`;
          fs.renameSync(this.lockPath, stalePath);
          fs.unlinkSync(stalePath);
          
          if (config.debug) {
            console.log("🔓 Removed stale lock for PID:", pid);
          }
          return true;
        } catch {
          return false; // Someone else is handling it
        }
      }
    } catch (error) {
      if (config.debug) {
        console.warn("Error checking stale lock:", error);
      }
      return false;
    }
  }
}