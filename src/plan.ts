/**
 * "kc plan" - Structure and plan next development steps
 */

import { randomUUID } from "crypto";
import { Storage } from "./storage";
import { ClaudeMdManager } from "./claudeMdManager";
import { getMessage, formatError } from "./i18n";
import { getGitBranch, getGitCommit } from "./utils/git";
import { parseStep, getNextStep, ValidStep } from "./utils/validation";
import type { Snapshot } from "./types";

interface PlanOptions {
  title?: string;
  debug?: boolean;
}

export async function planCommand(options: PlanOptions) {
  const storage = new Storage();
  
  // Load latest snapshot for context
  const latestSnapshot = await storage.getLatestSnapshot();
  
  // Interactive planning session
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
    console.log("📋 Planning Session");
    console.log("==================\n");
    
    // Show current context
    if (latestSnapshot) {
      console.log("📚 Current context:");
      console.log(`   Title: ${latestSnapshot.title}`);
      console.log(`   Step: ${latestSnapshot.step || "none"}`);
      
      if (latestSnapshot.nextSteps.length > 0) {
        console.log("\n   Previous next steps:");
        latestSnapshot.nextSteps.forEach(s => console.log(`   - ${s}`));
      }
      
      console.log("");
    }
    
    // Get plan title
    const title = options.title || await prompt("📝 Plan title: ");
    if (!title) {
      console.error(formatError(getMessage("titleRequired")));
      process.exit(1);
    }
    
    // Determine next step
    const currentStep = latestSnapshot?.step as ValidStep | undefined;
    let nextStep: ValidStep | undefined;
    
    if (currentStep) {
      const suggestedStep = getNextStep(currentStep);
      
      const useNextStep = await prompt(`📊 Move to "${suggestedStep}" step? (y/n): `);
      if (useNextStep.toLowerCase() === "y") {
        nextStep = suggestedStep;
      } else {
        const stepInput = await prompt("📊 Enter step (requirements/designing/implementing/testing): ");
        nextStep = parseStep(stepInput, currentStep);
      }
    } else {
      const stepInput = await prompt("📊 Enter step (requirements/designing/implementing/testing): ");
      nextStep = parseStep(stepInput, "requirements");
    }
    
    // Get goals
    console.log("\n🎯 What are the main goals? (one per line, empty to finish):");
    const goals = [];
    
    while (true) {
      const goal = await prompt("- ");
      if (!goal) break;
      goals.push(goal);
    }
    
    // Get tasks
    console.log("\n✅ What tasks need to be done? (one per line, empty to finish):");
    const tasks = [];
    
    while (true) {
      const task = await prompt("- ");
      if (!task) break;
      tasks.push(task);
    }
    
    // Get considerations
    console.log("\n⚠️ Any important considerations? (one per line, empty to finish):");
    const considerations = [];
    
    while (true) {
      const consideration = await prompt("- ");
      if (!consideration) break;
      considerations.push(consideration);
    }
    
    rl.close();
    
    // Build plan context
    const planContext = buildPlanContext(goals, tasks, considerations);
    
    // Create planning snapshot
    const snapshot: Snapshot = {
      version: "1.0.0",
      id: randomUUID(),
      title,
      timestamp: new Date().toISOString(),
      step: nextStep,
      context: planContext,
      decisions: latestSnapshot?.decisions || [],
      nextSteps: tasks, // Tasks become next steps
      claudeSessionId: storage.loadSessionId() || undefined,
      cwd: process.cwd(),
      gitBranch: getGitBranch(),
      gitCommit: getGitCommit(),
    };
    
    // Save snapshot
    await storage.saveSnapshot(snapshot);
    
    // Trigger auto-archive if enabled
    storage.triggerAutoArchive();
    
    // Update CLAUDE.md if enabled
    const claudeMd = new ClaudeMdManager();
    claudeMd.updateSection(snapshot);
    
    console.log("\n" + getMessage("planCreated", snapshot.id));
    console.log("📦 ID:", snapshot.id);
    console.log("📝 Title:", snapshot.title);
    console.log("📊 Step:", snapshot.step);
    console.log("🎯 Goals:", goals.length);
    console.log("✅ Tasks:", tasks.length);
    
    // Display the plan
    console.log("\n" + "=".repeat(50));
    console.log("📋 YOUR PLAN");
    console.log("=".repeat(50));
    
    console.log(`\n🏷️ ${title}`);
    console.log(`📊 Step: ${nextStep}`);
    
    if (goals.length > 0) {
      console.log("\n🎯 Goals:");
      goals.forEach(g => console.log(`   • ${g}`));
    }
    
    if (tasks.length > 0) {
      console.log("\n✅ Tasks:");
      tasks.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
    }
    
    if (considerations.length > 0) {
      console.log("\n⚠️ Considerations:");
      considerations.forEach(c => console.log(`   • ${c}`));
    }
    
    console.log("\n" + "=".repeat(50));
    
    // Suggest next action
    console.log("\n💡 To execute this plan with Claude, run:");
    console.log(`   kc go`);
    
  } catch (error) {
    console.error(formatError(`${getMessage("errorCreating", "plan")} ${error}`));
    process.exit(1);
  }
}

/**
 * Build plan context string
 */
function buildPlanContext(goals: string[], tasks: string[], considerations: string[]): string {
  const parts = [];
  
  parts.push("# Development Plan\n");
  
  if (goals.length > 0) {
    parts.push("## Goals");
    goals.forEach(g => parts.push(`- ${g}`));
    parts.push("");
  }
  
  if (tasks.length > 0) {
    parts.push("## Tasks");
    tasks.forEach((t, i) => parts.push(`${i + 1}. ${t}`));
    parts.push("");
  }
  
  if (considerations.length > 0) {
    parts.push("## Considerations");
    considerations.forEach(c => parts.push(`- ${c}`));
    parts.push("");
  }
  
  return parts.join("\n");
}

