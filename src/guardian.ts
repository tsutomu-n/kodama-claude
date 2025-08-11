/**
 * Guardian module - Protects users from context loss
 * Provides health checks and automatic protection
 */

import { Storage } from "./storage";
import { analyzeTranscript, getTranscriptPath, type TranscriptInfo } from "./utils/transcript";
import { getMessage } from "./i18n";
import { config } from "./config";
import type { Snapshot } from "./types";

export interface HealthStatus {
  level: 'healthy' | 'warning' | 'danger';
  transcript?: TranscriptInfo | null;
  lastSnapshot?: {
    id: string;
    title: string;
    ageHours: number;
  };
  suggestion?: string;
  autoAction?: 'snapshot' | 'warn' | null;
}

export interface GuardianConfig {
  autoSnapshotThreshold: number;  // Default: 10% (90% used)
  warningThreshold: number;       // Default: 30% (70% used)  
  snapshotIntervalHours: number;  // Default: 1 hour
}

export class Guardian {
  private storage: Storage;
  private config: GuardianConfig;

  constructor(customConfig?: Partial<GuardianConfig>) {
    this.storage = new Storage();
    this.config = {
      autoSnapshotThreshold: customConfig?.autoSnapshotThreshold ?? 10,
      warningThreshold: customConfig?.warningThreshold ?? 30,
      snapshotIntervalHours: customConfig?.snapshotIntervalHours ?? 1,
    };
  }

  /**
   * Perform a comprehensive health check
   */
  async checkHealth(): Promise<HealthStatus> {
    // Get transcript info
    const transcriptPath = getTranscriptPath();
    const transcript = transcriptPath ? analyzeTranscript(transcriptPath) : null;

    // Get latest snapshot info
    const latestSnapshot = await this.storage.getLatestSnapshot();
    const lastSnapshot = latestSnapshot ? {
      id: latestSnapshot.id,
      title: latestSnapshot.title,
      ageHours: this.getSnapshotAgeHours(latestSnapshot.timestamp)
    } : undefined;

    // Determine health level
    const level = this.calculateHealthLevel(transcript, lastSnapshot);
    
    // Generate suggestion
    const suggestion = this.generateSuggestion(transcript, lastSnapshot);
    
    // Determine auto action
    const autoAction = this.determineAutoAction(transcript, lastSnapshot);

    return {
      level,
      transcript,
      lastSnapshot,
      suggestion,
      autoAction
    };
  }

  /**
   * Perform automatic protection actions
   */
  async protect(): Promise<boolean> {
    const health = await this.checkHealth();

    if (health.autoAction === 'snapshot') {
      // Auto-create snapshot
      const snapshot = await this.createAutoSnapshot();
      if (snapshot) {
        console.log(`🛡️ ${getMessage('autoSnapshotCreated', snapshot.id.substring(0, 8))}`);
        return true;
      }
    } else if (health.autoAction === 'warn') {
      // Show warning
      console.log(`⚠️ ${health.suggestion}`);
      return false;
    }

    return false;
  }

  /**
   * Create an automatic snapshot
   */
  private async createAutoSnapshot(): Promise<Snapshot | null> {
    try {
      const health = await this.checkHealth();
      const percent = health.transcript?.remainingPercent ?? 'unknown';
      
      const snapshot: Snapshot = {
        version: "1.0.0",
        id: require("crypto").randomUUID(),
        title: `Auto-save at ${100 - Number(percent)}% usage`,
        timestamp: new Date().toISOString(),
        context: "Automatic snapshot by KODAMA Guardian",
        decisions: [],
        nextSteps: [],
        cwd: process.cwd(),
      };

      await this.storage.saveSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      if (config.debug) {
        console.error("Failed to create auto snapshot:", error);
      }
      return null;
    }
  }

  /**
   * Calculate overall health level
   */
  private calculateHealthLevel(
    transcript: TranscriptInfo | null,
    lastSnapshot?: { ageHours: number }
  ): HealthStatus['level'] {
    // If no transcript info, check snapshot age
    if (!transcript) {
      if (!lastSnapshot) return 'warning'; // No info available
      if (lastSnapshot.ageHours > 3) return 'warning';
      return 'healthy';
    }

    // Use transcript status as primary indicator
    if (transcript.status === 'danger') return 'danger';
    if (transcript.status === 'warning') {
      // Escalate to danger if no recent snapshot
      if (!lastSnapshot || lastSnapshot.ageHours > 2) {
        return 'danger';
      }
      return 'warning';
    }

    // Healthy transcript, but check snapshot age
    if (lastSnapshot && lastSnapshot.ageHours > 4) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Generate actionable suggestion
   */
  private generateSuggestion(
    transcript: TranscriptInfo | null,
    lastSnapshot?: { ageHours: number }
  ): string {
    if (!transcript) {
      if (!lastSnapshot) {
        return "No session info. Run 'kc snap' to create first snapshot";
      }
      if (lastSnapshot.ageHours > 3) {
        return `Last snapshot ${Math.round(lastSnapshot.ageHours)}h ago. Consider 'kc snap'`;
      }
      return "Session healthy. Keep coding!";
    }

    const { remainingPercent } = transcript;

    if (remainingPercent < 10) {
      return "🔴 Critical! Run 'kc snap' immediately to avoid context loss";
    }

    if (remainingPercent < 30) {
      if (!lastSnapshot || lastSnapshot.ageHours > 1) {
        return `🟡 ${remainingPercent}% remaining. Run 'kc snap' soon`;
      }
      return `🟡 ${remainingPercent}% remaining. Recent snapshot exists`;
    }

    if (lastSnapshot && lastSnapshot.ageHours > 3) {
      return `🟢 ${remainingPercent}% remaining. Consider snapshot (${Math.round(lastSnapshot.ageHours)}h old)`;
    }

    return `🟢 ${remainingPercent}% remaining. All good!`;
  }

  /**
   * Determine if automatic action should be taken
   */
  private determineAutoAction(
    transcript: TranscriptInfo | null,
    lastSnapshot?: { ageHours: number }
  ): HealthStatus['autoAction'] {
    if (!transcript) return null;

    const { remainingPercent } = transcript;

    // Auto-snapshot if critical
    if (remainingPercent <= this.config.autoSnapshotThreshold) {
      // But not if we just saved
      if (lastSnapshot && lastSnapshot.ageHours < 0.1) {
        return null; // Just saved, skip
      }
      return 'snapshot';
    }

    // Warning if approaching threshold
    if (remainingPercent <= this.config.warningThreshold) {
      if (!lastSnapshot || lastSnapshot.ageHours > this.config.snapshotIntervalHours) {
        return 'warn';
      }
    }

    return null;
  }

  /**
   * Calculate snapshot age in hours
   */
  private getSnapshotAgeHours(timestamp: string): number {
    const snapshotTime = new Date(timestamp).getTime();
    const now = Date.now();
    return (now - snapshotTime) / (1000 * 60 * 60);
  }
}