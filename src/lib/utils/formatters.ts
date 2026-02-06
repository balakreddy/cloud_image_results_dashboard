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

/**
 * Format date to readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Extract Fedora version from compose ID
 * e.g., "Fedora-Cloud-42-20260122.0" -> "42"
 */
export function extractVersion(composeId: string): string {
  const match = composeId.match(/Fedora-\w+-(\d+|Rawhide|eln)/i);
  return match ? match[1] : 'Unknown';
}

/**
 * Sort compose IDs by date (newest first)
 */
export function sortComposesByDate(composeIds: string[]): string[] {
  return composeIds.sort((a, b) => {
    const dateA = extractDateFromCompose(a);
    const dateB = extractDateFromCompose(b);
    return dateB.getTime() - dateA.getTime();
  });
}

function extractDateFromCompose(composeId: string): Date {
  const match = composeId.match(/(\d{8})/);
  if (!match) return new Date(0);
  
  const dateStr = match[1];
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1;
  const day = parseInt(dateStr.substring(6, 8), 10);
  
  return new Date(year, month, day);
}
