/**
 * Tests for security redline dictionary
 */

import { describe, it, expect } from "bun:test";
import {
  checkDangerousCommands,
  redactSensitiveData,
  validateContent,
  cleanContent,
} from "./redline";

describe("Security Redline", () => {
  describe("checkDangerousCommands", () => {
    it("should detect rm -rf commands", () => {
      const dangerous = [
        "rm -rf /",
        "rm -rf ~/",
        "rm -rf *",
        "sudo rm -rf /",
      ];
      
      for (const cmd of dangerous) {
        const result = checkDangerousCommands(cmd);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toContain("rm");
      }
    });
    
    it("should detect database destruction commands", () => {
      const dangerous = [
        "DROP DATABASE production",
        "DROP TABLE users",
        "TRUNCATE TABLE orders",
        "DELETE FROM users WHERE 1=1",
      ];
      
      for (const cmd of dangerous) {
        const result = checkDangerousCommands(cmd);
        expect(result.length).toBeGreaterThan(0);
      }
    });
    
    it("should detect system commands", () => {
      const dangerous = [
        "shutdown -h now",
        "reboot",
        "kill -9 -1",
        "pkill -9 node",
      ];
      
      for (const cmd of dangerous) {
        const result = checkDangerousCommands(cmd);
        expect(result.length).toBeGreaterThan(0);
      }
    });
    
    it("should not flag safe commands", () => {
      const safe = [
        "rm file.txt",
        "SELECT * FROM users",
        "git commit -m 'test'",
        "npm install",
      ];
      
      for (const cmd of safe) {
        const result = checkDangerousCommands(cmd);
        expect(result.length).toBe(0);
      }
    });
  });
  
  describe("redactSensitiveData", () => {
    it("should redact API keys", () => {
      const text = "My API key is sk_test_4242424242424242 and token is abc123def456ghi789jkl";
      const { text: redacted, redactionCount } = redactSensitiveData(text);
      
      expect(redacted).not.toContain("sk_test_4242424242424242");
      expect(redacted).not.toContain("abc123def456ghi789jkl");
      expect(redacted).toContain("<REDACTED>");
      expect(redactionCount).toBeGreaterThan(0);
    });
    
    it("should redact AWS keys", () => {
      const text = "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE";
      const { text: redacted } = redactSensitiveData(text);
      
      expect(redacted).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(redacted).toContain("<REDACTED>");
    });
    
    it("should redact JWT tokens", () => {
      const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const { text: redacted } = redactSensitiveData(`Token: ${jwt}`);
      
      expect(redacted).not.toContain(jwt);
      expect(redacted).toContain("<REDACTED>");
    });
    
    it("should redact database URLs with passwords", () => {
      const urls = [
        "postgres://user:password123@localhost:5432/db",
        "mysql://admin:secret@db.example.com/myapp",
        "mongodb://root:topsecret@mongo:27017/",
      ];
      
      for (const url of urls) {
        const { text: redacted } = redactSensitiveData(url);
        expect(redacted).not.toContain("password123");
        expect(redacted).not.toContain("secret");
        expect(redacted).not.toContain("topsecret");
      }
    });
    
    it("should redact passwords", () => {
      const text = "password: mySecretPass123 and secret = AnotherSecret456";
      const { text: redacted } = redactSensitiveData(text);
      
      expect(redacted).not.toContain("mySecretPass123");
      expect(redacted).not.toContain("AnotherSecret456");
      expect(redacted).toContain("<REDACTED>");
    });
    
    it("should handle private keys", () => {
      const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA1234567890
-----END RSA PRIVATE KEY-----`;
      
      const { text: redacted } = redactSensitiveData(privateKey);
      expect(redacted).not.toContain("MIIEowIBAAKCAQEA");
      expect(redacted).toContain("<REDACTED>");
    });
  });
  
  describe("validateContent", () => {
    it("should mark safe content as safe", () => {
      const safeText = "This is a normal development note about implementing features";
      const result = validateContent(safeText);
      
      expect(result.safe).toBe(true);
      expect(result.dangerousCommands).toHaveLength(0);
      expect(result.sensitiveDataFound).toBe(false);
    });
    
    it("should detect dangerous content", () => {
      const dangerousText = "Run rm -rf / to clean up";
      const result = validateContent(dangerousText);
      
      expect(result.safe).toBe(false);
      expect(result.dangerousCommands.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
    
    it("should detect sensitive data", () => {
      const sensitiveText = "API_KEY=sk_live_1234567890abcdef";
      const result = validateContent(sensitiveText);
      
      expect(result.sensitiveDataFound).toBe(true);
      expect(result.redactionCount).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
    
    it("should warn about large content", () => {
      const largeText = "a".repeat(11000);
      const result = validateContent(largeText);
      
      expect(result.warnings.some(w => w.includes("very large"))).toBe(true);
    });
  });
  
  describe("cleanContent", () => {
    it("should remove dangerous commands and redact sensitive data", () => {
      const mixedContent = `
        Here's how to set up:
        1. Set API_KEY=sk_test_123456789
        2. DON'T RUN: rm -rf /
        3. Database: postgres://user:password@localhost/db
      `;
      
      const cleaned = cleanContent(mixedContent);
      
      expect(cleaned).not.toContain("sk_test_123456789");
      expect(cleaned).not.toContain("rm -rf /");
      expect(cleaned).not.toContain("password");
      expect(cleaned).toContain("[DANGEROUS COMMAND REMOVED]");
      expect(cleaned).toContain("<REDACTED>");
    });
    
    it("should preserve safe content", () => {
      const safeContent = "Implement user authentication with JWT tokens";
      const cleaned = cleanContent(safeContent);
      
      expect(cleaned).toBe(safeContent);
    });
  });
});