/**
 * Performance monitoring utilities for KODAMA Claude
 * 
 * Provides timing measurements for debugging and optimization
 * Only active when debug mode is enabled
 */

import { config } from "./config";

/**
 * Performance timer class for measuring operation durations
 */
export class PerfTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();
  private enabled: boolean;

  constructor(private operation: string) {
    this.enabled = config.debug;
    this.startTime = performance.now();
    
    if (this.enabled) {
      this.log(`⏱️  Starting: ${operation}`);
    }
  }

  /**
   * Mark a checkpoint in the operation
   */
  mark(label: string): void {
    if (!this.enabled) return;
    
    const elapsed = performance.now() - this.startTime;
    this.marks.set(label, elapsed);
    this.log(`  ├─ ${label}: ${this.formatDuration(elapsed)}`);
  }

  /**
   * End timing and log total duration
   */
  end(): void {
    if (!this.enabled) return;
    
    const totalTime = performance.now() - this.startTime;
    this.log(`  └─ Completed: ${this.formatDuration(totalTime)}`);
  }

  /**
   * Get all timing data
   */
  getMetrics(): Record<string, number> {
    const totalTime = performance.now() - this.startTime;
    const metrics: Record<string, number> = {
      total: totalTime,
    };

    for (const [label, time] of this.marks) {
      metrics[label] = time;
    }

    return metrics;
  }

  /**
   * Format duration for display
   */
  private formatDuration(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(0)}μs`;
    } else if (ms < 1000) {
      return `${ms.toFixed(1)}ms`;
    } else {
      return `${(ms / 1000).toFixed(2)}s`;
    }
  }

  /**
   * Log with consistent formatting
   */
  private log(message: string): void {
    console.log(message);
  }
}

/**
 * Simple wrapper for timing async operations
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!config.debug) {
    return fn();
  }

  const timer = new PerfTimer(operation);
  try {
    const result = await fn();
    timer.end();
    return result;
  } catch (error) {
    timer.mark("error");
    timer.end();
    throw error;
  }
}

/**
 * Simple wrapper for timing sync operations
 */
export function measureSync<T>(
  operation: string,
  fn: () => T
): T {
  if (!config.debug) {
    return fn();
  }

  const timer = new PerfTimer(operation);
  try {
    const result = fn();
    timer.end();
    return result;
  } catch (error) {
    timer.mark("error");
    timer.end();
    throw error;
  }
}

/**
 * Memory usage reporter
 */
export function reportMemoryUsage(label: string): void {
  if (!config.debug) return;

  const usage = process.memoryUsage();
  console.log(`📊 Memory (${label}):`);
  console.log(`  ├─ RSS: ${formatBytes(usage.rss)}`);
  console.log(`  ├─ Heap Used: ${formatBytes(usage.heapUsed)}`);
  console.log(`  ├─ Heap Total: ${formatBytes(usage.heapTotal)}`);
  console.log(`  └─ External: ${formatBytes(usage.external)}`);
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Create a performance report for all operations
 */
export class PerfReport {
  private operations: Array<{ name: string; metrics: Record<string, number> }> = [];

  add(operation: string, metrics: Record<string, number>): void {
    this.operations.push({ name: operation, metrics });
  }

  /**
   * Generate summary report
   */
  getSummary(): string {
    if (this.operations.length === 0) {
      return "No performance data collected";
    }

    const lines = ["📈 Performance Report"];
    
    for (const op of this.operations) {
      lines.push(`\n${op.name}:`);
      for (const [key, value] of Object.entries(op.metrics)) {
        lines.push(`  ${key}: ${this.formatDuration(value)}`);
      }
    }

    return lines.join("\n");
  }

  private formatDuration(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(0)}μs`;
    } else if (ms < 1000) {
      return `${ms.toFixed(1)}ms`;
    } else {
      return `${(ms / 1000).toFixed(2)}s`;
    }
  }
}