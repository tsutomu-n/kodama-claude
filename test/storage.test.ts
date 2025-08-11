/**
 * Storage module tests
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Storage } from "../src/storage";
import { randomUUID } from "crypto";
import { rmSync, existsSync } from "fs";
import { join } from "path";
import type { Snapshot } from "../src/types";

describe("Storage", () => {
  let storage: Storage;
  let testDir: string;
  
  // Mock snapshot for testing
  const mockSnapshot: Snapshot = {
    version: "1.0.0",
    id: "",  // Will be overridden in tests
    title: "Test snapshot",
    timestamp: new Date().toISOString(),
    context: "Test context",
    decisions: [],
    nextSteps: [],
    cwd: "/test"
  };
  
  beforeEach(() => {
    // Use test-specific directory
    process.env.XDG_DATA_HOME = `/tmp/kodama-test-${randomUUID()}`;
    storage = new Storage();
  });
  
  afterEach(() => {
    // Clean up test directory
    if (process.env.XDG_DATA_HOME && existsSync(process.env.XDG_DATA_HOME)) {
      rmSync(process.env.XDG_DATA_HOME, { recursive: true, force: true });
    }
  });
  
  test("should create storage directories", () => {
    const paths = storage["paths"];
    expect(existsSync(paths.data)).toBe(true);
    expect(existsSync(paths.snapshots)).toBe(true);
  });
  
  test("should save and load snapshot", async () => {
    const snapshot: Snapshot = {
      version: "1.0.0",
      id: randomUUID(),
      title: "Test snapshot",
      timestamp: new Date().toISOString(),
      step: "implementing",
      context: "Test context",
      decisions: ["Decision 1", "Decision 2"],
      nextSteps: ["Step 1", "Step 2"],
      cwd: "/test/dir",
      gitBranch: "main",
      gitCommit: "abc123",
    };
    
    await storage.saveSnapshot(snapshot);
    
    const loaded = await storage.loadSnapshot(snapshot.id);
    expect(loaded).toBeDefined();
    expect(loaded?.id).toBe(snapshot.id);
    expect(loaded?.title).toBe(snapshot.title);
    expect(loaded?.decisions).toEqual(snapshot.decisions);
  });
  
  test("should get latest snapshot", async () => {
    const snapshot1: Snapshot = {
      version: "1.0.0",
      id: randomUUID(),
      title: "First snapshot",
      timestamp: new Date(Date.now() - 10000).toISOString(),
      context: "",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
    };
    
    const snapshot2: Snapshot = {
      version: "1.0.0",
      id: randomUUID(),
      title: "Second snapshot",
      timestamp: new Date().toISOString(),
      context: "",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
    };
    
    await storage.saveSnapshot(snapshot1);
    
    // Small delay to ensure different mtime
    Bun.sleepSync(10);
    
    await storage.saveSnapshot(snapshot2);
    
    const latest = await storage.getLatestSnapshot();
    expect(latest?.id).toBe(snapshot2.id);
  });
  
  test("should list snapshots sorted by timestamp", async () => {
    const snapshots: Snapshot[] = [];
    
    for (let i = 0; i < 3; i++) {
      const snapshot: Snapshot = {
        version: "1.0.0",
        id: randomUUID(),
        title: `Snapshot ${i}`,
        timestamp: new Date(Date.now() - (i * 1000)).toISOString(),
        context: "",
        decisions: [],
        nextSteps: [],
        cwd: "/test",
      };
      
      snapshots.push(snapshot);
      await storage.saveSnapshot(snapshot);
      Bun.sleepSync(10); // Ensure different mtimes
    }
    
    const list = await storage.listSnapshots();
    expect(list).toHaveLength(3);
    expect(list[0].title).toBe("Snapshot 0"); // Most recent first
    expect(list[2].title).toBe("Snapshot 2"); // Oldest last
  });
  
  test("should handle atomic writes correctly", async () => {
    const snapshot: Snapshot = {
      version: "1.0.0",
      id: randomUUID(),
      title: "Atomic test",
      timestamp: new Date().toISOString(),
      context: "Test",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
    };
    
    // Save snapshot
    await storage.saveSnapshot(snapshot);
    
    // Verify no temp files left behind
    const paths = storage["paths"];
    const files = require("fs").readdirSync(paths.snapshots);
    const tempFiles = files.filter((f: string) => f.includes(".tmp"));
    
    expect(tempFiles).toHaveLength(0);
  });
  
  test("should save and load session ID", async () => {
    const sessionId = randomUUID();
    
    await storage.saveSessionId(sessionId);
    const loaded = storage.loadSessionId();
    
    expect(loaded).toBe(sessionId);
  });
  
  test("should append events to log", async () => {
    const event1 = {
      timestamp: new Date().toISOString(),
      eventType: "snapshot_created" as const,
      snapshotId: randomUUID(),
    };
    
    const event2 = {
      timestamp: new Date().toISOString(),
      eventType: "snapshot_sent" as const,
      snapshotId: randomUUID(),
    };
    
    await storage.appendEvent(event1);
    await storage.appendEvent(event2);
    
    // Read event log
    const paths = storage["paths"];
    const logContent = require("fs").readFileSync(paths.events, "utf-8");
    const lines = logContent.trim().split("\n");
    
    expect(lines).toHaveLength(2);
    
    const parsed1 = JSON.parse(lines[0]);
    expect(parsed1.eventType).toBe("snapshot_created");
    
    const parsed2 = JSON.parse(lines[1]);
    expect(parsed2.eventType).toBe("snapshot_sent");
  });
  
  test("should cleanup old snapshots", async () => {
    // Create old snapshot
    const oldSnapshot: Snapshot = {
      version: "1.0.0",
      id: randomUUID(),
      title: "Old snapshot",
      timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days old
      context: "",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
    };
    
    // Create recent snapshot
    const recentSnapshot: Snapshot = {
      version: "1.0.0",
      id: randomUUID(),
      title: "Recent snapshot",
      timestamp: new Date().toISOString(),
      context: "",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
    };
    
    await storage.saveSnapshot(oldSnapshot);
    await storage.saveSnapshot(recentSnapshot);
    
    // Manually set old mtime for old snapshot
    const paths = storage["paths"];
    const oldPath = join(paths.snapshots, `${oldSnapshot.id}.json`);
    const oldTime = Date.now() - (40 * 24 * 60 * 60 * 1000);
    require("fs").utimesSync(oldPath, oldTime / 1000, oldTime / 1000);
    
    // Run cleanup
    const removed = await storage.cleanup(30);
    
    expect(removed).toBe(1);
    expect(await storage.loadSnapshot(oldSnapshot.id)).toBeNull();
    expect(await storage.loadSnapshot(recentSnapshot.id)).toBeDefined();
  });
  
  test("should not cleanup important snapshots", async () => {
    const importantSnapshot: Snapshot = {
      version: "1.0.0",
      id: randomUUID(),
      title: "Important release v1.0.0",
      timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      context: "",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
    };
    
    await storage.saveSnapshot(importantSnapshot);
    
    // Manually set old mtime
    const paths = storage["paths"];
    const oldPath = join(paths.snapshots, `${importantSnapshot.id}.json`);
    const oldTime = Date.now() - (40 * 24 * 60 * 60 * 1000);
    require("fs").utimesSync(oldPath, oldTime / 1000, oldTime / 1000);
    
    // Run cleanup
    const removed = await storage.cleanup(30);
    
    expect(removed).toBe(0);
    expect(await storage.loadSnapshot(importantSnapshot.id)).toBeDefined();
  });

  test("should trigger auto-archive when enabled", async () => {
    // Create old snapshots (35+ days old)
    const oldSnapshot1 = {
      ...mockSnapshot,
      id: randomUUID(),
      title: "Old snapshot 1",
    };
    await storage.saveSnapshot(oldSnapshot1);
    
    const oldSnapshot2 = {
      ...mockSnapshot,
      id: randomUUID(),
      title: "Old snapshot 2",
    };
    await storage.saveSnapshot(oldSnapshot2);

    // Make snapshots old
    const oldTime = Date.now() - (35 * 24 * 60 * 60 * 1000);
    const paths = storage["paths"];
    const oldPath1 = `${paths.snapshots}/${oldSnapshot1.id}.json`;
    const oldPath2 = `${paths.snapshots}/${oldSnapshot2.id}.json`;
    require("fs").utimesSync(oldPath1, oldTime / 1000, oldTime / 1000);
    require("fs").utimesSync(oldPath2, oldTime / 1000, oldTime / 1000);

    // Test with auto-archive enabled (default)
    delete process.env.KODAMA_AUTO_ARCHIVE;
    const archived = storage.triggerAutoArchive();
    expect(archived).toBe(2);

    // Check that snapshots were moved to archive
    const archivePath = `${paths.snapshots}/archive`;
    expect(require("fs").existsSync(archivePath)).toBe(true);
    expect(require("fs").existsSync(`${archivePath}/${oldSnapshot1.id}.json`)).toBe(true);
    expect(require("fs").existsSync(`${archivePath}/${oldSnapshot2.id}.json`)).toBe(true);
  });

  test("should not trigger auto-archive when disabled", async () => {
    // Create old snapshot
    const oldSnapshot = {
      ...mockSnapshot,
      id: randomUUID(),
      title: "Old snapshot",
    };
    await storage.saveSnapshot(oldSnapshot);

    // Make snapshot old
    const oldTime = Date.now() - (35 * 24 * 60 * 60 * 1000);
    const paths = storage["paths"];
    const oldPath = `${paths.snapshots}/${oldSnapshot.id}.json`;
    require("fs").utimesSync(oldPath, oldTime / 1000, oldTime / 1000);

    // Disable auto-archive
    process.env.KODAMA_AUTO_ARCHIVE = 'false';
    const archived = storage.triggerAutoArchive();
    expect(archived).toBe(0);

    // Check that snapshot was NOT moved
    expect(require("fs").existsSync(oldPath)).toBe(true);
    
    // Clean up environment
    delete process.env.KODAMA_AUTO_ARCHIVE;
  });

});