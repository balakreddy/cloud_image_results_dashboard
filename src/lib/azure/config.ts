/**
 * Simple configuration for Azure Blob Storage
 * Supports both public and authenticated access
 */

export const AZURE_CONFIG = {
  accountName: 'fedoratestresults',
  containerName: '$web',
  endpoint: 'https://fedoratestresults.z5.web.core.windows.net'
} as const;

// Helper to build blob URLs
export function getBlobUrl(blobName: string): string {
  return `${AZURE_CONFIG.endpoint}/${blobName}`;
}
