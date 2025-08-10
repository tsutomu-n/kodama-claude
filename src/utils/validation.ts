/**
 * Type-safe validation utilities for KODAMA Claude
 */

// Valid step values for snapshots
export const VALID_STEPS = ["requirements", "designing", "implementing", "testing"] as const;
export type ValidStep = typeof VALID_STEPS[number];

/**
 * Type guard to check if a value is a valid step
 * @param value - The value to check
 * @returns true if the value is a valid step
 */
export function isValidStep(value: unknown): value is ValidStep {
  return typeof value === 'string' && VALID_STEPS.includes(value as ValidStep);
}

/**
 * Safely parse a step value with fallback
 * @param value - The value to parse
 * @param fallback - Optional fallback value if parsing fails
 * @returns A valid step or undefined
 */
export function parseStep(value: unknown, fallback?: ValidStep): ValidStep | undefined {
  if (isValidStep(value)) {
    return value;
  }
  
  // Handle common variations and typos
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    
    // Map common aliases
    const stepAliases: Record<string, ValidStep> = {
      'requirement': 'requirements',
      'req': 'requirements',
      'design': 'designing',
      'implement': 'implementing',
      'impl': 'implementing',
      'test': 'testing',
      'tests': 'testing',
    };
    
    if (stepAliases[normalized]) {
      return stepAliases[normalized];
    }
    
    // Check if it starts with a valid step
    const matchingStep = VALID_STEPS.find(step => step.startsWith(normalized));
    if (matchingStep) {
      return matchingStep;
    }
  }
  
  return fallback;
}

/**
 * Get the next step in the progression
 * @param currentStep - The current step
 * @returns The next step in the progression
 */
export function getNextStep(currentStep?: ValidStep): ValidStep {
  const stepProgression: Record<ValidStep, ValidStep> = {
    requirements: "designing",
    designing: "implementing",
    implementing: "testing",
    testing: "testing", // Stay at testing when complete
  };
  
  return currentStep ? stepProgression[currentStep] : "requirements";
}