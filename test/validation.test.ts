import { test, expect, describe } from "bun:test";
import { 
  isValidStep, 
  parseStep, 
  getNextStep,
  VALID_STEPS,
  type ValidStep 
} from "../src/utils/validation";

describe("Validation Utilities", () => {
  describe("isValidStep", () => {
    test("should validate correct step values", () => {
      expect(isValidStep("requirements")).toBe(true);
      expect(isValidStep("designing")).toBe(true);
      expect(isValidStep("implementing")).toBe(true);
      expect(isValidStep("testing")).toBe(true);
    });

    test("should reject invalid step values", () => {
      expect(isValidStep("invalid")).toBe(false);
      expect(isValidStep("")).toBe(false);
      expect(isValidStep(null)).toBe(false);
      expect(isValidStep(undefined)).toBe(false);
      expect(isValidStep(123)).toBe(false);
      expect(isValidStep({})).toBe(false);
    });

    test("should be case-sensitive", () => {
      expect(isValidStep("Requirements")).toBe(false);
      expect(isValidStep("TESTING")).toBe(false);
    });
  });

  describe("parseStep", () => {
    test("should parse valid steps", () => {
      expect(parseStep("requirements")).toBe("requirements");
      expect(parseStep("designing")).toBe("designing");
      expect(parseStep("implementing")).toBe("implementing");
      expect(parseStep("testing")).toBe("testing");
    });

    test("should handle common aliases", () => {
      expect(parseStep("requirement")).toBe("requirements");
      expect(parseStep("req")).toBe("requirements");
      expect(parseStep("design")).toBe("designing");
      expect(parseStep("implement")).toBe("implementing");
      expect(parseStep("impl")).toBe("implementing");
      expect(parseStep("test")).toBe("testing");
      expect(parseStep("tests")).toBe("testing");
    });

    test("should handle case-insensitive input", () => {
      expect(parseStep("Requirements")).toBe("requirements");
      expect(parseStep("DESIGNING")).toBe("designing");
      expect(parseStep("ImpleMenting")).toBe("implementing");
    });

    test("should handle whitespace", () => {
      expect(parseStep("  requirements  ")).toBe("requirements");
      expect(parseStep("\tdesigning\n")).toBe("designing");
    });

    test("should handle partial matches", () => {
      expect(parseStep("req")).toBe("requirements");
      expect(parseStep("des")).toBe("designing");
      expect(parseStep("imp")).toBe("implementing");
      expect(parseStep("tes")).toBe("testing");
    });

    test("should return undefined for invalid input without fallback", () => {
      // parseStep returns undefined when no match is found and no fallback is provided
      expect(parseStep("invalid")).toBeUndefined();
      expect(parseStep("")).toBeUndefined();
      expect(parseStep(null)).toBeUndefined();
      expect(parseStep(undefined)).toBeUndefined();
      expect(parseStep(123)).toBeUndefined();
    });

    test("should use fallback when provided", () => {
      expect(parseStep("invalid", "requirements")).toBe("requirements");
      expect(parseStep("", "designing")).toBe("designing");
      expect(parseStep(null, "implementing")).toBe("implementing");
      expect(parseStep(undefined, "testing")).toBe("testing");
    });

    test("should prefer valid input over fallback", () => {
      expect(parseStep("designing", "requirements")).toBe("designing");
      expect(parseStep("impl", "testing")).toBe("implementing");
    });
  });

  describe("getNextStep", () => {
    test("should return correct progression", () => {
      expect(getNextStep("requirements")).toBe("designing");
      expect(getNextStep("designing")).toBe("implementing");
      expect(getNextStep("implementing")).toBe("testing");
      expect(getNextStep("testing")).toBe("testing"); // Stays at testing
    });

    test("should handle undefined input", () => {
      expect(getNextStep(undefined)).toBe("requirements");
      expect(getNextStep()).toBe("requirements");
    });

    test("should type-check at compile time", () => {
      // This test ensures TypeScript compilation works
      const steps: ValidStep[] = ["requirements", "designing", "implementing", "testing"];
      steps.forEach(step => {
        const next = getNextStep(step);
        expect(VALID_STEPS).toContain(next);
      });
    });
  });

  describe("Integration tests", () => {
    test("should handle user input flow", () => {
      // Simulate user entering various inputs
      const userInputs = [
        "req",           // Should parse to "requirements"
        "Design",        // Should parse to "designing"
        "  impl  ",      // Should parse to "implementing"
        "TESTING",       // Should parse to "testing"
        "invalid",       // Should return undefined or fallback
      ];

      const results = userInputs.map(input => parseStep(input, "requirements"));
      
      expect(results[0]).toBe("requirements");
      expect(results[1]).toBe("designing");
      expect(results[2]).toBe("implementing");
      expect(results[3]).toBe("testing");
      expect(results[4]).toBe("requirements"); // Fallback
    });

    test("should handle complete workflow progression", () => {
      let currentStep: ValidStep | undefined = undefined;
      
      // Start workflow
      currentStep = getNextStep(currentStep);
      expect(currentStep).toBe("requirements");
      
      // Progress through steps
      currentStep = getNextStep(currentStep);
      expect(currentStep).toBe("designing");
      
      currentStep = getNextStep(currentStep);
      expect(currentStep).toBe("implementing");
      
      currentStep = getNextStep(currentStep);
      expect(currentStep).toBe("testing");
      
      // Should stay at testing
      currentStep = getNextStep(currentStep);
      expect(currentStep).toBe("testing");
    });

    test("should handle legacy data migration", () => {
      // Simulate legacy data that might have invalid steps
      const legacySteps = [
        "requirements",  // Valid
        "design",       // Old format
        "implement",    // Old format
        "test",         // Old format
        "deployed",     // Invalid
        null,          // Null value
      ];

      const migrated = legacySteps.map(step => parseStep(step as any));
      
      expect(migrated[0]).toBe("requirements");
      expect(migrated[1]).toBe("designing");
      expect(migrated[2]).toBe("implementing");
      expect(migrated[3]).toBe("testing");
      expect(migrated[4]).toBeUndefined();
      expect(migrated[5]).toBeUndefined();
    });
  });
});