/**
 * Guardian module tests
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Guardian } from "../src/guardian";
import { Storage } from "../src/storage";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

describe("Guardian", () => {
  let guardian: Guardian;
  let testDir: string;
  
  beforeEach(() => {
    // Use test-specific directory
    testDir = `/tmp/kodama-test-${randomUUID()}`;
    process.env.XDG_DATA_HOME = testDir;
    process.env.HOME = testDir;
    guardian = new Guardian();
  });
  
  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  test("should return warning when no snapshot exists", async () => {
    const health = await guardian.checkHealth();
    
    expect(health.level).toBe('warning');
    expect(health.lastSnapshot).toBeUndefined();
    expect(health.suggestion).toContain("No session info");
  });
  
  test("should return healthy with recent snapshot", async () => {
    const storage = new Storage();
    
    // Create a recent snapshot
    await storage.saveSnapshot({
      version: "1.0.0",
      id: randomUUID(),
      title: "Test snapshot",
      timestamp: new Date().toISOString(),
      context: "Test",
      decisions: [],
      nextSteps: [],
      cwd: "/test"
    });
    
    const health = await guardian.checkHealth();
    
    expect(health.level).toBe('healthy');
    expect(health.lastSnapshot).toBeDefined();
    expect(health.lastSnapshot?.ageHours).toBeLessThan(1);
  });
  
  test("should return warning for old snapshot", async () => {
    const storage = new Storage();
    
    // Create an old snapshot (5 hours ago)
    await storage.saveSnapshot({
      version: "1.0.0",
      id: randomUUID(),
      title: "Old snapshot",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      context: "Test",
      decisions: [],
      nextSteps: [],
      cwd: "/test"
    });
    
    const health = await guardian.checkHealth();
    
    expect(health.level).toBe('warning');
    expect(health.lastSnapshot?.ageHours).toBeGreaterThan(4);
    expect(health.suggestion).toContain("Consider");
  });
  
  test("should determine auto-action correctly", async () => {
    const customGuardian = new Guardian({
      autoSnapshotThreshold: 15,
      warningThreshold: 40
    });
    
    // Mock transcript path - would need more setup for full test
    const health = await customGuardian.checkHealth();
    
    // Without transcript, should not have auto-action
    expect(health.autoAction).toBeNull();
  });
});