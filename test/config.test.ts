import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { config, validateConfig, getConfigSummary } from "../src/config";

describe("Configuration Management", () => {
  // Store original env vars
  const originalEnv = { ...process.env };
  
  beforeEach(() => {
    // Reset env vars before each test
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('KODAMA_') || key === 'HOME' || key.startsWith('XDG_')) {
        delete process.env[key];
      }
    });
    // Set required HOME
    process.env.HOME = '/home/test';
  });
  
  afterEach(() => {
    // Restore original env vars
    Object.assign(process.env, originalEnv);
  });

  describe("Debug configuration", () => {
    test("should be false by default", () => {
      expect(config.debug).toBe(false);
    });

    test("should be true when KODAMA_DEBUG=true", () => {
      process.env.KODAMA_DEBUG = 'true';
      expect(config.debug).toBe(true);
    });

    test("should be true when KODAMA_DEBUG=1", () => {
      process.env.KODAMA_DEBUG = '1';
      expect(config.debug).toBe(true);
    });

    test("should be false for other values", () => {
      process.env.KODAMA_DEBUG = 'false';
      expect(config.debug).toBe(false);
      
      process.env.KODAMA_DEBUG = 'yes';
      expect(config.debug).toBe(false);
    });
  });

  describe("No limit configuration", () => {
    test("should be false by default", () => {
      expect(config.noLimit).toBe(false);
    });

    test("should be true when KODAMA_NO_LIMIT=true", () => {
      process.env.KODAMA_NO_LIMIT = 'true';
      expect(config.noLimit).toBe(true);
    });

    test("should be true when KODAMA_NO_LIMIT=1", () => {
      process.env.KODAMA_NO_LIMIT = '1';
      expect(config.noLimit).toBe(true);
    });
  });

  describe("Auto-archive configuration", () => {
    test("should be enabled by default", () => {
      expect(config.autoArchiveDisabled).toBe(false);
    });

    test("should be disabled when KODAMA_AUTO_ARCHIVE=false", () => {
      process.env.KODAMA_AUTO_ARCHIVE = 'false';
      expect(config.autoArchiveDisabled).toBe(true);
    });

    test("should be enabled for other values", () => {
      process.env.KODAMA_AUTO_ARCHIVE = 'true';
      expect(config.autoArchiveDisabled).toBe(false);
      
      process.env.KODAMA_AUTO_ARCHIVE = 'yes';
      expect(config.autoArchiveDisabled).toBe(false);
    });
  });

  describe("CLAUDE.md sync configuration", () => {
    test("should be false by default", () => {
      expect(config.claudeMdSync).toBe(false);
    });

    test("should be true when KODAMA_CLAUDE_SYNC=true", () => {
      process.env.KODAMA_CLAUDE_SYNC = 'true';
      expect(config.claudeMdSync).toBe(true);
    });
  });

  describe("Language configuration", () => {
    test("should return undefined by default", () => {
      expect(config.language).toBeUndefined();
    });

    test("should return language when KODAMA_LANG is set", () => {
      process.env.KODAMA_LANG = 'ja';
      expect(config.language).toBe('ja');
      
      process.env.KODAMA_LANG = 'en';
      expect(config.language).toBe('en');
    });
  });

  describe("System locale", () => {
    test("should return empty string by default", () => {
      expect(config.systemLocale).toBe('');
    });

    test("should return LANG when set", () => {
      process.env.LANG = 'ja_JP.UTF-8';
      expect(config.systemLocale).toBe('ja_JP.UTF-8');
    });

    test("should return LC_ALL when LANG is not set", () => {
      process.env.LC_ALL = 'en_US.UTF-8';
      expect(config.systemLocale).toBe('en_US.UTF-8');
    });

    test("should prefer LANG over LC_ALL", () => {
      process.env.LANG = 'ja_JP.UTF-8';
      process.env.LC_ALL = 'en_US.UTF-8';
      expect(config.systemLocale).toBe('ja_JP.UTF-8');
    });
  });

  describe("XDG directories", () => {
    test("should use defaults when not set", () => {
      expect(config.xdgDataHome).toBe('/home/test/.local/share');
      expect(config.xdgConfigHome).toBe('/home/test/.config');
    });

    test("should use XDG_DATA_HOME when set", () => {
      process.env.XDG_DATA_HOME = '/custom/data';
      expect(config.xdgDataHome).toBe('/custom/data');
    });

    test("should use XDG_CONFIG_HOME when set", () => {
      process.env.XDG_CONFIG_HOME = '/custom/config';
      expect(config.xdgConfigHome).toBe('/custom/config');
    });
  });

  describe("Archive threshold", () => {
    test("should default to 30 days", () => {
      expect(config.archiveThresholdDays).toBe(30);
    });

    test("should use KODAMA_ARCHIVE_DAYS when valid", () => {
      process.env.KODAMA_ARCHIVE_DAYS = '60';
      expect(config.archiveThresholdDays).toBe(60);
    });

    test("should use default for invalid values", () => {
      process.env.KODAMA_ARCHIVE_DAYS = 'invalid';
      expect(config.archiveThresholdDays).toBe(30);
      
      process.env.KODAMA_ARCHIVE_DAYS = '0';
      expect(config.archiveThresholdDays).toBe(30);
      
      process.env.KODAMA_ARCHIVE_DAYS = '-10';
      expect(config.archiveThresholdDays).toBe(30);
    });
  });

  describe("Max decisions", () => {
    test("should default to 5", () => {
      expect(config.maxDecisions).toBe(5);
    });

    test("should return Infinity when noLimit is true", () => {
      process.env.KODAMA_NO_LIMIT = 'true';
      expect(config.maxDecisions).toBe(Infinity);
    });

    test("should use KODAMA_MAX_DECISIONS when valid", () => {
      process.env.KODAMA_MAX_DECISIONS = '10';
      expect(config.maxDecisions).toBe(10);
    });

    test("should use default for invalid values", () => {
      process.env.KODAMA_MAX_DECISIONS = 'invalid';
      expect(config.maxDecisions).toBe(5);
      
      process.env.KODAMA_MAX_DECISIONS = '0';
      expect(config.maxDecisions).toBe(5);
    });
  });

  describe("Storage paths", () => {
    test("should generate correct paths", () => {
      const paths = config.paths;
      
      expect(paths.data).toBe('/home/test/.local/share/kodama-claude');
      expect(paths.config).toBe('/home/test/.config/kodama-claude');
      expect(paths.snapshots).toBe('/home/test/.local/share/kodama-claude/snapshots');
      expect(paths.archive).toBe('/home/test/.local/share/kodama-claude/snapshots/archive');
      expect(paths.events).toBe('/home/test/.local/share/kodama-claude/events.jsonl');
      expect(paths.session).toBe('/home/test/.local/share/kodama-claude/.session');
    });

    test("should use custom XDG paths", () => {
      process.env.XDG_DATA_HOME = '/custom/data';
      process.env.XDG_CONFIG_HOME = '/custom/config';
      
      const paths = config.paths;
      
      expect(paths.data).toBe('/custom/data/kodama-claude');
      expect(paths.config).toBe('/custom/config/kodama-claude');
      expect(paths.snapshots).toBe('/custom/data/kodama-claude/snapshots');
    });
  });

  describe("Environment detection", () => {
    test("should detect test environment", () => {
      process.env.NODE_ENV = 'test';
      expect(config.isTest).toBe(true);
      
      delete process.env.NODE_ENV;
      process.env.BUN_ENV = 'test';
      expect(config.isTest).toBe(true);
      
      delete process.env.BUN_ENV;
      expect(config.isTest).toBe(false);
    });

    test("should detect CI environment", () => {
      expect(config.isCI).toBe(false);
      
      process.env.CI = 'true';
      expect(config.isCI).toBe(true);
      
      delete process.env.CI;
      process.env.GITHUB_ACTIONS = 'true';
      expect(config.isCI).toBe(true);
    });
  });

  describe("Configuration validation", () => {
    test("should pass validation with valid config", () => {
      expect(() => validateConfig()).not.toThrow();
    });

    test("should throw when HOME is not set", () => {
      delete process.env.HOME;
      expect(() => config.home).toThrow('HOME environment variable is not set');
    });

    test("should not throw in test environment", () => {
      process.env.NODE_ENV = 'test';
      delete process.env.HOME;
      expect(() => validateConfig()).not.toThrow();
    });
  });

  describe("Configuration summary", () => {
    test("should return complete summary", () => {
      process.env.KODAMA_DEBUG = 'true';
      process.env.KODAMA_LANG = 'ja';
      
      const summary = getConfigSummary();
      
      expect(summary.debug).toBe(true);
      expect(summary.language).toBe('ja');
      expect(summary.paths).toBeDefined();
      expect(summary.archiveThresholdDays).toBe(30);
      expect(summary.maxDecisions).toBe(5);
    });
  });

  describe("Lazy evaluation", () => {
    test("should evaluate environment variables lazily", () => {
      // Initially false
      expect(config.debug).toBe(false);
      
      // Change environment variable
      process.env.KODAMA_DEBUG = 'true';
      
      // Should reflect the change immediately
      expect(config.debug).toBe(true);
      
      // Change again
      delete process.env.KODAMA_DEBUG;
      
      // Should reflect the change
      expect(config.debug).toBe(false);
    });
  });
});