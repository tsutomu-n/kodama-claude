#!/usr/bin/env bun
/**
 * Show specific snapshot details
 * Displays full snapshot information with partial ID matching
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { SnapshotSchema, getStoragePaths } from "../types";
import { getMessage, formatError } from "../i18n";
import { config } from "../config";
import { validateSnapshotId, sanitizeForOutput } from "../utils/sanitize";

interface ShowOptions {
  json?: boolean;
  verbose?: boolean;
}

export async function show(snapshotId: string, options: ShowOptions = {}): Promise<void> {
  const { json = false, verbose = false } = options;
  
  try {
    // Input validation with sanitization
    const validation = validateSnapshotId(snapshotId);
    
    if (!validation.isValid) {
      if (json) {
        console.log(JSON.stringify({ 
          error: "Invalid snapshot ID", 
          details: validation.errors 
        }));
      } else {
        console.error(`❌ Snapshot ID '${sanitizeForOutput(snapshotId)}' is invalid.`);
        validation.errors.forEach(error => {
          console.error(`   Reason: ${error}`);
        });
        console.error("💡 Examples of valid IDs: abc123, test-2024, feature_login");
      }
      process.exit(1);
    }
    
    // Use sanitized ID from here on
    const sanitizedId = validation.sanitized;

    // Get snapshot directory
    const paths = getStoragePaths();
    const snapshotDir = paths.snapshots;
    
    if (!fs.existsSync(snapshotDir)) {
      if (json) {
        console.log(JSON.stringify({ error: "No snapshots directory found" }));
      } else {
        console.error("❌ No snapshots found. Create one with: kc save");
      }
      process.exit(1);
    }
    
    // Find matching snapshot files with partial ID matching
    const allFiles = fs.readdirSync(snapshotDir)
      .filter(f => f.endsWith(".json") && !f.startsWith("archive"));
    
    // Try exact match first
    let matchingFiles = allFiles.filter(f => 
      f === `${sanitizedId}.json`
    );
    
    // If no exact match, try partial match (prefix)
    if (matchingFiles.length === 0) {
      matchingFiles = allFiles.filter(f => 
        f.startsWith(sanitizedId) && f !== "latest.json"
      );
    }
    
    // Handle multiple or no matches
    if (matchingFiles.length === 0) {
      if (json) {
        console.log(JSON.stringify({ error: `No snapshot found matching ID: ${sanitizeForOutput(sanitizedId)}` }));
      } else {
        console.error(`❌ No snapshot found matching ID: ${sanitizeForOutput(sanitizedId)}`);
        
        // Suggest similar IDs if any exist (optimized)
        const lowerQuery = sanitizedId.toLowerCase();
        const similarIds = allFiles
          .map(f => f.replace(".json", ""))
          .filter(id => {
            const lowerId = id.toLowerCase();
            return lowerId.includes(lowerQuery) || 
                   lowerQuery.includes(lowerId.slice(0, 4));
          })
          .slice(0, 3);
        
        if (similarIds.length > 0) {
          console.error("💡 Did you mean one of these?");
          similarIds.forEach(id => console.error(`   • ${sanitizeForOutput(id)}`));
        } else {
          console.error("💡 Use 'kc list' to see all available snapshots");
        }
      }
      process.exit(1);
    }
    
    if (matchingFiles.length > 1) {
      if (json) {
        const matches = matchingFiles.map(f => ({
          id: f.replace(".json", ""),
          filename: f
        }));
        console.log(JSON.stringify({ 
          error: "Multiple snapshots match", 
          matches 
        }));
      } else {
        console.error(`❌ Multiple snapshots match ID '${sanitizeForOutput(sanitizedId)}' (${matchingFiles.length} found):`);
        matchingFiles.forEach((f, index) => {
          const id = f.replace(".json", "");
          console.error(`  ${index + 1}. ${sanitizeForOutput(id)}`);
        });
        console.error("💡 Use a more specific ID. Examples:");
        const suggestionId = matchingFiles[0].replace(".json", "").slice(0, Math.min(8, matchingFiles[0].length - 5));
        console.error(`   • Try '${sanitizeForOutput(suggestionId)}'`);
      }
      process.exit(1);
    }
    
    // Load the matching snapshot
    const fileName = matchingFiles[0];
    const filePath = path.join(snapshotDir, fileName);
    const actualId = fileName.replace(".json", "");
    
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      
      // Security: Limit content size for parsing
      if (content.length > 1024 * 1024) { // 1MB max
        throw new Error("Snapshot file too large");
      }
      
      const data = JSON.parse(content);
      const snapshot = SnapshotSchema.parse(data);
      
      // Display the snapshot
      if (json) {
        console.log(JSON.stringify({
          snapshot: {
            ...snapshot,
            filename: fileName,
            actualId
          }
        }, null, 2));
      } else {
        displaySnapshot(snapshot, actualId, fileName, verbose);
      }
    } catch (error) {
      if (json) {
        console.log(JSON.stringify({ 
          error: "Failed to load snapshot",
          details: config.debug ? String(error) : "Invalid snapshot format"
        }));
      } else {
        console.error(`❌ Failed to load snapshot: ${actualId}`);
        if (config.debug) {
          console.error(`   Error: ${error}`);
        }
      }
      process.exit(1);
    }
    
  } catch (error) {
    if (json) {
      console.log(JSON.stringify({ error: String(error) }));
    } else {
      console.error("❌ Error showing snapshot:", error);
    }
    process.exit(1);
  } finally {
    // Ensure any open file handles are properly cleaned up
  }
}

function displaySnapshot(snapshot: any, actualId: string, fileName: string, verbose: boolean): void {
  const date = new Date(snapshot.timestamp);
  const timeAgo = getTimeAgo(date);
  const formattedDate = formatDate(date);
  
  // Header
  console.log("==========================================");
  console.log(`📄 Snapshot: ${actualId}`);
  console.log("==========================================");
  
  // Basic information
  const safeTitle = (snapshot.title || "Untitled").replace(/[\x00-\x1F\x7F]/g, "");
  console.log(`📌 Title: ${safeTitle}`);
  console.log(`📅 Created: ${formattedDate} (${timeAgo})`);
  
  if (snapshot.step && snapshot.step !== "unknown") {
    console.log(`📊 Step: ${snapshot.step}`);
  }
  
  if (snapshot.tags && snapshot.tags.length > 0) {
    const safeTags = snapshot.tags
      .map((t: any) => String(t).replace(/[\x00-\x1F\x7F]/g, ""))
      .join(", ");
    console.log(`🏷️  Tags: ${safeTags}`);
  }
  
  if (snapshot.cwd) {
    console.log(`📁 Directory: ${snapshot.cwd}`);
  }
  
  if (snapshot.gitBranch) {
    console.log(`🌿 Git Branch: ${snapshot.gitBranch}`);
  }
  
  if (snapshot.gitCommit) {
    console.log(`🔗 Git Commit: ${snapshot.gitCommit.substring(0, 8)}`);
  }
  
  // Context (limited unless verbose)
  if (snapshot.context) {
    console.log("\n📝 Context:");
    console.log("------------------------------------------");
    
    if (verbose || snapshot.context.length <= 500) {
      console.log(snapshot.context);
    } else {
      // Show truncated context
      console.log(snapshot.context.substring(0, 500) + "...");
      console.log(`\n💡 Context truncated. Use --verbose to see full content (${snapshot.context.length} characters total)`);
    }
  }
  
  // Decisions
  if (snapshot.decisions && snapshot.decisions.length > 0) {
    console.log("\n✅ Decisions:");
    console.log("------------------------------------------");
    snapshot.decisions.forEach((decision: string, index: number) => {
      const safeDecision = decision.replace(/[\x00-\x1F\x7F]/g, "");
      console.log(`${index + 1}. ${safeDecision}`);
    });
  }
  
  // Next Steps
  if (snapshot.nextSteps && snapshot.nextSteps.length > 0) {
    console.log("\n📋 Next Steps:");
    console.log("------------------------------------------");
    snapshot.nextSteps.forEach((step: string, index: number) => {
      const safeStep = step.replace(/[\x00-\x1F\x7F]/g, "");
      console.log(`${index + 1}. ${safeStep}`);
    });
  }
  
  // Metadata (verbose only)
  if (verbose) {
    console.log("\n🔍 Metadata:");
    console.log("------------------------------------------");
    console.log(`Version: ${snapshot.version}`);
    console.log(`Full ID: ${snapshot.id}`);
    console.log(`File: ${fileName}`);
    if (snapshot.claudeSessionId) {
      console.log(`Claude Session: ${snapshot.claudeSessionId}`);
    }
  }
  
  console.log("==========================================");
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

function formatDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month} ${day} ${hours}:${minutes}`;
}

// CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: ShowOptions = {};
  let snapshotId = "";
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--json":
        options.json = true;
        break;
      case "--verbose":
      case "-v":
        options.verbose = true;
        break;
      case "--help":
      case "-h":
        console.log(`Usage: kc show <snapshot-id> [options]

Show detailed information about a specific snapshot

Arguments:
  <snapshot-id>    Snapshot ID or partial ID to display

Options:
  --json           Output as JSON
  -v, --verbose    Show full details including complete context
  -h, --help       Show this help message

Examples:
  kc show abc123           # Show snapshot with ID starting with 'abc123'
  kc show abc123 --json    # JSON output
  kc show abc123 -v        # Show complete context and metadata`);
        process.exit(0);
      default:
        if (!snapshotId && !args[i].startsWith('-')) {
          snapshotId = args[i];
        }
        break;
    }
  }
  
  if (!snapshotId) {
    console.error("❌ Snapshot ID is required");
    console.error("Usage: kc show <snapshot-id>");
    console.error("Use 'kc show --help' for more information");
    process.exit(1);
  }
  
  show(snapshotId, options);
}