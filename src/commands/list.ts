#!/usr/bin/env bun
/**
 * List saved snapshots
 * Shows recent snapshots with title, timestamp, and tags
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { SnapshotSchema, getStoragePaths } from "../types";

interface ListOptions {
  limit?: number;
  json?: boolean;
  verbose?: boolean;
}

export async function list(options: ListOptions = {}): Promise<void> {
  // Input validation and sanitization
  const limit = Math.min(Math.max(1, options.limit || 10), 1000); // Cap at 1000 for performance
  const { json = false, verbose = false } = options;
  
  try {
    // Get snapshot directory
    const paths = getStoragePaths();
    const snapshotDir = paths.snapshots;
    
    if (!fs.existsSync(snapshotDir)) {
      if (json) {
        console.log(JSON.stringify({ snapshots: [] }));
      } else {
        console.log("📭 No snapshots found");
      }
      return;
    }
    
    // Get all snapshot files with safe path handling
    const allFiles = fs.readdirSync(snapshotDir);
    const validFiles = [];
    
    for (const fileName of allFiles) {
      // Security: Validate filename pattern
      if (!/^[0-9T\-]+[a-z0-9]+\.json$/.test(fileName) && fileName !== "archive") {
        continue; // Skip non-snapshot files
      }
      
      if (fileName === "latest.json") {
        continue; // Skip symlink
      }
      
      const filePath = path.join(snapshotDir, fileName);
      
      try {
        const stat = fs.statSync(filePath);
        
        // Security: Skip if not a regular file
        if (!stat.isFile()) {
          continue;
        }
        
        // Security: Skip files larger than 10MB (potential DoS)
        if (stat.size > 10 * 1024 * 1024) {
          if (verbose) {
            console.error(`⚠️  Skipping large file: ${fileName} (${Math.round(stat.size / 1024 / 1024)}MB)`);
          }
          continue;
        }
        
        validFiles.push({
          name: fileName,
          path: filePath,
          mtime: stat.mtime,
          size: stat.size
        });
      } catch (e) {
        // Skip files we can't stat
        if (verbose) {
          console.error(`⚠️  Cannot read file: ${fileName}`);
        }
      }
    }
    
    const files = validFiles
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .slice(0, limit);
    
    if (files.length === 0) {
      if (json) {
        console.log(JSON.stringify({ snapshots: [] }));
      } else {
        console.log("📭 No snapshots found");
      }
      return;
    }
    
    // Load and format snapshots
    const snapshots = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(file.path, "utf-8");
        
        // Security: Limit content size for parsing
        if (content.length > 1024 * 1024) { // 1MB max
          throw new Error("Snapshot too large");
        }
        
        const data = JSON.parse(content);
        const snapshot = SnapshotSchema.parse(data);
        
        // Sanitize output data
        snapshots.push({
          id: snapshot.id?.substring(0, 100) || "unknown",
          title: (snapshot.title || "Untitled").substring(0, 200),
          timestamp: snapshot.timestamp,
          step: snapshot.step,
          tags: (snapshot.tags || []).slice(0, 10).map(t => String(t).substring(0, 50)),
          file: file.name
        });
      } catch (e) {
        // Skip invalid snapshots
        if (verbose) {
          // Security: Don't expose internal error details
          const safeFileName = file.name.substring(0, 50);
          console.error(`⚠️  Skipping invalid snapshot: ${safeFileName}`);
        }
      }
    }
    
    // Output results
    if (json) {
      console.log(JSON.stringify({ snapshots }, null, 2));
    } else {
      console.log(`📚 Recent Snapshots (showing ${snapshots.length}/${files.length}):\n`);
      
      snapshots.forEach((snap, index) => {
        const date = new Date(snap.timestamp);
        const timeAgo = getTimeAgo(date);
        const formattedDate = formatDate(date);
        
        // Security: Escape potential control characters in title
        const safeTitle = (snap.title || "Untitled").replace(/[\x00-\x1F\x7F]/g, "");
        console.log(`${index + 1}. ${safeTitle}`);
        console.log(`   📅 ${formattedDate} (${timeAgo})`);
        
        if (snap.step && snap.step !== "unknown") {
          console.log(`   📊 Step: ${snap.step}`);
        }
        
        if (snap.tags && snap.tags.length > 0) {
          // Security: Escape tags and limit display
          const safeTags = snap.tags
            .map(t => String(t).replace(/[\x00-\x1F\x7F]/g, ""))
            .join(", ");
          console.log(`   🏷️  Tags: ${safeTags}`);
        }
        
        if (verbose) {
          console.log(`   🆔 ID: ${snap.id}`);
          console.log(`   📁 File: ${snap.file}`);
        }
        
        console.log("");
      });
      
      if (files.length > limit) {
        console.log(`💡 Showing ${limit} of ${files.length} snapshots. Use --limit to see more.`);
      }
    }
  } catch (error) {
    if (json) {
      console.log(JSON.stringify({ error: String(error) }));
    } else {
      console.error("❌ Error listing snapshots:", error);
    }
    process.exit(1);
  }
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
  const options: ListOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--limit":
      case "-n":
        const limitValue = parseInt(args[++i], 10);
        if (isNaN(limitValue) || limitValue < 1) {
          console.error("❌ Invalid limit value. Must be a positive number.");
          process.exit(1);
        }
        options.limit = limitValue;
        break;
      case "--json":
        options.json = true;
        break;
      case "--verbose":
      case "-v":
        options.verbose = true;
        break;
      case "--help":
      case "-h":
        console.log(`Usage: kc list [options]

List saved snapshots

Options:
  -n, --limit <n>  Number of snapshots to show (default: 10)
  --json           Output as JSON
  -v, --verbose    Show more details
  -h, --help       Show this help message

Examples:
  kc list              # Show recent 10 snapshots
  kc list -n 20        # Show recent 20 snapshots
  kc list --verbose    # Show with IDs and filenames
  kc list --json       # Output as JSON`);
        process.exit(0);
    }
  }
  
  list(options);
}