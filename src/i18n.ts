/**
 * Simple internationalization for error messages
 * Supports English and Japanese based on environment variables
 */

import { config } from "./config";

type Language = 'en' | 'ja';

// Define message types for better type safety
type SimpleMessage = {
  titleRequired: string;
  claudeNotFound: string;
  claudeSessionFailed: string;
  noSnapshotsFound: string;
};

type ParameterizedMessage = {
  errorCreating: (type: string) => string;
  snapshotNotFound: (id: string) => string;
  snapshotLoadFailed: (id: string, error: string) => string;
  snapshotCreated: (id: string) => string;
  planCreated: (id: string) => string;
};

type Messages = SimpleMessage & ParameterizedMessage;

const messages: Record<Language, Messages> = {
  en: {
    // Simple messages
    titleRequired: "Title is required",
    claudeNotFound: "Claude Code CLI not found. Please install: npm install -g @anthropic/claude",
    claudeSessionFailed: "Failed to start/continue Claude session:",
    noSnapshotsFound: "No snapshots found. Create one with: kc snap",
    
    // Parameterized messages
    errorCreating: (type) => `Error creating ${type}:`,
    snapshotNotFound: (id) => `Snapshot not found: ${id}`,
    snapshotLoadFailed: (id, error) => `Failed to load snapshot ${id}: ${error}`,
    snapshotCreated: (id) => `✓ Snapshot created: ${id}`,
    planCreated: (id) => `✓ Plan created: ${id}`,
  },
  
  ja: {
    // Simple messages
    titleRequired: "タイトルが必要です",
    claudeNotFound: "Claude Code CLIが見つかりません。インストールしてください: npm install -g @anthropic/claude",
    claudeSessionFailed: "Claudeセッションの開始/継続に失敗しました:",
    noSnapshotsFound: "スナップショットが見つかりません。作成してください: kc snap",
    
    // Parameterized messages
    errorCreating: (type) => `${type}の作成中にエラーが発生しました:`,
    snapshotNotFound: (id) => `スナップショットが見つかりません: ${id}`,
    snapshotLoadFailed: (id, error) => `スナップショット ${id} の読み込みに失敗しました: ${error}`,
    snapshotCreated: (id) => `✓ スナップショットを作成しました: ${id}`,
    planCreated: (id) => `✓ プランを作成しました: ${id}`,
  }
};

/**
 * Get the current language from environment variables
 * Priority: KODAMA_LANG > LANG > LC_ALL > default (en)
 */
function getCurrentLanguage(): Language {
  const kodamaLang = config.language;
  if (kodamaLang?.toLowerCase().startsWith('ja')) return 'ja';
  if (kodamaLang?.toLowerCase().startsWith('en')) return 'en';
  
  const lang = config.systemLocale;
  if (lang.toLowerCase().startsWith('ja')) return 'ja';
  
  return 'en'; // Default to English
}

/**
 * Get message in current language with function overloads for type safety
 */

// Simple messages (no parameters)
export function getMessage(key: 'titleRequired'): string;
export function getMessage(key: 'claudeNotFound'): string;
export function getMessage(key: 'claudeSessionFailed'): string;
export function getMessage(key: 'noSnapshotsFound'): string;

// Parameterized messages
export function getMessage(key: 'errorCreating', type: string): string;
export function getMessage(key: 'snapshotNotFound', id: string): string;
export function getMessage(key: 'snapshotLoadFailed', id: string, error: string): string;
export function getMessage(key: 'snapshotCreated', id: string): string;
export function getMessage(key: 'planCreated', id: string): string;

// Implementation
export function getMessage(key: keyof Messages, ...args: any[]): string {
  const lang = getCurrentLanguage();
  const message = messages[lang][key];
  
  if (typeof message === 'function') {
    // Use type assertion here since we know the arguments match based on overloads
    return (message as Function)(...args);
  }
  
  return message;
}

/**
 * Get the current language for display purposes
 */
export function getLanguage(): Language {
  return getCurrentLanguage();
}

/**
 * Format error message with prefix
 */
export function formatError(message: string): string {
  return `❌ ${message}`;
}

