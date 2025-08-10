/**
 * "kc doctor" - Check system health and configuration
 */

import { existsSync, statSync, readdirSync } from "fs";
import { execSync, execFileSync } from "child_process";
import { Storage } from "./storage";
import { ClaudeCLI } from "./claude";
import { getStoragePaths } from "./types";

interface CheckResult {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  details?: string;
}

export async function doctorCommand() {
  console.log("🏥 KODAMA Claude - System Health Check");
  console.log("=" .repeat(50));
  
  const checks: CheckResult[] = [];
  
  // Check 1: Claude CLI availability
  const claude = new ClaudeCLI();
  if (claude.isAvailable()) {
    checks.push({
      name: "Claude CLI",
      status: "ok",
      message: "Claude Code CLI is installed",
    });
  } else {
    checks.push({
      name: "Claude CLI",
      status: "error",
      message: "Claude Code CLI not found",
      details: "Install with: npm install -g @anthropic/claude",
    });
  }
  
  // Check 2: Bun runtime
  try {
    const bunVersion = execSync("bun --version", { encoding: "utf-8" }).trim();
    checks.push({
      name: "Bun Runtime",
      status: "ok",
      message: `Bun ${bunVersion} installed`,
    });
  } catch {
    checks.push({
      name: "Bun Runtime",
      status: "warning",
      message: "Bun not found (using Node.js fallback)",
      details: "Install Bun for better performance: curl -fsSL https://bun.sh/install | bash",
    });
  }
  
  // Check 3: Storage directories
  const paths = getStoragePaths();
  const storage = new Storage();
  
  if (existsSync(paths.data)) {
    const stats = statSync(paths.data);
    if (stats.isDirectory()) {
      checks.push({
        name: "Storage Directory",
        status: "ok",
        message: `Storage initialized at ${paths.data}`,
      });
    } else {
      checks.push({
        name: "Storage Directory",
        status: "error",
        message: `${paths.data} exists but is not a directory`,
      });
    }
  } else {
    checks.push({
      name: "Storage Directory",
      status: "warning",
      message: "Storage not yet initialized",
      details: "Will be created on first use",
    });
  }
  
  // Check 4: Snapshots
  if (existsSync(paths.snapshots)) {
    const snapshots = readdirSync(paths.snapshots).filter(f => f.endsWith(".json"));
    checks.push({
      name: "Snapshots",
      status: "ok",
      message: `${snapshots.length} snapshot(s) found`,
    });
  } else {
    checks.push({
      name: "Snapshots",
      status: "warning",
      message: "No snapshots yet",
      details: "Create your first snapshot with: kc snap",
    });
  }
  
  // Check 5: Git repository
  try {
    const gitStatus = execSync("git status --porcelain", { encoding: "utf-8" });
    const branch = execSync("git branch --show-current", { encoding: "utf-8" }).trim();
    
    checks.push({
      name: "Git Repository",
      status: "ok",
      message: `On branch "${branch}"`,
      details: gitStatus ? `${gitStatus.split("\n").length} uncommitted changes` : "Clean working directory",
    });
  } catch {
    checks.push({
      name: "Git Repository",
      status: "warning",
      message: "Not a git repository",
      details: "Git integration provides better context tracking",
    });
  }
  
  // Check 6: Clipboard access
  const clipboardCommands = ["xclip", "xsel", "wl-copy", "pbcopy", "clip.exe"];
  let clipboardAvailable = false;
  let clipboardCmd = "";
  
  for (const cmd of clipboardCommands) {
    try {
      execSync(`which ${cmd}`, { stdio: "ignore" });
      clipboardAvailable = true;
      clipboardCmd = cmd;
      break;
    } catch {
      // Try next
    }
  }
  
  if (clipboardAvailable) {
    checks.push({
      name: "Clipboard",
      status: "ok",
      message: `System clipboard available (${clipboardCmd})`,
    });
  } else {
    checks.push({
      name: "Clipboard",
      status: "warning",
      message: "No clipboard command found",
      details: "Will fallback to temp files or OSC52",
    });
  }
  
  // Check 7: Disk space
  try {
    const dfOutput = execFileSync("df", ["-h", paths.data], { encoding: "utf-8" });
    const lines = dfOutput.split("\n");
    if (lines.length > 1) {
      const parts = lines[1].split(/\s+/);
      const available = parts[3];
      const percent = parseInt(parts[4]);
      
      if (percent > 90) {
        checks.push({
          name: "Disk Space",
          status: "warning",
          message: `Low disk space (${percent}% used)`,
          details: `${available} available`,
        });
      } else {
        checks.push({
          name: "Disk Space",
          status: "ok",
          message: `${available} available (${percent}% used)`,
        });
      }
    }
  } catch {
    // Skip disk check on error
  }
  
  // Check 8: XDG compliance
  const xdgData = process.env.XDG_DATA_HOME;
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  
  if (xdgData || xdgConfig) {
    checks.push({
      name: "XDG Directories",
      status: "ok",
      message: "Using XDG Base Directory specification",
      details: `Data: ${xdgData || "default"}, Config: ${xdgConfig || "default"}`,
    });
  } else {
    checks.push({
      name: "XDG Directories",
      status: "ok",
      message: "Using default XDG locations",
    });
  }
  
  // Display results
  console.log("");
  
  let hasErrors = false;
  let hasWarnings = false;
  
  for (const check of checks) {
    const icon = check.status === "ok" ? "✅" : 
                 check.status === "warning" ? "⚠️" : "❌";
    
    console.log(`${icon} ${check.name}: ${check.message}`);
    
    if (check.details) {
      console.log(`   ${check.details}`);
    }
    
    if (check.status === "error") hasErrors = true;
    if (check.status === "warning") hasWarnings = true;
  }
  
  // Summary
  console.log("\n" + "=" .repeat(50));
  
  if (hasErrors) {
    console.log("❌ Some checks failed. Please fix the errors above.");
    process.exit(1);
  } else if (hasWarnings) {
    console.log("⚠️ System is functional with warnings.");
    console.log("✅ KODAMA Claude is ready to use!");
  } else {
    console.log("✅ All checks passed!");
    console.log("🚀 KODAMA Claude is fully operational!");
  }
  
  // Usage hints
  console.log("\n💡 Quick start:");
  console.log("   kc snap    - Create a snapshot of your current work");
  console.log("   kc go      - Start or continue Claude session");
  console.log("   kc plan    - Plan your next development steps");
  console.log("   kc send    - Send context to Claude");
}