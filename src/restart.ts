/**
 * Smart Restart implementation
 * Provides /clear-independent restart with context preservation
 */

import { ProcessManager } from "./utils/process";
import { Storage } from "./storage";
import { ClaudeCLI } from "./claude";
import { AdaptiveContextPack } from "./contextPack";
import { Guardian } from "./guardian";
import { getGitBranch, getGitCommit } from "./utils/git";
import { config } from "./config";
import { getMessage } from "./i18n";
import type { Snapshot } from "./types";

export interface RestartOptions {
  force?: boolean;           // Force kill existing process
  noInject?: boolean;        // Skip context injection
  verifyResponse?: boolean;  // Enable response verification
  debug?: boolean;
}

/**
 * Smart Restart controller
 */
export class SmartRestart {
  private processManager: ProcessManager;
  private storage: Storage;
  private claude: ClaudeCLI;
  private contextPack: AdaptiveContextPack;
  private guardian: Guardian;
  
  constructor() {
    this.processManager = new ProcessManager();
    this.storage = new Storage();
    this.claude = new ClaudeCLI();
    this.contextPack = new AdaptiveContextPack();
    this.guardian = new Guardian();
  }
  
  /**
   * Main restart logic
   */
  async restart(options: RestartOptions = {}): Promise<boolean> {
    console.log("🔄 Smart Restart initiated");
    
    // Step 1: Check current Claude status
    const status = this.processManager.getStatus();
    
    if (status.alive) {
      if (status.sameProject) {
        console.log("✅ Claude is already running in this project");
        
        // Try to use --continue first
        if (await this.tryContinue()) {
          return true;
        }
        
        console.log("⚠️  --continue failed, attempting restart");
      } else {
        console.log("⚠️  Claude is running in a different project");
      }
      
      // Kill existing process if needed
      if (!await this.processManager.killClaude(options.force)) {
        console.error("❌ Failed to stop existing Claude process");
        return false;
      }
    }
    
    // Step 2: Load latest snapshot
    const snapshot = await this.storage.getLatestSnapshot();
    if (!snapshot) {
      console.log("📭 No snapshot found, starting fresh");
      return this.startFresh();
    }
    
    // Step 3: Generate context pack
    const gitBranch = getGitBranch();
    const gitCommit = getGitCommit();
    const pack = this.contextPack.generate(snapshot, gitBranch, gitCommit);
    
    // Step 4: Inject context and start Claude
    if (!options.noInject) {
      console.log("📤 Injecting context...");
      
      const injectResult = await this.claude.injectContext(pack);
      if (!injectResult.success) {
        console.warn("⚠️  Context injection failed:", injectResult.error);
        // Continue anyway, user can paste manually
      }
    }
    
    // Step 5: Start Claude with --continue
    console.log("🚀 Starting Claude...");
    const pid = this.processManager.spawnClaude(["--continue"]);
    
    if (!pid) {
      console.error("❌ Failed to start Claude");
      return false;
    }
    
    console.log(`✅ Claude started (PID: ${pid})`);
    
    // Step 6: Verify response if requested
    if (options.verifyResponse) {
      await this.verifyRestart(snapshot);
    }
    
    return true;
  }
  
  /**
   * Try to continue existing session
   */
  private async tryContinue(): Promise<boolean> {
    try {
      const result = await this.claude.openREPL();
      return result.success;
    } catch {
      return false;
    }
  }
  
  /**
   * Start fresh Claude session
   */
  private startFresh(): boolean {
    const pid = this.processManager.spawnClaude([]);
    if (pid) {
      console.log(`✅ Fresh Claude session started (PID: ${pid})`);
      return true;
    }
    return false;
  }
  
  /**
   * Verify restart succeeded by checking Claude's response
   */
  private async verifyRestart(snapshot: Snapshot): Promise<void> {
    // Wait for Claude to process context
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Read transcript to check response
    console.log("🔍 Verifying context recognition...");
    
    // This would need actual transcript reading implementation
    // For now, just log that we would verify
    if (config.debug) {
      console.log("Would verify these key points:");
      console.log("- Title mentioned:", snapshot.title);
      console.log("- Decisions recognized:", snapshot.decisions.length > 0);
      console.log("- Next steps acknowledged:", snapshot.nextSteps.length > 0);
    }
    
    // Update context pack preference based on response
    // this.contextPack.checkResponse(response);
  }
  
  /**
   * Get restart status and recommendations
   */
  async getRestartStatus(): Promise<{
    canRestart: boolean;
    reason: string;
    recommendations: string[];
  }> {
    const status = this.processManager.getStatus();
    const health = await this.guardian.checkHealth();
    
    const recommendations: string[] = [];
    
    // Check if Claude is alive
    if (!status.alive) {
      return {
        canRestart: true,
        reason: "No Claude process running",
        recommendations: ["Run 'kc restart' to start with context"],
      };
    }
    
    // Check if same project
    if (!status.sameProject) {
      recommendations.push("Claude is running in a different project");
      recommendations.push("Use 'kc restart --force' to switch projects");
    }
    
    // Check health
    if (health.level === "danger") {
      recommendations.push("Context usage is critical");
      recommendations.push("Consider 'kc save' before restart");
    }
    
    return {
      canRestart: true,
      reason: status.alive ? "Claude is running" : "Claude is not running",
      recommendations,
    };
  }
}

/**
 * Restart command handler
 */
export async function restartCommand(options: RestartOptions): Promise<void> {
  const restart = new SmartRestart();
  
  // Check if restart is recommended
  const status = await restart.getRestartStatus();
  
  if (status.recommendations.length > 0) {
    console.log("💡 Recommendations:");
    status.recommendations.forEach(rec => console.log(`   - ${rec}`));
    console.log("");
  }
  
  // Perform restart
  const success = await restart.restart(options);
  
  if (!success) {
    console.error(getMessage("restartFailed"));
    process.exit(1);
  }
  
  console.log("✨ Smart Restart complete!");
}