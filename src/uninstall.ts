/**
 * Uninstall command for KODAMA Claude
 * Provides safe self-uninstallation with data preservation options
 */

import { spawnSync } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as readline from "readline/promises";
import { config } from "./config";
import { getMessage } from "./i18n";

interface UninstallOptions {
  removeAll?: boolean;
  dryRun?: boolean;
  force?: boolean;
  backup?: boolean;
  quiet?: boolean;
}

const BINARY_PATH = "/usr/local/bin/kc";
const DATA_DIR = join(homedir(), ".local", "share", "kodama-claude");
const CONFIG_DIR = join(homedir(), ".config", "kodama-claude");

/**
 * Calculate directory size
 */
function getDirectorySize(dir: string): string {
  if (!existsSync(dir)) return "0";
  
  const result = spawnSync("du", ["-sh", dir], { encoding: "utf-8" });
  if (result.status === 0) {
    return result.stdout.split("\t")[0];
  }
  return "unknown";
}

/**
 * Count snapshots
 */
function countSnapshots(): number {
  const snapshotDir = join(DATA_DIR, "snapshots");
  if (!existsSync(snapshotDir)) return 0;
  
  try {
    return readdirSync(snapshotDir).filter(f => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

/**
 * Show removal summary
 */
function showSummary(options: UninstallOptions): void {
  console.log("\n📊 Removal Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  // Binary
  if (existsSync(BINARY_PATH)) {
    const stats = statSync(BINARY_PATH);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    console.log("Will remove:");
    console.log(`  • Binary: ${BINARY_PATH} (${sizeMB}MB)`);
  }
  
  // Data
  if (options.removeAll && existsSync(DATA_DIR)) {
    const snapshots = countSnapshots();
    const size = getDirectorySize(DATA_DIR);
    console.log(`  • Data directory: ${DATA_DIR}`);
    console.log(`    - ${snapshots} snapshot(s)`);
    console.log(`    - Total size: ${size}`);
  } else if (existsSync(DATA_DIR)) {
    const snapshots = countSnapshots();
    console.log("\nWill keep:");
    console.log(`  • Snapshots: ${DATA_DIR}/snapshots/ (${snapshots} files)`);
    console.log(`  • Event log: ${DATA_DIR}/events.jsonl`);
    console.log("\n  ℹ️  Use --remove-all to delete data");
  }
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

/**
 * Execute uninstall script
 */
function executeUninstall(options: UninstallOptions): void {
  // Build command arguments
  const args = [];
  
  if (options.removeAll) args.push("--remove-all");
  if (options.dryRun) args.push("--dry-run");
  if (options.force) args.push("--force");
  if (options.backup) args.push("--backup");
  if (options.quiet) args.push("--quiet");
  
  // Find uninstall script
  const scriptPaths = [
    join(__dirname, "..", "uninstall.sh"),
    join(__dirname, "..", "..", "uninstall.sh"),
    "/usr/local/share/kodama-claude/uninstall.sh",
    join(homedir(), ".local", "share", "kodama-claude", "uninstall.sh")
  ];
  
  let scriptPath = scriptPaths.find(p => existsSync(p));
  
  if (!scriptPath) {
    // Fallback to downloading from GitHub
    console.log("📥 Downloading uninstall script...");
    const result = spawnSync("curl", [
      "-fsSL",
      "https://raw.githubusercontent.com/tsutomu-n/kodama-claude/main/uninstall.sh"
    ], { encoding: "utf-8" });
    
    if (result.status === 0) {
      // Execute downloaded script
      const bashResult = spawnSync("bash", ["-s", "--", ...args], {
        input: result.stdout,
        stdio: ["pipe", "inherit", "inherit"]
      });
      process.exit(bashResult.status || 0);
    } else {
      console.error("❌ Failed to download uninstall script");
      console.log("\nManual uninstall:");
      console.log("  sudo rm /usr/local/bin/kc");
      if (options.removeAll) {
        console.log("  rm -rf ~/.local/share/kodama-claude");
      }
      process.exit(1);
    }
  }
  
  // Execute local script
  const result = spawnSync("bash", [scriptPath, ...args], {
    stdio: "inherit"
  });
  
  process.exit(result.status || 0);
}

/**
 * Uninstall command handler
 */
export async function uninstallCommand(options: UninstallOptions): Promise<void> {
  console.log("🗑️  KODAMA Claude Uninstaller");
  console.log("═══════════════════════════════════════");
  
  // Show summary
  showSummary(options);
  
  // Confirm if not forced
  if (!options.force && !options.dryRun) {
    if (options.removeAll) {
      console.log("\n⚠️  WARNING: This will permanently delete all your snapshots!");
    }
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await rl.question("\nDo you want to continue? [y/N]: ");
    rl.close();
    
    if (!answer.match(/^[yY]/)) {
      console.log("\nUninstall cancelled");
      process.exit(0);
    }
  }
  
  // Execute uninstall
  executeUninstall(options);
}