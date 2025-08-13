#!/usr/bin/env bun
/**
 * Delete snapshots with soft delete (trash) functionality
 * Supports multiple deletion modes and safe recovery
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { SnapshotSchema, getStoragePaths } from "../types";
import { getMessage, formatError } from "../i18n";
import { config } from "../config";
import { TrashManager } from "../utils/trash";

interface DeleteOptions {
  force?: boolean;
  dryRun?: boolean;
  json?: boolean;
  olderThan?: string;
  match?: string;
  restore?: boolean;
  emptyTrash?: boolean;
  showTrash?: boolean;
}

export async function deleteCommand(snapshotIds: string[], options: DeleteOptions = {}): Promise<void> {
  const { force = false, dryRun = false, json = false, olderThan, match, restore = false, emptyTrash = false, showTrash = false } = options;
  
  try {
    const trashManager = new TrashManager();

    // Handle special operations first
    if (showTrash) {
      return await showTrashContents(trashManager, json);
    }

    if (emptyTrash) {
      return await emptyTrashOperation(trashManager, force, dryRun, json);
    }

    if (restore) {
      return await restoreOperation(snapshotIds, trashManager, json);
    }

    // Regular deletion operations
    const paths = getStoragePaths();
    const snapshotDir = paths.snapshots;
    
    if (!fs.existsSync(snapshotDir)) {
      if (json) {
        console.log(JSON.stringify({ error: "No snapshots directory found" }));
      } else {
        console.error("❌ No snapshots found. Nothing to delete.");
      }
      process.exit(1);
    }

    // Determine which snapshots to delete
    let targetFiles: { id: string; path: string; title?: string }[] = [];

    if (olderThan) {
      targetFiles = await findSnapshotsOlderThan(snapshotDir, olderThan);
    } else if (match) {
      targetFiles = await findSnapshotsByPattern(snapshotDir, match);
    } else if (snapshotIds.length > 0) {
      targetFiles = await findSnapshotsByIds(snapshotDir, snapshotIds);
    } else {
      if (json) {
        console.log(JSON.stringify({ error: "No snapshots specified for deletion" }));
      } else {
        console.error("❌ No snapshots specified for deletion");
        console.error("Usage: kc delete <id1> [id2...] or kc delete --older-than <period> or kc delete --match <pattern>");
      }
      process.exit(1);
    }

    if (targetFiles.length === 0) {
      if (json) {
        console.log(JSON.stringify({ message: "No snapshots found matching criteria" }));
      } else {
        console.log("📭 No snapshots found matching the specified criteria");
      }
      return;
    }

    // Show what will be deleted
    if (json && dryRun) {
      console.log(JSON.stringify({
        operation: "delete-preview",
        targets: targetFiles,
        dryRun: true
      }, null, 2));
      return;
    }

    if (!json) {
      console.log(`🗑️  Found ${targetFiles.length} snapshot(s) to delete:`);
      targetFiles.forEach((file, index) => {
        const title = file.title || "Untitled";
        console.log(`${index + 1}. ${file.id} - ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`);
      });
      console.log("");
    }

    if (dryRun) {
      if (!json) {
        console.log("🔍 Dry run complete. Use without --dry-run to actually delete these snapshots.");
      }
      return;
    }

    // Confirm deletion unless forced
    if (!force && !json) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      try {
        const answer = await new Promise<string>(resolve => {
          rl.question(`⚠️  Are you sure you want to delete these ${targetFiles.length} snapshot(s)? (y/N): `, resolve);
        });

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log("❌ Deletion cancelled");
          return;
        }
      } finally {
        rl.close();
      }
    }

    // Perform soft deletion
    const results = await performSoftDeletion(targetFiles, trashManager, json);
    
    if (json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      const successCount = results.deleted.length;
      const errorCount = results.errors.length;

      console.log(`✅ Successfully moved ${successCount} snapshot(s) to trash`);
      
      if (errorCount > 0) {
        console.log(`❌ Failed to delete ${errorCount} snapshot(s):`);
        results.errors.forEach(error => {
          console.log(`   • ${error.id}: ${error.message}`);
        });
      }

      console.log(`\n💡 To restore deleted snapshots: kc delete --restore <id>`);
      console.log(`💡 To permanently remove: kc delete --empty-trash (after 7 days)`);
    }

  } catch (error) {
    if (json) {
      console.log(JSON.stringify({ error: String(error) }));
    } else {
      console.error("❌ Error during delete operation:", error);
    }
    process.exit(1);
  }
}

async function findSnapshotsByIds(snapshotDir: string, snapshotIds: string[]): Promise<Array<{ id: string; path: string; title?: string }>> {
  const results: Array<{ id: string; path: string; title?: string }> = [];

  for (const inputId of snapshotIds) {
    // Validate ID - enforce minimum length for safety
    if (!inputId || 
        inputId.includes('..') || 
        inputId.includes('/') || 
        inputId.includes('\\') ||
        inputId.length < 4 ||
        inputId.length > 100) {
      throw new Error(`Invalid snapshot ID: ${inputId}. Must be 4-100 characters without path components.`);
    }

    // Find matching files
    const allFiles = fs.readdirSync(snapshotDir)
      .filter(f => f.endsWith(".json") && !f.startsWith("archive") && f !== "latest.json");
    
    // Try exact match first
    let matchingFiles = allFiles.filter(f => f === `${inputId}.json`);
    
    // If no exact match, try partial match
    if (matchingFiles.length === 0) {
      matchingFiles = allFiles.filter(f => f.startsWith(inputId));
    }

    if (matchingFiles.length === 0) {
      throw new Error(`No snapshot found matching ID: ${inputId}`);
    }

    if (matchingFiles.length > 1) {
      throw new Error(`Multiple snapshots match ID '${inputId}': ${matchingFiles.map(f => f.replace('.json', '')).join(', ')}`);
    }

    const fileName = matchingFiles[0];
    const filePath = path.join(snapshotDir, fileName);
    const actualId = fileName.replace(".json", "");

    // Try to get title from snapshot
    let title: string | undefined;
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.length <= 1024 * 1024) { // 1MB limit
        const snapshot = JSON.parse(content);
        title = snapshot.title;
      }
    } catch {
      // Ignore errors when reading title
    }

    results.push({ id: actualId, path: filePath, title });
  }

  return results;
}

async function findSnapshotsOlderThan(snapshotDir: string, olderThanStr: string): Promise<Array<{ id: string; path: string; title?: string }>> {
  // Parse time period (e.g., "30 days", "2 weeks", "1 month")
  const cutoffDate = parseDatePeriod(olderThanStr);
  if (!cutoffDate) {
    throw new Error(`Invalid time period: ${olderThanStr}. Use format like "30 days", "2 weeks", "1 month"`);
  }

  const results: Array<{ id: string; path: string; title?: string }> = [];
  const allFiles = fs.readdirSync(snapshotDir)
    .filter(f => f.endsWith(".json") && !f.startsWith("archive") && f !== "latest.json");

  for (const fileName of allFiles) {
    const filePath = path.join(snapshotDir, fileName);
    
    try {
      const stat = fs.statSync(filePath);
      
      if (stat.mtime < cutoffDate) {
        const actualId = fileName.replace(".json", "");
        
        // Try to get title
        let title: string | undefined;
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          if (content.length <= 1024 * 1024) {
            const snapshot = JSON.parse(content);
            title = snapshot.title;
          }
        } catch {
          // Ignore errors
        }

        results.push({ id: actualId, path: filePath, title });
      }
    } catch {
      // Skip files we can't stat
    }
  }

  return results;
}

async function findSnapshotsByPattern(snapshotDir: string, pattern: string): Promise<Array<{ id: string; path: string; title?: string }>> {
  // Validate pattern - prevent dangerous patterns
  if (!pattern || 
      pattern.includes('..') || 
      pattern.includes('/') || 
      pattern.includes('\\') ||
      pattern.length > 100) {
    throw new Error(`Invalid pattern: ${pattern}`);
  }

  // Securely convert shell-style pattern to regex
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars first
    .replace(/\\\*/g, '.*')  // Then convert escaped * to .*
    .replace(/\\\?/g, '.');  // Then convert escaped ? to .
  
  let regex: RegExp;
  try {
    // Limit regex complexity to prevent ReDoS
    if (regexPattern.length > 200) {
      throw new Error("Pattern too complex");
    }
    regex = new RegExp(`^${regexPattern}$`);
  } catch {
    throw new Error(`Invalid pattern: ${pattern}`);
  }

  const results: Array<{ id: string; path: string; title?: string }> = [];
  const allFiles = fs.readdirSync(snapshotDir)
    .filter(f => f.endsWith(".json") && !f.startsWith("archive") && f !== "latest.json");

  for (const fileName of allFiles) {
    const actualId = fileName.replace(".json", "");
    
    if (regex.test(actualId)) {
      const filePath = path.join(snapshotDir, fileName);
      
      // Try to get title
      let title: string | undefined;
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        if (content.length <= 1024 * 1024) {
          const snapshot = JSON.parse(content);
          title = snapshot.title;
        }
      } catch {
        // Ignore errors
      }

      results.push({ id: actualId, path: filePath, title });
    }
  }

  return results;
}

async function performSoftDeletion(
  targets: Array<{ id: string; path: string; title?: string }>, 
  trashManager: TrashManager,
  json: boolean
): Promise<{ deleted: Array<{ id: string; title?: string }>; errors: Array<{ id: string; message: string }> }> {
  const deleted: Array<{ id: string; title?: string }> = [];
  const errors: Array<{ id: string; message: string }> = [];

  for (const target of targets) {
    try {
      const trashItem = trashManager.moveToTrash(target.path, target.id, target.title);
      deleted.push({ id: target.id, title: target.title });
      
      if (!json && config.debug) {
        console.log(`♻️  ${target.id} -> trash`);
      }
    } catch (error) {
      errors.push({ id: target.id, message: String(error) });
      
      if (!json && config.debug) {
        console.error(`❌ Failed to delete ${target.id}: ${error}`);
      }
    }
  }

  return { deleted, errors };
}

async function restoreOperation(snapshotIds: string[], trashManager: TrashManager, json: boolean): Promise<void> {
  if (snapshotIds.length === 0) {
    if (json) {
      console.log(JSON.stringify({ error: "No snapshot IDs specified for restore" }));
    } else {
      console.error("❌ No snapshot IDs specified for restore");
      console.error("Usage: kc delete --restore <id1> [id2...]");
    }
    process.exit(1);
  }

  const results: { restored: Array<{ id: string }>; errors: Array<{ id: string; message: string }> } = { restored: [], errors: [] };

  for (const snapshotId of snapshotIds) {
    try {
      // Validate ID - enforce minimum length for safety
      if (!snapshotId || 
          snapshotId.includes('..') || 
          snapshotId.includes('/') || 
          snapshotId.includes('\\') ||
          snapshotId.length < 4) {
        throw new Error("Invalid snapshot ID. Must be at least 4 characters without path components.");
      }

      const restored = trashManager.restoreFromTrash(snapshotId);
      if (restored) {
        results.restored.push({ id: snapshotId });
        if (!json) {
          console.log(`✅ Restored: ${snapshotId}`);
        }
      } else {
        throw new Error(`Snapshot not found in trash: ${snapshotId}`);
      }
    } catch (error) {
      results.errors.push({ id: snapshotId, message: String(error) });
      if (!json) {
        console.error(`❌ Failed to restore ${snapshotId}: ${error}`);
      }
    }
  }

  if (json) {
    console.log(JSON.stringify(results, null, 2));
  }
}

async function emptyTrashOperation(trashManager: TrashManager, force: boolean, dryRun: boolean, json: boolean): Promise<void> {
  const trashItems = trashManager.listTrashItems();
  
  if (trashItems.length === 0) {
    if (json) {
      console.log(JSON.stringify({ message: "Trash is already empty" }));
    } else {
      console.log("♻️  Trash is already empty");
    }
    return;
  }

  if (json && dryRun) {
    console.log(JSON.stringify({
      operation: "empty-trash-preview",
      itemCount: trashItems.length,
      items: trashItems.map(item => ({
        id: item.originalId,
        title: item.title,
        trashedAt: item.trashedAt
      })),
      dryRun: true
    }, null, 2));
    return;
  }

  if (!json) {
    console.log(`🗑️  Found ${trashItems.length} item(s) in trash:`);
    trashItems.forEach((item, index) => {
      const title = item.title || "Untitled";
      const date = new Date(item.trashedAt).toLocaleDateString();
      console.log(`${index + 1}. ${item.originalId} - ${title.substring(0, 50)} (${date})`);
    });
  }

  if (dryRun) {
    if (!json) {
      console.log("\n🔍 Dry run complete. Use without --dry-run to permanently delete these items.");
    }
    return;
  }

  // Confirm unless forced
  if (!force && !json) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      const answer = await new Promise<string>(resolve => {
        rl.question(`⚠️  Are you sure you want to PERMANENTLY delete all ${trashItems.length} items in trash? (y/N): `, resolve);
      });

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log("❌ Operation cancelled");
        return;
      }
    } finally {
      rl.close();
    }
  }

  const deletedCount = trashManager.emptyTrash();
  
  if (json) {
    console.log(JSON.stringify({ deletedCount, message: "Trash emptied successfully" }));
  } else {
    console.log(`✅ Permanently deleted ${deletedCount} item(s) from trash`);
  }
}

async function showTrashContents(trashManager: TrashManager, json: boolean): Promise<void> {
  const trashItems = trashManager.listTrashItems();
  const stats = trashManager.getTrashStats();

  if (json) {
    console.log(JSON.stringify({
      stats,
      items: trashItems
    }, null, 2));
    return;
  }

  if (trashItems.length === 0) {
    console.log("♻️  Trash is empty");
    return;
  }

  console.log(`🗑️  Trash contains ${stats.count} item(s), ${formatBytes(stats.totalSize)} total:`);
  console.log("");

  trashItems.forEach((item, index) => {
    const title = (item.title || "Untitled").replace(/[\x00-\x1F\x7F]/g, "");
    const date = new Date(item.trashedAt);
    const timeAgo = getTimeAgo(date);
    const size = formatBytes(item.size || 0);
    
    console.log(`${index + 1}. ${item.originalId}`);
    console.log(`   📌 ${title}`);
    console.log(`   📅 Deleted: ${timeAgo} (${formatDate(date)})`);
    console.log(`   📊 Size: ${size}`);
    console.log("");
  });

  console.log(`💡 To restore: kc delete --restore <id>`);
  console.log(`💡 To empty trash: kc delete --empty-trash`);
}

function parseDatePeriod(period: string): Date | null {
  const match = period.match(/^(\d+)\s*(day|days|week|weeks|month|months|year|years)$/i);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const now = new Date();

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
    case 'year':
    case 'years':
      const yearsAgo = new Date(now);
      yearsAgo.setFullYear(yearsAgo.getFullYear() - amount);
      return yearsAgo;
    default:
      return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
  const options: DeleteOptions = {};
  const snapshotIds: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--force":
      case "-f":
        options.force = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--older-than":
        options.olderThan = args[++i];
        break;
      case "--match":
        options.match = args[++i];
        break;
      case "--restore":
        options.restore = true;
        break;
      case "--empty-trash":
        options.emptyTrash = true;
        break;
      case "--show-trash":
        options.showTrash = true;
        break;
      case "--help":
      case "-h":
        console.log(`Usage: kc delete [options] [snapshot-ids...]

Delete snapshots with soft delete (trash) functionality

Options:
  -f, --force          Skip confirmation prompts
  --dry-run            Show what would be deleted without deleting
  --json               Output as JSON
  --older-than <time>  Delete snapshots older than specified time (e.g. "30 days")
  --match <pattern>    Delete snapshots matching pattern (shell wildcards)
  --restore <ids...>   Restore snapshots from trash
  --empty-trash        Permanently delete all items in trash
  --show-trash         Show contents of trash
  -h, --help           Show this help message

Examples:
  kc delete abc123                    # Delete single snapshot
  kc delete abc123 def456 --force     # Delete multiple snapshots (skip confirmation)
  kc delete --older-than "30 days"   # Delete snapshots older than 30 days
  kc delete --match "test-*"         # Delete snapshots matching pattern
  kc delete --dry-run --match "*"    # Preview what would be deleted
  kc delete --restore abc123         # Restore from trash
  kc delete --show-trash             # Show trash contents
  kc delete --empty-trash            # Empty trash permanently`);
        process.exit(0);
      default:
        if (!args[i].startsWith('-')) {
          snapshotIds.push(args[i]);
        }
        break;
    }
  }
  
  deleteCommand(snapshotIds, options);
}