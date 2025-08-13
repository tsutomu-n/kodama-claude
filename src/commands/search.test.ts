import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { search } from "./search";
import { getStoragePaths } from "../types";

describe("kc search command", () => {
  const paths = getStoragePaths();
  const testDir = paths.snapshots;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;
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

  test("requires search query", async () => {
    await search("", {});
    
    expect(exitCode).toBe(1);
    expect(output.some(o => o.includes("Search query is required"))).toBe(true);
  });

  test("handles empty search results", async () => {
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    await search("nonexistentterm12345", {});
    
    expect(output.some(o => o.includes("No snapshots found matching"))).toBe(true);
  });

  test("searches in titles by default", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440001",
      title: "AuthenticationUniqueTitle12345",
      timestamp: new Date().toISOString(),
      context: "JWT token validation",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440001.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      await search("AuthenticationUniqueTitle12345", {});
      
      // Should find the snapshot
      expect(output.some(o => o.includes("Found 1 snapshot(s)"))).toBe(true);
      expect(output.some(o => o.includes("AuthenticationUniqueTitle12345"))).toBe(true);
      
      // Reset for second test
      output = [];
      
      // Should NOT find by context when not using --all
      await search("JWT", {});
      expect(output.some(o => o.includes("No snapshots found"))).toBe(true);
      
    } finally {
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("searches all fields with --all option", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440002",
      title: "Test Snapshot",
      timestamp: new Date().toISOString(),
      context: "JWT token validation and user authentication",
      decisions: ["Use bcrypt for password hashing"],
      nextSteps: ["Implement OAuth2 flow"],
      cwd: "/test",
      tags: ["backend", "security"]
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440002.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      // Test context search
      await search("JWT", { all: true });
      expect(output.some(o => o.includes("Found 1 snapshot(s)"))).toBe(true);
      
      output = [];
      
      // Test decision search
      await search("bcrypt", { all: true });
      expect(output.some(o => o.includes("Found 1 snapshot(s)"))).toBe(true);
      
      output = [];
      
      // Test next steps search
      await search("OAuth2", { all: true });
      expect(output.some(o => o.includes("Found 1 snapshot(s)"))).toBe(true);
      
      output = [];
      
      // Test tags search
      await search("backend", { all: true });
      expect(output.some(o => o.includes("Found 1 snapshot(s)"))).toBe(true);
      
    } finally {
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("filters by tags", async () => {
    const testSnapshots = [
      {
        version: "1.0.0",
        id: "550e8400-e29b-41d4-a716-446655440003",
        title: "Backend API",
        timestamp: new Date().toISOString(),
        context: "Test context",
        decisions: [],
        nextSteps: [],
        cwd: "/test",
        tags: ["backend", "api"]
      },
      {
        version: "1.0.0",
        id: "550e8400-e29b-41d4-a716-446655440004", 
        title: "Frontend UI",
        timestamp: new Date().toISOString(),
        context: "Test context",
        decisions: [],
        nextSteps: [],
        cwd: "/test",
        tags: ["frontend", "ui"]
      }
    ];
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFiles = testSnapshots.map(snapshot => {
      const filePath = path.join(testDir, `${snapshot.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
      return filePath;
    });
    
    try {
      // Search with backend tag filter
      await search("API", { tags: "backend" });
      
      expect(output.some(o => o.includes("Found") && o.includes("snapshot(s)"))).toBe(true);
      expect(output.some(o => o.includes("Backend") && o.includes("API"))).toBe(true);
      
      output = [];
      
      // Search with frontend tag filter - should find nothing matching "API"
      await search("API", { tags: "frontend" });
      expect(output.some(o => o.includes("No snapshots found"))).toBe(true);
      
    } finally {
      testFiles.forEach(file => {
        try { fs.unlinkSync(file); } catch {}
      });
    }
  });

  test("supports regex search", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440005",
      title: "Bug Fix Implementation",
      timestamp: new Date().toISOString(),
      context: "Fixed critical bug in user module",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440005.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      // Test regex pattern
      await search(".*Fix.*", { regex: true });
      expect(output.some(o => o.includes("Found 1 snapshot(s)"))).toBe(true);
      
      output = [];
      
      // Test case-sensitive regex
      await search("bug", { all: true, regex: true, caseSensitive: true });
      expect(output.some(o => o.includes("Found 1 snapshot(s)"))).toBe(true);
      
      output = [];
      
      // Test case-sensitive that should fail
      await search("BUG", { all: true, regex: true, caseSensitive: true });
      expect(output.some(o => o.includes("No snapshots found"))).toBe(true);
      
    } finally {
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("filters by date range", async () => {
    const oldSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440006",
      title: "Old Test Implementation",
      timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
      context: "Test context",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    const newSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440007",
      title: "New Test Implementation", 
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      context: "Test context",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const oldFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440006.json");
    const newFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440007.json");
    
    try {
      fs.writeFileSync(oldFile, JSON.stringify(oldSnapshot, null, 2));
      fs.writeFileSync(newFile, JSON.stringify(newSnapshot, null, 2));
      
      // Search since 30 days ago - should only find new snapshot
      await search("Test", { since: "30 days ago" });
      
      expect(output.some(o => o.includes("Found") && o.includes("snapshot(s)"))).toBe(true);
      expect(output.some(o => o.includes("New") && o.includes("Test"))).toBe(true);
      expect(output.some(o => o.includes("Old Test"))).toBe(false);
      
    } finally {
      try { fs.unlinkSync(oldFile); } catch {}
      try { fs.unlinkSync(newFile); } catch {}
    }
  });

  test("limits results", async () => {
    const testSnapshots = [];
    for (let i = 0; i < 15; i++) {
      testSnapshots.push({
        version: "1.0.0",
        id: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
        title: `Test Implementation ${i}`,
        timestamp: new Date().toISOString(),
        context: "Test context",
        decisions: [],
        nextSteps: [],
        cwd: "/test",
        tags: []
      });
    }
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFiles = testSnapshots.map(snapshot => {
      const filePath = path.join(testDir, `${snapshot.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
      return filePath;
    });
    
    try {
      // Search with limit of 5
      await search("Test", { limit: 5 });
      
      expect(output.some(o => o.includes("Found") && o.includes("snapshot(s)"))).toBe(true);
      expect(output.some(o => o.includes("Showing top 5"))).toBe(true);
      
    } finally {
      testFiles.forEach(file => {
        try { fs.unlinkSync(file); } catch {}
      });
    }
  });

  test("provides search suggestions", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440008",
      title: "Authentication Implementation System",
      timestamp: new Date().toISOString(),
      context: "Test context",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440008.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      await search("Auth", { suggestions: true });
      
      expect(output.some(o => o.includes("suggestions"))).toBe(true);
      expect(output.some(o => o.includes("Authentication"))).toBe(true);
      
    } finally {
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("outputs JSON format", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440009",
      title: "JSON Test Implementation",
      timestamp: new Date().toISOString(),
      context: "Test context",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440009.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      await search("JSON", { json: true });
      
      const jsonOutput = output.find(o => o.includes('"query"'));
      expect(jsonOutput).toBeDefined();
      
      if (jsonOutput) {
        const data = JSON.parse(jsonOutput);
        expect(data.query).toBe("JSON");
        expect(data.resultCount).toBe(1);
        expect(data.results).toHaveLength(1);
        expect(data.results[0].snapshot.title).toBe("JSON Test Implementation");
      }
      
    } finally {
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("handles invalid regex patterns", async () => {
    // Create a test snapshot first
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440010",
      title: "Test Implementation",
      timestamp: new Date().toISOString(),
      context: "Test context",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: []
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440010.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      // Test with invalid regex - should handle gracefully
      await search("[invalid", { regex: true });
      
      // Should not crash and should show no results
      expect(output.some(o => o.includes("No snapshots found"))).toBe(true);
      
    } finally {
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("handles non-existent snapshot directory", async () => {
    // Mock getStoragePaths for this test
    const originalEnv = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = "/tmp/nonexistent-kodama-search-test";
    
    await search("test", {});
    
    expect(output.some(o => o.includes("No snapshots found"))).toBe(true);
    
    // Restore environment
    process.env.XDG_DATA_HOME = originalEnv;
  });

  test("sanitizes output properly", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440011",
      title: "Control\x00\x1F\x7FChars Test",
      timestamp: new Date().toISOString(),
      context: "Test with\x00control chars",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: ["tag\x1Fwith\x7Fchars"]
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440011.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      await search("Control", {});
      
      // Should not contain dangerous control characters in output (excluding newlines and tabs)
      const hasControlChars = output.some(o => /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(o));
      expect(hasControlChars).toBe(false);
      
    } finally {
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("parses multiple tag filters", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440012",
      title: "Multi Tag Test",
      timestamp: new Date().toISOString(),
      context: "Test context",
      decisions: [],
      nextSteps: [],
      cwd: "/test",
      tags: ["backend", "api", "security"]
    };
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440012.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      // Test comma-separated tags
      await search("Multi", { tags: "backend,api" });
      expect(output.some(o => o.includes("Found 1 snapshot(s)"))).toBe(true);
      
      output = [];
      
      // Test space-separated tags
      await search("Multi", { tags: "backend security" });
      expect(output.some(o => o.includes("Found 1 snapshot(s)"))).toBe(true);
      
      output = [];
      
      // Test non-matching tags
      await search("Multi", { tags: "frontend,mobile" });
      expect(output.some(o => o.includes("No snapshots found"))).toBe(true);
      
    } finally {
      try { fs.unlinkSync(testFile); } catch {}
    }
  });
});