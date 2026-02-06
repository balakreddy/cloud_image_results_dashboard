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

// Parse compose ID from blob path: "Fedora-Cloud-42-20260122.0/x86_64/junit.xml"
export function parseBlobPath(path: string) {
  const parts = path.split('/');
  if (parts.length < 2) return null;
  
  return {
    composeId: parts[0],
    architecture: parts[1],
    filename: parts[2] || '',
    isJunit: path.endsWith('junit.xml'),
    isHtml: path.endsWith('index.html')
  };
}
