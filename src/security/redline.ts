/**
 * Security redline dictionary and pattern detection
 * Prevents dangerous commands and sensitive data from being stored
 */

import { config } from "../config";

/**
 * Dangerous command patterns that should never be in context
 */
const DANGEROUS_COMMANDS = [
  // Destructive file operations
  /rm\s+-rf\s+\//i,           // rm -rf /
  /rm\s+-rf\s+~\//i,          // rm -rf ~/
  /rm\s+-rf\s+\*/i,           // rm -rf *
  />\s*\/dev\/sda/i,          // Write to disk device
  /dd\s+if=.*of=\/dev\//i,    // dd to device
  
  // Database destruction
  /DROP\s+DATABASE/i,
  /DROP\s+TABLE/i,
  /TRUNCATE\s+TABLE/i,
  /DELETE\s+FROM.*WHERE\s+1/i, // DELETE without condition
  
  // System commands
  /shutdown|reboot|poweroff/i,
  /kill\s+-9\s+-1/i,          // Kill all processes
  /pkill\s+-9/i,
  
  // AWS/Cloud destruction
  /aws\s+.*--force-delete/i,
  /terraform\s+destroy.*-auto-approve/i,
  /kubectl\s+delete.*--all/i,
];

/**
 * Sensitive data patterns that should be redacted
 */
const SENSITIVE_PATTERNS = [
  // API Keys and Tokens (including sk_test, sk_live patterns)
  /sk_(?:test|live)_[a-zA-Z0-9]{8,}/g,
  /(?:api[_-]?key|apikey|api[_-]?secret)[\s:=]+["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
  /(?:token|bearer|auth)[\s:=]+["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
  
  // AWS Keys
  /AKIA[0-9A-Z]{16}/g,        // AWS Access Key
  /(?:aws[_-]?secret[_-]?access[_-]?key)[\s:=]+["']?([a-zA-Z0-9/+=]{40})["']?/gi,
  
  // Private Keys
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]+?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
  /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----[\s\S]+?-----END\s+OPENSSH\s+PRIVATE\s+KEY-----/g,
  
  // Database URLs with passwords
  /(?:mysql|postgres|postgresql|mongodb):\/\/[^:]+:([^@]+)@/gi,
  
  // JWT tokens
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  
  // Credit card numbers (basic pattern)
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  
  // Email addresses (optional - may want to keep for context)
  // /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
];

/**
 * Check if text contains dangerous commands
 * @returns Array of matched dangerous patterns
 */
export function checkDangerousCommands(text: string): string[] {
  const matches: string[] = [];
  
  for (const pattern of DANGEROUS_COMMANDS) {
    const match = text.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  
  return matches;
}

/**
 * Redact sensitive information from text
 * @returns Redacted text and count of redactions
 */
export function redactSensitiveData(text: string): { text: string; redactionCount: number } {
  let redactedText = text;
  let redactionCount = 0;
  
  for (const pattern of SENSITIVE_PATTERNS) {
    const matches = redactedText.match(pattern);
    if (matches) {
      redactionCount += matches.length;
      redactedText = redactedText.replace(pattern, "<REDACTED>");
    }
  }
  
  // Also redact anything that looks like a secret or password
  // First, replace password patterns with placeholder
  const passwordPattern = /(?:password|secret|pwd|pass)[\s:=]+["']?(\S+)["']?/gi;
  redactedText = redactedText.replace(passwordPattern, (match, p1) => {
    redactionCount++;
    return "password <REDACTED>";
  });
  
  // Then redact long random strings that might be tokens (with upper limit to prevent ReDoS)
  const tokenPattern = /\b[a-zA-Z0-9]{20,100}\b/g;
  const tokenMatches = redactedText.match(tokenPattern);
  if (tokenMatches) {
    // Additional check: only redact if it looks like a token (has mixed case or underscore)
    tokenMatches.forEach(match => {
      if (/[A-Z]/.test(match) || /_/.test(match) || /[a-z].*[0-9]/.test(match)) {
        redactionCount++;
        redactedText = redactedText.replace(match, "<REDACTED>");
      }
    });
  }
  
  return { text: redactedText, redactionCount };
}

/**
 * Validate if content is safe to store/inject
 * @returns Validation result with details
 */
export interface ValidationResult {
  safe: boolean;
  dangerousCommands: string[];
  sensitiveDataFound: boolean;
  redactionCount: number;
  warnings: string[];
}

export function validateContent(text: string): ValidationResult {
  const dangerousCommands = checkDangerousCommands(text);
  const { redactionCount } = redactSensitiveData(text);
  
  const warnings: string[] = [];
  
  if (dangerousCommands.length > 0) {
    warnings.push(`Found ${dangerousCommands.length} dangerous command(s)`);
  }
  
  if (redactionCount > 0) {
    warnings.push(`Found ${redactionCount} sensitive data pattern(s)`);
  }
  
  // Check for suspicious patterns that might not be dangerous but worth warning
  if (text.includes("sudo rm") || text.includes("sudo dd")) {
    warnings.push("Contains privileged destructive commands");
  }
  
  if (text.length > 10000) {
    warnings.push("Content is very large (>10KB)");
  }
  
  return {
    safe: dangerousCommands.length === 0,
    dangerousCommands,
    sensitiveDataFound: redactionCount > 0,
    redactionCount,
    warnings,
  };
}

/**
 * Clean content for safe storage
 * Removes dangerous commands and redacts sensitive data
 */
export function cleanContent(text: string): string {
  // First, check for dangerous commands
  const validation = validateContent(text);
  
  if (!validation.safe && config.debug) {
    console.warn("⚠️  Dangerous content detected:", validation.dangerousCommands);
  }
  
  // Remove dangerous commands by replacing with warning
  let cleanedText = text;
  for (const pattern of DANGEROUS_COMMANDS) {
    cleanedText = cleanedText.replace(pattern, "[DANGEROUS COMMAND REMOVED]");
  }
  
  // Redact sensitive data
  const { text: redactedText } = redactSensitiveData(cleanedText);
  
  return redactedText;
}