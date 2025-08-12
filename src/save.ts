/**
 * "kc save" - Save snapshot and optionally paste to clipboard
 * Combines the old snap + send functionality
 */

import { randomUUID } from "crypto";
import { cwd } from "process";
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
import * as readline from "readline/promises";
import { Storage } from "./storage";
import { ClaudeMdManager } from "./claudeMdManager";
import { getMessage, formatError } from "./i18n";
import { config } from "./config";
import { getGitBranch, getGitCommit } from "./utils/git";
import { parseStep, ValidStep } from "./utils/validation";
import { TagManager } from "./utils/tags";
import type { Snapshot } from "./types";

export interface SaveOptions {
  title?: string;
  step?: string;
  stdin?: boolean;
  file?: string;
  yes?: boolean;
  copy?: 'auto' | 'clipboard' | 'osc52' | 'file' | 'none';
  debug?: boolean;
  tags?: string;  // Comma or space separated tags
}

export async function saveCommand(options: SaveOptions) {
  try {
    const storage = new Storage();
    const tagManager = new TagManager();
    
    // Show 3-line plan at the beginning
    console.log("📝 Save your work context");
    console.log("   1. Capture current state");
    console.log("   2. Store decisions & next steps");
    console.log("   3. Optional: paste to clipboard\n");
    
    let title = options.title;
    let step = parseStep(options.step);
    let context = "";
    let decisions: string[] = [];
    let nextSteps: string[] = [];
    let tags: string[] = [];
    
    // Get input based on mode
    if (options.stdin) {
      // Read from stdin
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      context = Buffer.concat(chunks).toString('utf-8');
      
      if (!title) {
        title = "Snapshot from stdin";
      }
    } else if (options.file) {
      // Read from file
      if (!existsSync(options.file)) {
        console.error(formatError(`File not found: ${options.file}`));
        process.exit(1);
      }
      context = readFileSync(options.file, 'utf-8');
      
      if (!title) {
        title = `Snapshot from ${options.file}`;
      }
    } else {
      // Interactive mode
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      const isWSL = process.platform === 'linux' && 
                    existsSync('/proc/version') && 
                    readFileSync('/proc/version', 'utf-8').toLowerCase().includes('microsoft');
      
      console.log("Interactive snapshot creation");
      console.log(`(End input with ${isWSL ? 'Ctrl+Z' : 'Ctrl+D'})\n`);
      
      // Title
      if (!title) {
        title = await rl.question("📝 Title (required): ");
        if (!title.trim()) {
          console.error(formatError(getMessage("titleRequired")));
          rl.close();
          process.exit(1);
        }
      }
      
      // Step
      if (!step) {
        const stepInput = await rl.question("📊 Step (designing/implementing/testing/done): ");
        step = parseStep(stepInput);
      }
      
      // Context
      console.log(`\n📝 What did you accomplish? (${isWSL ? 'Ctrl+Z' : 'Ctrl+D'} to finish):`);
      const contextLines: string[] = [];
      rl.on('line', (line) => contextLines.push(line));
      
      await new Promise<void>((resolve) => {
        rl.once('close', () => resolve());
      });
      
      context = contextLines.join('\n');
      
      // Decisions
      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      console.log(`\n🎯 Key decisions made (one per line, ${isWSL ? 'Ctrl+Z' : 'Ctrl+D'} when done):`);
      const decisionLines: string[] = [];
      rl2.on('line', (line) => {
        if (line.trim()) decisionLines.push(line.trim());
      });
      
      await new Promise<void>((resolve) => {
        rl2.once('close', () => resolve());
      });
      
      decisions = decisionLines;
      
      // Next steps
      const rl3 = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      console.log(`\n🚀 Next steps to take (one per line, ${isWSL ? 'Ctrl+Z' : 'Ctrl+D'} when done):`);
      const nextStepLines: string[] = [];
      rl3.on('line', (line) => {
        if (line.trim()) nextStepLines.push(line.trim());
      });
      
      await new Promise<void>((resolve) => {
        rl3.once('close', () => resolve());
      });
      
      nextSteps = nextStepLines;
      
      // Tags (optional)
      const rl4 = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      console.log(`\n🏷️  Tags (optional, comma/space separated, Enter to skip):`);
      const tagInput = await rl4.question("   ");
      rl4.close();
      
      if (tagInput) {
        tags = tagManager.parseTags(tagInput);
      }
    }
    
    // Parse tags from command line option
    if (options.tags) {
      tags = tagManager.parseTags(options.tags);
    }
    
    // Add automatic tags if no manual tags provided
    if (tags.length === 0) {
      tags = tagManager.generateAutoTags();
    }
    
    // Create snapshot
    const snapshot: Snapshot = {
      version: "1.0.0",
      id: randomUUID(),
      title: title || "Untitled",
      timestamp: new Date().toISOString(),
      step,
      context,
      decisions: config.noLimit ? decisions : decisions.slice(-5),
      nextSteps,
      cwd: cwd(),
      gitBranch: getGitBranch(),
      gitCommit: getGitCommit(),
      tags,
    };
    
    // Save snapshot
    await storage.saveSnapshot(snapshot);
    
    // Trigger auto-archive if enabled
    storage.triggerAutoArchive();
    
    // Update CLAUDE.md if enabled (dry-run by default)
    const claudeMd = new ClaudeMdManager();
    claudeMd.updateSection(snapshot, undefined, config.claudeMdSyncDryRun);
    
    console.log("\n" + getMessage("snapshotCreated", snapshot.id));
    console.log("📦 ID:", snapshot.id);
    console.log("📝 Title:", snapshot.title);
    console.log("📊 Step:", snapshot.step || "none");
    if (tags.length > 0) {
      console.log("🏷️  Tags:", tags.join(", "));
    }
    
    // Ask about pasting (unless --yes with --copy specified, or --copy=none)
    const copyMode = options.copy || 'auto';
    
    if (copyMode !== 'none' && !options.yes) {
      const rl4 = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      const answer = await rl4.question("\n[Y/n] Paste to clipboard now? ");
      rl4.close();
      
      if (answer.toLowerCase() !== 'n' && answer.toLowerCase() !== 'no') {
        await pasteSnapshot(snapshot, copyMode);
      }
    } else if (copyMode !== 'none' && options.yes) {
      // Auto-paste if --yes specified
      await pasteSnapshot(snapshot, copyMode);
    }
    
  } catch (error) {
    console.error(formatError(getMessage("errorCreating", "snapshot")));
    if (config.debug) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Paste snapshot to clipboard/file
 */
async function pasteSnapshot(snapshot: Snapshot, mode: string): Promise<void> {
  const contextMessage = buildContextMessage(snapshot);
  
  if (mode === 'auto') {
    // Try in order: clipboard -> osc52 -> file
    if (await trySystemClipboard(contextMessage)) {
      console.log("✅ Context copied to system clipboard");
      return;
    }
    
    if (await tryOSC52Clipboard(contextMessage)) {
      console.log("✅ Context copied via OSC52");
      return;
    }
    
    // Fallback to file
    await saveToTempFile(contextMessage);
  } else if (mode === 'clipboard') {
    if (!await trySystemClipboard(contextMessage)) {
      console.error("❌ Failed to copy to clipboard");
      console.log("💡 Try: kc save --copy=osc52 or --copy=file");
    } else {
      console.log("✅ Context copied to system clipboard");
    }
  } else if (mode === 'osc52') {
    if (await tryOSC52Clipboard(contextMessage)) {
      console.log("✅ Context copied via OSC52");
    } else {
      console.error("❌ OSC52 may not be supported by your terminal");
    }
  } else if (mode === 'file') {
    await saveToTempFile(contextMessage);
  }
}

/**
 * Build context message from snapshot
 */
function buildContextMessage(snapshot: Snapshot): string {
  const parts = [];
  
  parts.push("# Continuing Previous Session\n");
  parts.push(`**Title:** ${snapshot.title}`);
  parts.push(`**When:** ${snapshot.timestamp}`);
  
  if (snapshot.step) {
    parts.push(`**Step:** ${snapshot.step}`);
  }
  
  if (snapshot.cwd) {
    parts.push(`**Directory:** ${snapshot.cwd}`);
  }
  
  if (snapshot.gitBranch) {
    parts.push(`**Git Branch:** ${snapshot.gitBranch}`);
  }
  
  if (snapshot.context) {
    parts.push("\n## Previous Context\n");
    parts.push(snapshot.context);
  }
  
  if (snapshot.decisions && snapshot.decisions.length > 0) {
    parts.push("\n## Key Decisions Made\n");
    snapshot.decisions.forEach((d: string) => parts.push(`- ${d}`));
  }
  
  if (snapshot.nextSteps && snapshot.nextSteps.length > 0) {
    parts.push("\n## Next Steps Planned\n");
    snapshot.nextSteps.forEach((s: string) => parts.push(`- ${s}`));
  }
  
  parts.push("\n---\n");
  parts.push("Let's continue from where we left off. What should we work on next?");
  
  return parts.join("\n");
}

/**
 * Try OSC52 clipboard
 */
async function tryOSC52Clipboard(text: string): Promise<boolean> {
  try {
    const base64 = Buffer.from(text).toString("base64");
    const osc52 = `\x1b]52;c;${base64}\x07`;
    
    // Write to stderr (usually connected to terminal)
    process.stderr.write(osc52);
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Try system clipboard
 */
async function trySystemClipboard(text: string): Promise<boolean> {
  const commands = [
    // WSL
    { cmd: "clip.exe", args: [] },
    
    // Linux (Wayland)
    { cmd: "wl-copy", args: [] },
    
    // Linux (X11)
    { cmd: "xclip", args: ["-selection", "clipboard"] },
    { cmd: "xsel", args: ["--clipboard", "--input"] },
    
    // macOS
    { cmd: "pbcopy", args: [] },
  ];
  
  for (const { cmd, args } of commands) {
    try {
      // Check if command exists (safe)
      const checkResult = spawnSync("which", [cmd], { 
        encoding: "utf-8",
        shell: false
      });
      
      if (checkResult.status === 0) {
        // Try to copy
        const proc = require("child_process").spawn(cmd, args, {
          stdio: ["pipe", "ignore", "ignore"],
        });
        
        proc.stdin.write(text);
        proc.stdin.end();
        
        // Wait a bit for the command to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return true;
      }
    } catch {
      // Try next command
    }
  }
  
  return false;
}

/**
 * Save to temp file
 */
async function saveToTempFile(text: string): Promise<void> {
  const tempFile = join(tmpdir(), `kodama-context-${randomUUID()}.txt`);
  writeFileSync(tempFile, text, "utf-8");
  
  console.log("📄 Context saved to temp file:");
  console.log(`   ${tempFile}`);
  console.log("\n📋 To use with Claude:");
  console.log(`   cat "${tempFile}" | claude`);
  
  // Clean up after 5 minutes
  setTimeout(() => {
    try {
      unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }, 5 * 60 * 1000);
}