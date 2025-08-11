/**
 * "kc snap" - Create structured snapshot of current dialogue
 */

import { randomUUID } from "crypto";
import { cwd } from "process";
import { readFileSync, existsSync } from "fs";
import { Storage } from "./storage";
import { ClaudeMdManager } from "./claudeMdManager";
import { getMessage, formatError } from "./i18n";
import { getGitBranch, getGitCommit } from "./utils/git";
import { parseStep, ValidStep } from "./utils/validation";
import type { Snapshot } from "./types";

interface SnapOptions {
  title?: string;
  step?: string;
  debug?: boolean;
}

export async function snapCommand(options: SnapOptions) {
  const storage = new Storage();
  
  // Interactive prompts for missing info
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const prompt = (question: string): Promise<string> => {
    return new Promise(resolve => {
      rl.question(question, answer => {
        resolve(answer.trim());
      });
    });
  };
  
  try {
    // Get title
    const title = options.title || await prompt("📝 Snapshot title: ");
    if (!title) {
      console.error(formatError(getMessage("titleRequired")));
      process.exit(1);
    }
    
    // Get step
    const step = options.step || await prompt("📊 Current step (requirements/designing/implementing/testing): ");
    
    // Get context
    console.log("📚 Enter context (what have we accomplished?):");
    console.log("   (Press Enter twice to finish)");
    
    const contextLines = [];
    let emptyLineCount = 0;
    
    while (true) {
      const line = await prompt("");
      
      if (line === "") {
        emptyLineCount++;
        if (emptyLineCount >= 2) break;
        contextLines.push("");
      } else {
        emptyLineCount = 0;
        contextLines.push(line);
      }
    }
    
    const context = contextLines.join("\n").trim();
    
    // Get decisions
    console.log("🎯 Key decisions made (one per line, empty to finish):");
    const decisions = [];
    
    while (true) {
      const decision = await prompt("- ");
      if (!decision) break;
      decisions.push(decision);
    }
    
    // Get next steps
    console.log("➡️ Next steps (one per line, empty to finish):");
    const nextSteps = [];
    
    while (true) {
      const nextStep = await prompt("- ");
      if (!nextStep) break;
      nextSteps.push(nextStep);
    }
    
    rl.close();
    
    // Get current project info
    const currentDir = cwd();
    const gitBranch = getGitBranch();
    const gitCommit = getGitCommit();
    const sessionId = storage.loadSessionId();
    
    // Create snapshot
    const snapshot: Snapshot = {
      version: "1.0.0",
      id: randomUUID(),
      title,
      timestamp: new Date().toISOString(),
      step: parseStep(step),
      context,
      decisions,
      nextSteps,
      claudeSessionId: sessionId || undefined,
      cwd: currentDir,
      gitBranch,
      gitCommit,
    };
    
    // Save snapshot
    await storage.saveSnapshot(snapshot);
    
    // Trigger auto-archive if enabled
    storage.triggerAutoArchive();
    
    // Update CLAUDE.md if enabled
    const claudeMd = new ClaudeMdManager();
    claudeMd.updateSection(snapshot);
    
    console.log("\n" + getMessage("snapshotCreated", snapshot.id));
    console.log("📦 ID:", snapshot.id);
    console.log("📝 Title:", snapshot.title);
    console.log("📊 Step:", snapshot.step || "none");
    console.log("🎯 Decisions:", decisions.length);
    console.log("➡️ Next steps:", nextSteps.length);
    
    if (options.debug) {
      console.log("\n--- Debug Info ---");
      console.log("Full snapshot:", JSON.stringify(snapshot, null, 2));
    }
    
    // Suggest next action
    console.log("\n💡 To continue with this context, run:");
    console.log(`   kc go`);
    
  } catch (error) {
    console.error(formatError(`${getMessage("errorCreating", "snapshot")} ${error}`));
    process.exit(1);
  }
}

