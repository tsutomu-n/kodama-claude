/**
 * Shared Git utility functions
 */

import { spawnSync } from "child_process";

/**
 * Get current git branch
 */
export function getGitBranch(): string | undefined {
  try {
    const result = spawnSync("git", ["branch", "--show-current"], { 
      encoding: "utf-8",
      shell: false
    });
    
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get current git commit
 */
export function getGitCommit(): string | undefined {
  try {
    const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], { 
      encoding: "utf-8",
      shell: false
    });
    
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim();
    }
    return undefined;
  } catch {
    return undefined;
  }
}