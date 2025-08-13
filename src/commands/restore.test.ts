/**
 * Basic tests for restore command
 */

import { expect, test, describe } from "bun:test";
import { restore } from "./restore";

describe("restore command", () => {
  
  test("should show usage when no snapshot IDs provided", async () => {
    let exitCalled = false;
    let exitCode = 0;
    
    // Mock process.exit
    const originalExit = process.exit;
    process.exit = ((code?: number) => {
      exitCalled = true;
      exitCode = code || 0;
      throw new Error("process.exit() called");
    }) as any;
    
    // Mock console.error
    let errorOutput = "";
    const originalError = console.error;
    console.error = (msg: string) => {
      errorOutput += msg + "\n";
    };
    
    try {
      await restore([]);
    } catch (error) {
      // Expected to throw due to process.exit
    }
    
    // Restore mocks
    process.exit = originalExit;
    console.error = originalError;
    
    expect(exitCalled).toBe(true);
    expect(exitCode).toBe(1);
    expect(errorOutput).toContain("No snapshot IDs provided");
  });

  test("should validate minimum ID length", async () => {
    let exitCalled = false;
    let exitCode = 0;
    
    // Mock process.exit
    const originalExit = process.exit;
    process.exit = ((code?: number) => {
      exitCalled = true;
      exitCode = code || 0;
      throw new Error("process.exit() called");
    }) as any;
    
    // Mock console.log
    let logOutput = "";
    const originalLog = console.log;
    console.log = (msg: string) => {
      logOutput += msg + "\n";
    };
    
    try {
      await restore(["ab"]);
    } catch (error) {
      // Expected to throw due to process.exit
    }
    
    // Restore mocks
    process.exit = originalExit;
    console.log = originalLog;
    
    expect(exitCalled).toBe(true);
    expect(exitCode).toBe(1);
    expect(logOutput).toContain("too short");
  });

  test("should support dry run mode", async () => {
    // Mock console.log
    let logOutput = "";
    const originalLog = console.log;
    console.log = (msg: string) => {
      logOutput += msg + "\n";
    };
    
    await restore(["nonexistent"], { dryRun: true });
    
    // Restore mocks
    console.log = originalLog;
    
    expect(logOutput).toContain("Dry run completed");
  });
});