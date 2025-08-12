/**
 * One-Key Resume functionality
 * Combines save + go into a single seamless operation
 */

import { Storage } from "./storage";
import { ClaudeCLI } from "./claude";
import { SmartRestart } from "./restart";
import { AdaptiveContextPack } from "./contextPack";
import { Guardian } from "./guardian";
import { TagManager } from "./utils/tags";
import { getGitBranch, getGitCommit } from "./utils/git";
import { config } from "./config";
import { getMessage, formatError } from "./i18n";
import { randomUUID } from "crypto";
import * as readline from "readline/promises";
import type { Snapshot } from "./types";

export interface ResumeOptions {
  message?: string;        // Quick message for resume
  tags?: string;           // Tags to add
  noSave?: boolean;        // Skip saving (just resume)
  noInject?: boolean;      // Skip context injection
  force?: boolean;         // Force restart if needed
  debug?: boolean;
}

/**
 * One-Key Resume controller
 */
export class OneKeyResume {
  private storage: Storage;
  private claude: ClaudeCLI;
  private restart: SmartRestart;
  private contextPack: AdaptiveContextPack;
  private guardian: Guardian;
  private tagManager: TagManager;
  
  constructor() {
    this.storage = new Storage();
    this.claude = new ClaudeCLI();
    this.restart = new SmartRestart();
    this.contextPack = new AdaptiveContextPack();
    this.guardian = new Guardian();
    this.tagManager = new TagManager();
  }
  
  /**
   * Main resume flow
   */
  async resume(options: ResumeOptions = {}): Promise<boolean> {
    console.log("⚡ One-Key Resume");
    
    // Step 1: Quick save if message provided
    if (options.message && !options.noSave) {
      await this.quickSave(options.message, options.tags);
    }
    
    // Step 2: Check Claude status
    const restartStatus = await this.restart.getRestartStatus();
    
    if (!restartStatus.canRestart) {
      console.error("❌ Cannot resume:", restartStatus.reason);
      return false;
    }
    
    // Step 3: Load latest snapshot
    const snapshot = await this.storage.getLatestSnapshot();
    if (!snapshot) {
      console.log("📭 No previous context found");
      console.log("💡 Use 'kc save' to create your first snapshot");
      return false;
    }
    
    // Step 4: Generate context pack
    const gitBranch = getGitBranch();
    const gitCommit = getGitCommit();
    const pack = this.contextPack.generate(snapshot, gitBranch, gitCommit);
    
    // Step 5: Check health before resuming
    const health = await this.guardian.checkHealth();
    if (health.level === "danger") {
      console.warn("⚠️  Context usage is critical");
      
      if (!options.force) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        
        const answer = await rl.question("Continue anyway? (y/N): ");
        rl.close();
        
        if (answer.toLowerCase() !== 'y') {
          console.log("Aborted");
          return false;
        }
      }
    }
    
    // Step 6: Inject context and restart
    if (!options.noInject) {
      console.log("📤 Injecting context...");
      
      const injectResult = await this.claude.injectContext(pack);
      if (!injectResult.success) {
        console.warn("⚠️  Context injection failed:", injectResult.error);
        console.log("💡 You can paste the context manually");
      }
    }
    
    // Step 7: Smart restart
    const restartSuccess = await this.restart.restart({
      force: options.force,
      noInject: true, // Already injected above
      debug: options.debug,
    });
    
    if (!restartSuccess) {
      console.error("❌ Failed to resume Claude session");
      return false;
    }
    
    // Step 8: Display resume summary
    this.showResumeSummary(snapshot);
    
    return true;
  }
  
  /**
   * Quick save with minimal interaction
   */
  private async quickSave(message: string, tagString?: string): Promise<void> {
    const tags = tagString ? this.tagManager.parseTags(tagString) : this.tagManager.generateAutoTags();
    
    const snapshot: Snapshot = {
      version: "1.0.0",
      id: randomUUID(),
      title: `Quick Resume: ${message.substring(0, 50)}`,
      timestamp: new Date().toISOString(),
      context: message,
      decisions: [],
      nextSteps: [],
      cwd: process.cwd(),
      gitBranch: getGitBranch(),
      gitCommit: getGitCommit(),
      tags,
    };
    
    await this.storage.saveSnapshot(snapshot);
    console.log("💾 Quick save completed");
  }
  
  /**
   * Show resume summary
   */
  private showResumeSummary(snapshot: Snapshot): void {
    console.log("\n✨ Resume Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📝 ${snapshot.title}`);
    
    if (snapshot.tags && snapshot.tags.length > 0) {
      console.log(`🏷️  ${snapshot.tags.join(", ")}`);
    }
    
    if (snapshot.nextSteps && snapshot.nextSteps.length > 0) {
      console.log("\n📋 Next Steps:");
      snapshot.nextSteps.slice(0, 3).forEach(step => {
        console.log(`   • ${step}`);
      });
    }
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🚀 Claude is ready with your context!");
  }
  
  /**
   * Interactive resume with prompts
   */
  async interactiveResume(): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    // Ask for quick update
    console.log("⚡ Quick Resume - What have you done since last session?");
    const message = await rl.question("📝 Update (optional, Enter to skip): ");
    
    let tags: string | undefined;
    if (message) {
      const tagInput = await rl.question("🏷️  Tags (optional): ");
      if (tagInput) {
        tags = tagInput;
      }
    }
    
    rl.close();
    
    return this.resume({
      message: message || undefined,
      tags,
    });
  }
}

/**
 * Resume command handler
 */
export async function resumeCommand(options: ResumeOptions): Promise<void> {
  const resume = new OneKeyResume();
  
  let success: boolean;
  
  if (!options.message && !options.noSave) {
    // Interactive mode
    success = await resume.interactiveResume();
  } else {
    // Direct mode
    success = await resume.resume(options);
  }
  
  if (!success) {
    console.error(getMessage("resumeFailed"));
    process.exit(1);
  }
}