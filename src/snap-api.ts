/**
 * API version of snap command for programmatic use
 */

import { randomUUID } from "crypto";
import { Storage } from "./storage";
import type { Snapshot } from "./types";

export function createSnapshot(options: {
  title: string;
  step?: "requirements" | "designing" | "implementing" | "testing";
  context?: string;
  decisions?: string[];
  nextSteps?: string[];
}): string {
  const storage = new Storage();
  
  const snapshot: Snapshot = {
    version: "1.0.0",
    id: randomUUID(),
    title: options.title,
    timestamp: new Date().toISOString(),
    step: options.step,
    context: options.context || "",
    decisions: options.decisions || [],
    nextSteps: options.nextSteps || [],
    cwd: process.cwd(),
    gitBranch: getGitBranch(),
    gitCommit: getGitCommit(),
    claudeSessionId: storage.loadSessionId() || undefined,
  };
  
  storage.saveSnapshot(snapshot);
  
  return snapshot.id;
}

function getGitBranch(): string | undefined {
  try {
    const { execSync } = require("child_process");
    return execSync("git branch --show-current", { encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}

function getGitCommit(): string | undefined {
  try {
    const { execSync } = require("child_process");
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}

// CLI usage
if (require.main === module) {
  const id = createSnapshot({
    title: "KODAMA Claude MVP Complete",
    step: "implementing",
    context: "Successfully created the new kodama-claude project with TypeScript/Bun. Implemented Phase 1 MVP with all core commands. Built binaries and tested functionality.",
    decisions: [
      "Use TypeScript with Bun runtime",
      "Single binary distribution via Bun compile",
      "Atomic file operations with fsync",
      "XDG Base Directory compliance",
      "Multi-level clipboard fallback strategy"
    ],
    nextSteps: [
      "Test with real Claude CLI integration",
      "Publish to GitHub as kodama-cli/kodama-claude",
      "Create first release v0.1.0",
      "Test one-liner installation script"
    ]
  });
  
  console.log(`✅ Snapshot created: ${id}`);
}