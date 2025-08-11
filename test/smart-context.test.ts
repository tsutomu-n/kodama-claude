/**
 * Tests for smart context management features
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Storage } from "../src/storage";
import { ClaudeMdManager } from "../src/claudeMdManager";
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import type { Snapshot } from "../src/types";

// Test directory
const TEST_DIR = join(process.cwd(), ".test-kodama");
const TEST_SNAPSHOTS = join(TEST_DIR, "snapshots");

describe("Smart Context Management", () => {
  beforeEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    
    // Create test directories
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_SNAPSHOTS, { recursive: true });
    
    // Mock storage paths - point to test directory
    process.env.HOME = TEST_DIR;
    process.env.XDG_DATA_HOME = TEST_DIR;
  });
  
  afterEach(() => {
    // Clean up
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    
    // Reset environment
    delete process.env.KODAMA_NO_LIMIT;
    delete process.env.KODAMA_AUTO_ARCHIVE;
    delete process.env.KODAMA_CLAUDE_SYNC;
    delete process.env.KODAMA_DEBUG;
    delete process.env.XDG_DATA_HOME;
  });
  
  describe("Decision Limiting", () => {
    it("should limit decisions to 5 by default", async () => {
      const storage = new Storage();
      
      // Create a snapshot with many decisions
      const snapshot: Snapshot = {
        version: "1.0.0",
        id: randomUUID(),
        title: "Test Snapshot",
        timestamp: new Date().toISOString(),
        context: "Test context",
        decisions: [
          "Decision 1",
          "Decision 2",
          "Decision 3",
          "Decision 4",
          "Decision 5",
          "Decision 6",
          "Decision 7",
          "Decision 8",
        ],
        nextSteps: [],
        cwd: process.cwd(),
      };
      
      await storage.saveSnapshot(snapshot);
      
      // Get latest snapshot
      const retrieved = await storage.getLatestSnapshot();
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.decisions.length).toBe(5);
      expect(retrieved!.decisions[0]).toBe("Decision 4"); // Should keep latest 5
      expect(retrieved!.decisions[4]).toBe("Decision 8");
    });
    
    it("should preserve all decisions in storage", async () => {
      const storage = new Storage();
      
      const snapshot: Snapshot = {
        version: "1.0.0",
        id: randomUUID(),
        title: "Test Snapshot",
        timestamp: new Date().toISOString(),
        context: "Test context",
        decisions: Array.from({ length: 10 }, (_, i) => `Decision ${i + 1}`),
        nextSteps: [],
        cwd: process.cwd(),
      };
      
      await storage.saveSnapshot(snapshot);
      
      // Read directly from file to verify all decisions are saved
      const paths = storage["paths"];
      const filePath = join(paths.snapshots, `${snapshot.id}.json`);
      const fileContent = JSON.parse(readFileSync(filePath, "utf-8"));
      
      expect(fileContent.decisions.length).toBe(10);
    });
    
    it("should respect KODAMA_NO_LIMIT env var", async () => {
      process.env.KODAMA_NO_LIMIT = "true";
      const storage = new Storage();
      
      const snapshot: Snapshot = {
        version: "1.0.0",
        id: randomUUID(),
        title: "Test Snapshot",
        timestamp: new Date().toISOString(),
        context: "Test context",
        decisions: Array.from({ length: 10 }, (_, i) => `Decision ${i + 1}`),
        nextSteps: [],
        cwd: process.cwd(),
      };
      
      await storage.saveSnapshot(snapshot);
      
      const retrieved = await storage.getLatestSnapshot();
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.decisions.length).toBe(10); // Should keep all decisions
    });
  });
  
  describe("Auto Archive", () => {
    it("should archive snapshots older than 30 days", async () => {
      const storage = new Storage();
      const paths = storage["paths"];
      
      // Create old snapshot (35 days ago)
      const oldSnapshot: Snapshot = {
        version: "1.0.0",
        id: randomUUID(),
        title: "Old Snapshot",
        timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        context: "Old context",
        decisions: [],
        nextSteps: [],
        cwd: process.cwd(),
      };
      
      // Create recent snapshot
      const recentSnapshot: Snapshot = {
        version: "1.0.0",
        id: randomUUID(),
        title: "Recent Snapshot",
        timestamp: new Date().toISOString(),
        context: "Recent context",
        decisions: [],
        nextSteps: [],
        cwd: process.cwd(),
      };
      
      // Save snapshots
      await storage.saveSnapshot(oldSnapshot);
      await storage.saveSnapshot(recentSnapshot);
      
      // Manually set old file timestamp
      const oldFilePath = join(paths.snapshots, `${oldSnapshot.id}.json`);
      const oldTime = Date.now() - 35 * 24 * 60 * 60 * 1000;
      require("fs").utimesSync(oldFilePath, oldTime / 1000, oldTime / 1000);
      
      // Archive old snapshots
      const archived = storage.archiveOldSnapshots();
      
      expect(archived).toBe(1);
      
      // Check archive directory
      const archiveDir = join(paths.snapshots, "archive");
      expect(existsSync(archiveDir)).toBe(true);
      expect(existsSync(join(archiveDir, `${oldSnapshot.id}.json`))).toBe(true);
      expect(existsSync(join(paths.snapshots, `${oldSnapshot.id}.json`))).toBe(false);
      expect(existsSync(join(paths.snapshots, `${recentSnapshot.id}.json`))).toBe(true);
    });
    
    it("should create archive directory if not exists", async () => {
      const storage = new Storage();
      const paths = storage["paths"];
      const archiveDir = join(paths.snapshots, "archive");
      
      // Remove archive dir if it exists
      if (existsSync(archiveDir)) {
        rmSync(archiveDir, { recursive: true, force: true });
      }
      
      expect(existsSync(archiveDir)).toBe(false);
      
      storage.archiveOldSnapshots();
      
      expect(existsSync(archiveDir)).toBe(true);
    });
    
    it("should handle archive failures gracefully", async () => {
      const storage = new Storage();
      
      // Create a snapshot
      const snapshot: Snapshot = {
        version: "1.0.0",
        id: randomUUID(),
        title: "Test Snapshot",
        timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        context: "Test context",
        decisions: [],
        nextSteps: [],
        cwd: process.cwd(),
      };
      
      await storage.saveSnapshot(snapshot);
      
      // Make archive directory read-only to cause failure
      const paths = storage["paths"];
      const archiveDir = join(paths.snapshots, "archive");
      
      // Remove existing archive dir
      if (existsSync(archiveDir)) {
        rmSync(archiveDir, { recursive: true, force: true });
      }
      
      mkdirSync(archiveDir, { mode: 0o400 });
      
      // Should not throw, just skip the file
      expect(() => storage.archiveOldSnapshots()).not.toThrow();
    });
  });
  
  describe("CLAUDE.md Integration", () => {
    const testClaudeMdPath = join(TEST_DIR, "CLAUDE.md");
    
    beforeEach(() => {
      // Clean up CLAUDE.md
      if (existsSync(testClaudeMdPath)) {
        rmSync(testClaudeMdPath);
      }
    });
    
    it("should update only KODAMA section", async () => {
      process.env.KODAMA_CLAUDE_SYNC = "true";
      
      // Create existing CLAUDE.md with markers
      const existingContent = `# My Project

Some existing content here.

<!-- KODAMA:START -->
Old KODAMA content
<!-- KODAMA:END -->

More content after.`;
      
      writeFileSync(testClaudeMdPath, existingContent);
      
      const manager = new ClaudeMdManager();
      const snapshot: Snapshot = {
        version: "1.0.0",
        id: randomUUID(),
        title: "Test",
        timestamp: new Date().toISOString(),
        context: "Test",
        decisions: ["New decision"],
        nextSteps: ["Next step"],
        cwd: TEST_DIR,
        gitBranch: "main",
        gitCommit: "abc123",
      };
      
      manager.updateSection(snapshot, TEST_DIR);
      
      const updated = readFileSync(testClaudeMdPath, "utf-8");
      
      expect(updated).toContain("Some existing content here.");
      expect(updated).toContain("More content after.");
      expect(updated).toContain("New decision");
      expect(updated).toContain("Next step");
      expect(updated).not.toContain("Old KODAMA content");
    });
    
    it("should create backup before update", async () => {
      process.env.KODAMA_CLAUDE_SYNC = "true";
      
      // Create existing CLAUDE.md with KODAMA markers
      const content = `# Original content
      
<!-- KODAMA:START -->
<!-- KODAMA:END -->`;
      writeFileSync(testClaudeMdPath, content);
      
      const manager = new ClaudeMdManager();
      const snapshot: Snapshot = {
        version: "1.0.0",
        id: randomUUID(),
        title: "Test",
        timestamp: new Date().toISOString(),
        context: "Test",
        decisions: [],
        nextSteps: [],
        cwd: TEST_DIR,
      };
      
      manager.updateSection(snapshot, TEST_DIR);
      
      const backupPath = `${testClaudeMdPath}.backup`;
      expect(existsSync(backupPath)).toBe(true);
      expect(readFileSync(backupPath, "utf-8")).toBe(content);
    });
    
    it("should skip update if no markers found", async () => {
      process.env.KODAMA_CLAUDE_SYNC = "true";
      
      const content = "# Project without markers";
      writeFileSync(testClaudeMdPath, content);
      
      const manager = new ClaudeMdManager();
      const snapshot: Snapshot = {
        version: "1.0.0",
        id: randomUUID(),
        title: "Test",
        timestamp: new Date().toISOString(),
        context: "Test",
        decisions: [],
        nextSteps: [],
        cwd: TEST_DIR,
      };
      
      const result = manager.updateSection(snapshot, TEST_DIR);
      
      expect(result).toBe(false);
      expect(readFileSync(testClaudeMdPath, "utf-8")).toBe(content);
    });
    
    it("should respect opt-in flag", async () => {
      // KODAMA_CLAUDE_SYNC not set (default to false)
      
      const manager = new ClaudeMdManager();
      const snapshot: Snapshot = {
        version: "1.0.0",
        id: randomUUID(),
        title: "Test",
        timestamp: new Date().toISOString(),
        context: "Test",
        decisions: [],
        nextSteps: [],
        cwd: TEST_DIR,
      };
      
      const result = manager.updateSection(snapshot, TEST_DIR);
      
      expect(result).toBe(false);
      expect(existsSync(testClaudeMdPath)).toBe(false);
    });
  });
});