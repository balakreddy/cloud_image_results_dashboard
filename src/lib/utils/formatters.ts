/**
 * Simple utility functions
 * Keep utilities focused and reusable
 */

/**
 * Format duration in seconds to readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

/**
 * Format percentage
 * Note: Pass rate excludes skipped tests - only passed vs failed
 */
export function formatPercent(passed: number, failed: number): string {
  const total = passed + failed;
  if (total === 0) return '0%';
  return `${((passed / total) * 100).toFixed(1)}%`;
}
