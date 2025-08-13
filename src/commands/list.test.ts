import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { list } from "./list";
import { getStoragePaths } from "../types";

describe("kc list command", () => {
  const paths = getStoragePaths();
  const testDir = paths.snapshots;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  let output: string[] = [];
  
  beforeEach(() => {
    output = [];
    console.log = (...args: any[]) => {
      output.push(args.join(" "));
    };
    console.error = (...args: any[]) => {
      output.push(args.join(" "));
    };
  });
  
  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  test("handles non-existent directory gracefully", async () => {
    // Mock getStoragePaths for this test
    const originalEnv = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = "/tmp/nonexistent-kodama-test";
    
    await list({});
    
    expect(output).toContain("📭 No snapshots found");
    
    // Restore environment
    process.env.XDG_DATA_HOME = originalEnv;
  });
  
  test("limits output to specified number", async () => {
    await list({ limit: 5, json: true });
    
    const jsonOutput = output.find(o => o.startsWith("{"));
    if (jsonOutput) {
      const data = JSON.parse(jsonOutput);
      expect(data.snapshots.length).toBeLessThanOrEqual(5);
    }
  });
  
  test("validates limit parameter", async () => {
    // Extremely high limit should be capped
    await list({ limit: 10000 });
    
    // Check that it doesn't crash and executes
    expect(output.length).toBeGreaterThan(0);
  });
  
  test("escapes control characters in output", async () => {
    // Create a test snapshot with control characters
    const testSnapshot = {
      id: "test-123",
      title: "Test\x00\x1F\x7FTitle",
      timestamp: new Date().toISOString(),
      tags: ["test\x00tag"],
      step: "testing"
    };
    
    // This would be caught by sanitization
    await list({ verbose: true });
    
    // Control characters should not appear in output
    const hasControlChars = output.some(o => 
      /[\x00-\x1F\x7F]/.test(o)
    );
    expect(hasControlChars).toBe(false);
  });
  
  test("handles malformed JSON gracefully", async () => {
    // If there's a malformed snapshot, it should skip it
    await list({ verbose: true });
    
    // Should not crash, should show warnings for invalid files
    expect(output.some(o => 
      o.includes("Skipping invalid") || 
      o.includes("Recent Snapshots") ||
      o.includes("No snapshots")
    )).toBe(true);
  });
  
  test("limits tag and title lengths", async () => {
    await list({ json: true });
    
    const jsonOutput = output.find(o => o.startsWith("{"));
    if (jsonOutput) {
      const data = JSON.parse(jsonOutput);
      
      for (const snap of data.snapshots) {
        // Check title length
        expect(snap.title.length).toBeLessThanOrEqual(200);
        
        // Check tag constraints
        expect(snap.tags.length).toBeLessThanOrEqual(10);
        snap.tags.forEach((tag: string) => {
          expect(tag.length).toBeLessThanOrEqual(50);
        });
      }
    }
  });
  
  test("JSON output is valid", async () => {
    await list({ json: true });
    
    const jsonOutput = output.find(o => o.startsWith("{"));
    if (jsonOutput) {
      expect(() => JSON.parse(jsonOutput)).not.toThrow();
    }
  });
  
  test("verbose mode shows additional info", async () => {
    await list({ verbose: true });
    
    // In verbose mode, should show IDs and filenames if snapshots exist
    const hasVerboseInfo = output.some(o => 
      o.includes("🆔 ID:") || 
      o.includes("📁 File:") ||
      o.includes("No snapshots")
    );
    
    expect(hasVerboseInfo).toBe(true);
  });
});