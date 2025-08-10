/**
 * Storage module - Atomic file operations with proper locking
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, openSync, fsyncSync, closeSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { randomUUID } from "crypto";
import { config } from "./config";
import { SnapshotSchema, EventLogEntrySchema, type Snapshot, type EventLogEntry, getStoragePaths } from "./types";
import { getMessage, formatError } from "./i18n";

export class Storage {
  private paths = getStoragePaths();
  
  constructor() {
    this.ensureDirectories();
  }
  
  private ensureDirectories() {
    // Create all required directories
    for (const dir of [this.paths.data, this.paths.snapshots]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
    }
  }
  
  /**
   * Atomic write with fsync
   */
  private writeAtomic(path: string, data: string) {
    const tmpPath = `${path}.tmp.${randomUUID()}`;
    const dir = dirname(path);
    
    // Ensure directory exists
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    
    // Write to temp file
    writeFileSync(tmpPath, data, { mode: 0o600 });
    
    // fsync to ensure data is on disk
    const fd = openSync(tmpPath, "r");
    fsyncSync(fd);
    closeSync(fd);
    
    // Atomic rename
    renameSync(tmpPath, path);
    
    // fsync directory (Linux)
    if (process.platform === "linux") {
      try {
        const dirFd = openSync(dir, "r");
        fsyncSync(dirFd);
        closeSync(dirFd);
      } catch {
        // Directory fsync may fail on some filesystems
      }
    }
  }
  
  /**
   * Save snapshot with validation
   */
  saveSnapshot(snapshot: Snapshot): void {
    // Validate schema
    const validated = SnapshotSchema.parse(snapshot);
    const path = join(this.paths.snapshots, `${validated.id}.json`);
    
    this.writeAtomic(path, JSON.stringify(validated, null, 2));
    
    // Append to event log
    this.appendEvent({
      timestamp: new Date().toISOString(),
      eventType: "snapshot_created",
      snapshotId: validated.id,
    });
  }
  
  /**
   * Load snapshot by ID
   */
  loadSnapshot(id: string): Snapshot | null {
    // Validate ID to prevent path traversal
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return null;
    }
    
    const path = join(this.paths.snapshots, `${id}.json`);
    
    if (!existsSync(path)) {
      return null;
    }
    
    try {
      const data = readFileSync(path, "utf-8");
      return SnapshotSchema.parse(JSON.parse(data));
    } catch (error) {
      console.error(formatError(getMessage("snapshotLoadFailed", id, String(error))));
      return null;
    }
  }
  
  /**
   * Get latest snapshot with smart context management
   */
  getLatestSnapshot(): Snapshot | null {
    const files = readdirSync(this.paths.snapshots)
      .filter(f => f.endsWith(".json") && !f.startsWith("archive"))
      .map(f => ({
        name: f,
        path: join(this.paths.snapshots, f),
        mtime: statSync(join(this.paths.snapshots, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    if (files.length === 0) {
      return null;
    }
    
    const id = files[0].name.replace(".json", "");
    const snapshot = this.loadSnapshot(id);
    
    // Apply smart decision limiting (non-destructive)
    if (snapshot && !config.noLimit) {
      const originalDecisionCount = snapshot.decisions.length;
      
      if (originalDecisionCount > 5) {
        // Keep only the latest 5 decisions for display
        snapshot.decisions = snapshot.decisions.slice(-5);
        
        // Debug information
        if (config.debug) {
          console.log(`ℹ️  Showing latest 5 of ${originalDecisionCount} decisions (older decisions are preserved in storage)`);
        }
      }
    }
    
    return snapshot;
  }
  
  /**
   * List all snapshots
   */
  listSnapshots(): Array<{ id: string; title: string; timestamp: string; step?: string }> {
    const files = readdirSync(this.paths.snapshots).filter(f => f.endsWith(".json"));
    
    const snapshots = files
      .map(file => {
        const id = file.replace(".json", "");
        const snapshot = this.loadSnapshot(id);
        if (!snapshot) return null;
        
        return {
          id: snapshot.id,
          title: snapshot.title,
          timestamp: snapshot.timestamp,
          step: snapshot.step,
        };
      })
      .filter(Boolean) as Array<{ id: string; title: string; timestamp: string; step?: string }>;
    
    // Sort by timestamp descending
    return snapshots.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  /**
   * Append to event log (JSONL format)
   */
  appendEvent(event: EventLogEntry): void {
    const validated = EventLogEntrySchema.parse(event);
    const line = JSON.stringify(validated) + "\n";
    
    // Append atomically
    const tmpPath = `${this.paths.events}.tmp.${randomUUID()}`;
    
    // Copy existing content if file exists
    if (existsSync(this.paths.events)) {
      const existing = readFileSync(this.paths.events);
      writeFileSync(tmpPath, existing);
    }
    
    // Append new line
    const fd = openSync(tmpPath, "a");
    writeFileSync(fd, line);
    fsyncSync(fd);
    closeSync(fd);
    
    // Atomic rename
    renameSync(tmpPath, this.paths.events);
  }
  
  /**
   * Save current session ID
   */
  saveSessionId(sessionId: string): void {
    this.writeAtomic(this.paths.session, sessionId);
  }
  
  /**
   * Load current session ID
   */
  loadSessionId(): string | null {
    if (!existsSync(this.paths.session)) {
      return null;
    }
    
    try {
      return readFileSync(this.paths.session, "utf-8").trim();
    } catch {
      return null;
    }
  }
  
  /**
   * Archive old snapshots (non-destructive)
   */
  archiveOldSnapshots(maxAgeDays: number = 30): number {
    const archiveDir = join(this.paths.snapshots, 'archive');
    
    // Create archive directory if it doesn't exist
    if (!existsSync(archiveDir)) {
      mkdirSync(archiveDir, { recursive: true, mode: 0o700 });
    }
    
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    let archived = 0;
    
    const files = readdirSync(this.paths.snapshots)
      .filter(f => f.endsWith(".json") && !f.startsWith("archive"));
    
    for (const file of files) {
      const sourcePath = join(this.paths.snapshots, file);
      const stat = statSync(sourcePath);
      
      if (stat.mtime.getTime() < cutoff) {
        try {
          const targetPath = join(archiveDir, file);
          
          // Move to archive (atomic operation)
          renameSync(sourcePath, targetPath);
          archived++;
          
          if (config.debug) {
            console.log(`♻️  Archived: ${file}`);
          }
        } catch (error) {
          // Skip files that cannot be archived
          if (config.debug) {
            console.warn(`⚠️  Could not archive ${file}: ${error}`);
          }
        }
      }
    }
    
    if (archived > 0 && config.debug) {
      console.log(`♻️  Archived ${archived} snapshot(s) older than ${maxAgeDays} days`);
    }
    
    return archived;
  }
  
  /**
   * Cleanup old snapshots (deprecated - use archiveOldSnapshots instead)
   */
  cleanup(maxAgeDays: number = 30): number {
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    let removed = 0;
    
    const files = readdirSync(this.paths.snapshots).filter(f => f.endsWith(".json"));
    
    for (const file of files) {
      const path = join(this.paths.snapshots, file);
      const stat = statSync(path);
      
      if (stat.mtime.getTime() < cutoff) {
        try {
          const id = file.replace(".json", "");
          const snapshot = this.loadSnapshot(id);
          
          // Archive important snapshots instead of deleting
          if (snapshot && snapshot.title.toLowerCase().includes("important")) {
            continue;
          }
          
          // Remove old snapshot
          require("fs").unlinkSync(path);
          removed++;
        } catch {
          // Ignore cleanup errors
        }
      }
    }
    
    return removed;
  }

  /**
   * Trigger auto-archive if enabled
   * Consolidates the archive logic used across multiple commands
   * @returns number of archived snapshots (0 if disabled or no snapshots to archive)
   */
  triggerAutoArchive(): number {
    // Check if auto-archive is disabled
    if (config.autoArchiveDisabled) {
      return 0;
    }

    // Archive old snapshots
    const archived = this.archiveOldSnapshots();
    
    // Log if in debug mode and snapshots were archived
    if (archived > 0 && config.debug) {
      console.log(`♻️  Archived ${archived} old snapshot(s)`);
    }
    
    return archived;
  }
}