/**
 * Storage module - Atomic file operations with proper locking
 */

import { existsSync, mkdirSync, renameSync, openSync, fsyncSync, closeSync, readdirSync, statSync, readFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { randomUUID } from "crypto";
import { file, write } from "bun";
import { config } from "./config";
import { SnapshotSchema, EventLogEntrySchema, type Snapshot, type EventLogEntry, getStoragePaths } from "./types";
import { getMessage, formatError } from "./i18n";
import { PerfTimer } from "./performance";
import { isSameFilesystem, getExistingParent, cleanupTmpFiles, FileLock } from "./utils/fs";

export class Storage {
  private paths = getStoragePaths();
  
  constructor() {
    this.ensureDirectories();
    this.cleanupOldTmpFiles();
  }
  
  private ensureDirectories() {
    // Create all required directories
    for (const dir of [this.paths.data, this.paths.snapshots]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
    }
  }
  
  private cleanupOldTmpFiles() {
    // Clean up any tmp files from previous crashes
    const cleaned = cleanupTmpFiles(this.paths.snapshots);
    if (cleaned > 0 && config.debug) {
      console.log(`♻️  Cleaned ${cleaned} old tmp files`);
    }
  }
  
  /**
   * Atomic write with enhanced robustness
   * - Same filesystem check for atomic rename
   * - Two-stage fsync (file → dir → rename → dir)
   * - Short-lived locks with timeout
   * - Automatic rollback on failure
   */
  private async writeAtomic(path: string, data: string): Promise<void> {
    const dir = dirname(path);
    const lock = new FileLock(path);
    let tmpPath: string | null = null;
    
    try {
      // Try to acquire lock (max 500ms)
      if (!await lock.tryAcquire(500, 3)) {
        throw new Error(`Could not acquire lock for ${path} within timeout`);
      }
      
      // Ensure directory exists
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
      
      // Check if we can do atomic rename (same filesystem)
      const existingParent = getExistingParent(path);
      const sameFS = existingParent ? isSameFilesystem(existingParent, dir) : true;
      
      if (!sameFS && config.debug) {
        console.warn("⚠️  Different filesystem detected, using safe mode");
      }
      
      // Create tmp file in same directory for atomic rename
      tmpPath = sameFS 
        ? join(dir, `.tmp.${randomUUID()}`)
        : `${path}.tmp.${randomUUID()}`;
      
      // Write data to tmp file
      await write(tmpPath, data);
      
      // Stage 1: fsync the tmp file
      const tmpFd = openSync(tmpPath, "r");
      fsyncSync(tmpFd);
      closeSync(tmpFd);
      
      // Stage 2: fsync parent directory (pre-rename)
      if (process.platform === "linux") {
        try {
          const dirFd = openSync(dir, "r");
          fsyncSync(dirFd);
          closeSync(dirFd);
        } catch {
          // Non-critical on some filesystems
        }
      }
      
      // Stage 3: Atomic rename
      renameSync(tmpPath, path);
      tmpPath = null; // Mark as successfully renamed
      
      // Stage 4: fsync parent directory (post-rename)
      if (process.platform === "linux") {
        try {
          const dirFd = openSync(dir, "r");
          fsyncSync(dirFd);
          closeSync(dirFd);
        } catch (error) {
          // Non-critical but log in debug
          if (config.debug) {
            console.warn("Post-rename dir fsync failed (non-critical):", error);
          }
        }
      }
    } catch (error) {
      // Rollback: remove tmp file if it exists
      if (tmpPath && existsSync(tmpPath)) {
        try {
          unlinkSync(tmpPath);
        } catch {
          // Best effort cleanup
        }
      }
      
      // Re-throw with sanitized error (prevent info leakage)
      const sanitizedPath = config.debug ? path : path.replace(/^.*\//, '*/');
      throw new Error(`Atomic write failed for ${sanitizedPath}: ${config.debug ? error : 'See logs for details'}`);
    } finally {
      // Always release lock
      lock.release();
    }
  }
  
  /**
   * Save snapshot with validation
   */
  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    const timer = new PerfTimer("saveSnapshot");
    
    // Validate schema
    timer.mark("validation");
    const validated = SnapshotSchema.parse(snapshot);
    const path = join(this.paths.snapshots, `${validated.id}.json`);
    
    timer.mark("write");
    await this.writeAtomic(path, JSON.stringify(validated, null, 2));
    
    // Append to event log
    timer.mark("eventLog");
    await this.appendEvent({
      timestamp: new Date().toISOString(),
      eventType: "snapshot_created",
      snapshotId: validated.id,
    });
    
    timer.end();
  }
  
  /**
   * Load snapshot by ID - Using Bun's optimized file operations
   */
  async loadSnapshot(id: string): Promise<Snapshot | null> {
    const timer = new PerfTimer("loadSnapshot");
    
    // Validate ID to prevent path traversal
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      timer.end();
      return null;
    }
    
    const path = join(this.paths.snapshots, `${id}.json`);
    const f = file(path);
    
    timer.mark("checkExists");
    if (!await f.exists()) {
      timer.end();
      return null;
    }
    
    try {
      timer.mark("readFile");
      const data = await f.text();
      timer.mark("parse");
      const result = SnapshotSchema.parse(JSON.parse(data));
      timer.end();
      return result;
    } catch (error) {
      console.error(formatError(getMessage("snapshotLoadFailed", id, String(error))));
      timer.end();
      return null;
    }
  }
  
  /**
   * Get latest snapshot with smart context management - Using Bun's optimized file operations
   */
  async getLatestSnapshot(): Promise<Snapshot | null> {
    const timer = new PerfTimer("getLatestSnapshot");
    
    timer.mark("listFiles");
    const files = readdirSync(this.paths.snapshots)
      .filter(f => f.endsWith(".json") && !f.startsWith("archive"))
      .map(f => {
        const fullPath = join(this.paths.snapshots, f);
        const bunFile = file(fullPath);
        return {
          name: f,
          path: fullPath,
          file: bunFile,
        };
      });
    
    // Get stats in parallel for better performance
    timer.mark("getStats");
    const filesWithStats = await Promise.all(
      files.map(async (f) => ({
        ...f,
        mtime: (await f.file.stat())?.mtime || new Date(0),
      }))
    );
    
    timer.mark("sort");
    filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    if (filesWithStats.length === 0) {
      timer.end();
      return null;
    }
    
    const id = filesWithStats[0].name.replace(".json", "");
    timer.mark("loadSnapshot");
    const snapshot = await this.loadSnapshot(id);
    
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
    
    timer.end();
    return snapshot;
  }
  
  /**
   * List all snapshots (optionally including archived)
   */
  async listSnapshots(includeArchived: boolean = false): Promise<Array<any>> {
    const activeFiles = readdirSync(this.paths.snapshots).filter(f => f.endsWith(".json"));
    
    // Get archived files if requested
    let archivedFiles: string[] = [];
    if (includeArchived && existsSync(this.paths.archive)) {
      archivedFiles = readdirSync(this.paths.archive)
        .filter(f => f.endsWith(".json"))
        .map(f => `archive/${f}`);
    }
    
    const allFiles = [...activeFiles, ...archivedFiles];
    
    const snapshots = await Promise.all(
      allFiles.map(async file => {
        const isArchived = file.startsWith("archive/");
        const id = file.replace("archive/", "").replace(".json", "");
        const filePath = isArchived 
          ? join(this.paths.archive, file.replace("archive/", ""))
          : join(this.paths.snapshots, file);
        
        try {
          const content = readFileSync(filePath, "utf-8");
          const snapshot = JSON.parse(content);
          
          return {
            ...snapshot,
            archived: isArchived,
          };
        } catch {
          return null;
        }
      })
    );
    
    const validSnapshots = snapshots.filter(Boolean);
    
    // Sort by timestamp descending
    return validSnapshots.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  /**
   * Append to event log (JSONL format) - Using Bun's optimized file operations
   */
  async appendEvent(event: EventLogEntry): Promise<void> {
    const validated = EventLogEntrySchema.parse(event);
    const line = JSON.stringify(validated) + "\n";
    
    // Append atomically
    const tmpPath = `${this.paths.events}.tmp.${randomUUID()}`;
    
    // Copy existing content if file exists
    if (existsSync(this.paths.events)) {
      const existingFile = file(this.paths.events);
      const existing = await existingFile.text();
      await write(tmpPath, existing + line);
    } else {
      await write(tmpPath, line);
    }
    
    // fsync to ensure data is on disk
    const fd = openSync(tmpPath, "r");
    fsyncSync(fd);
    closeSync(fd);
    
    // Atomic rename
    renameSync(tmpPath, this.paths.events);
  }
  
  /**
   * Save current session ID
   */
  async saveSessionId(sessionId: string): Promise<void> {
    await this.writeAtomic(this.paths.session, sessionId);
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
  async cleanup(maxAgeDays: number = 30): Promise<number> {
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    let removed = 0;
    
    const files = readdirSync(this.paths.snapshots).filter(f => f.endsWith(".json"));
    
    for (const file of files) {
      const path = join(this.paths.snapshots, file);
      const stat = statSync(path);
      
      if (stat.mtime.getTime() < cutoff) {
        try {
          const id = file.replace(".json", "");
          const snapshot = await this.loadSnapshot(id);
          
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