import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { deleteCommand } from "./delete";
import { getStoragePaths } from "../types";
import { TrashManager } from "../utils/trash";

describe("kc delete command", () => {
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

  test("handles invalid snapshot IDs", async () => {
    await deleteCommand(["../invalid"], {});
    
    expect(exitCode).toBe(1);
    expect(output.some(o => o.includes("Error during delete operation"))).toBe(true);
  });

  test("handles path traversal attempts", async () => {
    await deleteCommand(["../../../../etc/passwd"], {});
    
    expect(exitCode).toBe(1);
    expect(output.some(o => o.includes("Error during delete operation"))).toBe(true);
  });

  test("handles non-existent snapshot directory", async () => {
    // Mock getStoragePaths for this test
    const originalEnv = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = "/tmp/nonexistent-kodama-delete-test";
    
    await deleteCommand(["abc123"], {});
    
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
    
    await deleteCommand(["nonexistent123"], {});
    
    expect(exitCode).toBe(1);
    expect(output.some(o => o.includes("Error during delete operation"))).toBe(true);
  });

  test("shows trash contents when empty", async () => {
    // Ensure trash is actually empty by emptying it first
    const trashManager = new TrashManager();
    try {
      // Clear any existing trash items
      const trashItems = trashManager.listTrashItems();
      trashItems.forEach(item => {
        try { fs.unlinkSync(item.trashedPath); } catch {}
      });
    } catch {}
    
    await deleteCommand([], { showTrash: true });
    
    expect(output.some(o => o.includes("♻️  Trash is empty"))).toBe(true);
  });

  test("performs dry run successfully", async () => {
    // Create test snapshot
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440020",
      title: "Dry Run Test",
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
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440020.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      await deleteCommand(["550e8400-e29b-41d4-a716-446655440020"], { dryRun: true, force: true });
      
      // File should still exist after dry run
      expect(fs.existsSync(testFile)).toBe(true);
      expect(output.some(o => o.includes("Dry run complete"))).toBe(true);
    } finally {
      // Cleanup
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("performs soft deletion to trash", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440021",
      title: "Soft Delete Test",
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
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440021.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      await deleteCommand(["550e8400-e29b-41d4-a716-446655440021"], { force: true });
      
      // Original file should be gone
      expect(fs.existsSync(testFile)).toBe(false);
      expect(exitCode).toBeUndefined();
      expect(output.some(o => o.includes("Successfully moved") && o.includes("to trash"))).toBe(true);
      
      // Check if item is in trash
      const trashManager = new TrashManager();
      const trashItems = trashManager.listTrashItems();
      const found = trashItems.find(item => item.originalId === "550e8400-e29b-41d4-a716-446655440021");
      expect(found).toBeDefined();
      
      // Cleanup trash
      if (found) {
        try { fs.unlinkSync(found.trashedPath); } catch {}
      }
    } finally {
      // Cleanup
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("restores from trash", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440022",
      title: "Restore Test",
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
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440022.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      // Delete first
      await deleteCommand(["550e8400-e29b-41d4-a716-446655440022"], { force: true });
      expect(fs.existsSync(testFile)).toBe(false);
      
      // Reset output
      output = [];
      exitCode = undefined;
      
      // Restore
      await deleteCommand(["550e8400-e29b-41d4-a716-446655440022"], { restore: true });
      
      // File should be back
      expect(fs.existsSync(testFile)).toBe(true);
      expect(output.some(o => o.includes("Restored"))).toBe(true);
    } finally {
      // Cleanup
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("handles older-than deletion", async () => {
    // Create old test snapshot
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440023",
      title: "Old Test",
      timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
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
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440023.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      // Set file modification time to 40 days ago
      const oldTime = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      fs.utimesSync(testFile, oldTime, oldTime);
      
      await deleteCommand([], { olderThan: "30 days", force: true });
      
      // File should be moved to trash
      expect(fs.existsSync(testFile)).toBe(false);
      expect(output.some(o => o.includes("Successfully moved") && o.includes("to trash"))).toBe(true);
      
      // Cleanup trash
      const trashManager = new TrashManager();
      const trashItems = trashManager.listTrashItems();
      const found = trashItems.find(item => item.originalId === "550e8400-e29b-41d4-a716-446655440023");
      if (found) {
        try { fs.unlinkSync(found.trashedPath); } catch {}
      }
    } finally {
      // Cleanup
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("handles pattern matching deletion", async () => {
    // Create test snapshots
    const testSnapshots = [
      {
        version: "1.0.0",
        id: "550e8400-e29b-41d4-a716-446655440024",
        title: "Test Pattern 1",
        timestamp: new Date().toISOString(),
        context: "Test context",
        decisions: [],
        nextSteps: [],
        cwd: "/test",
        tags: []
      },
      {
        version: "1.0.0",
        id: "550e8400-e29b-41d4-a716-446655440025",
        title: "Test Pattern 2", 
        timestamp: new Date().toISOString(),
        context: "Test context",
        decisions: [],
        nextSteps: [],
        cwd: "/test",
        tags: []
      },
      {
        version: "1.0.0",
        id: "550e8400-e29b-41d4-a716-446655440026",
        title: "Other Test",
        timestamp: new Date().toISOString(),
        context: "Test context",
        decisions: [],
        nextSteps: [],
        cwd: "/test",
        tags: []
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
      await deleteCommand([], { match: "550e8400-e29b-41d4-a716-44665544002*", force: true });
      
      // All pattern-matched files should be deleted
      expect(fs.existsSync(testFiles[0])).toBe(false);
      expect(fs.existsSync(testFiles[1])).toBe(false);
      expect(fs.existsSync(testFiles[2])).toBe(false);
      
      expect(output.some(o => o.includes("Successfully moved") && o.includes("to trash"))).toBe(true);
      
      // Cleanup trash
      const trashManager = new TrashManager();
      const trashItems = trashManager.listTrashItems();
      trashItems.forEach(item => {
        if (item.originalId.includes("550e8400-e29b-41d4-a716-44665544002")) {
          try { fs.unlinkSync(item.trashedPath); } catch {}
        }
      });
    } finally {
      // Cleanup
      testFiles.forEach(file => {
        try { fs.unlinkSync(file); } catch {}
      });
    }
  });

  test("handles multiple snapshot deletion", async () => {
    const testSnapshots = [
      {
        version: "1.0.0",
        id: "550e8400-e29b-41d4-a716-446655440027",
        title: "Multi Test 1",
        timestamp: new Date().toISOString(),
        context: "Test context",
        decisions: [],
        nextSteps: [],
        cwd: "/test",
        tags: []
      },
      {
        version: "1.0.0",
        id: "550e8400-e29b-41d4-a716-446655440028",
        title: "Multi Test 2",
        timestamp: new Date().toISOString(),
        context: "Test context",
        decisions: [],
        nextSteps: [],
        cwd: "/test",
        tags: []
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
      await deleteCommand(["550e8400-e29b-41d4-a716-446655440027", "550e8400-e29b-41d4-a716-446655440028"], { force: true });
      
      // Both files should be deleted
      expect(fs.existsSync(testFiles[0])).toBe(false);
      expect(fs.existsSync(testFiles[1])).toBe(false);
      
      expect(output.some(o => o.includes("Successfully moved 2") && o.includes("to trash"))).toBe(true);
      
      // Cleanup trash
      const trashManager = new TrashManager();
      const trashItems = trashManager.listTrashItems();
      trashItems.forEach(item => {
        if (item.originalId.includes("550e8400-e29b-41d4-a716-44665544002")) {
          try { fs.unlinkSync(item.trashedPath); } catch {}
        }
      });
    } finally {
      // Cleanup
      testFiles.forEach(file => {
        try { fs.unlinkSync(file); } catch {}
      });
    }
  });

  test("handles JSON output", async () => {
    const testSnapshot = {
      version: "1.0.0",
      id: "550e8400-e29b-41d4-a716-446655440029",
      title: "JSON Delete Test",
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
    
    const testFile = path.join(testDir, "550e8400-e29b-41d4-a716-446655440029.json");
    
    try {
      fs.writeFileSync(testFile, JSON.stringify(testSnapshot, null, 2));
      
      await deleteCommand(["550e8400-e29b-41d4-a716-446655440029"], { force: true, json: true });
      
      const jsonOutput = output.find(o => o.includes('"deleted"'));
      expect(jsonOutput).toBeDefined();
      
      if (jsonOutput) {
        const data = JSON.parse(jsonOutput);
        expect(data.deleted).toHaveLength(1);
        expect(data.deleted[0].id).toBe("550e8400-e29b-41d4-a716-446655440029");
      }
      
      // Cleanup trash
      const trashManager = new TrashManager();
      const trashItems = trashManager.listTrashItems();
      const found = trashItems.find(item => item.originalId === "550e8400-e29b-41d4-a716-446655440029");
      if (found) {
        try { fs.unlinkSync(found.trashedPath); } catch {}
      }
    } finally {
      // Cleanup
      try { fs.unlinkSync(testFile); } catch {}
    }
  });

  test("validates dangerous patterns", async () => {
    await deleteCommand([], { match: "../dangerous" });
    
    expect(exitCode).toBe(1);
    expect(output.some(o => o.includes("Error during delete operation"))).toBe(true);
  });

  test("handles invalid time periods", async () => {
    await deleteCommand([], { olderThan: "invalid period" });
    
    expect(exitCode).toBe(1);
    expect(output.some(o => o.includes("Error during delete operation"))).toBe(true);
  });

  test("handles multiple matching IDs error", async () => {
    // Create test snapshots with similar IDs
    const testSnapshots = [
      {
        version: "1.0.0",
        id: "550e8400-e29b-41d4-a716-446655440030",
        title: "Similar 1",
        timestamp: new Date().toISOString(),
        context: "Test",
        decisions: [],
        nextSteps: [],
        cwd: "/test",
        tags: []
      },
      {
        version: "1.0.0", 
        id: "550e8400-e29b-41d4-a716-446655440031",
        title: "Similar 2",
        timestamp: new Date().toISOString(),
        context: "Test",
        decisions: [],
        nextSteps: [],
        cwd: "/test",
        tags: []
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
      await deleteCommand(["550e8400"], { force: true });
      
      expect(exitCode).toBe(1);
      expect(output.some(o => o.includes("Multiple snapshots match"))).toBe(true);
    } finally {
      // Cleanup
      testFiles.forEach(file => {
        try { fs.unlinkSync(file); } catch {}
      });
    }
  });
});