/**
 * "kc go" - One-command workflow to start or continue Claude session
 */

import { randomUUID } from "crypto";
import { cwd } from "process";
import { Storage } from "./storage";
import { ClaudeCLI } from "./claude";
import { ClaudeMdManager } from "./claudeMdManager";
import { getMessage, formatError } from "./i18n";
import { getGitBranch, getGitCommit } from "./utils/git";
import { parseStep, ValidStep } from "./utils/validation";
import type { Snapshot } from "./types";

interface GoOptions {
  title?: string;
  step?: string;
  debug?: boolean;
}

export async function goCommand(options: GoOptions) {
  const storage = new Storage();
  const claude = new ClaudeCLI();
  
  // Check Claude CLI availability
  if (!claude.isAvailable()) {
    console.error(formatError(getMessage("claudeNotFound")));
    process.exit(1);
  }
  
  // Get or create session
  let sessionId = storage.loadSessionId();
  const isNewSession = !sessionId;
  
  // Load latest snapshot for context
  const latestSnapshot = storage.getLatestSnapshot();
  
  // Prepare context
  let context = "";
  
  if (latestSnapshot) {
    context = buildContextFromSnapshot(latestSnapshot);
    
    if (options.debug) {
      console.log("📚 Using snapshot:", latestSnapshot.id);
      console.log("   Title:", latestSnapshot.title);
      console.log("   Step:", latestSnapshot.step || "none");
    }
  }
  
  // Get current project info
  const currentDir = cwd();
  const gitBranch = getGitBranch();
  const gitCommit = getGitCommit();
  
  // Start or continue Claude session
  let result;
  
  if (isNewSession || !sessionId) {
    // Start new session with context
    console.log("🚀 Starting new Claude session...");
    
    const systemPrompt = `${context}

Current directory: ${currentDir}
Git branch: ${gitBranch || "none"}
Git commit: ${gitCommit || "none"}

You are helping with: ${options.title || latestSnapshot?.title || "development task"}
Current step: ${options.step || latestSnapshot?.step || "requirements"}`;
    
    result = claude.startWithContext(systemPrompt, "Hello! I'm ready to continue our work. What should we focus on?");
    
    if (result.success && result.sessionId) {
      storage.saveSessionId(result.sessionId);
      sessionId = result.sessionId;
    }
  } else {
    // Continue existing session
    console.log("🔄 Continuing Claude session:", sessionId);
    
    // Inject context reminder if we have new info
    const contextReminder = options.title || options.step ? 
      `Reminder - Current focus: ${options.title || "current task"}, Step: ${options.step || "current"}` : 
      undefined;
    
    result = claude.continue(sessionId, contextReminder);
  }
  
  if (!result.success) {
    console.error(formatError(`${getMessage("claudeSessionFailed")} ${result.error}`));
    process.exit(1);
  }
  
  // Create snapshot of this interaction
  const snapshot: Snapshot = {
    version: "1.0.0",
    id: randomUUID(),
    title: options.title || latestSnapshot?.title || "Development session",
    timestamp: new Date().toISOString(),
    step: parseStep(options.step, latestSnapshot?.step as ValidStep | undefined),
    context: context,
    decisions: latestSnapshot?.decisions || [],
    nextSteps: latestSnapshot?.nextSteps || [],
    claudeSessionId: sessionId || undefined,
    cwd: currentDir,
    gitBranch,
    gitCommit,
  };
  
  storage.saveSnapshot(snapshot);
  
  // Trigger auto-archive if enabled
  storage.triggerAutoArchive();
  
  // Update CLAUDE.md if enabled
  const claudeMd = new ClaudeMdManager();
  claudeMd.updateSection(snapshot);
  
  console.log("✅ Session ready!");
  console.log("📝 Snapshot saved:", snapshot.id);
  
  if (options.debug) {
    console.log("\n--- Debug Info ---");
    console.log("Session ID:", sessionId);
    console.log("Snapshot ID:", snapshot.id);
    console.log("Storage path:", storage["paths"].data);
  }
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

