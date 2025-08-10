/**
 * Shared Git utility functions
 */

import { execSync } from "child_process";

/**
 * Get current git branch
 */
export function getGitBranch(): string | undefined {
  try {
    return execSync("git branch --show-current", { encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}

/**
 * Get current git commit
 */
export function getGitCommit(): string | undefined {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}