/**
 * Security utilities for sanitizing user input and output
 */

/**
 * Sanitize user input to prevent terminal escape sequence attacks
 * Removes all control characters except tab and newline
 */
export function sanitizeUserInput(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  // Remove all control characters except tab (0x09) and newline (0x0A)
  // This prevents ANSI escape sequences and other terminal control codes
  return input.replace(/[\x00-\x08\x0B-\x1F\x7F-\x9F]/g, '');
}

/**
 * Sanitize text for safe terminal output
 * More strict than sanitizeUserInput - removes all control characters
 */
export function sanitizeForOutput(text: string): string {
  if (typeof text !== 'string') {
    return String(text);
  }
  
  // Remove all control characters including tab and newline for single-line output
  return text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}

/**
 * Truncate text to maximum length while preserving word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  const truncated = text.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Validate snapshot ID with detailed error information
 */
export interface SnapshotIdValidation {
  isValid: boolean;
  errors: string[];
  sanitized: string;
}

export function validateSnapshotId(id: string): SnapshotIdValidation {
  const errors: string[] = [];
  
  if (!id || typeof id !== 'string') {
    errors.push("ID is required");
    return { isValid: false, errors, sanitized: '' };
  }
  
  const sanitized = sanitizeUserInput(id);
  
  if (sanitized.length < 4) {
    errors.push("Too short (minimum 4 characters required for safety to prevent accidental matches)");
  }
  
  if (sanitized.length > 100) {
    errors.push("Too long (maximum 100 characters)");
  }
  
  if (sanitized.includes('..')) {
    errors.push("Contains path traversal sequences (security restriction)");
  }
  
  if (sanitized.includes('/') || sanitized.includes('\\')) {
    errors.push("Contains path separators (security restriction)");
  }
  
  if (!/^[a-zA-Z0-9\-_]+$/.test(sanitized)) {
    errors.push("Contains invalid characters (only alphanumeric, hyphens, and underscores allowed)");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}