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
  since?: string;
  until?: string;
  today?: boolean;
  yesterday?: boolean;
  thisWeek?: boolean;
  tags?: string;
  sort?: string;
  reverse?: boolean;
  noHeader?: boolean;
  machine?: boolean; // Machine-readable output (TSV format)
}

export async function list(options: ListOptions = {}): Promise<void> {
  // Input validation and sanitization
  const limit = Math.min(Math.max(1, options.limit || 10), 1000); // Cap at 1000 for performance
  const { 
    json = false, 
    verbose = false, 
    since,
    until,
    today = false,
    yesterday = false,
    thisWeek = false,
    tags,
    sort = "date",
    reverse = false,
    noHeader = false,
    machine = false
  } = options;
  
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
    const allFiles = fs.readdirSync(snapshotDir)
      .slice(0, 2000); // Performance: Cap directory listing to prevent DoS
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
    
    // Parse date filters
    const dateFilters = parseDateFilters({ since, until, today, yesterday, thisWeek });
    
    // Parse tag filters
    const tagFilters = parseTags(tags);

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
        
        // Apply filters
        if (!passesFilters(snapshot, file.mtime, dateFilters, tagFilters)) {
          continue;
        }
        
        // Sanitize output data
        snapshots.push({
          id: snapshot.id?.substring(0, 100) || "unknown",
          title: (snapshot.title || "Untitled").substring(0, 200),
          timestamp: snapshot.timestamp,
          step: snapshot.step,
          tags: (snapshot.tags || []).slice(0, 10).map(t => String(t).substring(0, 50)),
          file: file.name,
          mtime: file.mtime
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
    
    // Apply sorting
    applySorting(snapshots, sort, reverse);
    
    // Output results
    if (json) {
      console.log(JSON.stringify({ snapshots }, null, 2));
    } else if (machine) {
      // Machine-readable TSV format
      if (!noHeader) {
        console.log("ID\tTitle\tTimestamp\tStep\tTags");
      }
      
      snapshots.forEach((snap) => {
        const safeTitle = (snap.title || "Untitled").replace(/[\x00-\x1F\x7F\t]/g, " ");
        const safeTags = snap.tags ? snap.tags.join(",") : "";
        const safeStep = snap.step || "";
        
        console.log(`${snap.id}\t${safeTitle}\t${snap.timestamp}\t${safeStep}\t${safeTags}`);
      });
    } else {
      if (!noHeader) {
        console.log(`📚 Recent Snapshots (showing ${snapshots.length}/${files.length}):\n`);
      }
      
      snapshots.forEach((snap, index) => {
        const date = new Date(snap.timestamp);
        const timeAgo = getTimeAgo(date);
        const formattedDate = formatDate(date);
        
        // Security: Escape potential control characters in title
        const safeTitle = (snap.title || "Untitled").replace(/[\x00-\x1F\x7F]/g, "");
        
        if (noHeader) {
          // Simple format for --no-header: just ID and title
          console.log(`${snap.id} ${safeTitle}`);
        } else {
          console.log(`${index + 1}. ${safeTitle}`);
          console.log(`   📅 ${formattedDate} (${timeAgo})`);
          
          if (snap.step) {
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
        }
      });
      
      if (files.length > limit && !noHeader) {
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

interface DateFilters {
  since?: Date;
  until?: Date;
}

function parseDateFilters(options: {
  since?: string;
  until?: string;
  today?: boolean;
  yesterday?: boolean;
  thisWeek?: boolean;
}): DateFilters {
  const filters: DateFilters = {};
  const now = new Date();
  
  if (options.today) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    filters.since = today;
  } else if (options.yesterday) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    filters.since = yesterday;
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    filters.until = endOfYesterday;
  } else if (options.thisWeek) {
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = start of week
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);
    filters.since = startOfWeek;
  }
  
  if (options.since) {
    filters.since = parseDate(options.since) || undefined;
  }
  
  if (options.until) {
    filters.until = parseDate(options.until) || undefined;
  }
  
  return filters;
}

function parseDate(dateStr: string): Date | null {
  try {
    // ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return new Date(dateStr);
    }
    
    // Relative dates
    const now = new Date();
    const match = dateStr.match(/^(\d+)\s*(day|days|week|weeks|month|months)?\s*ago$/i);
    if (match) {
      const amount = parseInt(match[1], 10);
      const unit = match[2]?.toLowerCase() || 'days';
      
      switch (unit) {
        case 'day':
        case 'days':
          return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
        case 'week':
        case 'weeks':
          return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
        case 'month':
        case 'months':
          const monthsAgo = new Date(now);
          monthsAgo.setMonth(monthsAgo.getMonth() - amount);
          return monthsAgo;
      }
    }
    
    return new Date(dateStr);
  } catch {
    return null;
  }
}

function parseTags(tagsStr?: string): string[] {
  if (!tagsStr) return [];
  
  return tagsStr
    .split(/[,\s]+/)
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0)
    .slice(0, 10); // Limit to 10 tags for performance
}

interface FilterableSnapshot {
  timestamp: string;
  tags?: string[];
}

function passesFilters(
  snapshot: FilterableSnapshot, 
  fileTime: Date, 
  dateFilters: DateFilters, 
  tagFilters: string[]
): boolean {
  // Date filtering
  const snapshotDate = new Date(snapshot.timestamp);
  
  if (dateFilters.since && snapshotDate < dateFilters.since) {
    return false;
  }
  
  if (dateFilters.until && snapshotDate > dateFilters.until) {
    return false;
  }
  
  // Tag filtering
  if (tagFilters.length > 0) {
    const snapshotTags = (snapshot.tags || []).map((tag: string) => 
      String(tag).toLowerCase()
    );
    
    const hasMatchingTag = tagFilters.some(filterTag => 
      snapshotTags.some((snapshotTag: string) => 
        snapshotTag.includes(filterTag)
      )
    );
    
    if (!hasMatchingTag) {
      return false;
    }
  }
  
  return true;
}

interface SortableSnapshot {
  title?: string;
  timestamp: string;
  tags?: string[];
}

function applySorting(snapshots: SortableSnapshot[], sortBy: string, reverse: boolean): void {
  switch (sortBy.toLowerCase()) {
    case 'title':
      snapshots.sort((a, b) => {
        const titleA = (a.title || "").toLowerCase();
        const titleB = (b.title || "").toLowerCase();
        return titleA.localeCompare(titleB);
      });
      break;
    case 'size':
      snapshots.sort((a, b) => {
        // Approximate size based on title and tag lengths
        const sizeA = (a.title || "").length + (a.tags || []).join('').length;
        const sizeB = (b.title || "").length + (b.tags || []).join('').length;
        return sizeA - sizeB;
      });
      break;
    case 'date':
    default:
      snapshots.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA; // Newest first by default
      });
      break;
  }
  
  if (reverse) {
    snapshots.reverse();
  }
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
      case "--since":
        options.since = args[++i];
        break;
      case "--until":
        options.until = args[++i];
        break;
      case "--today":
        options.today = true;
        break;
      case "--yesterday":
        options.yesterday = true;
        break;
      case "--this-week":
        options.thisWeek = true;
        break;
      case "--tags":
      case "-t":
        options.tags = args[++i];
        break;
      case "--sort":
        options.sort = args[++i];
        break;
      case "--reverse":
        options.reverse = true;
        break;
      case "--help":
      case "-h":
        console.log(`Usage: kc list [options]

List saved snapshots with filtering and sorting

Options:
  -n, --limit <n>      Number of snapshots to show (default: 10)
  --json               Output as JSON
  -v, --verbose        Show more details
  
Date Filters:
  --since <date>       Show snapshots since date (YYYY-MM-DD or relative like "7 days ago")
  --until <date>       Show snapshots until date
  --today              Show snapshots from today
  --yesterday          Show snapshots from yesterday
  --this-week          Show snapshots from this week

Tag Filters:
  -t, --tags <tags>    Filter by tags (comma/space separated)

Sorting:
  --sort <field>       Sort by: date (default), title, size
  --reverse            Reverse sort order

  -h, --help           Show this help message

Examples:
  kc list                           # Show recent 10 snapshots
  kc list -n 20                     # Show recent 20 snapshots
  kc list --today                   # Show today's snapshots
  kc list --since "7 days ago"      # Show snapshots from last week
  kc list --tags backend,api        # Show snapshots with backend or api tags
  kc list --sort title              # Sort by title alphabetically
  kc list --sort date --reverse     # Show oldest snapshots first
  kc list --verbose --json          # Detailed JSON output`);
        process.exit(0);
    }
  }
  
  list(options);
}