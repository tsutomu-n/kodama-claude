/**
 * Tests for filesystem utility functions
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, unlinkSync, existsSync, rmdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { isSameFilesystem, getExistingParent, cleanupTmpFiles, FileLock } from "./fs";

describe("Filesystem Utilities", () => {
  let testDir: string;
  
  beforeEach(() => {
    testDir = join(tmpdir(), `kodama-test-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });
  
  afterEach(() => {
    // Cleanup test directory
    try {
      if (existsSync(testDir)) {
        const files = require("fs").readdirSync(testDir);
        for (const file of files) {
          unlinkSync(join(testDir, file));
        }
        rmdirSync(testDir);
      }
    } catch {
      // Best effort cleanup
    }
  });
  
  describe("isSameFilesystem", () => {
    it("should return true for paths on same filesystem", () => {
      const path1 = join(testDir, "file1.txt");
      const path2 = join(testDir, "file2.txt");
      writeFileSync(path1, "test");
      writeFileSync(path2, "test");
      
      expect(isSameFilesystem(path1, path2)).toBe(true);
    });
    
    it("should handle non-existent paths safely", () => {
      const path1 = join(testDir, "nonexistent1.txt");
      const path2 = join(testDir, "nonexistent2.txt");
      
      // Should return false when can't determine
      expect(isSameFilesystem(path1, path2)).toBe(false);
    });
  });
  
  describe("getExistingParent", () => {
    it("should find existing parent directory", () => {
      const deepPath = join(testDir, "a", "b", "c", "file.txt");
      const parent = getExistingParent(deepPath);
      
      expect(parent).toBe(testDir);
    });
    
    it("should return null for invalid paths", () => {
      const parent = getExistingParent("");
      expect(parent).toBeNull();
    });
  });
  
  describe("cleanupTmpFiles", () => {
    it("should remove old tmp files", () => {
      const oldTmpFile = join(testDir, `.tmp.${randomUUID()}`);
      writeFileSync(oldTmpFile, "old data");
      
      // Make it appear old by setting mtime
      const fs = require("fs");
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      fs.utimesSync(oldTmpFile, oldTime, oldTime);
      
      const cleaned = cleanupTmpFiles(testDir);
      expect(cleaned).toBe(1);
      expect(existsSync(oldTmpFile)).toBe(false);
    });
    
    it("should not remove recent tmp files", () => {
      const recentTmpFile = join(testDir, `.tmp.${randomUUID()}`);
      writeFileSync(recentTmpFile, "recent data");
      
      const cleaned = cleanupTmpFiles(testDir);
      expect(cleaned).toBe(0);
      expect(existsSync(recentTmpFile)).toBe(true);
    });
  });
  
  describe("FileLock", () => {
    it("should acquire and release lock", async () => {
      const lockPath = join(testDir, "test.json");
      const lock = new FileLock(lockPath);
      
      const acquired = await lock.tryAcquire(100, 1);
      expect(acquired).toBe(true);
      
      // Should exist while locked
      expect(existsSync(`${lockPath}.lock`)).toBe(true);
      
      lock.release();
      
      // Should not exist after release
      expect(existsSync(`${lockPath}.lock`)).toBe(false);
    });
    
    it("should fail to acquire when already locked", async () => {
      const lockPath = join(testDir, "test.json");
      const lock1 = new FileLock(lockPath);
      const lock2 = new FileLock(lockPath);
      
      // First lock should succeed
      const acquired1 = await lock1.tryAcquire(100, 1);
      expect(acquired1).toBe(true);
      
      // Second lock should fail
      const acquired2 = await lock2.tryAcquire(100, 1);
      expect(acquired2).toBe(false);
      
      // Cleanup
      lock1.release();
    });
    
    it("should handle stale locks", async () => {
      const lockPath = join(testDir, "test.json");
      
      // Create a stale lock with non-existent PID
      writeFileSync(`${lockPath}.lock`, "99999999");
      
      const lock = new FileLock(lockPath);
      // Need at least 2 retries: 1st to detect and remove stale, 2nd to acquire
      const acquired = await lock.tryAcquire(200, 2);
      
      // Should acquire by removing stale lock
      expect(acquired).toBe(true);
      
      lock.release();
    });
  });
});