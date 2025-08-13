import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { show } from "./show";
import { getStoragePaths } from "../types";

describe("kc show command", () => {
  const paths = getStoragePaths();
  const testDir = paths.snapshots;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;
  
  // Enable debug mode for detailed error messages
  process.env.KODAMA_DEBUG = "1";
  let output: string[] = [];
  let exitCode: number | undefined;
  
  beforeEach(() => {
    output = [];
    exitCode = undefined;
    
    console.log = (...args: any[]) => {
      output.push(args.join(" "));
    };
    console.error = (...args: any[]) => {
      output.push(args.join(" "));
    };
    process.exit = ((code: number) => {
      exitCode = code;
    }) as any;
  });
  
  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
  });

  test("handles invalid snapshot ID", async () => {
    await show("../invalid", {});
    
    expect(exitCode).toBe(1);
    expect(output.some(o => o.includes("is invalid"))).toBe(true);
  });

  test("handles path traversal attempts", async () => {
    await show("../../../../etc/passwd", {});
    
    expect(exitCode).toBe(1);
    expect(output.some(o => o.includes("is invalid"))).toBe(true);
  });

  test("handles non-existent snapshot directory", async () => {
    // Mock getStoragePaths for this test
    const originalEnv = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = "/tmp/nonexistent-kodama-test";
    
    await show("abc123", {});
    
    expect(exitCode).toBe(1);
    expect(output.some(o => o.includes("No snapshots found"))).toBe(true);
    
    // Restore environment
    process.env.XDG_DATA_HOME = originalEnv;
  });

  test("handles non-existent snapshot ID", async () => {
    // Ensure snapshot directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    await show("nonexistent123", {});
    
    expect(exitCode).toBe(1);
    expect(output.some(o => o.includes("No snapshot found matching ID"))).toBe(true);
  });

  test("handles multiple matching snapshots", async () => {
    // Create test snapshots with similar IDs
    const testSnapshot1 = {
      version: "1.0.0",
      id: "aaa11111-1111-1111-1111-111111111111",
      title: "Test Snapshot 1",
      timestamp: new Date().toISOString(),
      context: "Test context 1",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    const testSnapshot2 = {
      version: "1.0.0",
      id: "aaa11111-2222-2222-2222-222222222222", 
      title: "Test Snapshot 2",
      timestamp: new Date().toISOString(),
      context: "Test context 2",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Write test files
    const file1 = path.join(testDir, "aaa11111-1111-1111-1111-111111111111.json");
    const file2 = path.join(testDir, "aaa11111-2222-2222-2222-222222222222.json");
    
    try {
      fs.writeFileSync(file1, JSON.stringify(testSnapshot1, null, 2));
      fs.writeFileSync(file2, JSON.stringify(testSnapshot2, null, 2));
      
      await show("aaa11111", {});
      
      expect(exitCode).toBe(1);
      expect(output.some(o => o.includes("Multiple snapshots match"))).toBe(true);
    } finally {
      // Cleanup
      try { fs.unlinkSync(file1); } catch {}
      try { fs.unlinkSync(file2); } catch {}
    }
  });

  test("displays snapshot with basic information", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Display Snapshot",
      timestamp: new Date("2025-01-01T12:00:00Z").toISOString(),
      step: "implementing",
      context: "Test context for display",
      decisions: ["Decision 1", "Decision 2"],
      nextSteps: ["Next step 1"],
      cwd: "/test/project",
      gitBranch: "main",
      gitCommit: "abcdef1234567890",
      tags: ["test", "example"]
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440000.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      await show("550e8400", {});
      
      expect(exitCode).toBeUndefined();
      expect(output.some(o => o.includes("Test Display Snapshot"))).toBe(true);
      expect(output.some(o => o.includes("implementing"))).toBe(true);
      expect(output.some(o => o.includes("test, example"))).toBe(true);
      expect(output.some(o => o.includes("Decision 1"))).toBe(true);
      expect(output.some(o => o.includes("Next step 1"))).toBe(true);
    } finally {
      // Cleanup
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("works with partial ID matching", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Partial Match Test",
      timestamp: new Date().toISOString(),
      context: "Test partial matching",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    // Ensure directory exists  
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "123e4567-e89b-12d3-a456-426614174000.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      // Test with partial ID
      await show("123e4567", {});
      
      expect(exitCode).toBeUndefined();
      expect(output.some(o => o.includes("Partial Match Test"))).toBe(true);
    } finally {
      // Cleanup
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("outputs JSON format when requested", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "987fcdeb-51a2-4c8d-9a7e-123456789012",
      title: "JSON Test Snapshot", 
      timestamp: new Date().toISOString(),
      context: "JSON test context",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "987fcdeb-51a2-4c8d-9a7e-123456789012.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      await show("987fcdeb", { json: true });
      
      expect(exitCode).toBeUndefined();
      const jsonOutput = output.find(o => o.includes('"snapshot"'));
      expect(jsonOutput).toBeDefined();
      
      if (jsonOutput) {
        const data = JSON.parse(jsonOutput);
        expect(data.snapshot.title).toBe("JSON Test Snapshot");
        expect(data.snapshot.actualId).toBe("987fcdeb-51a2-4c8d-9a7e-123456789012");
      }
    } finally {
      // Cleanup
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("truncates long context unless verbose", async () => {
    const longContext = "x".repeat(1000); // Create long context
    const testSnapshot = {
      version: "1.0.0",
      id: "456e7890-1234-5678-9abc-def012345678",
      title: "Long Context Test",
      timestamp: new Date().toISOString(),
      context: longContext,
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "456e7890-1234-5678-9abc-def012345678.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      // Test without verbose - should truncate
      output = [];
      await show("456e7890", { verbose: false });
      
      expect(output.some(o => o.includes("Context truncated"))).toBe(true);
      
      // Test with verbose - should show full context
      output = [];
      exitCode = undefined;
      await show("456e7890", { verbose: true });
      
      const fullContextShown = output.some(o => o.includes(longContext));
      expect(fullContextShown).toBe(true);
    } finally {
      // Cleanup  
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("sanitizes control characters in output", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "789abcde-f012-4456-a89a-bcdef0123456",
      title: "Control\x00\x1F\x7FChar Test",
      timestamp: new Date().toISOString(), 
      context: "Test context",
      decisions: ["Decision with\x00control chars"],
      nextSteps: [],
      cwd: "/test",
      tags: ["tag\x1Fwith\x7Fchars"]
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "789abcde-f012-4456-a89a-bcdef0123456.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      await show("789abcde", {});
      
      expect(exitCode).toBeUndefined();
      
      // Check that no dangerous control characters appear in output (excluding newlines and tabs)
      const hasControlChars = output.some(o => /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(o));
      expect(hasControlChars).toBe(false);
    } finally {
      // Cleanup
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("handles malformed JSON files gracefully", async () => {
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "malformed123.json");
    
    try {
      // Write invalid JSON
      fs.writeFileSync(testFile, "{ invalid json }");
      
      await show("malformed123", {});
      
      expect(exitCode).toBe(1);
      expect(output.some(o => o.includes("Failed to load snapshot"))).toBe(true);
    } finally {
      // Cleanup
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("validates file size limits", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "largetest123",
      title: "Large Test",
      timestamp: new Date().toISOString(),
      context: "x".repeat(1024 * 1024 + 1), // Over 1MB limit
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "largetest123.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot));
      
      await show("largetest123", {});
      
      expect(exitCode).toBe(1);
      expect(output.some(o => o.includes("too large") || o.includes("Failed to load"))).toBe(true);
    } finally {
      // Cleanup
      try { fs.unlinkSync(testFile); } catch {}
    }
  });
});