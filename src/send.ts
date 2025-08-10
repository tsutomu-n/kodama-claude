/**
 * "kc send" - Send saved context to Claude Code CLI
 */

import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import { Storage } from "./storage";
import { getMessage, formatError } from "./i18n";

export async function sendCommand(snapshotId?: string) {
  const storage = new Storage();
  
  // Load snapshot
  let snapshot;
  
  if (snapshotId) {
    snapshot = storage.loadSnapshot(snapshotId);
    if (!snapshot) {
      console.error(formatError(getMessage("snapshotNotFound", snapshotId)));
      
      // List available snapshots
      const snapshots = storage.listSnapshots();
      if (snapshots.length > 0) {
        console.log("\n📦 Available snapshots:");
        snapshots.slice(0, 10).forEach(s => {
          console.log(`  ${s.id.substring(0, 8)}... - ${s.title} (${s.timestamp})`);
        });
      }
      
      process.exit(1);
    }
  } else {
    // Use latest snapshot
    snapshot = storage.getLatestSnapshot();
    if (!snapshot) {
      console.error(formatError(getMessage("noSnapshotsFound")));
      process.exit(1);
    }
  }
  
  console.log("📤 Sending snapshot to Claude...");
  console.log("   ID:", snapshot.id);
  console.log("   Title:", snapshot.title);
  console.log("   Step:", snapshot.step || "none");
  
  // Build context message
  const contextMessage = buildContextMessage(snapshot);
  
  // Try multiple methods to send to Claude
  let sent = false;
  
  // Method 1: Try OSC52 clipboard (works in many terminals)
  if (!sent) {
    sent = await tryOSC52Clipboard(contextMessage);
    if (sent) {
      console.log("✅ Context copied to clipboard via OSC52");
    }
  }
  
  // Method 2: Try system clipboard commands
  if (!sent) {
    sent = await trySystemClipboard(contextMessage);
    if (sent) {
      console.log("✅ Context copied to system clipboard");
    }
  }
  
  // Method 3: Save to temp file
  if (!sent) {
    const tempFile = join(tmpdir(), `kodama-context-${randomUUID()}.txt`);
    writeFileSync(tempFile, contextMessage, "utf-8");
    
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
    
    sent = true;
  }
  
  if (sent) {
    // Log event
    storage.appendEvent({
      timestamp: new Date().toISOString(),
      eventType: "snapshot_sent",
      snapshotId: snapshot.id,
    });
    
    console.log("\n💡 Next steps:");
    console.log("   1. Start Claude: claude");
    console.log("   2. Paste the context (Ctrl+V or Cmd+V)");
    console.log("   3. Continue your conversation");
  }
}

/**
 * Build context message from snapshot
 */
function buildContextMessage(snapshot: any): string {
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
 * Try to copy to clipboard using OSC52
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
 * Try to copy to system clipboard
 */
async function trySystemClipboard(text: string): Promise<boolean> {
  const commands = [
    // Linux (X11)
    { cmd: "xclip", args: ["-selection", "clipboard"] },
    { cmd: "xsel", args: ["--clipboard", "--input"] },
    
    // Linux (Wayland)
    { cmd: "wl-copy", args: [] },
    
    // macOS
    { cmd: "pbcopy", args: [] },
    
    // Windows (WSL)
    { cmd: "clip.exe", args: [] },
  ];
  
  for (const { cmd, args } of commands) {
    try {
      // Check if command exists
      execSync(`which ${cmd}`, { stdio: "ignore" });
      
      // Try to copy
      const proc = require("child_process").spawn(cmd, args, {
        stdio: ["pipe", "ignore", "ignore"],
      });
      
      proc.stdin.write(text);
      proc.stdin.end();
      
      // Wait a bit for the command to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch {
      // Try next command
    }
  }
  
  return false;
}