/**
 * "kc status" - Simple health status check
 * Shows 4-value status only (no percentage)
 */

import { Guardian } from "./guardian";

export interface StatusOptions {
  json?: boolean;
  strict?: boolean;  // Exit 1 on danger (for CI/CD)
}

export async function statusCommand(options: StatusOptions) {
  const guardian = new Guardian();
  const health = await guardian.checkHealth();

  // JSON output for automation
  if (options.json) {
    const output = {
      status: health.level,
      basis: getBasis(health),
      hint: health.suggestion || null,
    };
    console.log(JSON.stringify(output, null, 2));
    
    // In strict mode, exit with error code on danger
    if (options.strict && health.level === 'danger') {
      process.exit(1);
    }
    return;
  }

  // Simple one-line output (default)
  const emoji = getStatusEmoji(health.level);
  const basis = getBasis(health);
  const hint = health.suggestion || "No action needed";
  
  console.log(`${emoji} | basis: ${basis} | hint: ${hint}`);
  
  // In strict mode, exit with error code on danger
  if (options.strict && health.level === 'danger') {
    console.error('\n❌ Exiting with error code 1 (--strict mode)');
    process.exit(1);
  }
}

/**
 * Get the basis for the health status
 */
function getBasis(health: any): string {
  if (health.transcript) {
    return 'transcript';
  }
  if (health.lastSnapshot) {
    return 'heuristic';
  }
  return 'unknown';
}

/**
 * Get emoji for status level
 */
function getStatusEmoji(level: string): string {
  switch (level) {
    case 'healthy':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'danger':
      return '🔴';
    default:
      return '❓';
  }
}