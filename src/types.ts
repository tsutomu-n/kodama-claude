/**
 * Core type definitions for KODAMA Claude
 */

import { z } from "zod";

// Version 1.0.0 snapshot schema
export const SnapshotSchema = z.object({
  version: z.literal("1.0.0"),
  id: z.string().uuid(),
  title: z.string().min(1),
  timestamp: z.string().datetime(),
  step: z.enum(["requirements", "designing", "implementing", "testing"]).optional(),
  context: z.string().default(""),
  decisions: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  claudeSessionId: z.string().optional(),
  cwd: z.string(),
  gitBranch: z.string().optional(),
  gitCommit: z.string().optional(),
});

export type Snapshot = z.infer<typeof SnapshotSchema>;

// Event log entry for append-only log
export const EventLogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  eventType: z.enum(["snapshot_created", "snapshot_sent", "context_injected", "error"]),
  snapshotId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type EventLogEntry = z.infer<typeof EventLogEntrySchema>;

// Configuration schema
export const ConfigSchema = z.object({
  version: z.literal("1.0.0"),
  claudePath: z.string().default("claude"),
  storageDir: z.string(),
  maxSnapshots: z.number().default(100),
  autoCleanupDays: z.number().default(30),
});

export type Config = z.infer<typeof ConfigSchema>;

// Claude result
export interface ClaudeResult {
  success: boolean;
  output?: string;
  error?: string;
  sessionId?: string;
}

// Storage paths following XDG spec
export function getStoragePaths() {
  const home = process.env.HOME;
  if (!home) {
    throw new Error("HOME environment variable is not set");
  }
  
  const xdgData = process.env.XDG_DATA_HOME || `${home}/.local/share`;
  const xdgConfig = process.env.XDG_CONFIG_HOME || `${home}/.config`;
  
  return {
    data: `${xdgData}/kodama-claude`,
    config: `${xdgConfig}/kodama-claude`,
    snapshots: `${xdgData}/kodama-claude/snapshots`,
    archive: `${xdgData}/kodama-claude/snapshots/archive`,
    events: `${xdgData}/kodama-claude/events.jsonl`,
    session: `${xdgData}/kodama-claude/.session`,
  };
}