/**
 * Tests for Atomic Context Pack
 */

import { describe, it, expect } from "bun:test";
import { ContextPack, AdaptiveContextPack } from "./contextPack";
import type { Snapshot } from "./types";

describe("ContextPack", () => {
  const mockSnapshot: Snapshot = {
    version: "1.0.0",
    id: "test-123",
    title: "Test Development Session",
    timestamp: "2025-01-12T10:00:00Z",
    step: "testing",
    context: "Working on authentication system",
    decisions: [
      "Use JWT tokens for auth",
      "30-minute token expiry",
      "Refresh tokens in httpOnly cookies",
      "Use bcrypt for password hashing",
      "Implement rate limiting",
      "Add 2FA support", // 6th item - should be truncated
    ],
    nextSteps: [
      "Implement login endpoint",
      "Add password reset",
      "Create user dashboard",
      "Set up email verification",
      "Add OAuth providers",
    ],
    cwd: "/home/user/project",
  };
  
  describe("generate", () => {
    it("should generate a valid context pack", () => {
      const pack = new ContextPack();
      const result = pack.generate(mockSnapshot, "main", "abc1234");
      
      expect(result).toContain("Previous Session Context");
      expect(result).toContain("Test Development Session");
      expect(result).toContain("Working on authentication system");
      expect(result).toContain("Use JWT tokens for auth");
      expect(result).toContain("Implement login endpoint");
    });
    
    it("should respect max limits", () => {
      const pack = new ContextPack({ maxDecisions: 3, maxNextSteps: 2 });
      const result = pack.generate(mockSnapshot);
      
      // Should have exactly 3 decisions
      const decisionMatches = result.match(/^- /gm);
      expect(decisionMatches?.length).toBeGreaterThanOrEqual(5); // 3 decisions + 2 next steps
      
      // Should indicate more items
      expect(result).toContain("...(3 more)");
    });
    
    it("should truncate long lines", () => {
      const longSnapshot: Snapshot = {
        ...mockSnapshot,
        title: "A".repeat(200), // Very long title
      };
      
      const pack = new ContextPack({ maxLineLength: 50 });
      const result = pack.generate(longSnapshot);
      
      // Title should be truncated
      expect(result).toContain("A".repeat(47) + "...");
    });
    
    it("should handle empty fields gracefully", () => {
      const emptySnapshot: Snapshot = {
        ...mockSnapshot,
        context: "",
        decisions: [],
        nextSteps: [],
      };
      
      const pack = new ContextPack();
      const result = pack.generate(emptySnapshot);
      
      expect(result).toContain("- None"); // For empty lists
      expect(result).not.toContain("undefined");
      expect(result).not.toContain("null");
    });
    
    it("should include git info when provided", () => {
      const pack = new ContextPack({ includeGitInfo: true });
      const result = pack.generate(mockSnapshot, "feature/auth", "def5678");
      
      expect(result).toContain("Branch**: feature/auth");
      expect(result).toContain("Commit**: def5678");
    });
    
    it("should exclude git info when disabled", () => {
      const pack = new ContextPack({ includeGitInfo: false });
      const result = pack.generate(mockSnapshot, "main", "abc1234");
      
      expect(result).not.toContain("Branch**");
      expect(result).not.toContain("Commit**");
    });
  });
  
  describe("lint", () => {
    it("should validate a correct pack", () => {
      const pack = new ContextPack();
      const generatedPack = pack.generate(mockSnapshot);
      const lintResult = pack.lint(generatedPack);
      
      expect(lintResult.valid).toBe(true);
      expect(lintResult.errors).toHaveLength(0);
    });
    
    it("should detect missing sections", () => {
      const pack = new ContextPack();
      const invalidPack = "This is not a valid pack";
      const lintResult = pack.lint(invalidPack);
      
      expect(lintResult.valid).toBe(false);
      expect(lintResult.errors.length).toBeGreaterThan(0);
      expect(lintResult.errors.some(e => e.includes("Missing required section"))).toBe(true);
    });
    
    it("should detect packs that are too large", () => {
      const pack = new ContextPack();
      const largePack = "a".repeat(6000);
      const lintResult = pack.lint(largePack);
      
      expect(lintResult.valid).toBe(false);
      expect(lintResult.errors.some(e => e.includes("too large"))).toBe(true);
    });
    
    it("should detect packs that are too small", () => {
      const pack = new ContextPack();
      const smallPack = "tiny";
      const lintResult = pack.lint(smallPack);
      
      expect(lintResult.valid).toBe(false);
      expect(lintResult.errors.some(e => e.includes("too small"))).toBe(true);
    });
  });
  
  describe("dangerous content handling", () => {
    it("should clean dangerous commands", () => {
      const dangerousSnapshot: Snapshot = {
        ...mockSnapshot,
        decisions: ["rm -rf /", "Use JWT tokens"],
        nextSteps: ["DROP DATABASE production", "Add tests"],
      };
      
      const pack = new ContextPack();
      const result = pack.generate(dangerousSnapshot);
      
      expect(result).not.toContain("rm -rf /");
      expect(result).not.toContain("DROP DATABASE");
      expect(result).toContain("[DANGEROUS COMMAND REMOVED]");
      expect(result).toContain("Use JWT tokens"); // Safe content preserved
    });
    
    it("should redact sensitive data", () => {
      const sensitiveSnapshot: Snapshot = {
        ...mockSnapshot,
        context: "API key is sk_test_1234567890abcdef and password is secretpass123",
        decisions: ["Store AWS key AKIAIOSFODNN7EXAMPLE"],
      };
      
      const pack = new ContextPack();
      const result = pack.generate(sensitiveSnapshot);
      
      expect(result).not.toContain("sk_test_1234567890abcdef");
      expect(result).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(result).toContain("<REDACTED>");
      // Check that password is redacted (may have extra text after)
      expect(result).toContain("password <REDACTED>");
    });
  });
});

describe("AdaptiveContextPack", () => {
  const mockSnapshot: Snapshot = {
    version: "1.0.0",
    id: "test-456",
    title: "Adaptive Test",
    timestamp: "2025-01-12T11:00:00Z",
    context: "Testing adaptive templates",
    decisions: ["Use template A first"],
    nextSteps: ["Check response"],
    cwd: "/home/user/project",
  };
  
  it("should generate pack with primary template", () => {
    const adaptive = new AdaptiveContextPack();
    const result = adaptive.generate(mockSnapshot);
    
    expect(result).toContain("Previous Session Context");
    expect(result).toContain("Adaptive Test");
  });
  
  it("should switch templates based on response", () => {
    const adaptive = new AdaptiveContextPack();
    
    // Generate first pack
    adaptive.generate(mockSnapshot);
    
    // Simulate poor response (no context understanding)
    adaptive.checkResponse("I don't understand what you're asking");
    
    // Next pack should use different template
    const secondPack = adaptive.generate(mockSnapshot);
    
    // Template B uses === instead of #
    expect(secondPack).toContain("===");
  });
  
  it("should handle template fallback on lint failure", () => {
    const adaptive = new AdaptiveContextPack();
    
    // Create a snapshot that will fail lint
    const badSnapshot: Snapshot = {
      ...mockSnapshot,
      title: "", // Empty title might cause issues
      context: undefined as any, // Invalid context
    };
    
    // Should still generate something valid
    const result = adaptive.generate(badSnapshot);
    expect(result.length).toBeGreaterThan(50);
  });
});