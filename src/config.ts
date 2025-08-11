/**
 * Centralized configuration management for KODAMA Claude
 * 
 * This module provides type-safe access to environment variables
 * with proper defaults and validation.
 * 
 * IMPORTANT: This module should NOT import any other modules from the project
 * to avoid circular dependencies. Only Node.js built-ins are allowed.
 */

/**
 * Configuration object with type-safe environment variable access
 */
export const config = {
  /**
   * Debug mode - enables verbose logging
   * @default false
   */
  get debug(): boolean {
    return process.env.KODAMA_DEBUG === 'true' || process.env.KODAMA_DEBUG === '1';
  },

  /**
   * Disable 5-decision limit in snapshots
   * @default false (limit is enabled)
   */
  get noLimit(): boolean {
    return process.env.KODAMA_NO_LIMIT === 'true' || process.env.KODAMA_NO_LIMIT === '1';
  },

  /**
   * Disable automatic archiving of old snapshots
   * @default false (auto-archive is enabled)
   */
  get autoArchiveDisabled(): boolean {
    return process.env.KODAMA_AUTO_ARCHIVE === 'false';
  },

  /**
   * Enable CLAUDE.md automatic synchronization
   * @default false
   */
  get claudeMdSync(): boolean {
    return process.env.KODAMA_CLAUDE_SYNC === 'true';
  },
  
  /**
   * CLAUDE.md sync dry-run mode (when sync is enabled)
   * @default true (dry-run enabled)
   */
  get claudeMdSyncDryRun(): boolean {
    // Default to true unless explicitly set to false
    return process.env.KODAMA_CLAUDE_SYNC_DRY_RUN !== 'false';
  },

  /**
   * Language setting for internationalization
   * @default auto-detect from system locale
   */
  get language(): string | undefined {
    return process.env.KODAMA_LANG;
  },

  /**
   * System locale settings (fallback for language detection)
   */
  get systemLocale(): string {
    return process.env.LANG || process.env.LC_ALL || '';
  },

  /**
   * Home directory path
   * @throws Error if HOME is not set
   */
  get home(): string {
    const home = process.env.HOME;
    if (!home) {
      throw new Error('HOME environment variable is not set');
    }
    return home;
  },

  /**
   * XDG Data directory
   * @default $HOME/.local/share
   */
  get xdgDataHome(): string {
    return process.env.XDG_DATA_HOME || `${this.home}/.local/share`;
  },

  /**
   * XDG Config directory
   * @default $HOME/.config
   */
  get xdgConfigHome(): string {
    return process.env.XDG_CONFIG_HOME || `${this.home}/.config`;
  },

  /**
   * Archive threshold in days
   * @default 30
   */
  get archiveThresholdDays(): number {
    const days = process.env.KODAMA_ARCHIVE_DAYS;
    if (days) {
      const parsed = parseInt(days, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 30;
  },

  /**
   * Maximum number of decisions to keep in snapshots
   * @default 5
   */
  get maxDecisions(): number {
    if (this.noLimit) {
      return Infinity;
    }
    const max = process.env.KODAMA_MAX_DECISIONS;
    if (max) {
      const parsed = parseInt(max, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 5;
  },

  /**
   * Storage paths derived from XDG directories
   */
  get paths() {
    const dataDir = `${this.xdgDataHome}/kodama-claude`;
    const configDir = `${this.xdgConfigHome}/kodama-claude`;
    
    return {
      data: dataDir,
      config: configDir,
      snapshots: `${dataDir}/snapshots`,
      archive: `${dataDir}/snapshots/archive`,
      events: `${dataDir}/events.jsonl`,
      session: `${dataDir}/.session`,
    };
  },

  /**
   * Check if running in test environment
   */
  get isTest(): boolean {
    return process.env.NODE_ENV === 'test' || process.env.BUN_ENV === 'test';
  },

  /**
   * Check if running in CI environment
   */
  get isCI(): boolean {
    return process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  },
} as const;

/**
 * Validate configuration at startup
 * @throws Error if configuration is invalid
 */
export function validateConfig(): void {
  try {
    // Check required environment variables
    const home = config.home; // This will throw if HOME is not set
    
    // Check paths are valid
    if (!home.startsWith('/')) {
      throw new Error('HOME must be an absolute path');
    }
    
    // Validate numeric configs
    if (config.archiveThresholdDays <= 0) {
      throw new Error('Archive threshold days must be positive');
    }
    
    if (config.maxDecisions <= 0 && config.maxDecisions !== Infinity) {
      throw new Error('Max decisions must be positive or unlimited');
    }
  } catch (error) {
    if (config.isTest) {
      // In test environment, we might not have all env vars set
      return;
    }
    throw error;
  }
}

/**
 * Get a summary of current configuration for debugging
 */
export function getConfigSummary(): Record<string, any> {
  return {
    debug: config.debug,
    noLimit: config.noLimit,
    autoArchiveDisabled: config.autoArchiveDisabled,
    claudeMdSync: config.claudeMdSync,
    claudeMdSyncDryRun: config.claudeMdSyncDryRun,
    language: config.language,
    systemLocale: config.systemLocale,
    archiveThresholdDays: config.archiveThresholdDays,
    maxDecisions: config.maxDecisions,
    paths: config.paths,
    isTest: config.isTest,
    isCI: config.isCI,
  };
}