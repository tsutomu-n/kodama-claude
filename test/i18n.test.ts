/**
 * Tests for internationalization module
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { getMessage, getLanguage, formatError } from "../src/i18n";

describe("i18n", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("getLanguage", () => {
    test("should default to English", () => {
      delete process.env.KODAMA_LANG;
      delete process.env.LANG;
      delete process.env.LC_ALL;
      
      expect(getLanguage()).toBe("en");
    });

    test("should respect KODAMA_LANG=ja", () => {
      process.env.KODAMA_LANG = "ja";
      expect(getLanguage()).toBe("ja");
    });

    test("should respect KODAMA_LANG=ja_JP", () => {
      process.env.KODAMA_LANG = "ja_JP.UTF-8";
      expect(getLanguage()).toBe("ja");
    });

    test("should respect KODAMA_LANG=en", () => {
      process.env.KODAMA_LANG = "en";
      expect(getLanguage()).toBe("en");
    });

    test("should fallback to LANG if KODAMA_LANG not set", () => {
      delete process.env.KODAMA_LANG;
      process.env.LANG = "ja_JP.UTF-8";
      expect(getLanguage()).toBe("ja");
    });

    test("should fallback to LC_ALL if KODAMA_LANG and LANG not set", () => {
      delete process.env.KODAMA_LANG;
      delete process.env.LANG;
      process.env.LC_ALL = "ja_JP.UTF-8";
      expect(getLanguage()).toBe("ja");
    });

    test("should prioritize KODAMA_LANG over LANG", () => {
      process.env.KODAMA_LANG = "en";
      process.env.LANG = "ja_JP.UTF-8";
      expect(getLanguage()).toBe("en");
    });
  });

  describe("getMessage - English", () => {
    beforeEach(() => {
      process.env.KODAMA_LANG = "en";
    });

    test("should return English title required message", () => {
      expect(getMessage("titleRequired")).toBe("Title is required");
    });

    test("should return English Claude not found message", () => {
      expect(getMessage("claudeNotFound")).toBe(
        "Claude Code CLI not found. Please install: npm install -g @anthropic/claude"
      );
    });

    test("should return English snapshot not found message", () => {
      expect(getMessage("snapshotNotFound", "abc123")).toBe(
        "Snapshot not found: abc123"
      );
    });

    test("should return English error creating message", () => {
      expect(getMessage("errorCreating", "snapshot")).toBe(
        "Error creating snapshot:"
      );
    });

    test("should return English snapshot created message", () => {
      expect(getMessage("snapshotCreated", "xyz789")).toBe(
        "✓ Snapshot created: xyz789"
      );
    });

    test("should return English plan created message", () => {
      expect(getMessage("planCreated", "plan123")).toBe(
        "✓ Plan created: plan123"
      );
    });
  });

  describe("getMessage - Japanese", () => {
    beforeEach(() => {
      process.env.KODAMA_LANG = "ja";
    });

    test("should return Japanese title required message", () => {
      expect(getMessage("titleRequired")).toBe("タイトルが必要です");
    });

    test("should return Japanese Claude not found message", () => {
      expect(getMessage("claudeNotFound")).toBe(
        "Claude Code CLIが見つかりません。インストールしてください: npm install -g @anthropic/claude"
      );
    });

    test("should return Japanese snapshot not found message", () => {
      expect(getMessage("snapshotNotFound", "abc123")).toBe(
        "スナップショットが見つかりません: abc123"
      );
    });

    test("should return Japanese error creating message", () => {
      expect(getMessage("errorCreating", "snapshot")).toBe(
        "snapshotの作成中にエラーが発生しました:"
      );
    });

    test("should return Japanese snapshot created message", () => {
      expect(getMessage("snapshotCreated", "xyz789")).toBe(
        "✓ スナップショットを作成しました: xyz789"
      );
    });

    test("should return Japanese plan created message", () => {
      expect(getMessage("planCreated", "plan123")).toBe(
        "✓ プランを作成しました: plan123"
      );
    });

    test("should return Japanese no snapshots found message", () => {
      expect(getMessage("noSnapshotsFound")).toBe(
        "スナップショットが見つかりません。作成してください: kc snap"
      );
    });

    test("should return Japanese Claude session failed message", () => {
      expect(getMessage("claudeSessionFailed")).toBe(
        "Claudeセッションの開始/継続に失敗しました:"
      );
    });
  });

  describe("formatError", () => {
    test("should format error message with prefix", () => {
      expect(formatError("Something went wrong")).toBe("❌ Something went wrong");
    });
  });


  describe("Integration with environment", () => {
    test("should work with real environment variable patterns", () => {
      // Common Japanese locale patterns
      const japaneseLocales = [
        "ja_JP.UTF-8",
        "ja_JP.utf8",
        "ja_JP",
        "ja",
        "japanese"
      ];

      for (const locale of japaneseLocales) {
        process.env.LANG = locale;
        delete process.env.KODAMA_LANG;
        expect(getLanguage()).toBe("ja");
      }
    });

    test("should work with real English locale patterns", () => {
      // Common English locale patterns
      const englishLocales = [
        "en_US.UTF-8",
        "en_US.utf8",
        "en_GB",
        "C",
        "POSIX"
      ];

      for (const locale of englishLocales) {
        process.env.LANG = locale;
        delete process.env.KODAMA_LANG;
        expect(getLanguage()).toBe("en");
      }
    });
  });
});