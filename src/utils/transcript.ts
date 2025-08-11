/**
 * Transcript analysis utilities for token usage estimation
 * Inspired by efficient tail-reading approach
 */

import { existsSync, openSync, readSync, closeSync, statSync } from "fs";
import { join } from "path";

export interface TranscriptInfo {
  contextWindow: number;
  contextUsed: number;
  remainingTokens: number;
  remainingPercent: number;
  status: 'healthy' | 'warning' | 'danger';
}

/**
 * Get the Claude transcript path
 * Looking for the most recent transcript in standard locations
 */
export function getTranscriptPath(): string | null {
  const home = process.env.HOME;
  if (!home) return null;

  // Common transcript locations
  const possiblePaths = [
    join(home, '.claude', 'sessions', 'current', 'transcript.jsonl'),
    join(home, '.local', 'share', 'claude', 'transcript.jsonl'),
    process.env.CLAUDE_TRANSCRIPT_PATH
  ].filter(Boolean) as string[];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Efficiently read transcript tail and extract token usage
 * Based on provided efficient implementation
 */
export function analyzeTranscript(transcriptPath: string): TranscriptInfo | null {
  if (!transcriptPath || !existsSync(transcriptPath)) {
    return null;
  }

  try {
    const stat = statSync(transcriptPath);
    const size = stat.size;
    
    // Read last 64KB for efficiency (as per provided implementation)
    const tailSize = Math.min(size, 64 * 1024);
    if (tailSize === 0) return null;

    const fd = openSync(transcriptPath, 'r');
    const buffer = Buffer.alloc(tailSize);
    readSync(fd, buffer, 0, tailSize, size - tailSize);
    closeSync(fd);

    const text = buffer.toString('utf8');

    // Extract context_window and context_used from the tail
    // Looking for the most recent occurrence
    const contextWindowMatch = text.match(/"context_window"\s*:\s*(\d+)/g);
    const contextUsedMatch = text.match(/"context_used"\s*:\s*(\d+)/g);

    if (!contextWindowMatch || !contextUsedMatch) {
      return null;
    }

    // Get the last (most recent) match
    const lastWindowMatch = contextWindowMatch[contextWindowMatch.length - 1];
    const lastUsedMatch = contextUsedMatch[contextUsedMatch.length - 1];

    const contextWindow = parseInt(lastWindowMatch.match(/\d+/)![0], 10);
    const contextUsed = parseInt(lastUsedMatch.match(/\d+/)![0], 10);

    if (contextWindow <= 0) return null;

    const remainingTokens = Math.max(0, contextWindow - contextUsed);
    const remainingPercent = Math.round((remainingTokens / contextWindow) * 100);

    // Determine status based on remaining percentage
    let status: TranscriptInfo['status'];
    if (remainingPercent >= 30) {
      status = 'healthy';
    } else if (remainingPercent >= 10) {
      status = 'warning';
    } else {
      status = 'danger';
    }

    return {
      contextWindow,
      contextUsed,
      remainingTokens,
      remainingPercent,
      status
    };
  } catch (error) {
    // Silent failure for robustness
    return null;
  }
}

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`;
  }
  return tokens.toString();
}

/**
 * Get color code for status
 */
export function getStatusColor(status: TranscriptInfo['status']): string {
  const colors = {
    healthy: '\x1b[32m',  // green
    warning: '\x1b[33m',  // yellow
    danger: '\x1b[31m',   // red
  };
  return colors[status];
}

/**
 * Get status emoji
 */
export function getStatusEmoji(status: TranscriptInfo['status']): string {
  const emojis = {
    healthy: '🟢',
    warning: '🟡',
    danger: '🔴',
  };
  return emojis[status];
}

/**
 * Reset color code
 */
export const RESET_COLOR = '\x1b[0m';