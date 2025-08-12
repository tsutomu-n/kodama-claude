/**
 * "kc go" - Start or continue Claude session with context
 * Two-stage execution: inject context, then open REPL
 */

import { randomUUID } from "crypto";
import { cwd } from "process";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execSync } from "child_process";
import { Storage } from "./storage";
import { Guardian } from "./guardian";
import { ClaudeCLI } from "./claude";
import { ClaudeMdManager } from "./claudeMdManager";
import { getMessage, formatError } from "./i18n";
import { config } from "./config";
import { getGitBranch, getGitCommit } from "./utils/git";
import { parseStep, ValidStep } from "./utils/validation";
import type { Snapshot } from "./types";

interface GoOptions {
  title?: string;
  step?: string;
  noSend?: boolean;  // Skip context injection
  debug?: boolean;
}

export async function goCommand(options: GoOptions) {
  // Show 3-line plan at the beginning
  console.log("▶ Starting Claude session");
  console.log("  1. Check health & create snapshot");
  console.log("  2. Inject context with -c -p");
  console.log("  3. Open REPL with --continue\n");
  
  const storage = new Storage();
  const guardian = new Guardian();
  const claude = new ClaudeCLI();
  
  // Perform health check at start
  console.log("🔍 Checking session health...");
  const health = await guardian.checkHealth();
  
  // Display health status (4-value only, no percentage)
  const emoji = getStatusEmoji(health.level);
  console.log(`${emoji} Session status: ${health.level}`);
  
  if (health.lastSnapshot) {
    const hours = Math.round(health.lastSnapshot.ageHours);
    console.log(`📸 Last snapshot: ${hours}h ago`);
  }
  
  // Auto-protect if needed
  if (health.autoAction === 'snapshot') {
    console.log("⚠️ Context usage critical! Creating automatic snapshot...");
    await guardian.protect();
  } else if (health.suggestion) {
    console.log(`💡 ${health.suggestion}`);
  }
  
  console.log(""); // Empty line for clarity
  
  // Check Claude availability
  if (!claude.isAvailable()) {
    console.error(formatError(getMessage("claudeNotFound")));
    process.exit(1);
  }
  
  // Load latest snapshot for context
  const latestSnapshot = await storage.getLatestSnapshot();
  
  // Prepare context message
  let contextMessage = "";
  
  if (latestSnapshot) {
    contextMessage = buildContextFromSnapshot(latestSnapshot);
    
    if (options.debug) {
      console.log("📚 Using snapshot:", latestSnapshot.id);
      console.log("   Title:", latestSnapshot.title);
      console.log("   Step:", latestSnapshot.step || "none");
    }
  }
  
  // Add current project info
  const currentDir = cwd();
  const gitBranch = getGitBranch();
  const gitCommit = getGitCommit();
  
  contextMessage += `\n\nCurrent directory: ${currentDir}`;
  if (gitBranch) contextMessage += `\nGit branch: ${gitBranch}`;
  if (gitCommit) contextMessage += `\nGit commit: ${gitCommit}`;
  
  if (options.title) {
    contextMessage += `\n\nCurrent focus: ${options.title}`;
  }
  if (options.step) {
    contextMessage += `\nCurrent step: ${options.step}`;
  }
  
  // Create snapshot of this session start
  const snapshot: Snapshot = {
    version: "1.0.0",
    id: randomUUID(),
    title: options.title || latestSnapshot?.title || "Development session",
    timestamp: new Date().toISOString(),
    step: parseStep(options.step, latestSnapshot?.step as ValidStep | undefined),
    context: latestSnapshot?.context || "",
    decisions: latestSnapshot?.decisions || [],
    nextSteps: latestSnapshot?.nextSteps || [],
    cwd: currentDir,
    gitBranch,
    gitCommit,
  };
  
  await storage.saveSnapshot(snapshot);
  
  // Trigger auto-archive if enabled
  storage.triggerAutoArchive();
  
  // Update CLAUDE.md if enabled (dry-run by default)
  const claudeMd = new ClaudeMdManager();
  claudeMd.updateSection(snapshot, undefined, config.claudeMdSyncDryRun);
  
  // Two-stage execution for reliable context injection
  if (!options.noSend) {
    // Stage 1: Inject context with -c -p
    console.log("📤 Injecting context...");
    const injectResult = await claude.injectContext(contextMessage);
    
    if (!injectResult.success) {
      console.warn("⚠️ Direct injection failed, trying fallback methods...");
      if (config.debug) {
        console.error(injectResult.error);
      }
      // Try fallback methods
      await fallbackPaste(contextMessage);
    } else {
      console.log("✅ Context injected successfully");
    }
    
    // Stage 2: Open REPL with --continue
    console.log("🚀 Opening Claude REPL...");
    const replResult = await claude.openREPL();
    
    if (!replResult.success) {
      console.error(formatError(getMessage("claudeSessionFailed")));
      if (config.debug && replResult.error) {
        console.error(replResult.error);
      }
      // Try alternate methods
      console.log("\n💡 Try running manually:");
      console.log("   claude --continue");
      console.log("   or");
      console.log("   claude --resume");
      process.exit(1);
    }
  } else {
    console.log("ℹ️  Skipping context injection (--no-send)");
    console.log("💡 Run 'claude --continue' to open Claude manually");
  }
  
  console.log("\n✅ Session ready!");
  console.log(`📝 Snapshot saved: ${snapshot.id}`);
}

/**
 * Build context string from snapshot
 */
function buildContextFromSnapshot(snapshot: Snapshot): string {
  const parts = [];
  
  parts.push(`# Previous Session Context`);
  parts.push(`Title: ${snapshot.title}`);
  parts.push(`Timestamp: ${snapshot.timestamp}`);
  
  if (snapshot.step) {
    parts.push(`Step: ${snapshot.step}`);
  }
  
  if (snapshot.context) {
    parts.push(`\n## Context\n${snapshot.context}`);
  }
  
  if (snapshot.decisions.length > 0) {
    parts.push(`\n## Key Decisions`);
    snapshot.decisions.forEach(d => parts.push(`- ${d}`));
  }
  
  if (snapshot.nextSteps.length > 0) {
    parts.push(`\n## Next Steps`);
    snapshot.nextSteps.forEach(s => parts.push(`- ${s}`));
  }
  
  return parts.join("\n");
}

/**
 * Get emoji for status level (4-value only)
 */
function getStatusEmoji(level: string): string {
  switch (level) {
    case 'healthy':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'danger':
      return '🔴';
    default:
      return '❓';
  }
}

/**
 * Fallback paste methods when injection fails
 */
async function fallbackPaste(text: string): Promise<void> {
  // Try clipboard first
  const commands = [
    { cmd: "clip.exe", args: [] },  // WSL
    { cmd: "wl-copy", args: [] },   // Wayland
    { cmd: "xclip", args: ["-selection", "clipboard"] },  // X11
    { cmd: "pbcopy", args: [] },    // macOS
  ];
  
  for (const { cmd, args } of commands) {
    try {
      execSync(`which ${cmd}`, { stdio: "ignore" });
      const proc = require("child_process").spawn(cmd, args, {
        stdio: ["pipe", "ignore", "ignore"],
      });
      proc.stdin.write(text);
      proc.stdin.end();
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log("✅ Context copied to clipboard");
      console.log("💡 Paste it when Claude opens");
      return;
    } catch {
      // Try next
    }
  }
  
  // Fallback to OSC52
  try {
    const base64 = Buffer.from(text).toString("base64");
    const osc52 = `\x1b]52;c;${base64}\x07`;
    process.stderr.write(osc52);
    console.log("✅ Context copied via OSC52");
    return;
  } catch {
    // Continue to file
  }
  
  // Final fallback: temp file
  const tempFile = join(tmpdir(), `kodama-context-${randomUUID()}.txt`);
  writeFileSync(tempFile, text, "utf-8");
  console.log("📄 Context saved to:");
  console.log(`   ${tempFile}`);
  console.log(`💡 Use: cat "${tempFile}" | claude`);
}