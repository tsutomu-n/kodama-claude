/**
 * Storage module - Atomic file operations with proper locking
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, openSync, fsyncSync, closeSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { randomUUID } from "crypto";
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
   * Get latest snapshot
   */
  getLatestSnapshot(): Snapshot | null {
    const files = readdirSync(this.paths.snapshots)
      .filter(f => f.endsWith(".json"))
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
    return this.loadSnapshot(id);
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
   * Cleanup old snapshots
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
}